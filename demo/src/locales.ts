export interface TranslationSchema {
  ledger: string;
  developers: string;
  settings: string;
  shouldIUpgrade: string;
  enterRepoPlaceholder: string;
  analyze: string;
  specificVersion: string;
  relativeTimeframe: string;
  installedLabel: string;
  autoList: string;
  customLabel: string;
  loadingTags: string;
  noTagsFound: string;
  ageCheckedLabel: string;
  quickAuditSub: string;
  switchToSpecificTag: string;
  switchToTimeWindow: string;
  stateBeingLogged: string;
  latestDisplacement: string;
  verdictSealLabel: string;
  auditSuspended: string;
  reRunEngine: string;
  returnHome: string;
  statusAnalysisComplete: string;
  stateInstalled: string;
  gitLatestRelease: string;
  verdictSelection: string;
  consolidatingText: string;
  repositoryTarget: string;
  installedStatus: string;
  registryLatest: string;
  coreHighlightsLabel: string;
  noHighlightsText: string;
  criticalFixesLabel: string;
  noCriticalFixesText: string;
  breakingChangesLabel: string;
  noBreakingChangesText: string;
  logChronologies: string;
  highlightTelemetries: string;
  noLocalizedNotes: string;
  integrationSchema: string;
  clearLedger: string;
  noHistoryRecords: string;
  enterRepoToGenerate: string;
  clearHistoryConfirm: string;
  apiSettingsTitle: string;
  apiSettingsTip: string;
  apiUrlLabel: string;
  apiUrlPlaceholder: string;
  apiKeyLabel: string;
  apiKeyHasValue: string;
  apiKeyInlinePlaceholder: string;
  modelLabel: string;
  getOnlineModels: string;
  fetchingList: string;
  onlineModelsClick: string;
  resetDefaultConfig: string;
  saveAndClose: string;
  persistenceNote: string;
  devPortalTitle: string;
  devPortalSubtitle: string;
  optionATitle: string;
  optionASubtitle: string;
  optionASummary: string;
  optionBTitle: string;
  optionBSubtitle: string;
  optionBSummary: string;
  directiveSchemaTitle: string;
  directiveIntroduce: string;
  directiveStep1: string;
  directiveStep2: string;
  directiveStep3: string;
  recommendedModelTitle: string;
  recommendedModelBody: string;
  closeBtn: string;
  apiSettings: string;
  settingsTooltip: string;
  apiBaseUrl: string;
  apiBaseUrlPlaceholder: string;
  apiKey: string;
  apiKeySet: string;
  apiKeyPlaceholder: string;
  modelName: string;
  modelPlaceholder: string;
  fetchingModels: string;
  fetchModelList: string;
  onlineModelsTitle: string;
  resetSettings: string;
  clientPersistenceLabel: string;
  auditLedger: string;
  securePersistenceActive: string;
  projectIntegrationSchema: string;
  coreEnhancements: string;
  noSignificantModifications: string;
  criticalResolutions: string;
  noSevereSecurity: string;
  breakingChangesTitle: string;
  painlessMigration: string;
  codeMetricsTitle: string;
  codeMetricsLoading: string;
  codeMetricsError: string;
  totalLines: string;
  totalFiles: string;
  commentRatio: string;
  blankRatio: string;
  retryBtn: string;
  detailedMetrics: string;
  hideMetrics: string;
}

