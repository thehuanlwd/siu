import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = reportAppStartup();
const PORT = 3000;

function reportAppStartup() {
  const expressApp = express();
  expressApp.use(express.json());
  return expressApp;
}

// Dynamically construct OpenAI instance based on server env or client custom parameters
function getOpenAIClient(reqApiUrl?: string, reqApiKey?: string) {
  let apiUrl = (reqApiUrl || process.env.OPENAI_API_URL || "https://api.deepseek.com").trim().replace(/^["']|["']$/g, "");
  const apiKey = (reqApiKey || process.env.OPENAI_API_KEY || "").trim().replace(/^["']|["']$/g, "");

  // If URL lacks /v1 subpath, append /v1 for better OpenAI compatibility
  if (!apiUrl.endsWith("/v1") && !apiUrl.includes("/v1/")) {
    const tempUrl = apiUrl.replace(/\/+$/, "");
    if (!tempUrl.endsWith("/v1")) {
      apiUrl = `${tempUrl}/v1`;
    }
  }

  return new OpenAI({
    baseURL: apiUrl,
    apiKey: apiKey,
  });
}

// Helper: Parse GitHub URL to owner and repo name
function parseRepo(input: string): { owner: string; repo: string } | null {
  const cleanInput = input.trim();
  // Match "https://github.com/owner/repo" or "owner/repo" or "github.com/owner/repo"
  const match = cleanInput.match(/(?:https?:\/\/)?(?:github\.com\/)?([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)/);
  if (match) {
    const owner = match[1];
    let repo = match[2];
    // Remove trailing slashes or subpaths
    repo = repo.split('/')[0].replace(/\.git$/, '');
    return { owner, repo };
  }
  return null;
}

// Fetch helper with User-Agent required by GitHub API
async function githubFetch(url: string, res: express.Response) {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'SIU-ShouldIUpgrade-Applet',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      console.log("[GitHub API] 使用环境变量中配置的 GITHUB_TOKEN 进行身份验证授权。");
    }

    console.log(`[GitHub API Request] 开始请求 URL: ${url}`);
    const response = await fetch(url, { headers });
    
    // 读取并打印 GitHub 限流 Headers 信息
    const limit = response.headers.get('x-ratelimit-limit');
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    const resetTime = reset ? new Date(parseInt(reset) * 1000).toLocaleString() : 'N/A';
    
    console.log(`[GitHub API Response] 状态码: ${response.status} | 额度限制: ${limit} | 剩余额度: ${remaining} | 重置时间: ${resetTime}`);
    
    if (response.status === 403 || response.status === 429) {
      const bodyText = await response.text();
      console.warn(`[GitHub API Rate Limited] 请求触发限流或禁止访问: ${url} | 状态码: ${response.status} | 详情: ${bodyText}`);
      try {
        const errorJson = JSON.parse(bodyText);
        return { rateLimited: true, status: response.status, message: errorJson.message || bodyText };
      } catch {
        return { rateLimited: true, status: response.status, message: bodyText };
      }
    }
    
    if (!response.ok) {
      const bodyText = await response.text();
      console.error(`[GitHub API Error] 请求响应失败: ${url} | 状态码: ${response.status} ${response.statusText} | 详情: ${bodyText}`);
      try {
        const errorJson = JSON.parse(bodyText);
        return { error: errorJson.message || `GitHub API error: ${response.statusText}`, status: response.status };
      } catch {
        return { error: `GitHub API error: ${response.statusText} (${bodyText})`, status: response.status };
      }
    }
    
    const data = await response.json();
    return { data };
  } catch (err: any) {
    console.error(`[GitHub API Exception] 网络请求出现异常: ${url}`, err);
    return { error: err.message || "Failed to fetch from GitHub" };
  }
}

// Endpoint 1: Fetch tags/versions of a GitHub repository
app.get("/api/tags", async (req, res) => {
  const repoQuery = req.query.repo as string;
  if (!repoQuery) {
    return res.status(400).json({ error: "Missing 'repo' parameter" });
  }

  const parsed = parseRepo(repoQuery);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid repository format. Use 'owner/repo' or GitHub URL." });
  }

  const { owner, repo } = parsed;
  console.log(`Getting tags for ${owner}/${repo}`);

  // Fetch Releases first (releases contain structured names/bodies)
  const releasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=30`;
  const releasesResult = await githubFetch(releasesUrl, res);

  if ('rateLimited' in releasesResult && releasesResult.rateLimited) {
    const detailMsg = (releasesResult as any).message || '';
    return res.status(429).json({
      error: `GitHub API Rate Limited. Details: ${detailMsg} Please wait or proceed by entering your version manually, and AI will analyze via search reasoning.`
    });
  }

  if ('error' in releasesResult && releasesResult.error) {
    // Try tags as a fallback
    const tagsUrl = `https://api.github.com/repos/${owner}/${repo}/tags?per_page=30`;
    const tagsResult = await githubFetch(tagsUrl, res);
    
    if ('data' in tagsResult && tagsResult.data) {
      const tags = (tagsResult.data as any[]).map(t => ({ name: t.name }));
      return res.json({ tags, source: 'tags' });
    }
    
    const fallbackError = ('error' in tagsResult && tagsResult.error) ? tagsResult.error : '';
    const rateLimitError = ('rateLimited' in tagsResult && tagsResult.rateLimited) ? 'Rate Limited' : '';
    const detail = fallbackError || rateLimitError || releasesResult.error;
    
    return res.status(404).json({ error: `Repository '${owner}/${repo}' not found or inaccessible. Details: ${detail}` });
  }

  if ('data' in releasesResult && Array.isArray(releasesResult.data)) {
    if (releasesResult.data.length > 0) {
      const tags = releasesResult.data.map((r: any) => ({
        name: r.tag_name,
        releaseName: r.name,
        publishedAt: r.published_at
      }));
      return res.json({ tags, source: 'releases' });
    } else {
      // Releases array is empty, fetch tags instead
      const tagsUrl = `https://api.github.com/repos/${owner}/${repo}/tags?per_page=30`;
      const tagsResult = await githubFetch(tagsUrl, res);
      
      if ('data' in tagsResult && Array.isArray(tagsResult.data)) {
         const tags = tagsResult.data.map((t: any) => ({ name: t.name }));
        return res.json({ tags, source: 'tags' });
      }
      return res.json({ tags: [], source: 'none' });
    }
  }

  return res.status(500).json({ error: "Unexpected response from GitHub fetcher" });
});

// Endpoint 2: Complete analytical check (vetted with OpenAI client integration)
app.post("/api/analyze", async (req, res) => {
  const { 
    repoUrl, 
    currentVersion, 
    timeframe, 
    customApiUrl, 
    customApiKey, 
    customModel,
    lang
  } = req.body;

  const isChinese = lang === "zh";

  if (!repoUrl) {
    return res.status(400).json({ error: isChinese ? "请提供有效的仓库地址或名称" : "No repository url/name provided" });
  }

  const parsed = parseRepo(repoUrl);
  if (!parsed) {
    return res.status(400).json({ error: isChinese ? "无效的仓库格式，应当为 'owner/repo' 或 GitHub 完整链接。" : "Invalid repository format." });
  }

  const { owner, repo } = parsed;
  const targetRepo = `${owner}/${repo}`;
  console.log(`Analyzing repo: ${targetRepo}, current: ${currentVersion || 'None'}, timeframe: ${timeframe || 'None'}, lang: ${lang}`);

  // 1. Fetch releases
  const releasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=40`;
  const releasesResult = await githubFetch(releasesUrl, res);

  let releasesToAnalyze: any[] = [];
  let isViaSearch = false;
  let latestDetectedVersion = "Unknown";

  if (
    ('rateLimited' in releasesResult && releasesResult.rateLimited) || 
    ('error' in releasesResult && releasesResult.error) ||
    ('data' in releasesResult && (!Array.isArray(releasesResult.data) || releasesResult.data.length === 0))
  ) {
    console.log("GitHub API failed or was rate-limited. Falling back to AI model direct knowledge context.");
    isViaSearch = true;
  } else if ('data' in releasesResult && Array.isArray(releasesResult.data)) {
    const allReleases = releasesResult.data;
    if (allReleases.length > 0) {
      latestDetectedVersion = allReleases[0].tag_name;
    }

    if (currentVersion) {
      // User entered a version. Filter releases that are physically newer than this version
      const index = allReleases.findIndex((r: any) => r.tag_name === currentVersion || r.name === currentVersion);
      if (index === -1) {
        // If currentVersion is not found, assume all visible releases are newer
        releasesToAnalyze = allReleases.slice(0, 15);
      } else if (index === 0) {
        // Already on the latest version!
        return res.json({
          status: "up_to_date",
          repoName: targetRepo,
          currentVersion,
          latestVersion: latestDetectedVersion,
          message: isChinese 
            ? "您当前已处于最新的版本！无需进行任何升级。" 
            : "You are already on the absolute latest version! No updates are required."
        });
      } else {
        // Take releases starting from latest down to the current version index
        releasesToAnalyze = allReleases.slice(0, index);
      }
    } else if (timeframe) {
      // Filter based on selected timeframe
      const cutoff = new Date();
      if (timeframe === "1w") cutoff.setDate(cutoff.getDate() - 7);
      else if (timeframe === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
      else if (timeframe === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
      else cutoff.setMonth(cutoff.getMonth() - 1); // default to 1 month

      releasesToAnalyze = allReleases.filter((r: any) => {
        const pubDate = new Date(r.published_at);
        return pubDate >= cutoff;
      });

      if (releasesToAnalyze.length === 0) {
        const timeframeStr = timeframe === "1w" ? (isChinese ? "1周" : "week") : timeframe === "1m" ? (isChinese ? "1个月" : "month") : (isChinese ? "3个月" : "3 months");
        return res.json({
          status: "up_to_date",
          repoName: targetRepo,
          currentVersion: isChinese ? "近期版本" : "Recent",
          latestVersion: latestDetectedVersion,
          message: isChinese
            ? `在请求的时间跨度（过去 ${timeframeStr}）内未发现新的版本发布。您当前已是最新状态！`
            : `No new releases found in the requested timeframe (last ${timeframeStr}). You are up to date!`
        });
      }
    } else {
      // Default: analyze the top 10 latest releases
      releasesToAnalyze = allReleases.slice(0, 10);
    }
  }

  if (releasesToAnalyze.length === 0 && !isViaSearch) {
    isViaSearch = true;
  }

  // Compose prompt inputs
  let releaseNotesPayload = "";
  if (!isViaSearch) {
    releaseNotesPayload = releasesToAnalyze.map((r: any) => {
      const body = (r.body || "").slice(0, 2500);
      return `### Version: ${r.tag_name} | Name: ${r.name || r.tag_name} | Date: ${r.published_at}\n${body}\n---\n`;
    }).join("\n");
  }

  // Choose Prompt
  const promptZh = isViaSearch 
    ? `分析 GitHub 仓库 '${targetRepo}'。用户想知道他们是否应该从版本 '${currentVersion || (timeframe ? "大约 " + timeframe + " 之前" : "旧版本")}' 升级到最新发布版本。
       请提供：
       1. ${targetRepo} 的最新发布版本是什么？
       2. 自 '${currentVersion || "那一时期"}' 以来，添加了哪些重大功能、安全修复（例如 CVE 补丁）以及破坏性变更？
       3. 给出综合的“我应该升级吗？”推荐，并按照指定的 JSON 结构回答。`
    : `你是一个专业的软件发布版本审查和审计官。请对比 '${targetRepo}' 项目从版本 '${currentVersion || "旧版本"}' 到最新版本的更新。
       分析以下实际的发布说明（Release Notes）：
       
       ${releaseNotesPayload}
       
       判断用户是否应该升级，重点关注：
       1. 解决的 Bug/崩溃修复和安全漏洞（Critical fixes）。
       2. 令人兴奋、高呼声的新功能（Core highlights）。
       3. 风险指数：破坏性变更、废弃 API、编译问题（Breaking Changes）。
       
       按照指定的 JSON 结构回答以解释你的决策。`;

  const promptEn = isViaSearch 
    ? `Analyze the GitHub repository '${targetRepo}'. The user wants to know if they should upgrade from version '${currentVersion || "a version from " + (timeframe || "1 month ago")}' to the latest release.
       Please provide:
       1. What is the latest release version of ${targetRepo}?
       2. What major features, security fixes (such as CVEs), and breaking changes have been added since ${currentVersion || "that period"}?
       3. Create a comprehensive 'Should I Upgrade?' recommendation. Answer with the structured JSON schema specified.`
    : `You are a professional software release reviewer and auditor. Compare the updates from version '${currentVersion || 'the past'}' to the latest version of library/software '${targetRepo}'.
       Analyze the following actual releases and release notes:
       
       ${releaseNotesPayload}
       
       Determine if the user should upgrade. Focus on:
       1. Bug/Crash fixes and security vulnerabilities solved (Critical fixes).
       2. Exciting, highly-requested features (Core highlights).
       3. Risk index: breaking changes, deprecated APIs, compile-time problems (Breaking Changes).
       
       Answer with the structured JSON schema specified to explain your decision.`;

  const prompt = isChinese ? promptZh : promptEn;

  try {
    const openai = getOpenAIClient(customApiUrl, customApiKey);
    const selectedModel = (customModel || process.env.OPENAI_MODEL || "deepseek-v4-flash").trim().replace(/^["']|["']$/g, "");

    console.log(`Sending ChatCompletion request to OpenAI at Model: ${selectedModel}`);

    const systemPromptZh = `你是一个名为 SIU (Should I Upgrade?) 的精英 AI 软件版本审计官。你的目标是审查用户的当前版本与项目的最新版本之间的差距，撰写精辟的更新摘要，列出核心亮点、关键漏洞修复、潜在破坏性风险，并就他们是否应该升级给出明确的审查结论（'yes'、'no' 或 'maybe'）。

保持解释的简洁性、技术化、以人为本，并且结构优雅。

重要：所有的自然语言描述字段（包括 verdictReason、coreHighlights、breakingChanges、criticalFixes、newFeatures、releaseBreakdown.highlights）必须使用简体中文（Simplified Chinese）撰写。不要翻译或更改 JSON 的键名、版本号或特定技术名词。

你必须仅仅以一个干净且合法的 JSON 对象形式返回，格式如下：
{
  "repoName": "所分析的 GitHub 仓库名称 (string)",
  "currentVersion": "用户当前的版本或分析的时间跨度 (string)",
  "latestVersion": "发现的最新可用版本 (string)",
  "verdict": "yes" | "no" | "maybe",
  "verdictReason": "一句话精炼概括此审查结论的核心原因 (string)",
  "coreHighlights": ["3-4 个重大的、改变游戏规则的改进/功能 (array of strings)"],
  "breakingChanges": ["破坏性变更、迁移要求或已知回退风险列表 (array of strings)"],
  "criticalFixes": ["崩溃修复、安全补丁或解决的重大 Bug (array of strings)"],
  "newFeatures": ["其他次要功能、抛光或微小的性能微调 (array of strings)"],
  "versionCount": 分析的版本跨度中包含的 Release 总数 (number),
  "releaseBreakdown": [
    {
      "tag": "Release 标签名，例如 v2.3.1 (string)",
      "name": "Release 标题 (string)",
      "date": "大致的发布日期 (string)",
      "highlights": ["2-3 个极简的更新重点要点 (array of strings)"]
    }
  ]
}`;

    const systemPromptEn = `You are SIU (Should I Upgrade?), an elite AI software version auditor. Your goal is to inspect the gaps between a user's current version and the latest version of a project, write an insightful change summary, list highlights, security fixes, breaking risks, and deliver a definitive verdict ('yes', 'no', or 'maybe') on whether they should upgrade.
          
          Keep explanations concise, technical, human-centric, and structured in pristine style.
          
          Write all descriptions in English.
          
          You must respond ONLY with a valid, clean JSON object matching this structure:
          {
            "repoName": "The name of the GitHub repository analyzed (string)",
            "currentVersion": "The user's current version or timeframe analyzed (string)",
            "latestVersion": "The latest available version found (string)",
            "verdict": "yes" | "no" | "maybe",
            "verdictReason": "A summary sentence explaining the core reason for this verdict (string)",
            "coreHighlights": ["Top 3-4 major, game-changing improvements/features (array of strings)"],
            "breakingChanges": ["List of breaking changes, migration requirements, or known regressions (array of strings)"],
            "criticalFixes": ["Crash fixes, security patches or major bugs resolved (array of strings)"],
            "newFeatures": ["Other secondary features, polish, or minor performance tweaks (array of strings)"],
            "versionCount": total number of releases in analyzed gap (number),
            "releaseBreakdown": [
              {
                "tag": "release tag name e.g. v2.3.1 (string)",
                "name": "release title (string)",
                "date": "approximated release date (string)",
                "highlights": ["2-3 short bullet points of updates (array of strings)"]
              }
            ]
          }`;

    const systemPrompt = isChinese ? systemPromptZh : systemPromptEn;

    const chatCompletion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const responseText = chatCompletion.choices[0].message.content || "{}";
    const parsedJson = JSON.parse(responseText);
    
    if (!parsedJson.repoName) parsedJson.repoName = targetRepo;
    if (!parsedJson.currentVersion) parsedJson.currentVersion = currentVersion || "Older";
    if (parsedJson.latestVersion === "Unknown" && latestDetectedVersion !== "Unknown") {
      parsedJson.latestVersion = latestDetectedVersion;
    }

    return res.json({
      status: "success",
      analysis: parsedJson
    });

  } catch (err: any) {
    console.error("OpenAI Endpoint Analysis Failed:", err);
    let errorMessage = err.message || JSON.stringify(err);
    if (err.status === 401 || errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("Unauthenticated") || errorMessage.includes("API key")) {
      errorMessage = "API 密钥或接口地址验证失败。当前配置的 API 密钥无效或接口地址无法正常访问。请点击右上角设置图标，检查并配置正确的自定义接口与密钥！";
    }
    return res.status(500).json({ error: errorMessage });
  }
});

// Endpoint 3: Fetch available models from custom API endpoint for list selections
app.post("/api/models", async (req, res) => {
  const { customApiUrl, customApiKey } = req.body;

  try {
    const openai = getOpenAIClient(customApiUrl, customApiKey);
    const modelsList = await openai.models.list();
    const modelIds = modelsList.data.map(m => m.id);
    return res.json({ models: modelIds });
  } catch (err: any) {
    console.error("Failed to fetch custom models:", err);
    return res.status(500).json({ 
      error: `获取模型列表失败: ${err.message || err}。请确保您的 API 接口地址支持 GET /v1/models (或 /models) 格式，且密钥有效。`
    });
  }
});


// Configure Vite middleware or production serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SIU Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((error) => {
  console.error("Failed to start server:", error);
});
