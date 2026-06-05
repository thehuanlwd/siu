export interface ReleaseItem {
  tag: string;
  name: string;
  date: string;
  body: string;
}

export interface TagInfo {
  name: string;
  commitSha?: string;
}

export type VerdictType = 'yes' | 'no' | 'maybe';
export type UpgradePreferenceLevel = 'ignore' | 'neutral' | 'strong';

export interface UpgradePreferences {
  features: UpgradePreferenceLevel;
  ux: UpgradePreferenceLevel;
  bugs: UpgradePreferenceLevel;
}

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

export interface HistoryItem {
  id: string;
  repoName: string;
  currentVersion: string;
  latestVersion: string;
  verdict: VerdictType;
  timestamp: string;
  analysis: UpgradeAnalysis;
}