export const translations: Record<'en' | 'zh', TranslationSchema> = {
  en: {
    ledger: "LEDGER",
    developers: "DEVELOPERS",
    settings: "SETTINGS",
    shouldIUpgrade: "Should I Upgrade?",
    enterRepoPlaceholder: "Enter GitHub repository URL, analyze instantly",
    analyze: "Analyze",
    specificVersion: "Specific Version",
    relativeTimeframe: "Relative Timeframe",
    installedLabel: "Select Version:",
    autoList: "Auto List",
    customLabel: "Custom",
    loadingTags: "Loading tags...",
    noTagsFound: "No tags found",
    ageCheckedLabel: "Age Checked:",
    quickAuditSub: "Or quickly audit one of these popular packages",
    switchToSpecificTag: "Switch to Specific Tag",
    switchToTimeWindow: "Switch to Time Window",
    stateBeingLogged: "STATE BEING LOGGED:",
    latestDisplacement: "LATEST DISPLACEMENT",
    verdictSealLabel: "VERDICT",
    auditSuspended: "Audit Suspended",
    reRunEngine: "Re-run Engine",
    returnHome: "Return Home",
    statusAnalysisComplete: "STATUS ANALYSIS COMPLETE",
    stateInstalled: "STATE INSTALLED",
    gitLatestRelease: "GIT LATEST RELEASE",
    verdictSelection: "VERDICT SELECTION",
    consolidatingText: "CONSOLIDATING: {count} COMPREHENSIVE PACKAGES",
    repositoryTarget: "Repository target:",
    installedStatus: "Installed status:",
    registryLatest: "Registry latest:",
    coreHighlightsLabel: "Core Enhancements & Architecture",
    noHighlightsText: "No significant modifications logged. Minor tweaks observed.",
    criticalFixesLabel: "Critical Resolutions & Vetted Fixes",
    noCriticalFixesText: "No severe security CVE patches or crashes detected. Current footprint is stable.",
    breakingChangesLabel: "Breaking Changes & High-Risk Modifiers",
    noBreakingChangesText: "Painless migration roadmap. No destructive regression risks cataloged.",
    logChronologies: "Log Chronologies",
    highlightTelemetries: "HIGHLIGHT TELEMETRIES:",
    noLocalizedNotes: "No localized notes captured.",
    integrationSchema: "INTEGRATION SCHEMA",
    clearLedger: "Clear Ledger",
    noHistoryRecords: "No search records currently indexed.",
    enterRepoToGenerate: "Enter a repo to generate reports",
    clearHistoryConfirm: "Formally clear the entire Audit Ledger archive?",
    apiSettingsTitle: "API Settings",
    apiSettingsTip: "Tip: These settings are stored locally in your browser. If left empty, the system defaults to using the OpenAI proxy and integrated models.",
    apiUrlLabel: "API Base URL",
    apiUrlPlaceholder: "Default: https://api.deepseek.com",
    apiKeyLabel: "API Key",
    apiKeyHasValue: "Custom key configured (••••••••)",
    apiKeyInlinePlaceholder: "Default: Using system built-in key",
    modelLabel: "Model Name",
    getOnlineModels: "Get Online Model List",
    fetchingList: "Fetching list...",
    onlineModelsClick: "Online Available Models (Click to quickly select):",
    resetDefaultConfig: "Reset to Defaults",
    saveAndClose: "Save & Close",
    persistenceNote: "Client Persistent Config • SSL Encrypted",
    devPortalTitle: "Developer Integration Portal",
    devPortalSubtitle: "Implement automation schemas or leverage API connectivity",
    optionATitle: "Option A: REST API Integration",
    optionASubtitle: "Post Request Payload",
    optionASummary: "Call our unified server module directly from your continuous integration pipelines or monitoring dashboards to programmatically fetch security audits.",
    optionBTitle: "Option B: AI Prompter Script",
    optionBSubtitle: "Copy-Paste Context Prompt",
    optionBSummary: "Inject the blueprint rules below into any AI IDE tool (like Cursor or Windsurf) to let AI dynamically write version extraction scripts for your build tool.",
    directiveSchemaTitle: "DIRECTIVE SCHEMA FOR AI:",
    directiveIntroduce: "Develop the following feature suite in this project:",
    directiveStep1: "Write routine scripts reading local library tags",
    directiveStep2: "Submit lockfile metrics to endpoint: ",
    directiveStep3: "Halt development build processes if a critical CVE severity patch is published",
    recommendedModelTitle: "Recommended Model Schema:",
    recommendedModelBody: "If you elect to run custom LLMs in-house, deploy gemini-3.5-flash using the standard responseSchema structure. This guarantees complete schema conformity and seamless UI rendering.",
    closeBtn: "Close",
    apiSettings: "API Settings",
    settingsTooltip: "Tip: These settings are stored locally in your browser. If left empty, the system defaults to using the OpenAI proxy and integrated models.",
    apiBaseUrl: "API Base URL",
    apiBaseUrlPlaceholder: "Default: https://api.deepseek.com",
    apiKey: "API Key",
    apiKeySet: "Custom key configured (••••••••)",
    apiKeyPlaceholder: "Default: Using system built-in key",
    modelName: "Model Name",
    modelPlaceholder: "Default: server configured model",
    fetchingModels: "Fetching list...",
    fetchModelList: "Get Online Model List",
    onlineModelsTitle: "Online Available Models (Click to quickly select):",
    resetSettings: "Reset to Defaults",
    clientPersistenceLabel: "Client Persistent Config • SSL Encrypted",
    auditLedger: "Audit Ledger",
    securePersistenceActive: "SECURE PERSISTENCE ACTIVE [LOCAL-STORAGE]",
    projectIntegrationSchema: "Project Integration Schema",
    coreEnhancements: "Core Enhancements & Architecture",
    noSignificantModifications: "No significant modifications logged. Minor tweaks observed.",
    criticalResolutions: "Critical Resolutions & Vetted Fixes",
    noSevereSecurity: "No severe security CVE patches or crashes detected. Current footprint is stable.",
    breakingChangesTitle: "Breaking Changes & High-Risk Modifiers",
    painlessMigration: "Painless migration roadmap. No destructive regression risks cataloged.",
    codeMetricsTitle: "Code Metrics",
    codeMetricsLoading: "Retrieving repository code statistics...",
    codeMetricsError: "Code statistics unavailable (repo too big or rate limited)",
    totalLines: "Total Lines",
    totalFiles: "Total Files",
    commentRatio: "Comment Ratio",
    blankRatio: "Blank Ratio",
    retryBtn: "Retry",
    detailedMetrics: "Show detailed data",
    hideMetrics: "Hide detailed data"
  },
  zh: {
    ledger: "审计历史",
    developers: "开发者中枢",
    settings: " API 设置",
    shouldIUpgrade: "我应该升级吗？",
    enterRepoPlaceholder: "输入 GitHub 项目地址，立即帮你分析",
    analyze: "立即分析",
    specificVersion: "特定版本对比",
    relativeTimeframe: "时间跨度分析",
    installedLabel: "选择版本:",
    autoList: "自动拉取",
    customLabel: "手动输入",
    loadingTags: "正在解析版本标签...",
    noTagsFound: "未找到版本标签",
    ageCheckedLabel: "分析时间跨度:",
    quickAuditSub: "或者，快速审计以下常用开源项目",
    switchToSpecificTag: "切换为特定指定版本",
    switchToTimeWindow: "切换为时间跨度范围",
    stateBeingLogged: "当前对照状态:",
    latestDisplacement: "对比最新版本",
    verdictSealLabel: "审查结论",
    auditSuspended: "分析中止",
    reRunEngine: "重新运行分析",
    returnHome: "返回首页",
    statusAnalysisComplete: "版本分析对比完毕",
    stateInstalled: "已装稳定版本",
    gitLatestRelease: "仓库最新发布",
    verdictSelection: "审查评定说明",
    consolidatingText: "聚合汇总: {count} 个更新迭代包",
    repositoryTarget: "分析目标:",
    installedStatus: "选择版本:",
    registryLatest: "最新版本:",
    coreHighlightsLabel: "升级重点",
    noHighlightsText: "未分析到重大的功能或架构变更。通常包含日常优化与微调。",
    criticalFixesLabel: "漏洞修复",
    noCriticalFixesText: "未检测到严重的安全漏洞（CVE）或崩溃修复，当前版本表现稳定可靠。",
    breakingChangesLabel: "升级风险",
    noBreakingChangesText: "无痛过渡路线图。未登记导致接口不兼容或无法运行的回退风险。",
    logChronologies: "版本历史演进时间轴",
    highlightTelemetries: "各版本迭代重点:",
    noLocalizedNotes: "该版本未提供特殊的详细发布备忘录。",
    integrationSchema: "系统集成技术方案",
    clearLedger: "清空历史记录",
    noHistoryRecords: "暂未检索并缓存过项目审计记录。",
    enterRepoToGenerate: "请在首页中输入任意仓库地址来快速开始审计",
    clearHistoryConfirm: "您是否确认完全清空本地缓存的审计日志记录吗？",
    apiSettingsTitle: "大模型 API 连接设置",
    apiSettingsTip: "提示：以下自定义设置均存储在您当前浏览器的本地缓存中。若不设置（留空），本软件默认会通过备用的 OpenAI 代理后端及内置模型完成分析。",
    apiUrlLabel: "自定义 API 接口源 (URL 地址)",
    apiUrlPlaceholder: "默认：https://api.deepseek.com",
    apiKeyLabel: "自定义 API 密钥 (Key)",
    apiKeyHasValue: "已设置自定义密钥 (••••••••)",
    apiKeyInlinePlaceholder: "默认：使用内置备用密钥",
    modelLabel: "分析决策大模型 (Model Name)",
    getOnlineModels: "获取在线模型列表",
    fetchingList: "正在调取解析中...",
    onlineModelsClick: "在线可用模型 (点击可快速选择配置):",
    resetDefaultConfig: "清除自定义重置默认",
    saveAndClose: "保存并关闭设置",
    persistenceNote: "客户端安全沙箱存储 • 全程 TLS/SSL 传输加密保护",
    devPortalTitle: "开发者中枢 & API 集成对接",
    devPortalSubtitle: "利用本系统的自动化工作流与标准化 API 开发自定义脚本",
    optionATitle: "方案 A：标准 REST API 接口对接",
    optionASubtitle: "POST 接口传输数据体 (Request Payload)",
    optionASummary: "您可以在您的持续集成(CI)流水线、本地 Git Hook 或综合性能监控看板中，直接向我们的分析微服务推送高频请求。",
    optionBTitle: "方案 B：AI 编程助手指令联动 context",
    optionBSubtitle: "复制完整的 AI PROMPT 全景图(Markdown)",
    optionBSummary: "您可以将本系统规则作为 Context 灌输给 Cursor 或 Windsurf 等 AI 编程助手工具，使其为您开发自动获取依赖版本的辅助插件。",
    directiveSchemaTitle: "AI 指导提示词指令模板 (DIRECTIVE):",
    directiveIntroduce: "在当前开发工程中高品质完成以下自动化链路：",
    directiveStep1: "编写读取本项目包锁文件或本地依赖版本并进行规格化处理的脚本",
    directiveStep2: "将得到的仓库和对应的安装版本提交到以下高阶 API 指标接口中: ",
    directiveStep3: "当检测到依赖版本存在严重漏洞(CVE)、或者版本大跨度导致灾难性不兼容时，中止开发构建流并给出警告",
    recommendedModelTitle: "推荐部署模型配置：",
    recommendedModelBody: "如果您计划在内网或自有服务器架构中跑离线决策模型，建议采用具有高质量 responseSchema 标准化输出的 gemini-3.5-flash，这能够完美保证多语言格式的兼容性、100% 的 JSON 对齐和稳定的骨架屏 UI 显示。",
    closeBtn: "关闭",
    apiSettings: "API 设置",
    settingsTooltip: "提示：以下自定义设置均存储在您当前浏览器的本地缓存中。若不设置（留空），本软件默认会通过备用的 OpenAI 代理后端及内置模型完成分析。",
    apiBaseUrl: "自定义 API 接口源 (URL 地址)",
    apiBaseUrlPlaceholder: "默认：https://api.deepseek.com",
    apiKey: "自定义 API 密钥 (Key)",
    apiKeySet: "已设置自定义密钥 (••••••••)",
    apiKeyPlaceholder: "默认：使用内置备用密钥",
    modelName: "分析决策大模型 (Model Name)",
    modelPlaceholder: "默认: 使用服务端配置模型",
    fetchingModels: "正在调取解析中...",
    fetchModelList: "获取在线模型列表",
    onlineModelsTitle: "在线可用模型 (点击可快速选择配置):",
    resetSettings: "清除自定义重置默认",
    clientPersistenceLabel: "客户端安全沙箱存储 • 全程 TLS/SSL 传输加密保护",
    auditLedger: "审计历史",
    securePersistenceActive: "审计数据已保存在您本地安全沙箱",
    projectIntegrationSchema: "分析主线集成架构指引",
    coreEnhancements: "升级重点",
    noSignificantModifications: "这次没有特别值得普通用户惦记的新功能，更多是日常维护和细节打磨。",
    criticalResolutions: "漏洞修复",
    noSevereSecurity: "未检测到严重的安全漏洞（CVE）或崩溃修复，当前版本表现稳定可靠。",
    breakingChangesTitle: "升级风险",
    painlessMigration: "暂时没看到明显的兼容性雷区，正常升级风险不高。",
    codeMetricsTitle: "代码结构统计",
    codeMetricsLoading: "正在解析代码结构...",
    codeMetricsError: "暂无代码统计数据 (项目体积超标或请求频繁)",
    totalLines: "总代码行",
    totalFiles: "文件总数",
    commentRatio: "注释占比",
    blankRatio: "空行占比",
    retryBtn: "重试",
    detailedMetrics: "展开详细数据",
    hideMetrics: "收起详细数据"
  }
};
