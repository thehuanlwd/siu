import { sha256Hex } from "./hash";
import type { GitHubRelease, ParsedRepo, RepoDocumentation, RepoProfile, RuntimeEnv } from "./types";

interface GitHubFetchResult {
  releases?: GitHubRelease[];
  error?: string;
  status?: number;
  rateLimited?: boolean;
}

export async function fetchGitHubReleases(repo: ParsedRepo, env: RuntimeEnv): Promise<GitHubFetchResult> {
  const headers: Record<string, string> = {
    "User-Agent": "SIU-Should-I-Upgrade",
    Accept: "application/vnd.github.v3+json",
  };

  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases?per_page=100`;
  const response = await fetch(url, { headers });

  if (response.status === 403 || response.status === 429) {
    const text = await response.text();
    return {
      rateLimited: true,
      status: response.status,
      error: parseGitHubError(text) || "GitHub API rate limited.",
    };
  }

  if (!response.ok) {
    const text = await response.text();
    return {
      status: response.status,
      error: parseGitHubError(text) || `GitHub API failed with ${response.status}.`,
    };
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return { error: "Unexpected GitHub releases response." };
  }

  const releases = await Promise.all(
    data.map(async (release: any): Promise<GitHubRelease> => {
      const body = String(release.body || "");
      return {
        tagName: String(release.tag_name || ""),
        name: String(release.name || release.tag_name || ""),
        publishedAt: String(release.published_at || release.created_at || ""),
        htmlUrl: String(release.html_url || ""),
        body,
        bodyHash: await sha256Hex(body),
        isPrerelease: Boolean(release.prerelease),
        isDraft: Boolean(release.draft),
      };
    })
  );

  return { releases };
}

function parseGitHubError(text: string): string | null {
  try {
    const json = JSON.parse(text);
    return json.message || null;
  } catch {
    return text || null;
  }
}

export function releasesToTagList(releases: GitHubRelease[]) {
  return releases.map((release) => ({
    name: release.tagName,
    releaseName: release.name,
    publishedAt: release.publishedAt,
  }));
}

export async function fetchRepoProfile(repo: ParsedRepo, env: RuntimeEnv): Promise<RepoProfile> {
  const headers = githubHeaders(env);
  const repoResponse = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, { headers });

  let description = "";
  let topics: string[] = [];
  let primaryLanguage = "";
  let homepage = "";

  if (repoResponse.ok) {
    const data: any = await repoResponse.json();
    description = String(data.description || "");
    topics = Array.isArray(data.topics) ? data.topics.map(String) : [];
    primaryLanguage = String(data.language || "");
    homepage = String(data.homepage || "");
  }

  const readmeExcerpt = await fetchReadmeExcerpt(repo, env);

  return {
    fullName: repo.fullName,
    description,
    topics,
    primaryLanguage,
    homepage,
    readmeExcerpt,
  };
}

export async function fetchRepoDocumentation(repo: ParsedRepo, env: RuntimeEnv, query: string): Promise<RepoDocumentation[]> {
  const candidates = await listDocumentationCandidates(repo, env);
  const ranked = candidates
    .map((item) => ({ ...item, score: scoreDocPath(item.path, query) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const docs: RepoDocumentation[] = [];
  for (const candidate of ranked) {
    const content = await fetchRawPath(repo, candidate.path, env).catch(() => "");
    if (!content.trim()) continue;

    docs.push({
      path: candidate.path,
      title: candidate.path.split("/").pop() || candidate.path,
      content: cleanDocContent(content).slice(0, 2400),
    });
  }

  return docs;
}

function githubHeaders(env: RuntimeEnv): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "SIU-Should-I-Upgrade",
    Accept: "application/vnd.github.v3+json",
  };

  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function listDocumentationCandidates(repo: ParsedRepo, env: RuntimeEnv): Promise<Array<{ path: string }>> {
  const rootItems = await fetchContentList(repo, "", env);
  const docs: Array<{ path: string }> = [];

  for (const item of rootItems) {
    const path = String(item.path || item.name || "");
    const type = String(item.type || "");
    if (!path) continue;

    if (type === "file" && isDocPath(path)) {
      docs.push({ path });
    }

    if (type === "dir" && /^(docs?|documentation)$/i.test(String(item.name || ""))) {
      const docItems = await fetchContentList(repo, path, env).catch(() => []);
      for (const docItem of docItems) {
        const docPath = String(docItem.path || docItem.name || "");
        if (String(docItem.type || "") === "file" && isDocPath(docPath)) {
          docs.push({ path: docPath });
        }
      }
    }
  }

  return docs.slice(0, 18);
}

async function fetchContentList(repo: ParsedRepo, path: string, env: RuntimeEnv): Promise<any[]> {
  const suffix = path ? `/${encodeURIComponent(path).replace(/%2F/g, "/")}` : "";
  const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/contents${suffix}`, {
    headers: githubHeaders(env),
  });

  if (!response.ok) return [];
  const json = await response.json();
  return Array.isArray(json) ? json : [];
}

async function fetchRawPath(repo: ParsedRepo, path: string, env: RuntimeEnv): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    {
      headers: {
        ...githubHeaders(env),
        Accept: "application/vnd.github.raw",
      },
    }
  );

  if (!response.ok) return "";
  return response.text();
}

function isDocPath(path: string): boolean {
  if (!/\.(md|mdx|txt)$/i.test(path)) return false;
  return /(readme|changelog|changes|migration|migrate|upgrade|release|breaking|docs?)/i.test(path);
}

function scoreDocPath(path: string, query: string): number {
  const lowerPath = path.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let score = 0;

  if (/readme/i.test(path)) score += 8;
  if (/(migration|migrate|upgrade|breaking)/i.test(path)) score += 10;
  if (/(changelog|changes|release)/i.test(path)) score += 6;

  for (const token of lowerQuery.split(/[^a-z0-9_@.-]+/).filter((item) => item.length >= 4)) {
    if (lowerPath.includes(token)) score += 5;
  }

  return score;
}

function cleanDocContent(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchReadmeExcerpt(repo: ParsedRepo, env: RuntimeEnv): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/readme`, {
    headers: {
      ...githubHeaders(env),
      Accept: "application/vnd.github.raw",
    },
  });

  if (!response.ok) return "";

  const text = await response.text();
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[[^\]]+]\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}
