import React, { useState } from 'react';
import { Code, Terminal, Clipboard, Check, Sparkles, BookOpen, Cpu } from 'lucide-react';

interface DevDocsProps {
  lang?: 'en' | 'zh';
}

export default function DevDocs({ lang = 'en' }: DevDocsProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const currentAppUrl = window.location.origin;

  const apiSnippet = `// SIU API Endpoint integration
const response = await fetch("${currentAppUrl}/api/analyze", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    repoUrl: "https://github.com/facebook/react", // Or your own project repository
    currentVersion: "18.2.0" // Target version installed in lockfile
  })
});

const result = await response.json();
if (result.status === "success") {
  console.log("Verdict:", result.analysis.verdict);
  console.log("Core Highlights:", result.analysis.coreHighlights);
  console.log("Breaking Changes:", result.analysis.breakingChanges);
}
`;

  const aiPromptMarkdown = lang === 'zh' ? `### AI 编码工具核心指令 (适用于 Cursor / Windsurf / Copilot 等)

我正在开发一个应用，我想在我的代码库中集成自动的“SIU (Should I Upgrade?)”版本差距安全审计过程。
请根据我项目的技术栈执行以下实施步骤：

1. **自动提取本地版本**：
   - 编写一个辅助脚本或 webpack/vite 插件，自动读取我安装的软件依赖或关键开发包的当前版本（例如从 package.json、package-lock.json、yarn.lock 或 Gemfile 中读取）。

2. **连接 SIU 审计接口**：
   - 调用位于以下地址的免费 SIU 分析接口：\`${currentAppUrl}/api/analyze\`
   - 发送目标 GitHub 依赖包地址以及我们刚提取的本地版本作为参数。

3. **显示智能升级气泡或提示**：
   - 如果新版本中存在修复的安全漏洞、严重崩溃闪退，在控制台启动、打包时或在后台仪表显示一段优雅的警告。
   - 利用接口中返回的破坏性变更（breakingChanges）评估是否能一键平滑升级，直接给出对于升级升级的灵魂拷问评估解法。
` : `### AI Coding Tool Core Instruction (Cursor / Windsurf / Copilot)

I am developing an application and I want to integrate the automatic "SIU (Should I Upgrade?)" audit process into my codebase.
Please carry out the following implementation steps based on my project's stack:

1. **Auto-Extract Local Version**:
   - Write a helper script or webpack/vite plugin that reads my installed version of critical dependencies (e.g., from package.json, yarn.lock, or Gemfile).

2. **Connect to SIU Endpoint**:
   - Call the free SIU endpoint at: \`${currentAppUrl}/api/analyze\`
   - Send the target repository URL and the currently extracted local version.

3. **Display Intelligent Notice**:
   - On server startup, development console launch, or in a hidden system dashboard in my UI, show a polished verdict highlighting any critical security vulnerabilities or bug fixes resolved in newer versions.
   - Use the feedback to alert me if there's an exciting feature or a breaking change preventing a painless upgrade.
`;

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-1 animate-fade-in text-left">
      <div className="flex items-center space-x-4 pb-4 border-b border-ui-border">
        <div className="p-2.5 rounded-sm bg-btn-primary text-btn-primary-text">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-serif italic font-bold tracking-tight text-charcoal">
            {lang === 'zh' ? '开发者系统集成入口' : 'Developer Integration Portal'}
          </h2>
          <p className="text-xs uppercase tracking-widest text-charcoal/50 font-bold mt-1">
            {lang === 'zh' ? '集成自动化工作流或利用 REST 接口实现版本飞跃' : 'Implement automation schemas or leverage API connectivity'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Method 1: Connect via free Endpoint API */}
        <div className="p-8 rounded-sm border border-ui-border bg-paper-block shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-charcoal/[0.02] rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center space-x-2 text-charcoal/60 font-mono text-[10px] uppercase tracking-wider mb-4 border-b border-ui-border-light pb-2">
              <Code className="w-3.5 h-3.5" />
              <span className="font-bold">{lang === 'zh' ? '选项 A：REST API 直接对接' : 'Option A: REST API Integration'}</span>
            </div>
            
            <h3 className="font-serif text-xl font-bold text-charcoal mb-3">{lang === 'zh' ? 'POST 请求参数载荷' : 'Post Request Payload'}</h3>
            <p className="text-xs text-charcoal/60 mb-5 leading-relaxed">
              {lang === 'zh' 
                ? '直接从您的 CI/CD 持续集成流水线、监控后台、甚至本地部署命令行中直接请求该接口，快捷审计跨版本差距。'
                : 'Call our unified server module directly from your continuous integration pipelines or monitoring dashboards to programmatically fetch security audits.'}
            </p>
          </div>

          <div className="relative group">
            <button
              onClick={() => handleCopy(apiSnippet, 'api')}
              className="absolute top-3 right-3 p-1.5 rounded-sm bg-btn-primary text-btn-primary-text hover:opacity-90 transition-all shadow-sm"
              title="Copy snippet"
            >
              {copiedText === 'api' ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
            </button>
            <pre className="text-[11px] font-mono p-4 rounded-sm bg-paper-aside text-charcoal overflow-x-auto max-h-[300px] border border-ui-border-light leading-relaxed scrollbar">
              <code>{apiSnippet}</code>
            </pre>
          </div>
        </div>

        {/* Method 2: Feed system prompt directly to AI coder */}
        <div className="p-8 rounded-sm border border-ui-border bg-paper-block shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-charcoal/[0.02] rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center space-x-2 text-charcoal/60 font-mono text-[10px] uppercase tracking-wider mb-4 border-b border-ui-border-light pb-2">
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-bold">{lang === 'zh' ? '选项 B：AI 智能体专属指令' : 'Option B: AI Prompter Script'}</span>
            </div>
            
            <h3 className="font-serif text-xl font-bold text-charcoal mb-3">{lang === 'zh' ? '复制提示词作为外部上下文' : 'Copy-Paste Context Prompt'}</h3>
            <p className="text-xs text-charcoal/60 mb-5 leading-relaxed">
              {lang === 'zh'
                ? '将下方专为 AI IDE 开发框架而设计的指令导入至 Cursor/Windsurf 的 .cursorrules 或聊天框，让 AI 替你自动落地工程检测方案。'
                : 'Inject the blueprint rules below into any AI IDE tool (like Cursor or Windsurf) to let AI dynamically write version extraction scripts for your build tool.'}
            </p>
          </div>

          <div className="relative group">
            <button
              onClick={() => handleCopy(aiPromptMarkdown, 'prompt')}
              className="absolute top-3 right-3 p-1.5 rounded-sm bg-btn-primary text-btn-primary-text hover:opacity-90 transition-all shadow-sm"
              title="Copy prompt instructions"
            >
              {copiedText === 'prompt' ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
            </button>
            <div className="p-4 rounded-sm bg-paper-aside text-charcoal font-serif overflow-y-auto max-h-[300px] border border-ui-border-light leading-relaxed text-xs scrollbar">
              <div className="text-[9px] font-mono font-bold text-charcoal/50 mb-2">{lang === 'zh' ? '// 发给 AI 智能体的约束蓝图：' : '// DIRECTIVE SCHEMA FOR AI:'}</div>
              <p className="font-sans mb-3 text-charcoal font-semibold">{lang === 'zh' ? '在本项目中开发以下自动化套件：' : 'Develop the following feature suite in this project:'}</p>
              {lang === 'zh' ? (
                <ol className="list-decimal text-left list-inside space-y-2 font-sans text-charcoal/80">
                  <li>编写定时或特定周期的读取本地依赖库版本的底层脚本</li>
                  <li>将提取的当前依赖和 GitHub 信息打包并提交至端点：<span className="text-charcoal font-semibold font-mono text-[11px] bg-charcoal/5 px-1">{currentAppUrl}/api/analyze</span></li>
                  <li>如果检测出高危漏洞，提示中断并通知研发团队修复升级</li>
                </ol>
              ) : (
                <ol className="list-decimal text-left list-inside space-y-2 font-sans text-charcoal/80">
                  <li>Write routine scripts reading local library tags</li>
                  <li>Submit lockfile metrics to endpoint: <span className="text-charcoal font-semibold font-mono text-[11px] bg-charcoal/5 px-1">{currentAppUrl}/api/analyze</span></li>
                  <li>Halt development build processes if a critical CVE severity patch is published</li>
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-sm bg-paper-aside border-l-4 border-charcoal text-xs text-charcoal flex items-start space-x-3.5">
        <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-charcoal" />
        <p className="leading-relaxed text-left text-charcoal/80">
          <strong>{lang === 'zh' ? '高级配置与模型匹配：' : 'Recommended Model Schema:'}</strong> {lang === 'zh' 
            ? '如果您选择提供您自己的第三方 OpenAI 代理，建议使用具有强类型 JSON 模式解析的大型语言模型（如 deepseek-chat、gpt-4o 等），以保障在跨越几十个版本时能够无损提取历史的 Release Changelog。'
            : 'If you elect to run custom LLMs in-house, deploy gemini-3.5-flash using the standard responseSchema structure. This guarantees complete schema conformity and seamless UI rendering.'}
        </p>
      </div>
    </div>
  );
}
