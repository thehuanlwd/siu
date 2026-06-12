import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Terminal, 
  BookOpen, 
  AlertTriangle, 
  History, 
  RefreshCw, 
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Info,
  X,
  Layers,
  AlertCircle,
  Sliders,
  Settings,
  Sun,
  Moon,
  HelpCircle
} from 'lucide-react';
import Loader from './components/Loader';
import type { LoaderStatus } from './components/Loader';
import HistorySidebar from './components/HistorySidebar';
import DevDocs from './components/DevDocs';
import PreferenceControl, {
  DEFAULT_UPGRADE_PREFERENCES,
  PreferenceStatusLine,
  PreferenceSummaryList,
  normalizePreferences,
} from './components/PreferenceControl';
import VersionLatticeBg from './components/VersionLatticeBg';
import { UpgradeAnalysis, HistoryItem, VerdictType, UpgradePreferences, ExplainSection, ExplanationResult, LocMetric } from './types';
import { translations } from './locales';

type ThemeMode = 'light' | 'dark';
type LanguageMode = 'en' | 'zh';
type AnalysisTriggerOptions = {
  repoUrl?: string;
  currentVersion?: string;
  timeframe?: string;
  recentReleases?: number;
};
type ExplainItemState = {
  status: 'loading' | 'success' | 'error';
  explanation?: ExplanationResult;
  error?: string;
};

const PREFERENCES_STORAGE_KEY = 'siu_upgrade_preferences';
const PREFERENCES_CONFIGURED_KEY = 'siu_upgrade_preferences_configured';

