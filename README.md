# SIU

**SIU = Should I Upgrade?**

SIU 是一个面向开源项目用户和开发者的版本升级审计工具。它会对比用户当前版本与 GitHub 最新正式 Release 之间的差异，读取中间所有正式发布记录，并用 AI 汇总核心功能、关键修复、破坏性变更和升级建议，直接回答用户最关心的问题：**我应该升级吗？**

## 为什么需要 SIU

现代开源项目更新很快，很多项目几天就发布一个版本。用户打开软件或依赖列表时，往往发现自己已经落后多个版本，只看最新一条 Release Notes 很难判断：

- 中间到底更新了什么？
- 有没有安全修复或严重 bug 修复？
- 新功能是否真的和项目核心用途相关？
- 升级是否有破坏性风险？
- 这次到底值不值得升级？

SIU 的目标不是简单总结 changelog，而是做一次更接近人工审查的升级判断。

## 核心能力

- 检测 GitHub 项目的最新正式版本。
- 支持按当前版本或最近一周、一个月、三个月分析。
- 读取当前版本之后到最新正式版本之间的所有正式 Releases。
- 自动清洗 Release Notes，去除 commit hash、merge PR、重复标题等噪声。
- 读取项目简介、topics、主要语言和 README 摘要，让 AI 理解项目定位。
- 结合项目核心用途判断更新相关性，避免把无关 feature 当作升级理由。
- 输出升级建议、核心亮点、关键修复、破坏性变更和逐版本摘要。
- 使用 Supabase 跨用户缓存 GitHub Releases 和 AI 分析结果，相同请求可秒回。
- 支持 OpenAI-compatible 模型接口，可使用系统默认模型或开发者自定义模型。
- 前端支持亮色/暗色主题和流式分析状态。

## 当前技术栈

```text
Frontend: React + Vite
Backend: Cloudflare Pages Functions
Cache DB: Supabase Postgres
AI: OpenAI-compatible Chat Completions API
```

项目主体位于：

```text
demo/
```

## 项目结构

```text
demo/
  src/                     前端 UI 与交互
  functions/api/            Cloudflare Pages Functions API
  server/core/              可迁移后端核心逻辑
  supabase/schema.sql       Supabase 表结构
  CLOUDFLARE_PAGES_DEPLOY.md
```

重要文档：

- `AGENTS.md`：AI 编码助手项目规则。
- `demo/CLOUDFLARE_PAGES_DEPLOY.md`：Cloudflare Pages 部署说明。
- `demo/supabase/schema.sql`：Supabase 初始化 SQL。

## 本地开发

安装依赖：

```powershell
cd demo
npm install
```

复制环境变量模板：

```powershell
Copy-Item .env.example .dev.vars
```

填写 `.dev.vars`：

```text
OPENAI_API_URL
OPENAI_API_KEY
OPENAI_MODEL
GITHUB_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
PROMPT_VERSION
DEBUG_AI_CONTEXT
```

构建：

```powershell
npm run build
```

本地运行 Cloudflare Pages Functions：

```powershell
npx wrangler pages dev dist --ip 127.0.0.1 --port 8788
```

访问：

```text
http://127.0.0.1:8788
```

## API

```text
GET  /api/tags?repo=owner/repo
POST /api/analyze
POST /api/analyze/stream
POST /api/models
```

默认前端使用 `/api/analyze/stream`，失败时回退到 `/api/analyze`。

## Supabase

在 Supabase SQL Editor 中执行：

```text
demo/supabase/schema.sql
```

当前使用两张表：

- `github_release_cache`
- `analysis_cache`

## Cloudflare Pages 部署

Pages 项目配置：

```text
Root directory: demo
Build command: npm run build
Build output directory: dist
```

详细步骤见：

```text
demo/CLOUDFLARE_PAGES_DEPLOY.md
```

## 注意事项

不要提交：

- `demo/.env`
- `demo/.dev.vars`
- `demo/.wrangler/`
- `demo/*.log`
- `demo/dist/`
- `demo/node_modules/`
- `.ps_history/`

## License

尚未指定。正式开源前建议补充 `LICENSE`。

