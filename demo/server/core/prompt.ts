import type { CleanedReleaseNotes, GitHubRelease, LanguageCode, RepoProfile } from "./types";

export function buildReleaseNotesPayload(releases: GitHubRelease[]): string {
  return releases
    .map((release) => {
      const body = (release.body || "").slice(0, 5000);
      return `### Version: ${release.tagName} | Name: ${release.name || release.tagName} | Date: ${release.publishedAt} | Link: ${release.htmlUrl}
${body}
---`;
    })
    .join("\n\n");
}

export function buildCleanedReleasePayload(cleanedReleases: CleanedReleaseNotes[]): string {
  return cleanedReleases
    .map((release) => {
      const changes = release.changes.length
        ? release.changes
            .map((change) => {
              const scope = change.scope ? `(${change.scope})` : "";
              return `- ${change.type}${scope}: ${change.summary}`;
            })
            .join("\n")
        : "- note: No meaningful changelog entries were extracted.";

      return `### ${release.tag} | ${release.name} | ${release.date}
${changes}`;
    })
    .join("\n\n");
}

export function buildRepoProfilePayload(profile?: RepoProfile): string {
  if (!profile) return "No repository profile was available.";

  return [
    `Repository: ${profile.fullName}`,
    `Description: ${profile.description || "Unknown"}`,
    `Primary language: ${profile.primaryLanguage || "Unknown"}`,
    `Topics: ${profile.topics.length ? profile.topics.join(", ") : "None"}`,
    profile.homepage ? `Homepage: ${profile.homepage}` : "",
    profile.readmeExcerpt ? `README excerpt: ${profile.readmeExcerpt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSystemPrompt(lang: LanguageCode): string {
  if (lang === "zh") {
    return `你是 SIU (Should I Upgrade?)，一名严谨的软件版本升级审计官。

你的任务是审查用户当前版本之后，到最新正式版本之间的全部 GitHub Release Notes，回答用户是否应该升级。

重点关注：
1. 安全修复、崩溃修复、严重 bug 修复。
2. 核心功能、新能力、明显体验改进。
3. 破坏性变更、迁移成本、回退风险。
4. 更新内容与项目核心用途的相关性。

不要仅仅因为某条变更是 feat 就推荐升级。请结合项目画像判断该变更是否服务于项目的核心用途。
如果新功能明显偏离项目核心定位，请降低推荐强度。
如果修复影响项目核心工作流、认证、安全、稳定性或兼容性，请提高推荐强度。

所有自然语言字段必须使用简体中文。不要翻译 JSON 键名、版本号、项目名、API 名称或技术专有名词。

必须只返回一个合法 JSON 对象，不要输出 Markdown，不要输出解释文字。JSON 结构如下：
{
  "repoName": "GitHub 仓库名称",
  "currentVersion": "用户当前版本或时间跨度",
  "latestVersion": "最新正式版本",
  "verdict": "yes" | "no" | "maybe",
  "verdictReason": "一句话说明是否值得升级",
  "coreHighlights": ["3-4 个最重要的新功能或核心改进"],
  "breakingChanges": ["破坏性变更、迁移要求或升级风险"],
  "criticalFixes": ["安全修复、崩溃修复或严重 bug 修复"],
  "newFeatures": ["其他较小的新功能、优化或体验改进"],
  "versionCount": 参与分析的 Release 数量,
  "releaseBreakdown": [
    {
      "tag": "Release tag",
      "name": "Release 标题",
      "date": "发布日期",
      "highlights": ["2-3 个极简更新重点"]
    }
  ]
}`;
  }

  return `You are SIU (Should I Upgrade?), a rigorous software upgrade auditor.

Your task is to inspect all GitHub Release Notes after the user's current version through the latest official release, then answer whether the user should upgrade.

Focus on:
1. Security fixes, crash fixes, and severe bug fixes.
2. Core features, new capabilities, and meaningful UX improvements.
3. Breaking changes, migration cost, and rollback risks.
4. Whether each change is relevant to the repository's core purpose.

Do not recommend upgrading merely because a change is labeled as a feature. Use the repository profile to judge whether a change matters to the project's core purpose.
If a new feature is peripheral to the project purpose, lower the recommendation strength.
If a fix affects core workflows, authentication, security, stability, or compatibility, raise the recommendation strength.

All natural-language descriptions must be written in English.

Return only a valid JSON object. Do not output Markdown or surrounding explanation. The JSON shape must be:
{
  "repoName": "GitHub repository name",
  "currentVersion": "User's current version or timeframe",
  "latestVersion": "Latest official release",
  "verdict": "yes" | "no" | "maybe",
  "verdictReason": "One sentence explaining whether the upgrade is worthwhile",
  "coreHighlights": ["3-4 most important new features or core improvements"],
  "breakingChanges": ["Breaking changes, migration requirements, or upgrade risks"],
  "criticalFixes": ["Security fixes, crash fixes, or severe bug fixes"],
  "newFeatures": ["Other smaller features, polish, or optimizations"],
  "versionCount": number of releases analyzed,
  "releaseBreakdown": [
    {
      "tag": "Release tag",
      "name": "Release title",
      "date": "Release date",
      "highlights": ["2-3 short update highlights"]
    }
  ]
}`;
}

export function buildUserPrompt(input: {
  repoFullName: string;
  currentVersionLabel: string;
  latestVersion: string;
  releases: GitHubRelease[];
  cleanedReleases?: CleanedReleaseNotes[];
  repoProfile?: RepoProfile;
  lang: LanguageCode;
}): string {
  const releaseNotesPayload = input.cleanedReleases
    ? buildCleanedReleasePayload(input.cleanedReleases)
    : buildReleaseNotesPayload(input.releases);
  const repoProfilePayload = buildRepoProfilePayload(input.repoProfile);

  if (input.lang === "zh") {
    return `请分析 GitHub 仓库 ${input.repoFullName} 从 ${input.currentVersionLabel} 到最新正式版本 ${input.latestVersion} 之间的正式发布变化。

项目画像如下。请先理解这个项目的核心用途，再判断后续变更是否真的与核心用途相关：

${repoProfilePayload}

重要：下面提供的是从已经筛选好的正式 GitHub Releases 中提取出的有效变更条目。你必须基于这些条目总结，不要编造没有出现在材料中的内容。
如果某条变更与项目核心用途关系较弱，请不要把它当作核心升级理由。

参与分析的 Release 数量：${input.releases.length}

${releaseNotesPayload}`;
  }

  return `Analyze the official release changes for GitHub repository ${input.repoFullName}, from ${input.currentVersionLabel} to latest official release ${input.latestVersion}.

Repository profile. First understand the repository's core purpose, then judge whether each change matters to that purpose:

${repoProfilePayload}

Important: The notes below are meaningful change entries extracted from the selected official GitHub Releases. Base your answer on these entries and do not invent changes that are not present in the provided material.
If a change is peripheral to the repository's core purpose, do not treat it as a core upgrade reason.

Release count: ${input.releases.length}

${releaseNotesPayload}`;
}
