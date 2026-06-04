# SIU 项目初始化说明

## 项目定位

SIU 是 Should I Upgrade? 的缩写。它用于对比用户当前版本与 GitHub 最新正式版本之间的 Release 差异，并用 AI 汇总核心功能、关键修复、破坏性变更和升级建议。

当前版本以 `demo` 为主项目目录，包含：

- React/Vite 前端。
- Cloudflare Pages Functions API。
- Supabase release 与 analysis 缓存。
- OpenAI-compatible 大模型调用。

## 本地目录结构

```text
demo/
  src/                     前端 UI 与交互
  functions/api/            Cloudflare Pages Functions
  server/core/              可迁移后端核心逻辑
  supabase/schema.sql       Supabase 表结构
  CLOUDFLARE_PAGES_DEPLOY.md
```

## 初始化依赖

```powershell
cd demo
npm install
```

## 环境变量

复制并填写：

```powershell
Copy-Item .env.example .dev.vars
```

`.dev.vars` 用于 Wrangler 本地 Pages Functions 测试，不要提交到 Git。

必要变量：

```text
OPENAI_API_URL
OPENAI_API_KEY
OPENAI_MODEL
GITHUB_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
PROMPT_VERSION
```

调试变量：

```text
DEBUG_AI_CONTEXT=true
```

开启后会在 Wrangler 日志中输出完整 AI 请求上下文和模型原始返回。仅限本地调试使用。

## Supabase 初始化

在 Supabase SQL Editor 中执行：

```text
demo/supabase/schema.sql
```

当前使用两张表：

- `github_release_cache`
- `analysis_cache`

## 本地构建

```powershell
cd demo
npm run build
```

## 本地运行 Pages Functions

```powershell
cd demo
npx wrangler pages dev dist --ip 127.0.0.1 --port 8788
```

访问：

```text
http://127.0.0.1:8788
```

## 验证接口

```text
GET  /api/tags?repo=facebook/react
POST /api/analyze
POST /api/analyze/stream
POST /api/models
```

## 初始 Git 版本说明

首次提交只应包含源码、配置模板、SQL schema 和文档。

不要提交：

- `node_modules/`
- `dist/`
- `.env`
- `.dev.vars`
- `.wrangler/`
- `*.log`
- `.ps_history/`

