import { resolveAiConfig, logAiContext } from "./ai";
import { prepareAnalysis } from "./analysis";
import { fetchRepoDocumentation } from "./github";
import type {
  ExplainRequestBody,
  ExplainResponse,
  ExplanationDepth,
  ExplanationResult,
  GitHubRelease,
  RepoDocumentation,
  RepoProfile,
  RuntimeEnv,
} from "./types";

interface EvidenceCandidate {
  tag: string;
  name: string;
  date: string;
  htmlUrl: string;
  snippet: string;
  score: number;
}

interface AiExplanationShape extends Partial<ExplanationResult> {
  needsDocs?: boolean;
}

const MAX_VISIBLE_CHARS = 250;

export async function explainReportItem(request: ExplainRequestBody, env: RuntimeEnv): Promise<ExplainResponse> {
  const lang = request.lang || "en";
  const itemText = String(request.itemText || "").trim();
  if (!itemText) {
    throw new Error(lang === "zh" ? "缺少需要解释的报告条目。" : "Missing report item to explain.");
  }

  const repoUrl = request.repoUrl || request.repoName || "";
  const prepared = await prepareAnalysis({ ...request, repoUrl }, env);
  if ("status" in prepared) {
    throw new Error(lang === "zh" ? "无法定位这次分析的版本范围。" : "Unable to resolve the release range for this report.");
  }

  const candidates = selectEvidenceCandidates(prepared.range.releasesToAnalyze, request);
  const firstPass = await callExplanationAi(
    {
      request,
      env,
      repoFullName: prepared.repo.fullName,
      repoProfile: prepared.repoProfile,
      currentVersionLabel: prepared.range.currentVersionLabel,
      latestVersion: prepared.range.latestVersion,
      evidenceCandidates: candidates,
    },
    []
  );

  let explanation = firstPass;
  if (firstPass.needsDocs) {
    const docs = await fetchRepoDocumentation(prepared.repo, env, itemText).catch(() => []);
    if (docs.length > 0) {
      explanation = await callExplanationAi(
        {
          request,
          env,
          repoFullName: prepared.repo.fullName,
          repoProfile: prepared.repoProfile,
          currentVersionLabel: prepared.range.currentVersionLabel,
          latestVersion: prepared.range.latestVersion,
          evidenceCandidates: candidates,
        },
        docs
      );
    } else {
      explanation = {
        ...firstPass,
        depth: firstPass.depth === "docs" ? "source_needed" : firstPass.depth,
        needsSourceReview: firstPass.needsSourceReview || firstPass.needsDocs,
      };
    }
  }

  return {
    status: "success",
    explanation: normalizeExplanation(explanation, lang),
  };
}

