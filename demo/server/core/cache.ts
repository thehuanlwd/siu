import type { AnalysisCacheRecord, GitHubRelease, ReleaseCacheRead, RuntimeEnv, UpgradeAnalysis } from "./types";

const RELEASE_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function hasSupabase(env: RuntimeEnv): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(env: RuntimeEnv) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
  };

  if (key.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function supabaseUrl(env: RuntimeEnv, path: string): string {
  const baseUrl = (env.SUPABASE_URL || "").replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
  return `${baseUrl}/rest/v1/${path}`;
}

export async function readReleaseCache(repoFullName: string, env: RuntimeEnv): Promise<ReleaseCacheRead> {
  if (!hasSupabase(env)) {
    console.warn("[SIU Supabase] Release cache disabled: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    return { releases: [], hit: false, stale: false };
  }

  const url = supabaseUrl(
    env,
    `github_release_cache?repo_full_name=eq.${encodeURIComponent(repoFullName)}&select=tag_name,release_name,published_at,html_url,body,body_hash,is_prerelease,is_draft,fetched_at&order=published_at.desc`
  );

  const response = await fetch(url, { headers: supabaseHeaders(env) });
  if (!response.ok) {
    console.warn("[SIU Supabase] Failed to read release cache.", response.status, await response.text());
    return { releases: [], hit: false, stale: false };
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return { releases: [], hit: false, stale: false };
  }

  const newestFetchedAt = rows
    .map((row) => new Date(row.fetched_at).getTime())
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)[0];

  const stale = !newestFetchedAt || Date.now() - newestFetchedAt > RELEASE_CACHE_MAX_AGE_MS;

  return {
    hit: true,
    stale,
    releases: rows.map((row): GitHubRelease => ({
      tagName: row.tag_name,
      name: row.release_name || row.tag_name,
      publishedAt: row.published_at,
      htmlUrl: row.html_url || "",
      body: row.body || "",
      bodyHash: row.body_hash || undefined,
      isPrerelease: Boolean(row.is_prerelease),
      isDraft: Boolean(row.is_draft),
    })),
  };
}

export async function writeReleaseCache(repoFullName: string, releases: GitHubRelease[], env: RuntimeEnv): Promise<void> {
  if (!hasSupabase(env) || releases.length === 0) return;

  const rows = releases.map((release) => ({
    repo_full_name: repoFullName,
    tag_name: release.tagName,
    release_name: release.name,
    published_at: release.publishedAt,
    html_url: release.htmlUrl,
    body: release.body,
    body_hash: release.bodyHash,
    is_prerelease: release.isPrerelease,
    is_draft: release.isDraft,
    fetched_at: new Date().toISOString(),
  }));

  const response = await fetch(supabaseUrl(env, "github_release_cache?on_conflict=repo_full_name,tag_name"), {
    method: "POST",
    headers: {
      ...supabaseHeaders(env),
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    console.warn("[SIU Supabase] Failed to write release cache.", response.status, await response.text());
  }
}

export async function readAnalysisCache(cacheKey: string, env: RuntimeEnv): Promise<AnalysisCacheRecord | null> {
  if (!hasSupabase(env)) return null;

  const response = await fetch(
    supabaseUrl(env, `analysis_cache?cache_key=eq.${encodeURIComponent(cacheKey)}&select=cache_key,result_json&limit=1`),
    { headers: supabaseHeaders(env) }
  );

  if (!response.ok) {
    console.warn("[SIU Supabase] Failed to read analysis cache.", response.status, await response.text());
    return null;
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]?.result_json) return null;

  void incrementAnalysisHitCount(cacheKey, env);

  return {
    cacheKey: rows[0].cache_key,
    resultJson: rows[0].result_json as UpgradeAnalysis,
  };
}

export async function writeAnalysisCache(
  input: {
    cacheKey: string;
    repoFullName: string;
    inputType: string;
    inputValue: string;
    latestVersion: string;
    releaseCount: number;
    releaseHash: string;
    lang: string;
    promptVersion: string;
    provider: string;
    model: string;
    resultJson: UpgradeAnalysis;
  },
  env: RuntimeEnv
): Promise<void> {
  if (!hasSupabase(env)) return;

  const row = {
    cache_key: input.cacheKey,
    repo_full_name: input.repoFullName,
    input_type: input.inputType,
    input_value: input.inputValue,
    latest_version: input.latestVersion,
    release_count: input.releaseCount,
    release_hash: input.releaseHash,
    lang: input.lang,
    prompt_version: input.promptVersion,
    provider: input.provider,
    model: input.model,
    result_json: input.resultJson,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(supabaseUrl(env, "analysis_cache?on_conflict=cache_key"), {
    method: "POST",
    headers: {
      ...supabaseHeaders(env),
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    console.warn("[SIU Supabase] Failed to write analysis cache.", response.status, await response.text());
  }
}

async function incrementAnalysisHitCount(cacheKey: string, env: RuntimeEnv): Promise<void> {
  if (!hasSupabase(env)) return;

  const currentResponse = await fetch(
    supabaseUrl(env, `analysis_cache?cache_key=eq.${encodeURIComponent(cacheKey)}&select=hit_count&limit=1`),
    { headers: supabaseHeaders(env) }
  );

  if (!currentResponse.ok) return;
  const rows = await currentResponse.json();
  const hitCount = Number(rows?.[0]?.hit_count || 0) + 1;

  await fetch(supabaseUrl(env, `analysis_cache?cache_key=eq.${encodeURIComponent(cacheKey)}`), {
    method: "PATCH",
    headers: supabaseHeaders(env),
    body: JSON.stringify({ hit_count: hitCount, updated_at: new Date().toISOString() }),
  });
}
