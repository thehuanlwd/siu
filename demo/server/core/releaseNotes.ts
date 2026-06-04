import type { CleanedReleaseChange, CleanedReleaseNotes, GitHubRelease } from "./types";

const CONVENTIONAL_CHANGE_RE = /^(?<type>[a-zA-Z]+)(?:\((?<scope>[^)]+)\))?:\s*(?<summary>.+)$/;
const HASH_PREFIX_RE = /^(?:[a-f0-9]{7,40}\s+)+/i;

export function cleanReleaseNotes(releases: GitHubRelease[]): CleanedReleaseNotes[] {
  return releases.map((release) => ({
    tag: release.tagName,
    name: release.name,
    date: release.publishedAt,
    changes: extractChanges(release.body).slice(0, 40),
  }));
}

function extractChanges(body: string): CleanedReleaseChange[] {
  const seen = new Set<string>();
  const changes: CleanedReleaseChange[] = [];

  for (const rawLine of body.split(/\r?\n/)) {
    const cleaned = normalizeLine(rawLine);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const match = cleaned.match(CONVENTIONAL_CHANGE_RE);
    if (match?.groups?.summary) {
      changes.push({
        type: match.groups.type.toLowerCase(),
        scope: match.groups.scope,
        summary: match.groups.summary.trim(),
      });
    } else {
      const type = inferChangeType(cleaned);
      if (!type) continue;

      changes.push({
        type,
        summary: cleaned,
      });
    }
  }

  return changes;
}

function normalizeLine(line: string): string {
  return line
    .trim()
    .replace(/^[-*+]\s+/, "")
    .replace(HASH_PREFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferChangeType(line: string): string {
  const lower = line.toLowerCase();
  if (!line) return "note";
  if (lower.startsWith("merge pull request") || lower.startsWith("merge branch")) return "";
  if (lower === "changelog" || lower === "## changelog") return "";
  if (/^(fix|fixed|bugfix|bug fix)\b/.test(lower)) return "fix";
  if (/^(feat|feature|added|add)\b/.test(lower)) return "feat";
  if (/^(docs|documentation)\b/.test(lower)) return "docs";
  if (/^(refactor|cleanup)\b/.test(lower)) return "refactor";
  if (/^(chore|build|ci)\b/.test(lower)) return "chore";
  return "note";
}
