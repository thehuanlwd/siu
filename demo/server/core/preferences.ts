import type { UpgradePreferenceLevel, UpgradePreferences } from "./types";

export const DEFAULT_UPGRADE_PREFERENCES: UpgradePreferences = {
  features: "neutral",
  ux: "neutral",
  bugs: "neutral",
};

export function normalizeUpgradePreferences(preferences?: Partial<UpgradePreferences>): UpgradePreferences {
  return {
    features: normalizePreferenceLevel(preferences?.features, DEFAULT_UPGRADE_PREFERENCES.features),
    ux: normalizePreferenceLevel(preferences?.ux, DEFAULT_UPGRADE_PREFERENCES.ux),
    bugs: normalizePreferenceLevel(preferences?.bugs, DEFAULT_UPGRADE_PREFERENCES.bugs),
  };
}

export function buildPreferenceCacheKey(preferences?: Partial<UpgradePreferences>): string {
  const normalized = normalizeUpgradePreferences(preferences);
  return `features:${normalized.features}|ux:${normalized.ux}|bugs:${normalized.bugs}`;
}

export function buildPreferencePromptPayload(preferences?: Partial<UpgradePreferences>, lang: "en" | "zh" = "en"): string {
  const normalized = normalizeUpgradePreferences(preferences);
  const labels =
    lang === "zh"
      ? {
          features: "新功能",
          ux: "体验优化",
          bugs: "BUG修复",
          ignore: "不关注",
          neutral: "随意",
          strong: "强烈关注",
        }
      : {
          features: "New features",
          ux: "UX improvements",
          bugs: "Bug fixes",
          ignore: "Ignore",
          neutral: "Casual",
          strong: "Strong focus",
        };

  return [
    `${labels.features}: ${labels[normalized.features]}`,
    `${labels.ux}: ${labels[normalized.ux]}`,
    `${labels.bugs}: ${labels[normalized.bugs]}`,
  ].join("\n");
}

function normalizePreferenceLevel(value: unknown, fallback: UpgradePreferenceLevel): UpgradePreferenceLevel {
  return value === "ignore" || value === "neutral" || value === "strong" ? value : fallback;
}
