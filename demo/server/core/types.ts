export type LanguageCode = "en" | "zh";
export type VerdictType = "yes" | "no" | "maybe";
export type AnalyzeInputType = "version" | "timeframe" | "recent";
export type UpgradePreferenceLevel = "ignore" | "neutral" | "strong";

export interface UpgradePreferences {
  features: UpgradePreferenceLevel;
  ux: UpgradePreferenceLevel;
  bugs: UpgradePreferenceLevel;
}

export interface RuntimeEnv {
  OPENAI_API_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  GITHUB_TOKEN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  PROMPT_VERSION?: string;
  DEBUG_AI_CONTEXT?: string;
}

export interface ParsedRepo {
  owner: string;
  repo: string;
  fullName: string;
}

export interface GitHubRelease {
  tagName: string;
  name: string;
  publishedAt: string;
  htmlUrl: string;
  body: string;
  bodyHash?: string;
  isPrerelease: boolean;
  isDraft: boolean;
}

export interface RepoProfile {
  fullName: string;
  description: string;
  topics: string[];
  primaryLanguage: string;
  homepage?: string;
  readmeExcerpt?: string;
}

export interface RepoDocumentation {
  path: string;
  title: string;
  content: string;
}

export interface CleanedReleaseChange {
  type: string;
  scope?: string;
  summary: string;
}

export interface CleanedReleaseNotes {
  tag: string;
  name: string;
  date: string;
  changes: CleanedReleaseChange[];
}

export interface AnalyzeRequestBody {
  repoUrl: string;
  currentVersion?: string;
  timeframe?: "1w" | "1m" | "3m";
  recentReleases?: number;
  customApiUrl?: string;
  customApiKey?: string;
  customModel?: string;
  lang?: LanguageCode;
  preferences?: Partial<UpgradePreferences>;
}

export type ExplainSection = "coreHighlights" | "criticalFixes" | "breakingChanges" | "newFeatures" | "releaseBreakdown";
export type ExplanationDepth = "release_context" | "docs" | "source_needed";

export interface ExplainRequestBody extends AnalyzeRequestBody {
  repoName?: string;
  section: ExplainSection;
  itemText: string;
  itemIndex?: number;
  releaseTag?: string;
}

export interface ExplanationResult {
  plainMeaning: string;
  affectedUsers: string;
  action: string;
  evidence: string;
  depth: ExplanationDepth;
  needsSourceReview: boolean;
}

export interface ExplainSuccessResponse {
  status: "success";
  explanation: ExplanationResult;
}

export type ExplainResponse = ExplainSuccessResponse;

export interface UpgradeAnalysis {
  repoName: string;
  currentVersion: string;
  latestVersion: string;
  verdict: VerdictType;
  verdictReason: string;
  coreHighlights: string[];
  breakingChanges: string[];
  criticalFixes: string[];
  newFeatures: string[];
  preferences: UpgradePreferences;
  versionCount: number;
  releaseBreakdown: Array<{
    tag: string;
    name: string;
    date: string;
    highlights: string[];
  }>;
}

export interface ReleaseRangeResult {
  status: "ready" | "up_to_date" | "requires_version_resolution";
  inputType: AnalyzeInputType;
  inputValue: string;
  currentVersionLabel: string;
  latestVersion: string;
  releasesToAnalyze: GitHubRelease[];
  message?: string;
}

export interface AnalyzeSuccessResponse {
  status: "success";
  analysis: UpgradeAnalysis;
  cached: boolean;
  staleReleases?: boolean;
}

export interface AnalyzeUpToDateResponse {
  status: "up_to_date";
  repoName: string;
  currentVersion: string;
  latestVersion: string;
  message: string;
}

export interface AnalyzeVersionResolutionResponse {
  status: "requires_version_resolution";
  repoName: string;
  currentVersion: string;
  latestVersion: string;
  message: string;
  availableVersions: Array<{
    name: string;
    releaseName?: string;
    publishedAt?: string;
  }>;
}

export type AnalyzeResponse =
  | AnalyzeSuccessResponse
  | AnalyzeUpToDateResponse
  | AnalyzeVersionResolutionResponse;

export interface ReleaseCacheRead {
  releases: GitHubRelease[];
  hit: boolean;
  stale: boolean;
}

export interface AnalysisCacheRecord {
  cacheKey: string;
  resultJson: UpgradeAnalysis;
}
