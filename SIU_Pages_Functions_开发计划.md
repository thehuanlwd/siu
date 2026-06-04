# SIU Cloudflare Pages Functions 开发计划

## 目标

基于当前 `demo`，构建一个可以部署到 Cloudflare Pages Functions 的正式服务，同时尽可能保留现有前端 UI、亮色/暗色主题、动画、弹窗和结果页设计。

后端逻辑不完全照搬 demo。正式逻辑必须基于用户选择的版本，到 GitHub 最新正式 Release 之间的全部版本进行汇总分析。

## 非目标

- 暂不引入独立 Cloudflare Worker。
- 暂不引入 Cloudflare Queue。
- 暂不做用户账号、计费、API key 管理。
- 暂不处理并发相同请求的协同等待。
- 暂不重构整个 `App.tsx` UI 结构。

## 目标架构

```text
Cloudflare Pages
  - demo/dist 静态前端
  - demo/functions/api Pages Functions

Supabase
  - 跨用户 GitHub Release 缓存
  - 跨用户 AI 分析结果缓存

AI Provider
  - 系统默认 OpenAI-compatible API
  - 用户可选自定义 OpenAI-compatible API
```

## 项目结构

```text
demo/
  functions/
    api/
      tags.ts
      models.ts
      analyze.ts
      analyze/
        stream.ts
  server/
    core/
      ai.ts
      analysis.ts
      cache.ts
      github.ts
      hash.ts
      parseRepo.ts
      prompt.ts
      range.ts
      types.ts
  supabase/
    schema.sql
```

`functions/api` 只做请求/响应适配。核心业务逻辑放在 `server/core`，方便以后迁移到 Express、Fastify 或自建服务器。

## 正式版本范围规则

版本模式：

1. 优先读取 GitHub Releases。
2. 排除 draft。
3. 默认排除 prerelease。
4. 按 `published_at` 从新到旧排序。
5. 找到用户选择的当前版本。
6. 分析当前版本之后，到最新版本为止的全部正式 Releases。
7. 如果当前版本已是最新，返回 `up_to_date`。
8. 如果找不到当前版本，返回 `requires_version_resolution`，不再猜测分析前 10 或前 15 个版本。

时间模式：

1. 按用户选择的 `1w`、`1m`、`3m` 计算 cutoff。
2. 分析 `published_at >= cutoff` 的全部正式 Releases。
3. 如果范围为空，返回 `up_to_date`。

## API 设计

```text
GET  /api/tags?repo=owner/repo
POST /api/models
POST /api/analyze
POST /api/analyze/stream
```

`/api/analyze` 返回完整 JSON，用作兜底。

`/api/analyze/stream` 使用 NDJSON 流式返回：

```json
{"type":"status","message":"正在读取 GitHub Releases"}
{"type":"status","message":"已发现 8 个待分析正式版本"}
{"type":"delta","text":"..."}
{"type":"done","analysis":{},"cached":false}
```

## Supabase 缓存

Release 缓存：

- 表：`github_release_cache`
- 缓存 GitHub Release body、发布时间、链接和 hash。
- 6 小时内优先使用缓存。
- GitHub 限流时，如果存在旧缓存，则用旧缓存继续分析。

分析结果缓存：

- 表：`analysis_cache`
- 同一个仓库、输入版本/时间、最新版本、release hash、语言、prompt 版本、模型命中时直接秒回。

## 前端迁移策略

第一轮不大拆 `App.tsx`：

- 保留现有 JSX、主题、动画、历史抽屉、开发者弹窗、设置弹窗。
- 只改 `triggerAnalysis`。
- 默认调用 `/api/analyze/stream`。
- 流式失败时 fallback 到 `/api/analyze`。
- 完成后继续使用现有 `analysisResult` 渲染。

## 实施顺序

1. 编写本开发计划文档。
2. 新增 Supabase SQL schema。
3. 抽出核心模块：仓库解析、GitHub Release 获取、版本范围计算、hash、prompt、AI 调用、缓存。
4. 新增 Pages Functions：`tags`、`models`、`analyze`、`analyze/stream`。
5. 修正分析范围逻辑。
6. 前端 `triggerAnalysis` 接入流式接口。
7. 构建验证。

