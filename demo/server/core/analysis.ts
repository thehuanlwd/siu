import { callAiJson, resolveAiConfig } from "./ai";
import { readAnalysisCache, readReleaseCache, writeAnalysisCache, writeReleaseCache } from "./cache";
import { fetchGitHubReleases, fetchRepoProfile, releasesToTagList } from "./github";
import { sha256Hex } from "./hash";
import { parseRepo } from "./parseRepo";
import { buildPreferenceCacheKey, normalizeUpgradePreferences } from "./preferences";
import { officialReleasesOnly, resolveReleaseRange } from "./range";
import { cleanReleaseNotes } from "./releaseNotes";
import type {
  AnalyzeRequestBody,
  AnalyzeResponse,
  CleanedReleaseNotes,
  GitHubRelease,
  ParsedRepo,
  RepoProfile,
  ReleaseRangeResult,
  RuntimeEnv,
  UpgradeAnalysis,
} from "./types";

export interface PreparedAnalysis {
  repo: ParsedRepo;
  request: AnalyzeRequestBody;
  releases: GitHubRelease[];
  staleReleases: boolean;
  range: ReleaseRangeResult;
  promptVersion: string;
  releaseHash?: string;
  cacheKey?: string;
  cachedAnalysis?: UpgradeAnalysis;
  repoProfile?: RepoProfile;
  cleanedReleases: CleanedReleaseNotes[];
}

export async function getReleasesForRepo(repo: ParsedRepo, env: RuntimeEnv) {
  const cached = await readReleaseCache(repo.fullName, env);
  if (cached.hit && !cached.stale) {
    return { releases: cached.releases, cached: true, stale: false };
  }

  const fresh = await fetchGitHubReleases(repo, env);
  if (fresh.releases) {
    await writeReleaseCache(repo.fullName, fresh.releases, env);
    return { releases: fresh.releases, cached: false, stale: false };
  }

  if (cached.hit) {
    return { releases: cached.releases, cached: true, stale: true };
  }

  throw new Error(fresh.error || "Failed to fetch GitHub releases.");
}

export async function prepareAnalysis(request: AnalyzeRequestBody, env: RuntimeEnv): Promise<PreparedAnalysis | AnalyzeResponse> {
  const lang = request.lang || "en";
  const repo = parseRepo(request.repoUrl || "");
  if (!repo) {
    throw new Error(lang === "zh" ? "无效的仓库格式，应当为 owner/repo 或 GitHub URL。" : "Invalid repository format.");
  }

  const releaseResult = await getReleasesForRepo(repo, env);
  const officialReleases = officialReleasesOnly(releaseResult.releases);
  const range = resolveReleaseRange(officialReleases, request);
  const latestVersion = range.latestVersion;

  if (range.status === "up_to_date") {
    return {
      status: "up_to_date",
      repoName: repo.fullName,
      currentVersion: range.currentVersionLabel,
      latestVersion,
      message: range.message || (lang === "zh" ? "您当前无需升级。" : "No upgrade is required."),
    };
  }

  if (range.status === "requires_version_resolution") {
    return {
      status: "requires_version_resolution",
      repoName: repo.fullName,
      currentVersion: range.currentVersionLabel,
      latestVersion,
      message: range.message || "",
      availableVersions: releasesToTagList(officialReleases).slice(0, 100),
    };
  }

  const promptVersion = env.PROMPT_VERSION || "prompt_v5";
  const aiConfig = resolveAiConfig(request, env);
  const preferences = normalizeUpgradePreferences(request.preferences);
  const repoProfile = await fetchRepoProfile(repo, env).catch(() => undefined);
  const cleanedReleases = cleanReleaseNotes(range.releasesToAnalyze);
  const releaseHash = await buildReleaseHash(range.releasesToAnalyze);
  const repoProfileHash = repoProfile ? await sha256Hex(JSON.stringify(repoProfile)) : "";
  const cacheKey = await buildAnalysisCacheKey({
    repoFullName: repo.fullName,
    inputType: range.inputType,
    inputValue: range.inputValue,
    latestVersion,
    releaseHash,
    lang,
    promptVersion,
    model: aiConfig.model,
    repoProfileHash,
    preferenceKey: buildPreferenceCacheKey(preferences),
  });

  const cachedAnalysis = await readAnalysisCache(cacheKey, env);

  return {
    repo,
    request: { ...request, lang, preferences },
    releases: releaseResult.releases,
    staleReleases: releaseResult.stale,
    range,
    promptVersion,
    releaseHash,
    cacheKey,
    cachedAnalysis: cachedAnalysis?.resultJson,
    repoProfile,
    cleanedReleases,
  };
}

export async function runAnalysis(request: AnalyzeRequestBody, env: RuntimeEnv): Promise<AnalyzeResponse> {
  const prepared = await prepareAnalysis(request, env);
  if ("status" in prepared) return prepared;

  if (prepared.cachedAnalysis) {
    return {
      status: "success",
      analysis: prepared.cachedAnalysis,
      cached: true,
      staleReleases: prepared.staleReleases,
    };
  }

  const aiConfig = resolveAiConfig(request, env);
  const analysis = await callAiJson({
    request: prepared.request,
    env,
    releases: prepared.range.releasesToAnalyze,
    cleanedReleases: prepared.cleanedReleases,
    repoProfile: prepared.repoProfile,
    repoFullName: prepared.repo.fullName,
    currentVersionLabel: prepared.range.currentVersionLabel,
    latestVersion: prepared.range.latestVersion,
  });

  await writeAnalysisCache(
    {
      cacheKey: prepared.cacheKey || "",
      repoFullName: prepared.repo.fullName,
      inputType: prepared.range.inputType,
      inputValue: prepared.range.inputValue,
      latestVersion: prepared.range.latestVersion,
      releaseCount: prepared.range.releasesToAnalyze.length,
      releaseHash: prepared.releaseHash || "",
      lang: prepared.request.lang || "en",
      promptVersion: prepared.promptVersion,
      provider: aiConfig.provider,
      model: aiConfig.model,
      resultJson: analysis,
    },
    env
  );

  return {
    status: "success",
    analysis,
    cached: false,
    staleReleases: prepared.staleReleases,
  };
}

export async function buildReleaseHash(releases: GitHubRelease[]): Promise<string> {
  return sha256Hex(
    releases
      .map((release) => `${release.tagName}|${release.publishedAt}|${release.bodyHash || ""}`)
      .join("\n")
  );
}

async function buildAnalysisCacheKey(input: {
  repoFullName: string;
  inputType: string;
  inputValue: string;
  latestVersion: string;
  releaseHash: string;
  lang: string;
  promptVersion: string;
  model: string;
  repoProfileHash: string;
  preferenceKey: string;
}): Promise<string> {
  return sha256Hex(
    [
      input.repoFullName,
      input.inputType,
      input.inputValue,
      input.latestVersion,
      input.releaseHash,
      input.lang,
      input.promptVersion,
      input.model,
      input.repoProfileHash,
      input.preferenceKey,
    ].join("|")
  );
}
