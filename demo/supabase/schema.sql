create table if not exists public.github_release_cache (
  id bigserial primary key,
  repo_full_name text not null,
  tag_name text not null,
  release_name text,
  published_at timestamptz,
  html_url text,
  body text,
  body_hash text,
  is_prerelease boolean not null default false,
  is_draft boolean not null default false,
  fetched_at timestamptz not null default now(),
  unique (repo_full_name, tag_name)
);

create index if not exists github_release_cache_repo_published_idx
  on public.github_release_cache (repo_full_name, published_at desc);

create table if not exists public.analysis_cache (
  cache_key text primary key,
  repo_full_name text not null,
  input_type text not null,
  input_value text not null,
  latest_version text not null,
  release_count integer not null default 0,
  release_hash text not null,
  lang text not null,
  prompt_version text not null,
  provider text not null,
  model text not null,
  result_json jsonb not null,
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analysis_cache_repo_updated_idx
  on public.analysis_cache (repo_full_name, updated_at desc);

