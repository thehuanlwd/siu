import { sha256Hex } from "./hash";
import type { GitHubRelease, ParsedRepo, RepoProfile, RuntimeEnv } from "./types";

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
