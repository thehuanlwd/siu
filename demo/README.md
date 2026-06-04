# SIU Demo

这是 SIU 当前的前端和 Cloudflare Pages Functions 服务目录。

主项目说明见根目录：

```text
../README.md
```

本目录包含：

- React/Vite 前端。
- Cloudflare Pages Functions API。
- 可迁移后端核心逻辑。
- Supabase 初始化 SQL。

## 本地运行

```powershell
npm install
npm run build
npx wrangler pages dev dist --ip 127.0.0.1 --port 8788
```

## 部署

详见：

```text
CLOUDFLARE_PAGES_DEPLOY.md
```

