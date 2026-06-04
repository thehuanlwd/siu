# Cloudflare Pages 部署说明

## Pages 配置

```text
Root directory: demo
Build command: npm run build
Build output directory: dist
```

`functions/api` 会作为 Cloudflare Pages Functions 自动部署。

## 环境变量

在 Cloudflare Pages 项目的环境变量中配置：

```text
OPENAI_API_URL
OPENAI_API_KEY
OPENAI_MODEL
GITHUB_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
PROMPT_VERSION
```

`SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 可选。未配置时不会启用跨用户缓存，但分析接口仍可工作。

`SUPABASE_SERVICE_ROLE_KEY` 只能配置在 Cloudflare Pages Functions 环境变量中，不能暴露给前端。

## Supabase 初始化

在 Supabase SQL Editor 执行：

```text
demo/supabase/schema.sql
```

## API

```text
GET  /api/tags?repo=owner/repo
POST /api/models
POST /api/analyze
POST /api/analyze/stream
```

前端默认使用 `/api/analyze/stream`，失败时回退到 `/api/analyze`。