const getPreferredTheme = (): ThemeMode => {
  const saved = localStorage.getItem('siu_theme');
  const source = localStorage.getItem('siu_theme_source');
  if (source === 'manual' && (saved === 'light' || saved === 'dark')) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getPreferredLanguage = (): LanguageMode => {
  const saved = localStorage.getItem('siu_language');
  const source = localStorage.getItem('siu_language_source');
  if (source === 'manual' && (saved === 'en' || saved === 'zh')) return saved as LanguageMode;

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return browserLanguages.some((item) => item.toLowerCase().startsWith('zh')) ? 'zh' : 'en';
};

const getStoredPreferences = (): UpgradePreferences => {
  if (localStorage.getItem(PREFERENCES_CONFIGURED_KEY) !== 'true') {
    return DEFAULT_UPGRADE_PREFERENCES;
  }

  try {
    const saved = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return saved ? normalizePreferences(JSON.parse(saved)) : DEFAULT_UPGRADE_PREFERENCES;
  } catch {
    return DEFAULT_UPGRADE_PREFERENCES;
  }
};

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const cleanUrl = url.trim().replace(/\.git$/, '');
    const regex = /(?:github\.com[:/])([^/]+)\/([^/]+)/;
    const match = cleanUrl.match(regex);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch (e) {
    console.error("Parse github repo error:", e);
  }
  return null;
}

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(getPreferredTheme);

  // Sync theme with DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (localStorage.getItem('siu_theme_source') === 'manual') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleBrowserThemeChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem('siu_theme_source') === 'manual') return;
      setTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleBrowserThemeChange);
    return () => mediaQuery.removeEventListener('change', handleBrowserThemeChange);
  }, []);

  // Multilingual localization states
  const [lang, setLang] = useState<LanguageMode>(getPreferredLanguage);

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh' : 'en';
  }, [lang]);

  // Navigation Screens & Drawer Overlays
  const [currentTab, setCurrentTab] = useState<'analyzer' | 'developer'>('analyzer');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showDevPortalModal, setShowDevPortalModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Custom API configuration states
  const [customApiUrl, setCustomApiUrl] = useState(() => localStorage.getItem('siu_custom_api_url') || '');
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('siu_custom_api_key') || '');
  const [customModel, setCustomModel] = useState(() => {
    const savedModel = localStorage.getItem('siu_custom_model') || '';
    const hasCustomProvider = Boolean(localStorage.getItem('siu_custom_api_url') || localStorage.getItem('siu_custom_api_key'));
    if (savedModel === 'deepseek-v4-flash' && !hasCustomProvider) {
      localStorage.removeItem('siu_custom_model');
      return '';
    }
    return savedModel;
  });

  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Frontend cache for repository tags to avoid redundant loading
  const tagsCacheRef = useRef<Record<string, Array<{ name: string; releaseName?: string; publishedAt?: string }>>>({});
  const skipNextAutoTagLoadRef = useRef(false);

  // Home State vs Result State
  // We are in "landing" mode if there's no ongoing analysis, no parsed results, and no errors.
  const [hasSearched, setHasSearched] = useState(false);

  // Query States
  const [repoUrl, setRepoUrl] = useState('');
  const [tags, setTags] = useState<Array<{ name: string; releaseName?: string; publishedAt?: string }>>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [useTimeframe, setUseTimeframe] = useState(false);
  const [timeframe, setTimeframe] = useState('1m'); // '1w', '1m', '3m'
  const [manualVersion, setManualVersion] = useState('');
  const [customVersionActive, setCustomVersionActive] = useState(false);

  // Flow States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upToDateStatus, setUpToDateStatus] = useState<{
    repoName: string;
    currentVersion: string;
    latestVersion: string;
    message: string;
  } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<UpgradeAnalysis | null>(null);
  const [streamStatus, setStreamStatus] = useState<LoaderStatus | null>(null);

  // UI state
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [upgradePreferences, setUpgradePreferences] = useState<UpgradePreferences>(getStoredPreferences);
  const [preferencesConfigured, setPreferencesConfigured] = useState(
    () => localStorage.getItem(PREFERENCES_CONFIGURED_KEY) === 'true'
  );
  const [preferencesFlipped, setPreferencesFlipped] = useState(false);
  const [expandedExplanationKey, setExpandedExplanationKey] = useState<string | null>(null);
  const [explanationStates, setExplanationStates] = useState<Record<string, ExplainItemState>>({});

  // Codetabs Loc Metrics states
  const [locData, setLocData] = useState<LocMetric[] | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [locExpanded, setLocExpanded] = useState(false);
  const currentAnalyzingRepoRef = useRef<string | null>(null);

  // History State (Persisted in localStorage)
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('siu_audit_ledger');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Pre-seed repositories for rapid trials
  const POPULAR_REPOS = [
    { name: 'iOfficeAI/AionUi', url: 'https://github.com/iOfficeAI/AionUi', recentReleases: 10 },
    { name: 'openclaw/openclaw', url: 'https://github.com/openclaw/openclaw', recentReleases: 10 },
    { name: 'CherryHQ/cherry-studio', url: 'https://github.com/CherryHQ/cherry-studio', recentReleases: 10 }
  ];

  // Auto load tags when repository changes
  useEffect(() => {
    if (repoUrl.trim()) {
      if (skipNextAutoTagLoadRef.current) {
        skipNextAutoTagLoadRef.current = false;
        return;
      }
      fetchTagsOfRepo(repoUrl);
    } else {
      setTags([]);
      setCurrentVersion('');
    }
  }, [repoUrl]);

  // Persist History Ledger
  useEffect(() => {
    localStorage.setItem('siu_audit_ledger', JSON.stringify(history));
  }, [history]);

  // Persist Custom API Configurations
  useEffect(() => {
    localStorage.setItem('siu_custom_api_url', customApiUrl);
  }, [customApiUrl]);

  useEffect(() => {
    localStorage.setItem('siu_custom_api_key', customApiKey);
  }, [customApiKey]);

  useEffect(() => {
    if (customModel.trim()) {
      localStorage.setItem('siu_custom_model', customModel.trim());
    } else {
      localStorage.removeItem('siu_custom_model');
    }
  }, [customModel]);

  useEffect(() => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(upgradePreferences));
  }, [upgradePreferences]);

  // Fetch online OpenAI-compatible model list
  const handleFetchModels = async () => {
    setFetchingModels(true);
    setModelsError(null);
    setFetchedModels([]);
    try {
      const resp = await fetch('/api/models', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customApiUrl: customApiUrl || undefined,
          customApiKey: customApiKey || undefined
        })
      });
      
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "获取模型列表失败");
      }
      
      if (data.models && Array.isArray(data.models)) {
        setFetchedModels(data.models);
        if (data.models.length > 0 && !data.models.includes(customModel)) {
          setCustomModel(data.models[0]);
        }
      } else {
        throw new Error("服务端未返回有效的模型列表");
      }
    } catch (err: any) {
      console.error("Fetch models error:", err);
      setModelsError(err.message || "Failed to retrieve models");
    } finally {
      setFetchingModels(false);
    }
  };

  const fetchTagsOfRepo = async (targetUrl: string, forceRefresh = false, autoSelectVersion = true) => {
    if (!forceRefresh) {
      const cached = tagsCacheRef.current[targetUrl];
      if (cached) {
        console.log(`[Frontend] 从前端缓存加载仓库的版本列表: ${targetUrl}`);
        setTags(cached);
        if (autoSelectVersion && cached.length > 0) {
          const indexToSelect = Math.min(3, cached.length - 1);
          if (cached[indexToSelect]) {
            setCurrentVersion(cached[indexToSelect].name);
          } else {
            setCurrentVersion(cached[0].name);
          }
        }
        return cached;
      }
    }

    setTagsLoading(true);
    setTags([]);
    console.log(`[Frontend] 开始获取仓库的版本/标签列表: ${targetUrl}`);
    try {
      const resp = await fetch(`/api/tags?repo=${encodeURIComponent(targetUrl)}`);
      const data = await resp.json();
      if (resp.ok && data.tags) {
        console.log(`[Frontend] 获取版本/标签成功。共获取到 ${data.tags.length} 个版本，数据源: ${data.source}`);
        tagsCacheRef.current[targetUrl] = data.tags;
        setTags(data.tags);
        if (autoSelectVersion && data.tags.length > 0) {
          // Select an older tag if present to simulate being outdated
          const indexToSelect = Math.min(3, data.tags.length - 1);
          if (data.tags[indexToSelect]) {
            setCurrentVersion(data.tags[indexToSelect].name);
          } else {
            setCurrentVersion(data.tags[0].name);
          }
        }
        return data.tags;
      } else {
        console.error(`[Frontend] 获取版本/标签失败。状态码: ${resp.status} | 错误详情:`, data.error || data);
      }
    } catch (err) {
      console.error("[Frontend] 获取版本/标签出现网络或解析异常:", err);
    } finally {
      setTagsLoading(false);
    }

    return [];
  };

  const handleFetchTagsManually = () => {
    fetchTagsOfRepo(repoUrl, true);
  };

  const fetchLocMetrics = async (url: string) => {
    const repoInfo = parseGithubRepo(url);
    if (!repoInfo) {
      setLocData(null);
      setLocError("Invalid GitHub URL");
      return;
    }
    const repoPath = `${repoInfo.owner}/${repoInfo.repo}`;
    currentAnalyzingRepoRef.current = repoPath;

    // 优先从本地历史记录中拉取缓存，防止 429 限流
    const cacheKey = repoPath.toLowerCase();
    const cachedItem = history.find(
      (h) => h.repoName.toLowerCase() === cacheKey && h.analysis?.locData && h.analysis.locData.length > 0
    );
    if (cachedItem && cachedItem.analysis.locData) {
      console.log(`[Frontend] 从本地审计历史加载代码统计缓存: ${repoPath}`);
      setLocData(cachedItem.analysis.locData);
      setLocLoading(false);
      setLocError(null);
      return;
    }

    setLocLoading(true);
    setLocError(null);
    setLocData(null);

    try {
      const resp = await fetch(`https://api.codetabs.com/v1/loc?github=${repoInfo.owner}/${repoInfo.repo}`);
      if (!resp.ok) {
        if (resp.status === 429) {
          throw new Error("rate_limit");
        }
        throw new Error("failed");
      }
      const data = await resp.json();
      if (data && data.Error) {
        throw new Error(data.Error); // 捕获项目过大等 Codetabs 自身错误
      }
      if (Array.isArray(data)) {
        if (currentAnalyzingRepoRef.current === repoPath) {
          setLocData(data);
          
          // 若此时 AI 报告已展现，则同步合并 locData 入 analysisResult 以驱动 UI
          setAnalysisResult((prev) => {
            if (prev && prev.repoName.toLowerCase() === cacheKey) {
              return { ...prev, locData: data };
            }
            return prev;
          });

          // 同步补充到历史记录项中，持久化到 localStorage
          setHistory((prev) =>
            prev.map((item) => {
              if (item.repoName.toLowerCase() === cacheKey) {
                return {
                  ...item,
                  analysis: { ...item.analysis, locData: data }
                };
              }
              return item;
            })
          );
        }
      } else {
        throw new Error("invalid_response");
      }
    } catch (err: any) {
      console.error("[Frontend] 获取代码统计失败:", err);
      if (currentAnalyzingRepoRef.current === repoPath) {
        setLocError(err.message || "failed");
      }
    } finally {
      if (currentAnalyzingRepoRef.current === repoPath) {
        setLocLoading(false);
      }
    }
  };

  const handleAnalysisResponse = (data: any) => {
    if (data.status === 'up_to_date') {
      setUpToDateStatus({
        repoName: data.repoName,
        currentVersion: data.currentVersion,
        latestVersion: data.latestVersion,
        message: data.message
      });
    } else if (data.status === 'requires_version_resolution') {
      throw new Error(data.message || (lang === 'zh' ? '请选择一个正式发布版本后再分析。' : 'Choose an official release version before analyzing.'));
    } else if (data.status === 'success' && data.analysis) {
      // 合并静默请求到的 locData
      const currentRepoPath = data.analysis.repoName.toLowerCase();
      const matchingLocData = locData && currentAnalyzingRepoRef.current?.toLowerCase() === currentRepoPath ? locData : undefined;

      const normalizedAnalysis: UpgradeAnalysis = {
        ...data.analysis,
        preferences: normalizePreferences(data.analysis.preferences || upgradePreferences),
        locData: data.analysis.locData || matchingLocData
      };

      setAnalysisResult(normalizedAnalysis);
      
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        repoName: normalizedAnalysis.repoName,
        currentVersion: normalizedAnalysis.currentVersion,
        latestVersion: normalizedAnalysis.latestVersion,
        verdict: normalizedAnalysis.verdict,
        timestamp: new Date().toISOString(),
        analysis: normalizedAnalysis
      };

      setHistory(prev => {
        const filtered = prev.filter(h => h.repoName.toLowerCase() !== newHistoryItem.repoName.toLowerCase());
        return [newHistoryItem, ...filtered].slice(0, 30);
      });
    } else {
      throw new Error("Unable to synthesize update telemetry. Please try again.");
    }
  };

  const runFallbackAnalysis = async (requestPayload: any) => {
    const resp = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || "Server processing failure. Check your input.");
    }

    handleAnalysisResponse(data);
  };
  const triggerAnalysis = async (options: AnalysisTriggerOptions = {}) => {
    const finalRepo = (options.repoUrl || repoUrl).trim();
    if (!finalRepo) {
      setError(lang === 'zh' ? '请先输入一个 GitHub 项目地址。' : 'Enter a GitHub repository first.');
      setHasSearched(false);
      return;
    }

    // 静默并行调用 Loc 代码结构统计
    fetchLocMetrics(finalRepo);
    setLocExpanded(false);

    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setUpToDateStatus(null);
    setAnalysisResult(null);
    setExpandedExplanationKey(null);
    setExplanationStates({});
    setStreamStatus({
      stage: 'init',
      message: lang === 'zh' ? 'SIU 初始化成功...' : 'SIU initialized...',
      tokenCount: 0,
    });

    const activeVersion = customVersionActive 
      ? manualVersion.trim() 
      : (options.currentVersion || currentVersion);
    const activeRecentReleases = options.recentReleases;
    const shouldUseTimeframe = !activeRecentReleases && (Boolean(options.timeframe) || useTimeframe);
    
    const requestPayload = {
      repoUrl: finalRepo,
      currentVersion: activeRecentReleases || shouldUseTimeframe ? undefined : activeVersion,
      timeframe: shouldUseTimeframe ? (options.timeframe || timeframe) : undefined,
      recentReleases: activeRecentReleases,
      customApiUrl: customApiUrl || undefined,
      customApiKey: customApiKey || undefined,
      customModel: customModel.trim() || undefined,
      preferences: upgradePreferences,
      lang: lang
    };

    try {
      const resp = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!resp.ok) {
        await runFallbackAnalysis(requestPayload);
        return;
      }

      if (!resp.body) {
        await runFallbackAnalysis(requestPayload);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const event = JSON.parse(trimmed);
          if (event.type === 'status') {
            setStreamStatus((prev) => ({
              stage: event.stage || prev?.stage || 'init',
              message: event.message || prev?.message || '',
              releaseCount: event.releaseCount ?? prev?.releaseCount,
              tokenCount: event.tokenCount ?? prev?.tokenCount,
            }));
          } else if (event.type === 'delta') {
            setStreamStatus((prev) => ({
              stage: 'generating',
              message: prev?.message || (lang === 'zh' ? '报告生成中...' : 'Generating report...'),
              releaseCount: prev?.releaseCount,
              tokenCount: event.approxTokenCount ?? (prev?.tokenCount || 0) + Math.max(1, Math.ceil((event.text || '').length / 4)),
            }));
          } else if (event.type === 'error') {
            throw new Error(event.error || "Analysis stream failed.");
          } else if (event.type === 'done') {
            handleAnalysisResponse(event.response);
            completed = true;
          }
        }
      }

      if (!completed) {
        await runFallbackAnalysis(requestPayload);
      }
    } catch (err: any) {
      console.error("Analysis execution error", err);
      setError(err.message || "Network issue connecting with the SIU AI engine.");
    } finally {
      setIsLoading(false);
      setStreamStatus(null);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    const normalizedAnalysis: UpgradeAnalysis = {
      ...item.analysis,
      preferences: normalizePreferences(item.analysis.preferences),
    };
    setRepoUrl(`https://github.com/${item.repoName}`);
    setCurrentVersion(item.currentVersion);
    setAnalysisResult(normalizedAnalysis);
    setUpgradePreferences(normalizedAnalysis.preferences);
    setExpandedExplanationKey(null);
    setExplanationStates({});
    setUpToDateStatus(null);
    setError(null);
    setHasSearched(true);
    setShowHistoryDrawer(false);

    // 加载缓存好的 Loc 统计数据并还原当前库追踪
    setLocData(normalizedAnalysis.locData || null);
    setLocLoading(false);
    setLocError(null);
    setLocExpanded(false);
    const repoInfo = parseGithubRepo(`https://github.com/${item.repoName}`);
    if (repoInfo) {
      currentAnalyzingRepoRef.current = `${repoInfo.owner}/${repoInfo.repo}`;
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const clearAllHistory = () => {
    if (window.confirm("Formally clear the entire Audit Ledger archive?")) {
      setHistory([]);
    }
  };

  const handleQuickSeed = async (repo: typeof POPULAR_REPOS[number]) => {
    skipNextAutoTagLoadRef.current = true;
    setRepoUrl(repo.url);
    setManualVersion('');
    setCustomVersionActive(false);
    setUseTimeframe(false);
    const repoTags = await fetchTagsOfRepo(repo.url, false, false);
    const selectedTag = repoTags[Math.min(repo.recentReleases - 1, repoTags.length - 1)]?.name || '';
    setCurrentVersion(selectedTag);
    triggerAnalysis({ repoUrl: repo.url, recentReleases: repo.recentReleases });
  };

  const toggleVersionRow = (tag: string) => {
    setExpandedVersions(prev => ({
      ...prev,
      [tag]: !prev[tag]
    }));
  };

  const getVerdictLabel = (verdict: VerdictType) => {
    switch (verdict) {
      case 'yes':
        return lang === 'zh' ? '强烈推荐，必升！' : 'Upgrade Recommended';
      case 'no':
        return lang === 'zh' ? '慎重考虑！' : 'Hold Current Version';
      case 'maybe':
        return lang === 'zh' ? '随意，您看着办' : 'Evaluate & Test';
      default:
        return 'Unknown';
    }
  };

  const getVerdictSentence = (verdict: VerdictType) => {
    switch (verdict) {
      case 'yes':
        return lang === 'zh' ? '这次更新确实有东西，修复、功能或体验提升都比较实在，值得尽快跟上。' : 'Action recommended. Upgrading carries key improvements.';
      case 'no':
        return lang === 'zh' ? '新版目前看不到特别刚需的收益，或者升级成本偏高，先别急着动。' : 'Consolidated view suggests holding back from current migration path.';
      case 'maybe':
        return lang === 'zh' ? '有一些变化，但不是人人都需要；想尝鲜可以升，只求稳定也可以等等。' : 'Conduct selective review. Contains non-vital features or updates.';
      default:
        return '';
    }
  };

  const getVerdictShort = (verdict: VerdictType) => {
    switch (verdict) {
      case 'yes':
        return lang === 'zh' ? 'YES' : 'Yes';
      case 'no':
        return lang === 'zh' ? 'NO' : 'No';
      case 'maybe':
        return lang === 'zh' ? '？' : 'Maybe';
      default:
        return '?';
    }
  };

  const getUpgradeHighlights = (analysis: UpgradeAnalysis) => {
    const seen = new Set<string>();
    return [...(analysis.coreHighlights || []), ...(analysis.newFeatures || [])].filter((item) => {
      const normalized = item.trim();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  };

  const handleLanguageToggle = () => {
    const nextLang = lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('siu_language', nextLang);
    localStorage.setItem('siu_language_source', 'manual');
    setLang(nextLang);
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('siu_theme', nextTheme);
    localStorage.setItem('siu_theme_source', 'manual');
    setTheme(nextTheme);
  };

  const resetToHome = () => {
    setHasSearched(false);
    setAnalysisResult(null);
    setUpToDateStatus(null);
    setError(null);
    setExpandedExplanationKey(null);
  };

  const getRepoHref = (repoName: string) => `https://github.com/${repoName}`;

  const getReleaseHref = (repoName: string, version: string) => {
    const trimmed = version.trim();
    if (!trimmed || /\s/.test(trimmed)) return "";
    return `https://github.com/${repoName}/releases/tag/${encodeURIComponent(trimmed)}`;
  };

  const renderReleaseLink = (version: string, className: string) => {
    const href = analysisResult ? getReleaseHref(analysisResult.repoName, version) : "";
    if (!href) {
      return <span className={className}>{version}</span>;
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`${className} hover:text-accent-indigo hover:underline`}
      >
        {version}
      </a>
    );
  };

  const getExplanationKey = (section: ExplainSection, itemText: string, itemIndex: number, releaseTag?: string) => {
    return `${section}:${releaseTag || 'summary'}:${itemIndex}:${itemText}`;
  };

  const handleToggleExplanation = async (
    section: ExplainSection,
    itemText: string,
    itemIndex: number,
    releaseTag?: string
  ) => {
    if (!analysisResult) return;

    const key = getExplanationKey(section, itemText, itemIndex, releaseTag);
    if (expandedExplanationKey === key) {
      setExpandedExplanationKey(null);
      return;
    }

    setExpandedExplanationKey(key);
    if (explanationStates[key]?.status === 'success' || explanationStates[key]?.status === 'loading') return;

    setExplanationStates((prev) => ({
      ...prev,
      [key]: { status: 'loading' },
    }));

    try {
      const resp = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: `https://github.com/${analysisResult.repoName}`,
          repoName: analysisResult.repoName,
          currentVersion: useTimeframe ? undefined : analysisResult.currentVersion,
          timeframe: useTimeframe ? timeframe : undefined,
          section,
          itemText,
          itemIndex,
          releaseTag,
          customApiUrl: customApiUrl || undefined,
          customApiKey: customApiKey || undefined,
          customModel: customModel.trim() || undefined,
          lang,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || data.status !== 'success' || !data.explanation) {
        throw new Error(data.error || (lang === 'zh' ? '解释失败。' : 'Explanation failed.'));
      }

      setExplanationStates((prev) => ({
        ...prev,
        [key]: { status: 'success', explanation: data.explanation },
      }));
    } catch (err: any) {
      setExplanationStates((prev) => ({
        ...prev,
        [key]: {
          status: 'error',
          error: err.message || (lang === 'zh' ? '这条暂时解释失败，可以稍后再试。' : 'This item could not be explained yet.'),
        },
      }));
    }
  };

  const renderExplainButton = (section: ExplainSection, itemText: string, itemIndex: number, releaseTag?: string) => {
    const key = getExplanationKey(section, itemText, itemIndex, releaseTag);
    const isOpen = expandedExplanationKey === key;
    return (
      <button
        type="button"
        onClick={() => handleToggleExplanation(section, itemText, itemIndex, releaseTag)}
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-all focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-accent-indigo/40 ${
          isOpen
            ? 'border-accent-indigo bg-accent-indigo text-paper-light opacity-100'
            : 'border-ui-border bg-paper-block text-charcoal/35 opacity-0 group-hover:opacity-100 hover:border-accent-indigo hover:text-accent-indigo'
        }`}
        title={lang === 'zh' ? '解释这一条' : 'Explain this item'}
        aria-label={lang === 'zh' ? '解释这一条' : 'Explain this item'}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    );
  };

  const renderExplanationPanel = (section: ExplainSection, itemText: string, itemIndex: number, releaseTag?: string) => {
    const key = getExplanationKey(section, itemText, itemIndex, releaseTag);
    if (expandedExplanationKey !== key) return null;

    const state = explanationStates[key];
    if (!state || state.status === 'loading') {
      return (
        <div className="ml-8 mt-2 border-l border-ui-border-light pl-4">
          <div className="h-[2px] w-full overflow-hidden bg-ui-border-light">
            <motion.div
              className="h-full w-1/3 bg-charcoal"
              animate={{ x: ['-100%', '320%'] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            />
          </div>
          <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-charcoal/45">
            {lang === 'zh' ? '正在反查出处...' : 'Tracing release evidence...'}
          </p>
        </div>
      );
    }

    if (state.status === 'error') {
      return (
        <div className="ml-8 mt-2 border-l border-status-error-border bg-status-error-bg/35 px-4 py-3 text-xs text-status-error-text">
          {state.error || (lang === 'zh' ? '这条暂时解释失败，可以稍后再试。' : 'This explanation failed. Try again later.')}
        </div>
      );
    }

    const explanation = state.explanation;
    if (!explanation) return null;

    const rows = [
      [lang === 'zh' ? '这是什么意思' : 'Meaning', explanation.plainMeaning],
      [lang === 'zh' ? '影响谁' : 'Affected', explanation.affectedUsers],
      [lang === 'zh' ? '要不要管' : 'Action', explanation.action],
      [lang === 'zh' ? '依据' : 'Evidence', explanation.evidence],
    ];

    return (
      <div className="ml-8 mt-2 border-l border-ui-border-light bg-paper-aside/70 px-4 py-3 text-xs text-charcoal">
        <div className="space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[78px_minmax(0,1fr)] items-start gap-3">
              <span className="pt-[2px] text-right font-mono text-[9px] uppercase tracking-wider text-charcoal/40">{label}</span>
              <span className="min-w-0 leading-relaxed text-charcoal/80">{value}</span>
            </div>
          ))}
        </div>
        {explanation.needsSourceReview && (
          <p className="mt-3 border-t border-ui-border-light pt-2 text-[10px] font-mono uppercase tracking-wider text-charcoal/40">
            {lang === 'zh' ? '仍需源码确认，默认不继续消耗上下文。' : 'Source review may be needed; skipped by default.'}
          </p>
        )}
      </div>
    );
  };

  const renderCodeMetricsSection = () => {
    if (!analysisResult) return null;

    const languageColors: Record<string, string> = {
      typescript: '#3178c6',
      javascript: '#f1e05a',
      css: '#563d7c',
      html: '#e34c26',
      python: '#3572A5',
      go: '#00ADD8',
      rust: '#dea584',
      java: '#b07219',
      ruby: '#701516',
      php: '#4F5D95',
      c: '#555555',
      'c++': '#f34b7d',
      'c#': '#178600',
      shell: '#89e051',
      swift: '#F05138',
      vue: '#41B883',
    };

    const getLanguageColor = (lang: string) => {
      const lower = lang.toLowerCase();
      if (languageColors[lower]) return languageColors[lower];
      let hash = 0;
      for (let i = 0; i < lower.length; i++) {
        hash = lower.charCodeAt(i) + ((hash << 5) - hash);
      }
      const h = Math.abs(hash) % 360;
      return `hsl(${h}, 55%, 60%)`;
    };

    if (locLoading) {
      return (
        <div className="relative pl-6 pt-6 border-t border-ui-border mt-8">
          <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-charcoal/80 mb-3">
            {t.codeMetricsTitle}
          </h3>
          <div className="flex items-center space-x-2.5 text-xs text-charcoal/40 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-charcoal/30" />
            <span>{t.codeMetricsLoading}</span>
          </div>
        </div>
      );
    }

    if (locError) {
      const repoUrlToRetry = `https://github.com/${analysisResult.repoName}`;
      return (
        <div className="relative pl-6 pt-6 border-t border-ui-border mt-8">
          <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-charcoal/80 mb-3">
            {t.codeMetricsTitle}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-charcoal/40 font-mono leading-relaxed">
              {t.codeMetricsError}
            </span>
            <button
              onClick={() => fetchLocMetrics(repoUrlToRetry)}
              className="text-[10px] uppercase font-bold tracking-wider text-accent-indigo hover:underline flex items-center space-x-1 cursor-pointer bg-charcoal/5 px-2 py-0.5 rounded-sm border-none outline-none"
            >
              <span>{t.retryBtn}</span>
            </button>
          </div>
        </div>
      );
    }

    const metrics = analysisResult.locData || locData;
    if (!metrics || metrics.length === 0) {
      const repoUrlToRetry = `https://github.com/${analysisResult.repoName}`;
      return (
        <div className="relative pl-6 pt-6 border-t border-ui-border mt-8">
          <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-charcoal/80 mb-3">
            {t.codeMetricsTitle}
          </h3>
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-charcoal/40 font-mono">{t.codeMetricsError}</span>
            <button
              onClick={() => fetchLocMetrics(repoUrlToRetry)}
              className="text-[10px] uppercase font-bold tracking-wider text-accent-indigo hover:underline cursor-pointer bg-charcoal/5 px-2 py-0.5 rounded-sm border-none outline-none"
            >
              {t.retryBtn}
            </button>
          </div>
        </div>
      );
    }

    const dataRows = metrics.filter(m => m.language !== 'Total');
    const totalRow = metrics.find(m => m.language === 'Total') || {
      lines: dataRows.reduce((sum, r) => sum + r.lines, 0),
      files: dataRows.reduce((sum, r) => sum + r.files, 0),
      blanks: dataRows.reduce((sum, r) => sum + r.blanks, 0),
      comments: dataRows.reduce((sum, r) => sum + r.comments, 0),
    };

    const overallLines = totalRow.lines || 1;
    const commentRatioVal = ((totalRow.comments / overallLines) * 100).toFixed(1);
    const blankRatioVal = ((totalRow.blanks / overallLines) * 100).toFixed(1);

    const languageShares = dataRows
      .map(r => ({
        ...r,
        share: r.lines / overallLines,
        color: getLanguageColor(r.language),
      }))
      .sort((a, b) => b.lines - a.lines);

    let displayShares = languageShares.slice(0, 5);
    const otherLines = languageShares.slice(5).reduce((sum, r) => sum + r.lines, 0);
    const otherFiles = languageShares.slice(5).reduce((sum, r) => sum + r.files, 0);
    if (otherLines > 0) {
      displayShares.push({
        language: lang === 'zh' ? '其他语言' : 'Others',
        files: otherFiles,
        lines: otherLines,
        blanks: 0,
        comments: 0,
        share: otherLines / overallLines,
        color: '#d1d5db',
      });
    }

    return (
      <div className="relative pl-6 pt-6 border-t border-ui-border mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-charcoal/80">
            {t.codeMetricsTitle}
          </h3>
          <button
            type="button"
            onClick={() => setLocExpanded(!locExpanded)}
            className="text-[10px] uppercase tracking-wider font-mono font-extrabold text-charcoal/45 hover:text-charcoal cursor-pointer flex items-center space-x-1 bg-transparent border-none outline-none"
          >
            <span>{locExpanded ? t.hideMetrics : t.detailedMetrics}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${locExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-charcoal/5 mb-3 shadow-inner">
          {displayShares.map((item, idx) => (
            <div
              key={idx}
              style={{
                width: `${(item.share * 100).toFixed(1)}%`,
                backgroundColor: item.color,
              }}
              title={`${item.language}: ${(item.share * 100).toFixed(1)}% (${item.lines.toLocaleString()} lines)`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-charcoal/50">
          {displayShares.slice(0, 4).map((item, idx) => (
            <div key={idx} className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
              <span className="font-bold text-charcoal/70">{item.language}</span>
              <span>{(item.share * 100).toFixed(0)}%</span>
            </div>
          ))}
          {languageShares.length > 4 && (
            <span className="text-charcoal/35 font-normal text-[10px]">
              {lang === 'zh'
                ? `共 ${languageShares.length} 种语言`
                : `${languageShares.length} languages total`}
            </span>
          )}
        </div>

        <AnimatePresence initial={false}>
          {locExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-paper-aside rounded-sm border border-ui-border-light flex flex-col justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal/40 mb-1">{t.totalLines}</span>
                    <span className="font-mono text-lg font-bold text-charcoal">
                      {totalRow.lines.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-charcoal/40 font-mono mt-0.5">
                      {t.totalFiles}: {totalRow.files.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="p-3.5 bg-paper-aside rounded-sm border border-ui-border-light flex flex-col justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal/40 mb-1">{t.commentRatio}</span>
                    <span className="font-mono text-lg font-bold text-charcoal">
                      {commentRatioVal}%
                    </span>
                    <span className="text-[10px] text-charcoal/40 font-mono mt-0.5">
                      {totalRow.comments.toLocaleString()} lines
                    </span>
                  </div>

                  <div className="p-3.5 bg-paper-aside rounded-sm border border-ui-border-light flex flex-col justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal/40 mb-1">{t.blankRatio}</span>
                    <span className="font-mono text-lg font-bold text-charcoal">
                      {blankRatioVal}%
                    </span>
                    <span className="text-[10px] text-charcoal/40 font-mono mt-0.5">
                      {totalRow.blanks.toLocaleString()} lines
                    </span>
                  </div>
                </div>

                <div className="border border-ui-border-light rounded-xs overflow-hidden">
                  <table className="w-full text-left font-mono text-[11px] border-collapse bg-paper-light">
                    <thead>
                      <tr className="bg-paper-aside border-b border-ui-border-light text-charcoal/45 uppercase font-bold text-[9px] tracking-wider">
                        <th className="p-2.5 pl-4">Language</th>
                        <th className="p-2.5 text-right">Files</th>
                        <th className="p-2.5 text-right">Lines</th>
                        <th className="p-2.5 text-right">Blanks</th>
                        <th className="p-2.5 text-right pr-4">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border-light/40">
                      {languageShares.map((row) => (
                        <tr key={row.language} className="hover:bg-charcoal/[0.01]">
                          <td className="p-2.5 pl-4 font-bold text-charcoal/80 flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: row.color }} />
                            <span>{row.language}</span>
                          </td>
                          <td className="p-2.5 text-right text-charcoal/60">{row.files.toLocaleString()}</td>
                          <td className="p-2.5 text-right text-charcoal/80 font-bold">{row.lines.toLocaleString()}</td>
                          <td className="p-2.5 text-right text-charcoal/50">{row.blanks.toLocaleString()}</td>
                          <td className="p-2.5 text-right text-charcoal/50 pr-4">{row.comments.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-paper-aside/40 font-bold border-t border-ui-border-light">
                        <td className="p-2.5 pl-4 text-charcoal">Total</td>
                        <td className="p-2.5 text-right text-charcoal">{totalRow.files.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-charcoal">{totalRow.lines.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-charcoal/70">{totalRow.blanks.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-charcoal/70 pr-4">{totalRow.comments.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const confirmPreferences = () => {
    localStorage.setItem(PREFERENCES_CONFIGURED_KEY, 'true');
    setPreferencesConfigured(true);
    setPreferencesFlipped(false);
  };

  const renderSearchPanel = (variant: 'landing' | 'results') => {
    const frontPanelClass = "bg-paper-block p-6 md:p-8 rounded-sm border border-ui-border shadow-search space-y-5";
    const backPanelClass = "bg-paper-block px-6 py-5 md:px-8 md:py-6 rounded-sm border border-ui-border shadow-search space-y-7";

    return (
      <div className={`${variant === 'results' ? 'w-full max-w-5xl mx-auto ' : ''}preference-card-shell`}>
        <motion.div
          className={`preference-flip-card ${preferencesFlipped ? 'is-flipped' : ''}`}
          animate={{
            rotateY: preferencesFlipped ? 180 : 0,
            height: preferencesFlipped ? 318 : 248,
          }}
          transition={{
            rotateY: { duration: 0.46, ease: 'linear' },
            height: { duration: 0.28, ease: 'linear' },
          }}
        >
          <div className={`preference-card-face preference-card-front ${frontPanelClass} ${preferencesFlipped ? 'pointer-events-none' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-6">
                <div className="flex gap-4 border-b-2 border-search-line pb-2.5 items-center">
                  <input
                    type="text"
                    placeholder={t.enterRepoPlaceholder}
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && triggerAnalysis()}
                    className="min-w-0 bg-transparent text-lg md:text-2xl font-serif italic outline-none flex-1 placeholder:text-charcoal/45 text-charcoal border-none focus:ring-0 px-0"
                    id={variant === 'landing' ? 'landing-search-input' : 'active-search-input'}
                  />
                  <button
                    disabled={isLoading}
                    onClick={() => triggerAnalysis()}
                    className="bg-btn-primary text-btn-primary-text px-8 py-3 text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all font-bold shrink-0 rounded-sm cursor-pointer disabled:opacity-40"
                    id={variant === 'landing' ? 'landing-search-btn' : 'active-search-btn'}
                  >
                    {t.analyze}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 text-xs">
                  <div className="flex bg-paper-aside p-1 rounded-sm text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setUseTimeframe(false)}
                      className={`px-3 py-1 rounded-sm transition-all ${!useTimeframe ? 'bg-paper-block text-charcoal shadow-xs font-bold' : 'text-charcoal/55'}`}
                    >
                      {t.specificVersion}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseTimeframe(true)}
                      className={`px-3 py-1 rounded-sm transition-all ${useTimeframe ? 'bg-paper-block text-charcoal shadow-xs font-bold' : 'text-charcoal/55'}`}
                    >
                      {t.relativeTimeframe}
                    </button>
                  </div>

                  {!useTimeframe ? (
                    <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                      <span className="text-charcoal/40 font-mono text-[9px] uppercase font-bold">{t.installedLabel}</span>

                      {customVersionActive ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="text"
                            placeholder="e.g. 18.2.0"
                            value={manualVersion}
                            onChange={(e) => setManualVersion(e.target.value)}
                            className="p-1 px-2 border border-ui-border bg-transparent rounded-sm text-xs font-mono font-bold max-w-[85px] outline-none text-charcoal"
                            id={variant === 'landing' ? 'landing-manual-version' : 'active-manual-version'}
                          />
                          <button
                            onClick={() => setCustomVersionActive(false)}
                            className="text-[10px] text-accent-indigo/80 hover:underline font-bold"
                          >
                            {t.autoList}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <select
                              value={currentVersion}
                              onChange={(e) => setCurrentVersion(e.target.value)}
                              disabled={tagsLoading || tags.length === 0}
                              className="theme-select appearance-none pr-8 pl-2 py-1 border rounded-sm text-xs font-mono font-bold outline-none cursor-pointer transition-all"
                              id={variant === 'landing' ? 'landing-version-select' : 'active-version-select'}
                            >
                              {tagsLoading ? (
                                <option>{t.loadingTags}</option>
                              ) : tags.length === 0 ? (
                                <option>{t.noTagsFound}</option>
                              ) : (
                                tags.map((tag) => (
                                  <option key={tag.name} value={tag.name}>
                                    {tag.name}
                                  </option>
                                ))
                              )}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal/50 pointer-events-none" />
                          </div>

                          <button
                            onClick={() => setCustomVersionActive(true)}
                            className="text-[10px] text-charcoal/40 hover:text-charcoal hover:underline"
                          >
                            {t.customLabel}
                          </button>
                        </div>
                      )}

                      <button
                        onClick={handleFetchTagsManually}
                        className="p-1 rounded-full hover:bg-charcoal/5"
                        title="Reload Tag Registry"
                        disabled={tagsLoading || !repoUrl.trim()}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-charcoal/40 ${tagsLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-charcoal/40 font-mono text-[9px] uppercase font-bold">{t.ageCheckedLabel}</span>
                      <div className="flex border border-ui-border rounded-sm overflow-hidden bg-paper-block">
                        {['1w', '1m', '3m'].map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1 font-mono transition-all text-[11px] font-extrabold ${timeframe === tf ? 'bg-btn-primary text-btn-primary-text' : 'text-charcoal hover:bg-charcoal/5'}`}
                          >
                            {tf.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setPreferencesFlipped(true)}
                    className="inline-flex w-fit items-center gap-1.5 bg-transparent p-0 text-[10px] font-mono uppercase tracking-wider text-charcoal/45 transition hover:text-charcoal active:scale-[0.98]"
                    title={lang === 'zh' ? '倾向配置' : 'Preferences'}
                    aria-label={lang === 'zh' ? '倾向配置' : 'Preferences'}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>{lang === 'zh' ? '倾向配置' : 'Preferences'}</span>
                    {!preferencesConfigured && (
                      <span className="ml-0.5 h-1 w-1 rounded-full bg-charcoal/45" aria-hidden="true" />
                    )}
                  </button>
                  <PreferenceStatusLine lang={lang} value={upgradePreferences} />
                </div>
              </div>

              {variant === 'results' && analysisResult && (
                <div className="hidden md:block">
                  <div className="inline-block border border-charcoal p-3.5 rotate-2 rounded-sm bg-paper-light text-center min-w-[100px]">
                    <p className="text-[11px] font-serif font-extrabold">{analysisResult.repoName.split('/').pop()}</p>
                    <p className="verdict-seal-word text-xl font-bold my-0.5 text-charcoal">
                      {getVerdictShort(analysisResult.verdict)}
                    </p>
                    <p className="text-[8px] uppercase tracking-wider opacity-40 font-mono">{t.verdictSealLabel}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`preference-card-face preference-card-back ${backPanelClass} ${preferencesFlipped ? '' : 'pointer-events-none'}`} aria-hidden={!preferencesFlipped}>
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setPreferencesFlipped(false)}
                className="inline-flex items-center gap-3 bg-transparent p-0 text-charcoal transition hover:text-charcoal/70"
                aria-label={lang === 'zh' ? '返回搜索' : 'Back to search'}
              >
                <ArrowLeft className="h-7 w-7 stroke-[3]" />
                <span className="font-sans text-xl font-normal text-charcoal md:text-2xl">
                  {lang === 'zh' ? '请选择您的偏好' : 'Choose your preferences'}
                </span>
              </button>
              <button
                type="button"
                onClick={confirmPreferences}
                className="shrink-0 rounded-sm bg-btn-primary px-6 py-2.5 text-sm font-normal tracking-widest text-btn-primary-text transition-all hover:opacity-90 active:scale-[0.98]"
              >
                {lang === 'zh' ? '确定' : 'Done'}
              </button>
            </div>

            <PreferenceControl lang={lang} value={upgradePreferences} onChange={setUpgradePreferences} />
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div id="siu-root" className="min-h-screen bg-transparent text-charcoal font-sans flex flex-col justify-between selection:bg-charcoal selection:text-paper-light transition-all duration-500 overflow-x-hidden relative">
      
      {/* Dynamic Network / Git Graph Constellation Background */}
      <VersionLatticeBg />

      {/* Floating Header Actions (Ledger & API Docs) */}
      <header className="p-6 md:px-12 flex justify-between items-center bg-transparent z-40">
        <div className="flex items-center space-x-6">
          {hasSearched && (
            <button 
              onClick={resetToHome} 
              className="font-serif italic text-2xl font-bold tracking-tighter hover:scale-[1.03] transition-all cursor-pointer text-charcoal"
              id="header-home-btn"
            >
              SIU.
            </button>
          )}
        </div>

        <div className="flex items-center space-x-6 text-[11px] font-mono tracking-wider font-extrabold text-charcoal/60">
          <button 
            type="button" 
            onClick={() => setShowHistoryDrawer(true)} 
            className="hover:text-charcoal hover:underline flex items-center space-x-1 cursor-pointer"
            id="open-ledger-btn"
          >
            <History className="w-3.5 h-3.5" />
            <span>{t.ledger} ({history.length})</span>
          </button>
          
          <span className="opacity-30">|</span>

          <button 
            type="button" 
            onClick={() => setShowDevPortalModal(true)} 
            className="hover:text-charcoal hover:underline flex items-center space-x-1 cursor-pointer"
            id="open-dev-btn"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{t.developers}</span>
          </button>

          <span className="opacity-30">|</span>

          <button 
            type="button" 
            onClick={() => setSettingsOpen(true)} 
            className="hover:text-accent-indigo/80 hover:underline flex items-center space-x-1 cursor-pointer text-accent-indigo font-bold"
            id="open-settings-btn"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t.settings}</span>
          </button>

          <span className="opacity-30">|</span>

          <button 
            type="button" 
            onClick={handleLanguageToggle} 
            className="hover:text-charcoal hover:underline flex items-center space-x-1 cursor-pointer text-accent-indigo font-bold bg-charcoal/5 px-1.5 py-0.5 rounded-sm"
            id="open-lang-toggle-btn"
          >
            <span>{lang === 'zh' ? 'EN' : 'ZH'}</span>
          </button>

          <span className="opacity-30">|</span>

          <button 
            type="button" 
            onClick={handleThemeToggle} 
            className="hover:text-charcoal hover:underline flex items-center space-x-1 cursor-pointer text-accent-indigo font-bold"
            id="open-theme-toggle-btn"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Core View Area */}
      <main className="flex-1 flex flex-col justify-center items-center w-full px-6 md:px-12 py-6 z-30">
        
        <AnimatePresence mode="wait">
          {!hasSearched ? (
            
            /* STATE 1: SEARCH ENGINE HOMEPAGE STYLE (Default state) */
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-2xl text-center space-y-12 py-12 md:py-20"
              id="landing-container"
            >
              {/* Massive Editorial Masthead in Center */}
              <div>
                <h1 className="font-serif italic text-7xl md:text-8xl font-bold tracking-tighter text-charcoal select-none animate-fade-in">
                  SIU.
                </h1>
              <p className="brand-subtitle tracking-normal text-charcoal/60 font-semibold mt-3">
                {t.shouldIUpgrade}
              </p>
              </div>

              {renderSearchPanel('landing')}

              {/* Popular Sandbox triggers below box */}
              <div className="space-y-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-mono font-extrabold">
                  {t.quickAuditSub}
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {POPULAR_REPOS.map((repo) => (
                    <button
                      key={repo.name}
                      onClick={() => handleQuickSeed(repo)}
                      className="px-4 py-2 text-xs font-mono font-bold bg-paper-aside hover:bg-charcoal hover:text-paper-light rounded-sm border border-ui-border-light transition-all cursor-pointer flex items-center space-x-1"
                    >
                      <span>{repo.name}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>

          ) : (

            /* STATE 2: ACTIVE QUERY / RESULTS SCREEN (Search area is pushed up) */
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col space-y-10 animate-fade-in"
              id="results-container"
            >
              {renderSearchPanel('results')}

              {/* Dynamic Screen Content: Loader, Results, or Error */}
              <div className="w-full max-w-6xl mx-auto bg-transparent">
                
                {isLoading ? (
                  <Loader 
                    repoName={repoUrl.split('/').pop() || "repository"} 
                    currentVersion={useTimeframe ? undefined : currentVersion}
                    status={streamStatus || undefined}
                    lang={lang}
                  />
                ) : error ? (
                  
                  /* ERROR DISPOSITION CONTAINER */
                  <div className="p-10 border border-status-error-border bg-status-error-bg/50 rounded-sm text-left max-w-2xl mx-auto space-y-4">
                    <div className="flex items-start space-x-3 text-status-error-text">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-serif italic font-bold text-xl text-charcoal">{t.auditSuspended}</h3>
                        <p className="text-sm mt-1.5 leading-relaxed text-status-error-text">{error}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-status-error-border flex space-x-4">
                      <button
                        onClick={() => triggerAnalysis()}
                        className="px-5 py-2 bg-btn-primary text-btn-primary-text rounded-sm text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer"
                      >
                        {t.reRunEngine}
                      </button>
                      <button
                        onClick={resetToHome}
                        className="px-5 py-2 border border-ui-border text-charcoal rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-charcoal/5 transition-all cursor-pointer"
                      >
                        {t.returnHome}
                      </button>
                    </div>
                  </div>

                ) : upToDateStatus ? (

                  /* STATE: UP-TO-DATE INFORMATION SHEET */
                  <div className="p-12 bg-paper-block border border-ui-border rounded-sm text-center max-w-2xl mx-auto space-y-6">
                    <div className="w-16 h-16 bg-paper-aside border border-ui-border rounded-full flex items-center justify-center mx-auto text-charcoal">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-charcoal/40 font-mono">{t.statusAnalysisComplete}</p>
                      <h2 className="text-3xl font-serif italic text-charcoal font-bold">{upToDateStatus.repoName}</h2>
                      <p className="text-base text-charcoal/70 leading-relaxed max-w-md mx-auto">{upToDateStatus.message}</p>
                    </div>

                    <div className="p-4 bg-paper-aside border border-ui-border-light rounded-sm flex items-center justify-around text-xs font-mono max-w-md mx-auto">
                      <div>
                        <span className="block text-charcoal/40 text-[9px] uppercase font-bold">{t.stateInstalled}</span>
                        <span className="font-bold text-charcoal text-sm">{upToDateStatus.currentVersion}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-charcoal/30 flex-shrink-0" />
                      <div>
                        <span className="block text-charcoal/40 text-[9px] uppercase font-bold">{t.gitLatestRelease}</span>
                        <span className="font-bold text-charcoal text-sm">{upToDateStatus.latestVersion}</span>
                      </div>
                    </div>
                  </div>

                ) : analysisResult ? (

                  /* STATE: DYNAMIC EDITORIAL ANALYSIS DISCLOSURE */
                  <div className="grid grid-cols-1 lg:grid-cols-12 bg-paper-block border border-ui-border shadow-sm rounded-sm overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-ui-border">
                    
                    {/* Left Frame: Verdict summary column */}
                    <div className="lg:col-span-4 p-8 md:p-10 bg-paper-card flex flex-col justify-start text-center">
                      <div className="space-y-6 flex flex-col items-center">
                        
                        {/* Elegant typographic seal circle */}
                        <div className="w-36 h-36 border border-ui-border rounded-full flex flex-col items-center justify-center relative mb-4 bg-paper-block shadow-xs">
                          <div className="absolute inset-1.5 border border-dashed border-ui-border-light rounded-full" />
                          <span className="verdict-seal-word text-5xl italic font-extrabold text-charcoal z-10">
                            {getVerdictShort(analysisResult.verdict)}
                          </span>
                          <div className="absolute -bottom-1 text-[8px] bg-charcoal text-paper-light px-2 py-0.5 tracking-wider font-mono uppercase font-bold">
                            {t.verdictSelection}
                          </div>
                        </div>

                        <h2 className="text-3xl font-serif font-bold italic text-charcoal leading-tight">
                          {getVerdictLabel(analysisResult.verdict)}
                        </h2>
                        
                        <p className="text-sm leading-relaxed text-charcoal/75 font-semibold max-w-xs border-y border-ui-border-light py-4 w-full">
                          {analysisResult.verdictReason || getVerdictSentence(analysisResult.verdict)}
                        </p>

                        <div className="text-[10px] font-mono text-charcoal/40">
                          {t.consolidatingText.replace('{count}', String(analysisResult.versionCount))}
                        </div>
                      </div>

                      {/* Diagnostic details section */}
                      <div className="pt-8 text-left border-t border-ui-border mt-8 w-full">
                        <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-mono font-bold mb-3">{lang === 'zh' ? '版本对应规格指标' : 'VERSION METRIC SCHEMA'}</p>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-charcoal/60">{t.repositoryTarget}</span>
                            <a
                              href={getRepoHref(analysisResult.repoName)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-charcoal font-semibold break-all text-right max-w-[300px] hover:text-accent-indigo hover:underline"
                            >
                              {analysisResult.repoName}
                            </a>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-charcoal/60">{t.installedStatus}</span>
                            {renderReleaseLink(analysisResult.currentVersion, "font-mono text-charcoal font-bold text-right max-w-[300px] break-all")}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-charcoal/60">{t.registryLatest}</span>
                            {renderReleaseLink(analysisResult.latestVersion, "font-mono text-charcoal font-extrabold text-right max-w-[300px] break-all")}
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 text-left border-t border-ui-border mt-8 w-full">
                        <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-mono font-bold mb-3">
                          {lang === 'zh' ? '偏好选择' : 'PREFERENCE PROFILE'}
                        </p>
                        <PreferenceSummaryList lang={lang} value={normalizePreferences(analysisResult.preferences)} />
                      </div>

                    </div>

                    {/* Right Frame: Detailed lists (Highlights, Vulnerabilities, Regressions, Timeline) */}
                    <div className="lg:col-span-8 p-8 md:p-12 space-y-10 text-left bg-paper-block overflow-y-auto">
                      
                      {/* Segment 01 - highlights */}
                      <div className="relative pl-6">
                        <span className="absolute left-0 top-0 text-[11px] font-mono opacity-25 italic text-charcoal font-bold">01</span>
                        <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-charcoal/80 mb-4 border-b border-ui-border pb-2">
                          {t.coreEnhancements}
                        </h3>
                        {getUpgradeHighlights(analysisResult).length > 0 ? (
                          <ul className="space-y-3 mb-4">
                            {getUpgradeHighlights(analysisResult).map((highlight, idx) => (
                              <li key={idx} className="group">
                                <div className="flex items-start gap-3">
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-ui-border bg-paper-aside text-[10px] font-mono font-extrabold text-charcoal/60">
                                    {idx + 1}
                                  </span>
                                  <span className="font-sans text-[13px] leading-relaxed font-semibold text-charcoal">
                                    {highlight}
                                  </span>
                                  {renderExplainButton('coreHighlights', highlight, idx)}
                                </div>
                                {renderExplanationPanel('coreHighlights', highlight, idx)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="font-serif text-lg leading-relaxed text-charcoal/40 mb-4 italic">
                            {t.noSignificantModifications}
                          </p>
                        )}
                      </div>

                      {/* Segment 02 - Security Patches and Critical updates */}
                      <div className="relative pl-6">
                        <span className="absolute left-0 top-0 text-[11px] font-mono opacity-25 italic text-charcoal font-bold">02</span>
                        <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-status-error-text/80 mb-4 border-b border-status-error-border pb-2">
                          {t.criticalResolutions}
                        </h3>
                        <ul className="space-y-2.5">
                          {analysisResult.criticalFixes && analysisResult.criticalFixes.length > 0 ? (
                            analysisResult.criticalFixes.map((fix, idx) => (
                              <li key={idx} className="group">
                                <div className="flex items-start">
                                  <span className="mr-3 text-status-error-text/60 select-none font-sans font-bold">—</span>
                                  <span className="font-sans text-[13px] leading-relaxed font-semibold text-charcoal flex-1">{fix}</span>
                                  {renderExplainButton('criticalFixes', fix, idx)}
                                </div>
                                {renderExplanationPanel('criticalFixes', fix, idx)}
                              </li>
                            ))
                          ) : (
                            <li className="italic text-charcoal/40 text-xs">{t.noSevereSecurity}</li>
                          )}
                        </ul>
                      </div>

                      {/* Segment 03 - Breaking Changes */}
                      <div className="relative pl-6">
                        <span className="absolute left-0 top-0 text-[11px] font-mono opacity-25 italic text-charcoal font-bold">03</span>
                        <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-status-warning-text/80 mb-4 border-b border-status-warning-border pb-2">
                          {t.breakingChangesTitle}
                        </h3>
                        <ul className="space-y-2.5">
                          {analysisResult.breakingChanges && analysisResult.breakingChanges.length > 0 ? (
                            analysisResult.breakingChanges.map((change, idx) => (
                              <li key={idx} className="group text-xs font-mono text-charcoal">
                                <div className="flex items-start">
                                  <span className="mr-3 text-status-warning-text font-bold select-none">•</span>
                                  <span className="leading-relaxed bg-status-warning-bg/50 rounded-xs p-2 border border-status-warning-border flex-1">{change}</span>
                                  <span className="ml-2">{renderExplainButton('breakingChanges', change, idx)}</span>
                                </div>
                                {renderExplanationPanel('breakingChanges', change, idx)}
                              </li>
                            ))
                          ) : (
                            <li className="italic text-charcoal/40 text-xs font-serif">{t.painlessMigration}</li>
                          )}
                        </ul>
                      </div>

                      {/* Segment 04 - Chronological Releases breakdown */}
                      {analysisResult.releaseBreakdown && analysisResult.releaseBreakdown.length > 0 && (
                        <div className="relative pl-6 pt-6 border-t border-ui-border mt-8">
                          <h3 className="text-[10px] uppercase tracking-[0.22em] font-extrabold text-charcoal/50 mb-4">
                            {t.logChronologies}
                          </h3>
                          
                          <div className="space-y-2.5">
                            {analysisResult.releaseBreakdown.map((rel, idx) => {
                              const isExpanded = !!expandedVersions[rel.tag];
                              return (
                                <div 
                                  key={idx} 
                                  className="border border-ui-border-light rounded-xs overflow-hidden bg-paper-light shadow-2xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleVersionRow(rel.tag)}
                                    className="w-full flex items-center justify-between p-3.5 text-left text-xs bg-paper-block hover:bg-charcoal/[0.01] cursor-pointer transition-colors border-none outline-none focus:ring-1 focus:ring-charcoal/5"
                                  >
                                    <div className="flex items-center space-x-3 min-w-0">
                                      <span className="font-mono font-bold text-charcoal text-[11px] bg-charcoal/5 px-2 py-0.5 rounded-sm shrink-0">
                                        {rel.tag}
                                      </span>
                                      <span className="font-serif italic font-bold text-charcoal truncate">
                                        {rel.name || "Release Node"}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-charcoal/40 font-mono text-[9px] shrink-0">
                                      <span>{rel.date ? new Date(rel.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''}</span>
                                      <motion.div
                                        animate={{ rotate: isExpanded ? 90 : 0 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </motion.div>
                                    </div>
                                  </button>
                                  
                                  <AnimatePresence initial={false}>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                        className="overflow-hidden bg-paper-aside border-t border-ui-border-light"
                                      >
                                        <div className="p-4 text-xs text-charcoal space-y-2 text-left">
                                          <p className="font-mono text-[9px] uppercase tracking-wider text-charcoal/40 border-b border-ui-border-light pb-1">{t.highlightTelemetries}</p>
                                          <ul className="space-y-1.5 text-charcoal/80">
                                            {rel.highlights && rel.highlights.length > 0 ? (
                                              rel.highlights.map((hil, hidx) => (
                                                <li key={hidx} className="group">
                                                  <div className="leading-relaxed flex items-start">
                                                    <span className="mr-2 text-charcoal/30 select-none">—</span>
                                                    <span className="flex-1">{hil}</span>
                                                    {renderExplainButton('releaseBreakdown', hil, hidx, rel.tag)}
                                                  </div>
                                                  {renderExplanationPanel('releaseBreakdown', hil, hidx, rel.tag)}
                                                </li>
                                              ))
                                            ) : (
                                              <li className="italic text-charcoal/40">No localized notes captured.</li>
                                            )}
                                          </ul>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Segment 05 - 代码行数统计折叠卡片 */}
                      {renderCodeMetricsSection()}
                    </div>

                  </div>

                ) : null}

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Persistent Static Minimal Footer */}
      <footer className="p-8 border-t border-ui-border bg-footer-bg text-footer-text flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold z-10 select-none">
        <div className="flex gap-8">
          <span className="text-[9px] uppercase tracking-widest opacity-50">PROJECT SIU © 2026</span>
          <span className="text-[9px] uppercase tracking-widest opacity-50">MIT LICENSE</span>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href="https://linux.do/"
            target="_blank"
            rel="noreferrer"
            aria-label="感谢 LINUX DO 社区的大力支持"
            className="text-[9px] uppercase tracking-widest text-footer-text/60 hover:text-footer-text flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <img
              src="https://linux.do/logo-128.svg"
              alt=""
              className="w-3.5 h-3.5 object-contain grayscale opacity-80"
            />
            <span>感谢 LINUX DO 社区的大力支持</span>
          </a>
          <button
            onClick={() => setShowDevPortalModal(true)}
            className="text-[9px] uppercase tracking-widest text-footer-text hover:text-accent-indigo hover:underline flex items-center space-x-1.5 cursor-pointer"
          >
            <span>{t.integrationSchema}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
        </div>
      </footer>

      {/* DRAWER LAYER: Ledger audits list history */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryDrawer(false)}
              className="fixed inset-0 bg-black z-40 transition-opacity cursor-pointer"
            />
            {/* Drawer body */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="fixed top-0 right-0 w-full sm:w-96 h-screen bg-paper-light shadow-2xl border-l border-ui-border p-8 z-50 flex flex-col justify-between overflow-hidden"
              id="ledger-drawer"
            >
              <div>
                <div className="flex justify-between items-center pb-6 border-b border-ui-border mb-6">
                  <div className="flex items-center space-x-2">
                    <History className="w-5 h-5 text-charcoal" />
                    <h3 className="text-lg font-serif italic font-bold text-charcoal">{t.auditLedger}</h3>
                  </div>
                  <button 
                    onClick={() => setShowHistoryDrawer(false)}
                    className="p-1 rounded-sm bg-charcoal/5 hover:bg-charcoal/10 transition"
                  >
                    <X className="w-4 h-4 text-charcoal" />
                  </button>
                </div>

                <HistorySidebar 
                  history={history} 
                  onSelect={loadHistoryItem} 
                  onDelete={deleteHistoryItem} 
                  onClearAll={clearAllHistory}
                  lang={lang}
                />
              </div>

              <div className="pt-6 border-t border-ui-border-light text-[9px] text-charcoal/40 font-mono tracking-tighter">
                {t.securePersistenceActive}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL OVERLAY: Developer Portal Integration guide */}
      <AnimatePresence>
        {showDevPortalModal && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDevPortalModal(false)}
              className="fixed inset-0 bg-black z-40 transition-opacity cursor-pointer"
            />
            {/* Modal Screen dialog */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-4 sm:inset-12 md:inset-20 bg-paper-light shadow-2xl p-8 rounded-sm overflow-y-auto border border-ui-border z-50 flex flex-col align-middle max-w-5xl mx-auto"
              id="dev-portal-modal"
            >
              <div className="flex justify-between items-center pb-4 border-b border-ui-border">
                <span className="font-mono text-[9px] uppercase tracking-widest text-charcoal/40 font-bold">{t.projectIntegrationSchema}</span>
                <button 
                  onClick={() => setShowDevPortalModal(false)}
                  className="p-1.5 rounded-sm bg-btn-primary text-btn-primary-text hover:opacity-90 transition cursor-pointer"
                  title="Close console"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 py-6 overflow-y-auto">
                <DevDocs lang={lang} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DRAWER LAYER: Custom API Settings */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 bg-black z-40 transition-opacity cursor-pointer"
            />
            {/* Drawer body */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="fixed top-0 right-0 w-full sm:w-96 h-screen bg-paper-light shadow-2xl border-l border-ui-border p-8 z-50 flex flex-col justify-between overflow-y-auto"
              id="settings-drawer"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-ui-border">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-charcoal" />
                    <h3 className="text-lg font-serif italic font-bold text-charcoal border-none">{t.apiSettings}</h3>
                  </div>
                  <button 
                    onClick={() => setSettingsOpen(false)}
                    className="p-1 rounded-sm bg-charcoal/5 hover:bg-charcoal/10 transition cursor-pointer"
                  >
                    <X className="w-4 h-4 text-charcoal" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="leading-relaxed bg-status-warning-bg/50 rounded-xs p-2 border border-status-warning-border text-[11px] text-charcoal text-left">
                    {t.settingsTooltip}
                  </div>

                  {/* API Base URL */}
                  <div className="space-y-1.5 text-left font-sans">
                    <label className="block font-mono text-[9px] uppercase font-bold text-charcoal/80">{t.apiBaseUrl}</label>
                    <input
                      type="text"
                      placeholder={t.apiBaseUrlPlaceholder}
                      value={customApiUrl}
                      onChange={(e) => setCustomApiUrl(e.target.value)}
                      className="w-full p-2 border border-ui-border bg-paper-block rounded-sm text-xs font-mono outline-none text-charcoal placeholder:opacity-40"
                    />
                  </div>

                  {/* API Key */}
                  <div className="space-y-1.5 text-left font-sans">
                    <label className="block font-mono text-[9px] uppercase font-bold text-charcoal/80">{t.apiKey}</label>
                    <input
                      type="password"
                      placeholder={customApiKey ? t.apiKeySet : t.apiKeyPlaceholder}
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="w-full p-2 border border-ui-border bg-paper-block rounded-sm text-xs font-mono outline-none text-charcoal placeholder:opacity-40"
                    />
                  </div>

                  {/* Model Name */}
                  <div className="space-y-1.5 text-left font-sans">
                    <label className="block font-mono text-[9px] uppercase font-bold text-charcoal/80">{t.modelName}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t.modelPlaceholder}
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        className="flex-1 p-2 border border-ui-border bg-paper-block rounded-sm text-xs font-mono outline-none text-charcoal"
                      />
                    </div>
                  </div>

                  {/* Get Model List Section */}
                  <div className="space-y-2 pt-2 text-left">
                    <button
                      type="button"
                      disabled={fetchingModels}
                      onClick={handleFetchModels}
                      className="w-full py-2 bg-paper-aside text-charcoal border border-ui-border hover:bg-charcoal hover:text-paper-light rounded-sm text-[11px] font-mono font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1"
                    >
                      {fetchingModels ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{t.fetchingModels}</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>{t.fetchModelList}</span>
                        </>
                      )}
                    </button>

                    {modelsError && (
                      <div className="p-2 border border-status-error-border bg-status-error-bg text-[11px] text-status-error-text rounded-sm">
                        {modelsError}
                      </div>
                    )}

                    {fetchedModels.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="block font-mono text-[8.5px] uppercase font-bold text-charcoal/40">{t.onlineModelsTitle}</span>
                        <div className="max-h-36 overflow-y-auto border border-ui-border-light bg-paper-light p-1.5 rounded-sm space-y-1">
                          {fetchedModels.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setCustomModel(m)}
                              className={`w-full text-left p-1.5 rounded-xs font-mono text-[10.5px] truncate transition-colors cursor-pointer ${customModel === m ? 'bg-btn-primary text-btn-primary-text font-bold' : 'hover:bg-charcoal/5 text-charcoal/70'}`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reset Settings */}
                  <div className="pt-4 border-t border-ui-border-light flex justify-between gap-3 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomApiUrl('');
                        setCustomApiKey('');
                        setCustomModel('');
                        setFetchedModels([]);
                        setModelsError(null);
                        localStorage.removeItem('siu_custom_api_url');
                        localStorage.removeItem('siu_custom_api_key');
                        localStorage.removeItem('siu_custom_model');
                      }}
                      className="px-3 py-1.5 border border-ui-border text-charcoal/60 rounded-sm hover:text-status-error-text hover:border-status-error-border hover:bg-status-error-bg text-[10px] uppercase font-mono font-bold transition"
                    >
                      {t.resetSettings}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="px-4 py-1.5 bg-btn-primary text-btn-primary-text rounded-sm hover:opacity-90 text-[10px] uppercase font-mono font-bold transition cursor-pointer"
                    >
                      {t.saveAndClose}
                    </button>
                  </div>

                </div>
              </div>

              <div className="pt-6 border-t border-ui-border-light text-[9px] text-charcoal/40 font-mono tracking-tighter text-left">
                {t.clientPersistenceLabel}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
