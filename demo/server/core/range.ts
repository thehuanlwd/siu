import type { AnalyzeRequestBody, GitHubRelease, LanguageCode, ReleaseRangeResult } from "./types";

function normalizeVersion(value: string): string {
  return value.trim().replace(/^refs\/tags\//, "").replace(/^v/i, "").toLowerCase();
}

function releaseMatchesVersion(release: GitHubRelease, currentVersion: string): boolean {
  const target = normalizeVersion(currentVersion);
  return normalizeVersion(release.tagName) === target || normalizeVersion(release.name) === target;
}

function parseSemver(value: string): { major: number; minor: number; patch: number } | null {
  const normalized = normalizeVersion(value);
  const match = normalized.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function sameMajorMinorLine(a: string, b: string): boolean {
  const first = parseSemver(a);
  const second = parseSemver(b);
  if (!first || !second) return false;

  return first.major === second.major && first.minor === second.minor;
}

function filterSameReleaseLineIfPossible(releases: GitHubRelease[], currentVersion: string, latestVersion: string): GitHubRelease[] {
  if (!sameMajorMinorLine(currentVersion, latestVersion)) {
    return releases;
  }

  return releases.filter((release) => sameMajorMinorLine(release.tagName, currentVersion));
}

function timeframeCutoff(timeframe: "1w" | "1m" | "3m"): Date {
  const cutoff = new Date();
  if (timeframe === "1w") cutoff.setDate(cutoff.getDate() - 7);
  if (timeframe === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
  if (timeframe === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
  return cutoff;
}

function timeframeLabel(timeframe: "1w" | "1m" | "3m", lang: LanguageCode): string {
  if (lang === "zh") {
    if (timeframe === "1w") return "最近一周";
    if (timeframe === "1m") return "最近一个月";
    return "最近三个月";
  }

  if (timeframe === "1w") return "last week";
  if (timeframe === "1m") return "last month";
  return "last three months";
}

function recentReleaseCount(value?: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(50, Math.max(1, Math.floor(Number(value))));
}

export function officialReleasesOnly(releases: GitHubRelease[]): GitHubRelease[] {
  return releases
    .filter((release) => !release.isDraft && !release.isPrerelease)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function resolveReleaseRange(
  releases: GitHubRelease[],
  request: Pick<AnalyzeRequestBody, "currentVersion" | "timeframe" | "recentReleases" | "lang">
): ReleaseRangeResult {
  const lang = request.lang || "en";
  const officialReleases = officialReleasesOnly(releases);
  const latestVersion = officialReleases[0]?.tagName || "Unknown";
  const requestedRecentCount = recentReleaseCount(request.recentReleases);

  if (requestedRecentCount > 0) {
    const releasesToAnalyze = officialReleases.slice(0, requestedRecentCount);

    if (releasesToAnalyze.length === 0) {
      return {
        status: "up_to_date",
        inputType: "recent",
        inputValue: String(requestedRecentCount),
        currentVersionLabel: latestVersion,
        latestVersion,
        releasesToAnalyze,
        message:
          lang === "zh"
            ? "该项目暂时没有可分析的正式 GitHub Release。"
            : "No official GitHub releases were found for this repository.",
      };
    }

    return {
      status: "ready",
      inputType: "recent",
      inputValue: String(requestedRecentCount),
      currentVersionLabel: releasesToAnalyze[releasesToAnalyze.length - 1].tagName,
      latestVersion,
      releasesToAnalyze,
    };
  }

  if (request.timeframe) {
    const cutoff = timeframeCutoff(request.timeframe);
    const releasesToAnalyze = officialReleases.filter((release) => new Date(release.publishedAt) >= cutoff);
    const label = timeframeLabel(request.timeframe, lang);

    if (releasesToAnalyze.length === 0) {
      return {
        status: "up_to_date",
        inputType: "timeframe",
        inputValue: request.timeframe,
        currentVersionLabel: label,
        latestVersion,
        releasesToAnalyze,
        message:
          lang === "zh"
            ? `在${label}内未发现新的正式版本发布。`
            : `No official releases were found in the ${label}.`,
      };
    }

    return {
      status: "ready",
      inputType: "timeframe",
      inputValue: request.timeframe,
      currentVersionLabel: label,
      latestVersion,
      releasesToAnalyze,
    };
  }

  const currentVersion = request.currentVersion?.trim();
  if (!currentVersion) {
    return {
      status: "requires_version_resolution",
      inputType: "version",
      inputValue: "",
      currentVersionLabel: lang === "zh" ? "未选择版本" : "No version selected",
      latestVersion,
      releasesToAnalyze: [],
      message:
        lang === "zh"
          ? "请选择一个当前版本，或切换到时间跨度分析。"
          : "Please choose a current version, or switch to timeframe analysis.",
    };
  }

  const currentIndex = officialReleases.findIndex((release) => releaseMatchesVersion(release, currentVersion));

  if (currentIndex === 0) {
    return {
      status: "up_to_date",
      inputType: "version",
      inputValue: currentVersion,
      currentVersionLabel: currentVersion,
      latestVersion,
      releasesToAnalyze: [],
      message:
        lang === "zh"
          ? "您当前已处于最新正式版本，无需升级。"
          : "You are already on the latest official release.",
    };
  }

  if (currentIndex === -1) {
    return {
      status: "requires_version_resolution",
      inputType: "version",
      inputValue: currentVersion,
      currentVersionLabel: currentVersion,
      latestVersion,
      releasesToAnalyze: [],
      message:
        lang === "zh"
          ? `没有在该项目的正式 GitHub Releases 中找到版本 ${currentVersion}。请选择列表中的版本，或改用时间跨度分析。`
          : `Version ${currentVersion} was not found in the project's official GitHub Releases. Choose a listed version, or use timeframe analysis.`,
    };
  }

  return {
    status: "ready",
    inputType: "version",
    inputValue: currentVersion,
    currentVersionLabel: currentVersion,
    latestVersion,
    releasesToAnalyze: filterSameReleaseLineIfPossible(officialReleases.slice(0, currentIndex), currentVersion, latestVersion),
  };
}
