import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type LoaderStage = 'init' | 'reading' | 'collected' | 'summarizing' | 'reasoning' | 'generating' | 'cached';

export interface LoaderStatus {
  stage: LoaderStage;
  message: string;
  releaseCount?: number;
  tokenCount?: number;
}

const MIN_STATUS_MS = 500;
const SUMMARY_PARTS = ["升级重点...", "漏洞修复...", "升级风险..."];
const SUMMARY_INTERVAL_MS = 500;

interface LoaderProps {
  repoName?: string;
  currentVersion?: string;
  latestVersion?: string;
  status?: LoaderStatus;
  lang?: 'en' | 'zh';
}

export default function Loader({ repoName = "selected repository", currentVersion, latestVersion, status, lang = 'en' }: LoaderProps) {
  const [displayStatus, setDisplayStatus] = useState<LoaderStatus>(
    status || {
      stage: 'init',
      message: lang === 'zh' ? 'SIU 初始化成功...' : 'SIU initialized...',
    }
  );
  const [releaseTicker, setReleaseTicker] = useState(1);
  const [summaryStep, setSummaryStep] = useState(0);
  const lastStatusAt = useRef(Date.now());
  const pendingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!status) return;

    const isSameStage = status.stage === displayStatus.stage;
    if (isSameStage) {
      setDisplayStatus(status);
      return;
    }

    if (pendingTimer.current) {
      window.clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
    }

    const elapsed = Date.now() - lastStatusAt.current;
    const applyStatus = () => {
      setDisplayStatus(status);
      lastStatusAt.current = Date.now();
    };

    if (elapsed >= MIN_STATUS_MS) {
      applyStatus();
    } else {
      pendingTimer.current = window.setTimeout(applyStatus, MIN_STATUS_MS - elapsed);
    }

    return () => {
      if (pendingTimer.current) {
        window.clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
      }
    };
  }, [status, displayStatus.stage]);

  useEffect(() => {
    if (displayStatus.stage !== 'collected' || !displayStatus.releaseCount) return;

    setReleaseTicker(1);
    const target = Math.max(1, displayStatus.releaseCount);
    const totalDuration = Math.min(2600, Math.max(700, target * 90));
    const intervalMs = Math.max(28, Math.floor(totalDuration / target));
    const interval = window.setInterval(() => {
      setReleaseTicker((prev) => {
        if (prev >= target) {
          window.clearInterval(interval);
          return target;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [displayStatus.stage, displayStatus.releaseCount]);

  useEffect(() => {
    if (displayStatus.stage !== 'summarizing') return;

    setSummaryStep(0);
    const interval = window.setInterval(() => {
      setSummaryStep((prev) => {
        if (prev >= SUMMARY_PARTS.length) {
          window.clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, SUMMARY_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [displayStatus.stage]);

  const renderMessage = () => {
    if (displayStatus.stage === 'collected') {
      return (
        <>
          {lang === 'zh' ? '已收集到 ' : 'Collected '}
          <span className="inline-block min-w-[1.5ch] tabular-nums">{releaseTicker}</span>
          {lang === 'zh' ? ' 个版本记录' : ' release records'}
        </>
      );
    }

    if (displayStatus.stage === 'summarizing') {
      if (lang !== 'zh') {
        const englishParts = ["upgrade highlights...", "bug fixes...", "upgrade risks..."];
        return (
          <>
            <span className="block">Summarizing</span>
            <span className="mt-2 block text-xl not-italic font-sans font-extrabold">
              {englishParts.slice(0, summaryStep).join(' ')}
            </span>
          </>
        );
      }
      return (
        <>
          <span className="block">正在汇总</span>
          <span className="mt-2 block text-xl not-italic font-sans font-extrabold">
            {SUMMARY_PARTS.slice(0, summaryStep).join('')}
          </span>
        </>
      );
    }

    if (displayStatus.stage === 'generating') {
      const count = Math.max(0, displayStatus.tokenCount || 0);
      return (
        <>
          <span className="block">{lang === 'zh' ? '报告生成中...' : 'Generating report...'}</span>
          <span className="mt-2 block font-mono text-sm italic font-semibold text-charcoal/55 tabular-nums">
            ...{count}tokens
          </span>
        </>
      );
    }

    return displayStatus.message;
  };

  return (
    <div id="editorial-loader" className="flex flex-col items-center justify-center py-20 px-8 text-center max-w-lg mx-auto min-h-[400px] animate-fade-in select-none">
      {/* Editorial Bar Loader */}
      <div className="w-72 h-[2px] bg-ui-border relative overflow-hidden mb-8">
        <motion.div
          className="absolute h-full bg-charcoal"
          initial={{ left: "-30%", width: "30%" }}
          animate={{ 
            left: ["-30%", "110%"],
            width: ["30%", "40%", "30%"]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${displayStatus.stage}-${displayStatus.stage === 'summarizing' ? summaryStep : ''}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-3"
        >
          <h2 className="font-serif italic text-3xl font-bold tracking-tight text-charcoal">
            {renderMessage()}
          </h2>
          
          <p className="text-[10px] uppercase tracking-[0.25em] text-charcoal/40 font-extrabold">
            {lang === 'zh'
              ? `正在分析 ${repoName}${currentVersion ? ` / 当前版本 ${currentVersion}` : ''}`
              : `Analyzing ${repoName} ${currentVersion ? `from version ${currentVersion}` : ''}`}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Decorative typographic element */}
      <div className="mt-12 pt-6 border-t border-ui-border-light w-full flex justify-between items-center text-[9px] font-mono tracking-tighter text-charcoal/40">
        <span>SIU ENGINE DEPLOYED [3.5-FLASH]</span>
        <span>SCAN STATUS: ACTIVE</span>
      </div>
    </div>
  );
}
