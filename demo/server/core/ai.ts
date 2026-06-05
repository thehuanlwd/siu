import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { normalizeUpgradePreferences } from "./preferences";
import type { AnalyzeRequestBody, CleanedReleaseNotes, GitHubRelease, RepoProfile, RuntimeEnv, UpgradeAnalysis } from "./types";

export interface AiConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  provider: string;
}

export function resolveAiConfig(request: AnalyzeRequestBody, env: RuntimeEnv): AiConfig {
  const apiUrl = normalizeOpenAiBaseUrl(request.customApiUrl || env.OPENAI_API_URL || "https://api.deepseek.com");

  return {
    apiUrl,
    apiKey: (request.customApiKey || env.OPENAI_API_KEY || "").trim().replace(/^["']|["']$/g, ""),
    model: (request.customModel || env.OPENAI_MODEL || "deepseek-v4-flash").trim().replace(/^["']|["']$/g, ""),
    provider: request.customApiUrl ? "custom" : "system",
  };
}

function normalizeOpenAiBaseUrl(rawUrl: string): string {
  const cleaned = rawUrl.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  if (/\/v1(?:\/|$)/i.test(cleaned)) {
    return cleaned;
  }

  return `${cleaned}/v1`;
}

function chatPayload(input: {
  request: AnalyzeRequestBody;
  releases: GitHubRelease[];
  cleanedReleases?: CleanedReleaseNotes[];
  repoProfile?: RepoProfile;
  repoFullName: string;
  currentVersionLabel: string;
  latestVersion: string;
  stream?: boolean;
}) {
  const lang = input.request.lang || "en";

  return {
    model: resolveAiConfig(input.request, {}).model,
    messages: [
      { role: "system", content: buildSystemPrompt(lang) },
      {
        role: "user",
        content: buildUserPrompt({
          repoFullName: input.repoFullName,
          currentVersionLabel: input.currentVersionLabel,
          latestVersion: input.latestVersion,
          releases: input.releases,
          cleanedReleases: input.cleanedReleases,
          repoProfile: input.repoProfile,
          preferences: input.request.preferences,
          lang,
        }),
      },
    ],
    response_format: { type: "json_object" },
    stream: Boolean(input.stream),
  };
}

export async function callAiJson(input: {
  request: AnalyzeRequestBody;
  env: RuntimeEnv;
  releases: GitHubRelease[];
  cleanedReleases?: CleanedReleaseNotes[];
  repoProfile?: RepoProfile;
  repoFullName: string;
  currentVersionLabel: string;
  latestVersion: string;
}): Promise<UpgradeAnalysis> {
  const config = resolveAiConfig(input.request, input.env);
  if (!config.apiKey) {
    throw new Error(input.request.lang === "zh" ? "缺少 AI API Key。" : "Missing AI API key.");
  }

  const payload = {
    ...chatPayload({ ...input, stream: false }),
    model: config.model,
  };

  logAiContext(input.env, {
    phase: "request",
    stream: false,
    apiUrl: `${config.apiUrl}/chat/completions`,
    model: config.model,
    messages: payload.messages,
    response_format: payload.response_format,
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
    throw new Error(parseAiError(text) || `AI request failed with ${response.status}.`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content || "{}";
  logAiContext(input.env, {
    phase: "response",
    stream: false,
    model: config.model,
    rawContent: content,
    rawResponse: json,
  });
  return normalizeAnalysis(JSON.parse(content), input);
}

export async function fetchAiStream(input: {
  request: AnalyzeRequestBody;
  env: RuntimeEnv;
  releases: GitHubRelease[];
  cleanedReleases?: CleanedReleaseNotes[];
  repoProfile?: RepoProfile;
  repoFullName: string;
  currentVersionLabel: string;
  latestVersion: string;
}): Promise<Response> {
  const config = resolveAiConfig(input.request, input.env);
  if (!config.apiKey) {
    throw new Error(input.request.lang === "zh" ? "缺少 AI API Key。" : "Missing AI API key.");
  }

  const payload = {
    ...chatPayload({ ...input, stream: true }),
    model: config.model,
  };

  logAiContext(input.env, {
    phase: "request",
    stream: true,
    apiUrl: `${config.apiUrl}/chat/completions`,
    model: config.model,
    messages: payload.messages,
    response_format: payload.response_format,
  });

  const response = await fetch(`${config.apiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(parseAiError(text) || `AI stream request failed with ${response.status}.`);
  }

  return response;
}

export async function fetchModelList(request: Pick<AnalyzeRequestBody, "customApiUrl" | "customApiKey">, env: RuntimeEnv) {
  const config = resolveAiConfig({ repoUrl: "", ...request }, env);
  if (!config.apiKey) {
    throw new Error("Missing API key.");
  }

  const response = await fetch(`${config.apiUrl}/models`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseAiError(text) || `Model list request failed with ${response.status}.`);
  }

  const json = await response.json();
  return Array.isArray(json?.data) ? json.data.map((model: any) => model.id).filter(Boolean) : [];
}

export function normalizeAnalysis(
  analysis: Partial<UpgradeAnalysis>,
  input: {
    request: AnalyzeRequestBody;
    releases: GitHubRelease[];
    repoFullName: string;
    currentVersionLabel: string;
    latestVersion: string;
  }
): UpgradeAnalysis {
  const verdict = analysis.verdict === "yes" || analysis.verdict === "no" || analysis.verdict === "maybe" ? analysis.verdict : "maybe";

  return {
    repoName: analysis.repoName || input.repoFullName,
    currentVersion: analysis.currentVersion || input.currentVersionLabel,
    latestVersion: analysis.latestVersion || input.latestVersion,
    verdict,
    verdictReason: analysis.verdictReason || "",
    coreHighlights: Array.isArray(analysis.coreHighlights) ? analysis.coreHighlights : [],
    breakingChanges: Array.isArray(analysis.breakingChanges) ? analysis.breakingChanges : [],
    criticalFixes: Array.isArray(analysis.criticalFixes) ? analysis.criticalFixes : [],
    newFeatures: Array.isArray(analysis.newFeatures) ? analysis.newFeatures : [],
    preferences: normalizeUpgradePreferences(analysis.preferences || input.request.preferences),
    versionCount: Number.isFinite(analysis.versionCount) ? Number(analysis.versionCount) : input.releases.length,
    releaseBreakdown: Array.isArray(analysis.releaseBreakdown) ? analysis.releaseBreakdown : [],
  };
}

function parseAiError(text: string): string | null {
  try {
    const json = JSON.parse(text);
    return json?.error?.message || json?.message || null;
  } catch {
    return text || null;
  }
}

export function logAiContext(env: RuntimeEnv, payload: unknown): void {
  if (env.DEBUG_AI_CONTEXT !== "true") return;

  console.log("========== SIU AI CONTEXT DEBUG START ==========");
  console.log(JSON.stringify(payload, null, 2));
  console.log("========== SIU AI CONTEXT DEBUG END ==========");
}
