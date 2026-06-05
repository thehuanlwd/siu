import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Heart, type LucideIcon } from 'lucide-react';
import type { UpgradePreferenceLevel, UpgradePreferences } from '../types';

type PreferenceKey = keyof UpgradePreferences;

interface PreferenceControlProps {
  lang: 'en' | 'zh';
  value: UpgradePreferences;
  onChange: (value: UpgradePreferences) => void;
}

interface PreferenceDisplayProps {
  lang: 'en' | 'zh';
  value: UpgradePreferences;
  bordered?: boolean;
}

const LEVELS: UpgradePreferenceLevel[] = ['ignore', 'neutral', 'strong'];

const LEVEL_META: Record<UpgradePreferenceLevel, { zh: string; en: string; shortZh: string; shortEn: string }> = {
  ignore: { zh: '不关注', en: 'Ignore', shortZh: '低', shortEn: 'Low' },
  neutral: { zh: '随意', en: 'Casual', shortZh: '随', shortEn: 'Mid' },
  strong: { zh: '强烈关注', en: 'Strong focus', shortZh: '强', shortEn: 'High' },
};

const PREFERENCE_META: Record<
  PreferenceKey,
  {
    zh: string;
    en: string;
  }
> = {
  features: {
    zh: '新功能',
    en: 'New features',
  },
  ux: {
    zh: '体验优化',
    en: 'UX polish',
  },
  bugs: {
    zh: 'BUG修复',
    en: 'Bug fixes',
  },
};

export default function PreferenceControl({ lang, value, onChange }: PreferenceControlProps) {
  const setLevel = (key: PreferenceKey, level: UpgradePreferenceLevel) => {
    onChange({ ...value, [key]: level });
  };

  return (
    <div className="space-y-5">
      {(Object.keys(PREFERENCE_META) as PreferenceKey[]).map((key, index) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.035, ease: 'linear' }}
        >
          <PreferenceTrack
            itemKey={key}
            lang={lang}
            level={value[key]}
            onLevelChange={(level) => setLevel(key, level)}
          />
        </motion.div>
      ))}
    </div>
  );
}

export function PreferenceStatusLine({ lang, value }: PreferenceDisplayProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[10px] font-mono uppercase tracking-wider text-charcoal/55">
      {(Object.keys(PREFERENCE_META) as PreferenceKey[]).map((key) => {
        const meta = PREFERENCE_META[key];
        const level = value[key];
        const StatusIcon = getStatusIcon(level);
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 whitespace-nowrap"
            style={{ color: getStatusColor(level) }}
            title={`${lang === 'zh' ? meta.zh : meta.en}: ${lang === 'zh' ? LEVEL_META[level].zh : LEVEL_META[level].en}`}
          >
            <span>{lang === 'zh' ? meta.zh : meta.en}:</span>
            <StatusIcon className="h-3.5 w-3.5" />
          </span>
        );
      })}
    </div>
  );
}