async function callExplanationAi(
  input: {
    request: ExplainRequestBody;
    env: RuntimeEnv;
    repoFullName: string;
    repoProfile?: RepoProfile;
    currentVersionLabel: string;
    latestVersion: string;
    evidenceCandidates: EvidenceCandidate[];
  },
  docs: RepoDocumentation[]
): Promise<AiExplanationShape> {
  const config = resolveAiConfig(input.request, input.env);
  const lang = input.request.lang || "en";
  if (!config.apiKey) {
    throw new Error(lang === "zh" ? "缺少 AI API Key。" : "Missing AI API key.");
  }

  const payload = {
    model: config.model,
    messages: [
      { role: "system", content: buildExplainSystemPrompt(lang, docs.length > 0) },
      { role: "user", content: buildExplainUserPrompt(input, docs) },
    ],
    response_format: { type: "json_object" },
    stream: false,
  };

  logAiContext(input.env, {
    phase: "explain_request",
    apiUrl: `${config.apiUrl}/chat/completions`,
    model: config.model,
    requestBody: payload,
  });

  const response = await fetch(`${config.apiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseAiError(text) || `AI explanation request failed with ${response.status}.`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content || "{}";
  logAiContext(input.env, {
    phase: "explain_response",
    model: config.model,
    rawContent: content,
  });

  return JSON.parse(content || "{}");
}

function buildExplainSystemPrompt(lang: "en" | "zh", hasDocs: boolean): string {
  if (lang === "zh") {
    return `你是 SIU 的二次解释器。用户点了报告里一条看不懂的更新/警告/提醒，你要把它解释成人话。

规则：
1. 先根据 release 原文和上下文解释，不要编造。
2. 如果没有提供文档，且 release 原文本身模糊、术语不清、影响对象不清，请把 needsDocs 设为 true。
3. 如果已经提供文档但仍解释不清，请把 depth 设为 "source_needed"，needsSourceReview 设为 true。
4. 输出给用户看的四段正文合计不得超过 250 个中文字符。
5. 语气直接、具体、克制。作者没写清楚时要明说。

只返回合法 JSON：
{
  "plainMeaning": "这是什么意思",
  "affectedUsers": "影响谁",
  "action": "要不要管",
  "evidence": "依据",
  "depth": "release_context" | "docs" | "source_needed",
  "needsDocs": boolean,
  "needsSourceReview": boolean
}

当前是否提供文档：${hasDocs ? "是" : "否"}`;
  }

  return `You are SIU's secondary explainer. The user clicked one unclear update, warning, or note in a report. Explain it plainly.

Rules:
1. Use release evidence and context first. Do not invent facts.
2. If no docs were provided and the release note is vague, term-heavy, or unclear about impact, set needsDocs to true.
3. If docs were provided but impact is still unclear, set depth to "source_needed" and needsSourceReview to true.
4. Keep the four user-visible fields concise and under about 120 English words.
5. Be practical and cautious. Say when the author did not explain the scope.

Return only valid JSON:
{
  "plainMeaning": "what this means",
  "affectedUsers": "who is affected",
  "action": "what to do",
  "evidence": "evidence",
  "depth": "release_context" | "docs" | "source_needed",
  "needsDocs": boolean,
  "needsSourceReview": boolean
}

Docs provided: ${hasDocs ? "yes" : "no"}`;
}

function buildExplainUserPrompt(
  input: {
    request: ExplainRequestBody;
    repoFullName: string;
    repoProfile?: RepoProfile;
    currentVersionLabel: string;
    latestVersion: string;
    evidenceCandidates: EvidenceCandidate[];
  },
  docs: RepoDocumentation[]
): string {
  const lang = input.request.lang || "en";
  const profile = input.repoProfile
    ? [
        `Description: ${input.repoProfile.description || "Unknown"}`,
        `Language: ${input.repoProfile.primaryLanguage || "Unknown"}`,
        `Topics: ${input.repoProfile.topics.join(", ") || "None"}`,
        `README excerpt: ${input.repoProfile.readmeExcerpt || "None"}`,
      ].join("\n")
    : "No repository profile available.";

  const evidence = input.evidenceCandidates.length
    ? input.evidenceCandidates
        .map(
          (candidate) => `### ${candidate.tag} | ${candidate.name} | ${candidate.date}
Link: ${candidate.htmlUrl}
${candidate.snippet || "No clear snippet located."}`
        )
        .join("\n\n")
    : "No matching release evidence was located.";

  const docsPayload = docs.length
    ? docs.map((doc) => `### ${doc.path}\n${doc.content}`).join("\n\n")
    : "No documentation was provided in this pass.";

  if (lang === "zh") {
    return `请解释 SIU 报告中的这一条：

仓库：${input.repoFullName}
版本范围：${input.currentVersionLabel} -> ${input.latestVersion}
报告区块：${input.request.section}
用户点击的条目：${input.request.itemText}

仓库画像：
${profile}

反查到的 Release 上下文：
${evidence}

文档上下文：
${docsPayload}

请判断这条到底是什么意思、影响谁、用户要不要管，并给出最短依据。`;
  }

  return `Explain this SIU report item:

Repository: ${input.repoFullName}
Version range: ${input.currentVersionLabel} -> ${input.latestVersion}
Report section: ${input.request.section}
Clicked item: ${input.request.itemText}

Repository profile:
${profile}

Release context:
${evidence}

Documentation context:
${docsPayload}

Explain what it means, who is affected, what the user should do, and the shortest useful evidence.`;
}

function selectEvidenceCandidates(releases: GitHubRelease[], request: ExplainRequestBody): EvidenceCandidate[] {
  const scored = releases.map((release, index) => {
    const score = scoreRelease(release, request, index);
    return {
      tag: release.tagName,
      name: release.name,
      date: release.publishedAt,
      htmlUrl: release.htmlUrl,
      snippet: extractReleaseSnippet(release, request.itemText),
      score,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, request.releaseTag ? 3 : 6);
}

function scoreRelease(release: GitHubRelease, request: ExplainRequestBody, index: number): number {
  let score = Math.max(0, 20 - index);
  if (request.releaseTag && normalizeText(release.tagName) === normalizeText(request.releaseTag)) score += 120;

  const haystack = normalizeText([release.tagName, release.name, release.body].join(" "));
  for (const token of tokenize(request.itemText)) {
    if (haystack.includes(token)) score += token.length > 8 ? 8 : 4;
  }

  return score;
}

function extractReleaseSnippet(release: GitHubRelease, itemText: string): string {
  const lines = release.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s*$/.test(line))
    .slice(0, 80);

  const tokens = tokenize(itemText);
  const scored = lines
    .map((line, index) => ({
      line: line.replace(/\s+/g, " "),
      score: tokens.reduce((sum, token) => sum + (normalizeText(line).includes(token) ? 1 : 0), 0) * 10 - index,
    }))
    .sort((a, b) => b.score - a.score);

  const picked = scored.filter((item) => item.score > -20).slice(0, 4).map((item) => item.line);
  const fallback = lines.slice(0, 4).map((line) => line.replace(/\s+/g, " "));
  return (picked.length ? picked : fallback).join("\n").slice(0, 1100);
}

function normalizeExplanation(input: AiExplanationShape, lang: "en" | "zh"): ExplanationResult {
  const depth = normalizeDepth(input.depth);
  const result: ExplanationResult = {
    plainMeaning: cleanField(input.plainMeaning) || (lang === "zh" ? "这条更新的具体含义还不够明确。" : "The exact meaning of this update is still unclear."),
    affectedUsers: cleanField(input.affectedUsers) || (lang === "zh" ? "影响对象不明确。" : "Affected users are unclear."),
    action: cleanField(input.action) || (lang === "zh" ? "建议先查看原始 Release。" : "Check the original release note first."),
    evidence: cleanField(input.evidence) || (lang === "zh" ? "未能定位到明确 release 原文。" : "No clear release evidence was located."),
    depth,
    needsSourceReview: Boolean(input.needsSourceReview || depth === "source_needed"),
  };

  return clampExplanation(result, lang);
}

function clampExplanation(result: ExplanationResult, lang: "en" | "zh"): ExplanationResult {
  if (lang !== "zh") return result;

  const fields: Array<keyof Pick<ExplanationResult, "plainMeaning" | "affectedUsers" | "action" | "evidence">> = [
    "plainMeaning",
    "affectedUsers",
    "action",
    "evidence",
  ];
  let remaining = MAX_VISIBLE_CHARS;
  const next = { ...result };

  for (const field of fields) {
    const value = next[field];
    const limit = Math.max(24, Math.floor(remaining / (fields.length - fields.indexOf(field))));
    next[field] = value.length > limit ? `${value.slice(0, Math.max(0, limit - 1))}…` : value;
    remaining -= next[field].length;
  }

  return next;
}

function normalizeDepth(value?: string): ExplanationDepth {
  if (value === "docs" || value === "source_needed" || value === "release_context") return value;
  return "release_context";
}

function cleanField(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/[^a-z0-9_@.-]+/)
        .filter((token) => token.length >= 4)
    )
  ).slice(0, 18);
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\[[^\]]+]/g, " ").replace(/\s+/g, " ").trim();
}

function parseAiError(text: string): string | null {
  try {
    const json = JSON.parse(text);
    return json?.error?.message || json?.message || null;
  } catch {
    return text || null;
  }
}
