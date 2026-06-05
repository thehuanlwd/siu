# SIU AI Agent Integration Guide

> Give this document to Claude Code, Codex, Cursor, or another AI coding agent when you want it to add SIU-style upgrade analysis to a project.

## Goal

Integrate a local version-upgrade audit workflow similar to SIU (Should I Upgrade?) into the current project.

SIU does not currently provide a public hosted API. Do not assume there is an external SIU service to call. Instead, reproduce the workflow inside the user's project:

1. Read the target GitHub repository and the user's current version.
2. Fetch official GitHub Releases.
3. Select the release range from the current version to the latest release.
4. Clean release notes into concise change entries.
5. Send structured context to an LLM.
6. Require a strict JSON response.
7. Render or expose the final upgrade verdict.

## Expected User Inputs

Implement an input shape like this:

```ts
type UpgradePreferenceLevel = "ignore" | "neutral" | "strong";

interface AnalyzeRequestBody {
  repoUrl: string;
  currentVersion?: string;
  timeframe?: "1w" | "1m" | "3m";
  recentReleases?: number;
  lang?: "zh" | "en";
  preferences?: {
    features?: UpgradePreferenceLevel;
    ux?: UpgradePreferenceLevel;
    bugs?: UpgradePreferenceLevel;
  };
}
```

Default preferences should be:

```json
{
  "features": "neutral",
  "ux": "neutral",
  "bugs": "neutral"
}
```

## GitHub Data Collection

Use GitHub's REST API:

```txt
GET https://api.github.com/repos/{owner}/{repo}/releases?per_page=100
```

Recommended headers:

```ts
{
  "User-Agent": "SIU-Should-I-Upgrade",
  "Accept": "application/vnd.github.v3+json",
  "Authorization": "Bearer <GITHUB_TOKEN>" // optional but recommended
}
```

Map each release to:

```ts
interface GitHubRelease {
  tagName: string;
  name: string;
  publishedAt: string;
  htmlUrl: string;
  body: string;
  isPrerelease: boolean;
  isDraft: boolean;
}
```

Filter out `draft` and `prerelease` releases unless the user explicitly asks to include them.

## Release Range

Support at least one of these modes:

- `currentVersion`: analyze releases after this version through the latest version.
- `timeframe`: analyze releases published in the last `1w`, `1m`, or `3m`.
- `recentReleases`: analyze the latest N official releases.

If the current version cannot be matched to a release tag, ask the user to choose from the available tags instead of guessing.

## Cleaning Release Notes

For each release body:

1. Split by line.
2. Trim whitespace.
3. Remove common list prefixes such as `-`, `*`, and `+`.
4. Remove leading commit hashes.
5. Deduplicate repeated lines.
6. Classify obvious conventional-commit style lines:
   - `feat(...)`: feature
   - `fix(...)`: bug fix
   - `docs(...)`: docs
   - `refactor(...)`: refactor
   - `chore(...)`, `build(...)`, `ci(...)`: maintenance
7. Keep a maximum of about 40 meaningful entries per release.

Example cleaned payload:

```ts
interface CleanedReleaseNotes {
  tag: string;
  name: string;
  date: string;
  changes: Array<{
    type: string;
    scope?: string;
    summary: string;
  }>;
}
```

## LLM Prompting

Use the current SIU analysis prompt as the basis:

```txt
docs/analysis-prompt-v5.md
```

When calling the LLM, include:

- Repository full name.
- Current version label.
- Latest version.
- Repository profile if available: description, primary language, topics, homepage, README excerpt.
- User preferences.
- Cleaned release notes.
- Number of releases being analyzed.

Require the model to return only valid JSON. Do not allow Markdown or surrounding explanation.

## Expected JSON Output

The LLM response must match this shape:

```ts
interface UpgradeAnalysis {
  repoName: string;
  currentVersion: string;
  latestVersion: string;
  verdict: "yes" | "no" | "maybe";
  verdictReason: string;
  coreHighlights: string[];
  breakingChanges: string[];
  criticalFixes: string[];
  newFeatures: string[];
  preferences: {
    features: "ignore" | "neutral" | "strong";
    ux: "ignore" | "neutral" | "strong";
    bugs: "ignore" | "neutral" | "strong";
  };
  versionCount: number;
  releaseBreakdown: Array<{
    tag: string;
    name: string;
    date: string;
    highlights: string[];
  }>;
}
```

Example:

```json
{
  "repoName": "owner/repo",
  "currentVersion": "v1.4.0",
  "latestVersion": "v1.8.2",
  "verdict": "maybe",
  "verdictReason": "新版主要是体验优化和普通修复，如果你追求稳定可以先观察。",
  "coreHighlights": [
    "[体验优化] 启动速度和列表渲染更流畅",
    "[新功能] 新增 GitHub OAuth 登录入口"
  ],
  "breakingChanges": [
    "发布者提示配置文件字段 renamed，需要迁移"
  ],
  "criticalFixes": [
    "[BUG] 修复保存失败后状态未回滚的问题"
  ],
  "newFeatures": [
    "[稳定性] 降低网络重试导致的卡顿"
  ],
  "preferences": {
    "features": "neutral",
    "ux": "neutral",
    "bugs": "neutral"
  },
  "versionCount": 12,
  "releaseBreakdown": [
    {
      "tag": "v1.8.2",
      "name": "Patch release",
      "date": "2026-06-01",
      "highlights": ["修复保存异常", "优化加载状态"]
    }
  ]
}
```

## Verdict Rules

Use user preferences when deciding the final verdict:

- `features`: new product capabilities and major workflow additions.
- `ux`: visible usability, performance, stability, and interaction improvements.
- `bugs`: bug fixes, vulnerability fixes, crash fixes, data-loss fixes, privacy fixes.

High-risk security, privacy, data loss, or core-flow availability fixes may override preferences.

Do not exaggerate ordinary bug fixes. A bug fix should become a strong upgrade reason only when at least one is true:

- The publisher marks it as security, critical, urgent, hotfix, high severity, CVE, or strongly recommends upgrading.
- It is reachable through default/common user paths and may cause serious security impact.
- It may cause data loss, data corruption, privacy leaks, sync overwrites, save failures, or sensitive export.
- It affects core flows such as startup, login, payment, saving, sync, build, deployment, primary editing, or primary runtime.

Be conservative with upgrade risks. Only report risks stated by the publisher or obvious major changes such as major version bumps, removed APIs, config format changes, runtime/dependency baseline changes, or plugin protocol changes.

## Implementation Checklist For The AI Agent

When applying this guide to a user's project:

1. Inspect the project stack before coding.
2. Add a small server-side module for GitHub fetching and release cleaning.
3. Add an LLM call that enforces strict JSON output.
4. Validate and normalize the JSON response before rendering.
5. Add focused UI or CLI output based on the host project style.
6. Add tests for release range resolution, note cleaning, and JSON normalization.
7. Do not hard-code SIU's private deployment URL.

Keep the integration small and honest. The goal is to reproduce the SIU analysis workflow, not to depend on a hosted SIU API.
