import React from 'react';
import { Trash2, ArrowRight } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  lang?: 'en' | 'zh';
}

export default function HistorySidebar({ history, onSelect, onDelete, onClearAll, lang = 'en' }: HistorySidebarProps) {
  
  const getVerdictLabel = (verdict: string) => {
    switch (verdict) {
      case 'yes':
        return lang === 'zh' ? '升级' : 'Yes, upgrade';
      case 'maybe':
        return lang === 'zh' ? '评估' : 'Conditional';
      case 'no':
        return lang === 'zh' ? '暂缓' : 'Hold';
      default:
        return verdict;
    }
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'yes':
        return 'text-status-success-text bg-status-success-bg border-status-success-border';
      case 'maybe':
        return 'text-status-warning-text bg-status-warning-bg border-status-warning-border';
      case 'no':
        return 'text-status-neutral-text bg-status-neutral-bg border-status-neutral-border';
      default:
        return 'text-status-neutral-text bg-status-neutral-bg border-status-neutral-border/50';
    }
  };

  return (
    <div className="flex flex-col h-full text-left select-none animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] uppercase tracking-widest text-charcoal/50 font-bold">
          {lang === 'zh' ? '审计账本(历史)' : 'Audit Ledger'}
        </p>
        {history.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[9px] uppercase tracking-wider text-charcoal/40 hover:text-red-700 hover:underline transition-colors font-mono"
          >
            {lang === 'zh' ? '清空历史' : 'Clear Ledger'}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-12 px-4 text-center border border-ui-border-light bg-charcoal/5 rounded-sm">
          <p className="font-serif italic text-sm text-charcoal/50">{lang === 'zh' ? '暂无任何审计历史记录。' : 'No search records currently indexed.'}</p>
          <p className="text-[10px] text-charcoal/40 uppercase tracking-wider mt-2">{lang === 'zh' ? '输入 GitHub 地址以开展版本评估' : 'Enter a repo to generate reports'}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 h-[calc(100vh-270px)] scrollbar">
          <ul className="space-y-6">
            {history.map((item) => {
              const timeFormatted = new Date(item.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <li
                  key={item.id}
                  className="group relative border-b border-ui-border-light pb-5 last:border-0"
                >
                  <div 
                    onClick={() => onSelect(item)}
                    className="cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] text-charcoal/40 font-mono tracking-tighter">
                        {timeFormatted}
                      </span>
                      <span className={`text-[8px] py-0.5 px-1.5 rounded-sm uppercase tracking-widest font-mono border ${getVerdictStyle(item.verdict)}`}>
                        {getVerdictLabel(item.verdict)}
                      </span>
                    </div>

                    <span className="block font-serif text-lg leading-tight text-charcoal font-bold group-hover:italic group-hover:text-charcoal transition-all">
                      {item.repoName}
                    </span>

                    <div className="flex items-center space-x-1.5 text-xs text-charcoal/60">
                      <span className="font-mono bg-charcoal/5 px-1 rounded-sm text-[10px]">
                        {item.currentVersion}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 text-charcoal/30 flex-shrink-0" />
                      <span className="font-mono bg-charcoal/5 px-1 rounded-sm text-[10px] font-bold text-charcoal">
                        {item.latestVersion}
                      </span>
                    </div>
                  </div>

                  {/* Absolute Delete Button */}
                  <button
                    onClick={(e) => onDelete(item.id, e)}
                    className="absolute bottom-5 right-0 p-1 rounded-sm text-charcoal/35 hover:text-status-error-text hover:bg-status-error-bg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