export function PreferenceSummaryList({ lang, value }: PreferenceDisplayProps) {
  return (
    <div className="space-y-2 text-xs">
      {(Object.keys(PREFERENCE_META) as PreferenceKey[]).map((key) => {
        const meta = PREFERENCE_META[key];
        const level = value[key];
        return (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-charcoal/60">{lang === 'zh' ? meta.zh : meta.en}</span>
            <span className="font-mono text-charcoal">
              {lang === 'zh' ? LEVEL_META[level].zh : LEVEL_META[level].en}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function normalizePreferences(input: unknown): UpgradePreferences {
  if (!input || typeof input !== 'object') return DEFAULT_UPGRADE_PREFERENCES;
  const raw = input as Partial<UpgradePreferences>;
  return {
    features: normalizeLevel(raw.features, DEFAULT_UPGRADE_PREFERENCES.features),
    ux: normalizeLevel(raw.ux, DEFAULT_UPGRADE_PREFERENCES.ux),
    bugs: normalizeLevel(raw.bugs, DEFAULT_UPGRADE_PREFERENCES.bugs),
  };
}

export const DEFAULT_UPGRADE_PREFERENCES: UpgradePreferences = {
  features: 'neutral',
  ux: 'neutral',
  bugs: 'neutral',
};

function PreferenceTrack({
  itemKey,
  lang,
  level,
  onLevelChange,
}: {
  itemKey: PreferenceKey;
  lang: 'en' | 'zh';
  level: UpgradePreferenceLevel;
  onLevelChange: (level: UpgradePreferenceLevel) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const meta = PREFERENCE_META[itemKey];
  const activeIndex = LEVELS.indexOf(level);
  const progress = activeIndex / (LEVELS.length - 1);

  const updateFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const nextIndex = Math.round(ratio * (LEVELS.length - 1));
    onLevelChange(LEVELS[nextIndex]);
  };

  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3">
      <div className="pt-1.5 text-left text-sm font-normal text-charcoal whitespace-nowrap">
        {lang === 'zh' ? meta.zh : meta.en}
      </div>

      <div className="min-w-0 pr-[10px]">
        <div
          ref={trackRef}
          role="slider"
          aria-label={lang === 'zh' ? meta.zh : meta.en}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={activeIndex}
          tabIndex={0}
          onClick={(event) => updateFromClientX(event.clientX)}
          onPointerDown={(event) => {
            const target = event.currentTarget;
            target.setPointerCapture(event.pointerId);
            updateFromClientX(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1) return;
            updateFromClientX(event.clientX);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault();
              onLevelChange(LEVELS[Math.max(0, activeIndex - 1)]);
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault();
              onLevelChange(LEVELS[Math.min(LEVELS.length - 1, activeIndex + 1)]);
            }
          }}
          className="relative h-9 cursor-pointer touch-none rounded-sm outline-none focus:outline-none focus-visible:outline-none"
        >
          <div className="absolute left-0 right-0 top-4 h-1 -translate-y-1/2 rounded-full bg-charcoal/10" />
          <motion.div
            className="absolute left-0 top-4 h-1 -translate-y-1/2 rounded-full bg-charcoal"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.18, ease: 'linear' }}
          />
          <motion.div
            className="absolute top-4 h-5 w-5 -translate-y-1/2 rounded-full bg-charcoal shadow-sm"
            animate={{ left: `calc(${progress * 100}% - 10px)` }}
            transition={{ duration: 0.18, ease: 'linear' }}
            style={{ boxShadow: '0 0 0 7px rgba(var(--text-charcoal-rgb), 0.1)' }}
          />
          {LEVELS.map((tick, idx) => (
            <button
              key={tick}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onLevelChange(tick);
              }}
              className="absolute top-4 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-paper-block outline-none focus:outline-none focus-visible:outline-none"
              style={{
                left: `${(idx / (LEVELS.length - 1)) * 100}%`,
                borderColor: idx <= activeIndex ? 'var(--text-charcoal)' : 'rgba(var(--text-charcoal-rgb), 0.2)',
                backgroundColor: idx < activeIndex ? 'var(--text-charcoal)' : 'var(--bg-paper-block)',
              }}
              aria-label={lang === 'zh' ? LEVEL_META[tick].zh : LEVEL_META[tick].en}
            />
          ))}
        </div>

        <div className="-mt-1 grid grid-cols-3 text-[10px] font-mono uppercase tracking-wider">
          {LEVELS.map((tick, idx) => {
            const TickIcon = getStatusIcon(tick);
            return (
              <button
                key={tick}
                type="button"
                onClick={() => onLevelChange(tick)}
                className={`inline-flex items-center gap-1 bg-transparent p-0 font-normal outline-none transition hover:text-charcoal focus:outline-none focus-visible:outline-none ${
                  idx === 0 ? 'justify-self-start' : idx === 1 ? 'justify-self-center' : 'justify-self-end'
                } ${level === tick ? 'text-charcoal' : 'text-charcoal/35'}`}
              >
                <TickIcon className="h-3 w-3" />
                <span>{lang === 'zh' ? LEVEL_META[tick].zh : LEVEL_META[tick].en}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function normalizeLevel(value: unknown, fallback: UpgradePreferenceLevel): UpgradePreferenceLevel {
  return value === 'ignore' || value === 'neutral' || value === 'strong' ? value : fallback;
}

function getStatusIcon(level: UpgradePreferenceLevel): LucideIcon {
  if (level === 'strong') return Heart;
  if (level === 'neutral') return Eye;
  return EyeOff;
}

function getStatusColor(level: UpgradePreferenceLevel) {
  if (level === 'strong') return 'var(--text-charcoal)';
  if (level === 'neutral') return 'rgba(var(--text-charcoal-rgb), 0.58)';
  return 'rgba(var(--text-charcoal-rgb), 0.42)';
}
