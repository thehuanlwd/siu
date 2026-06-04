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
