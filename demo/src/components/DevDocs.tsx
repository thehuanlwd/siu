import React, { useState } from 'react';
import { BookOpen, Check, Clipboard, Code, Cpu, ExternalLink, FileText, Sparkles } from 'lucide-react';

interface DevDocsProps {
  lang?: 'en' | 'zh';
}

export default function DevDocs({ lang = 'en' }: DevDocsProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const origin = window.location.origin;
  const repoDocsBase = `${origin.replace(/\/$/, '')}/docs`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const jsonSnippet = `{
  "repoName": "owner/repo",
  "currentVersion": "v1.4.0",
  "latestVersion": "v1.8.2",
  "verdict": "maybe",
  "verdictReason": "新版主要是体验优化和普通修复，如果你追求稳定可以先观察。",
  "coreHighlights": [
    "[体验优化] 启动速度和列表渲染更流畅",
    "[新功能] 新增 GitHub OAuth 登录入口"
  ],
  "criticalFixes": [
    "[BUG] 修复保存失败后状态未回滚的问题"
  ],
  "breakingChanges": [
    "发布者提示配置文件字段 renamed，需要迁移"
  ],
  "newFeatures": [
    "[稳定性] 降低网络重试导致的卡顿"
  ],
  "preferences": {
    "features": "neutral",
    "ux": "neutral",
    "bugs": "neutral"
  },
  "versionCount": 12,
  "releaseBreakdown": [
    {
      "tag": "v1.8.2",
      "name": "Patch release",
      "date": "2026-06-01",
      "highlights": ["修复保存异常", "优化加载状态"]
    }
  ]
}`;

  const agentPrompt = lang === 'zh'
    ? `请读取并遵循这份 SIU 智能体接入文档：\n${repoDocsBase}/agent-integration.md\n\n目标：在当前项目中复刻 SIU 的 GitHub Release 获取、清洗、大模型 JSON 汇总和报告展示流程。`
    : `Read and follow this SIU agent integration document:\n${repoDocsBase}/agent-integration.md\n\nGoal: reproduce SIU's GitHub release fetching, cleaning, LLM JSON summarization, and report rendering flow in this project.`;

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-1 animate-fade-in text-left">
      <div className="flex items-center space-x-4 pb-4 border-b border-ui-border">
        <div className="p-2.5 rounded-sm bg-btn-primary text-btn-primary-text">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-serif italic font-bold tracking-tight text-charcoal">
            {lang === 'zh' ? '开发者接入方案' : 'Developer Integration Guide'}
          </h2>
          <p className="text-xs uppercase tracking-widest text-charcoal/50 font-bold mt-1">
            {lang === 'zh' ? '当前开放分析流程与智能体接入文档，公共托管 API 尚未开放' : 'Workflow and agent docs are available; public hosted API is not yet open'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 rounded-sm border border-ui-border bg-paper-block shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-charcoal/60 font-mono text-[10px] uppercase tracking-wider mb-4 border-b border-ui-border-light pb-2">
              <Code className="w-3.5 h-3.5" />
              <span className="font-bold">{lang === 'zh' ? '选项 A：自行接入' : 'Option A: Build It Yourself'}</span>
            </div>

            <h3 className="font-serif text-xl font-bold text-charcoal mb-3">
              {lang === 'zh' ? '复刻 SIU 的分析链路' : 'Reproduce the SIU analysis flow'}
            </h3>
            <p className="text-xs text-charcoal/65 mb-5 leading-relaxed">
              {lang === 'zh'
                ? '适合已有后端或 CI 能力的团队。你可以用 GitHub API 获取正式 Releases，清洗 changelog，把结构化上下文发给大模型，再解析固定 JSON 生成报告。'
                : 'For teams with backend or CI capacity. Fetch official GitHub Releases, clean changelogs, send structured context to an LLM, then parse a fixed JSON report.'}
            </p>

            <ol className="list-decimal list-inside space-y-2 text-xs text-charcoal/75 leading-relaxed">
              <li>{lang === 'zh' ? '解析 GitHub 仓库地址和用户当前版本。' : 'Parse the GitHub repository and current version.'}</li>
              <li>{lang === 'zh' ? '调用 GitHub Releases API，过滤 draft 和 prerelease。' : 'Call GitHub Releases API and filter drafts/prereleases.'}</li>
              <li>{lang === 'zh' ? '提取当前版本之后到最新版本之间的发布日志。' : 'Collect releases after the current version through latest.'}</li>
              <li>{lang === 'zh' ? '清洗日志行，保留 feat/fix/docs/chore/note 等有效变更。' : 'Clean notes into feat/fix/docs/chore/note style entries.'}</li>
              <li>{lang === 'zh' ? '发送给大模型，要求只返回固定 JSON。' : 'Send to an LLM and require strict JSON output.'}</li>
            </ol>
          </div>

          <div className="relative mt-6">
            <button
              onClick={() => handleCopy(jsonSnippet, 'json')}
              className="absolute top-3 right-3 p-1.5 rounded-sm bg-btn-primary text-btn-primary-text hover:opacity-90 transition-all shadow-sm"
              title="Copy JSON schema"
            >
              {copiedText === 'json' ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
            </button>
            <pre className="text-[11px] font-mono p-4 rounded-sm bg-paper-aside text-charcoal overflow-x-auto max-h-[300px] border border-ui-border-light leading-relaxed scrollbar">
              <code>{jsonSnippet}</code>
            </pre>
          </div>
        </div>

        <div className="p-8 rounded-sm border border-ui-border bg-paper-block shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-charcoal/60 font-mono text-[10px] uppercase tracking-wider mb-4 border-b border-ui-border-light pb-2">
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-bold">{lang === 'zh' ? '选项 B：AI 智能体自动接入' : 'Option B: Agent-Assisted Integration'}</span>
            </div>

            <h3 className="font-serif text-xl font-bold text-charcoal mb-3">
              {lang === 'zh' ? '把文档链接交给 AI 编码工具' : 'Give the docs link to an AI coding agent'}
            </h3>
            <p className="text-xs text-charcoal/65 mb-5 leading-relaxed">
              {lang === 'zh'
                ? '发布到 GitHub 后，把 agent-integration.md 的直观链接或 Raw 链接丢给 Claude Code、Codex、Cursor 等工具，让它按你的项目技术栈实现接入。'
                : 'After publishing to GitHub, give the agent-integration.md URL or Raw link to Claude Code, Codex, Cursor, or similar tools.'}
            </p>

            <div className="space-y-3 text-xs">
              <a
                href="/docs/agent-integration.md"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-sm border border-ui-border-light bg-paper-aside px-3 py-2.5 text-charcoal hover:bg-charcoal/5 transition"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  {lang === 'zh' ? '智能体接入提示词文档' : 'Agent integration prompt'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-charcoal/45" />
              </a>
              <a
                href="/docs/analysis-prompt-v6.md"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-sm border border-ui-border-light bg-paper-aside px-3 py-2.5 text-charcoal hover:bg-charcoal/5 transition"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  {lang === 'zh' ? '当前汇总分析提示词版本' : 'Current analysis prompt version'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-charcoal/45" />
              </a>
            </div>
          </div>

          <div className="relative mt-6">
            <button
              onClick={() => handleCopy(agentPrompt, 'agent')}
              className="absolute top-3 right-3 p-1.5 rounded-sm bg-btn-primary text-btn-primary-text hover:opacity-90 transition-all shadow-sm"
              title="Copy agent instruction"
            >
              {copiedText === 'agent' ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
            </button>
            <pre className="text-[11px] font-mono p-4 rounded-sm bg-paper-aside text-charcoal overflow-x-auto max-h-[220px] border border-ui-border-light leading-relaxed scrollbar whitespace-pre-wrap">
              <code>{agentPrompt}</code>
            </pre>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-sm bg-paper-aside border-l-4 border-charcoal text-xs text-charcoal flex items-start space-x-3.5">
        <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-charcoal" />
        <p className="leading-relaxed text-left text-charcoal/80">
          <strong>{lang === 'zh' ? '当前状态：' : 'Current status:'}</strong>
          {lang === 'zh'
            ? 'SIU 目前没有开放公共托管 API。上面的接口路径仅代表本项目内部 Pages Functions 结构；外部开发者应优先按文档复刻流程，或让 AI 智能体读取文档后自动接入。'
            : 'SIU does not currently expose a public hosted API. The internal Pages Functions routes are implementation details; external developers should reproduce the workflow from the docs or let an AI agent implement it.'}
        </p>
      </div>
    </div>
  );
}
