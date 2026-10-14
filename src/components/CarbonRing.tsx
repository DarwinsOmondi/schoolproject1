import { useMemo } from 'react';
import { formatGrams, gramsToEquivalent } from '@/lib/carbon';
import type { SiteStat } from '@/lib/types';

interface Props {
  todayGrams: number;
  goalGrams: number;
  sites?: SiteStat[];
  periodLabel?: string;
}

export function CarbonRing({ todayGrams, goalGrams, sites = [], periodLabel = 'today' }: Props) {
  const ratio = goalGrams > 0 ? todayGrams / goalGrams : 0;
  const pct = Math.min(100, ratio * 100);
  const over = todayGrams > goalGrams;
  const remaining = Math.max(0, goalGrams - todayGrams);
  const equiv = gramsToEquivalent(todayGrams);

  const r = 78;
  const circ = 2 * Math.PI * r;
  const targetOffset = useMemo(() => circ - (pct / 100) * circ, [circ, pct]);

  const waveRange = circ * 0.025;
  const waveStart = targetOffset + waveRange;
  const waveMid = targetOffset - waveRange;
  const waveEnd = targetOffset + waveRange * 0.5;

  const topSites = sites.slice(0, 3);
  const maxSiteGrams = topSites[0]?.grams || 1;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Ring */}
      <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
        <svg width="220" height="220" className="-rotate-90">
          <defs>
            <linearGradient id="ringGrad-ok" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#66bb6a" />
              <stop offset="100%" stopColor="#2e7d32" />
            </linearGradient>
            <linearGradient id="ringGrad-over" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="14" />
          <circle
            cx="110" cy="110" r={r} fill="none"
            stroke={`url(#ringGrad-${over ? 'over' : 'ok'})`}
            strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={targetOffset}
            style={{
              transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease',
              filter: over ? 'drop-shadow(0 0 8px rgba(239,68,68,0.4))' : 'drop-shadow(0 0 6px rgba(46,125,79,0.25))',
            }}
          />
          <circle
            cx="110" cy="110" r={r} fill="none"
            stroke={`url(#ringGrad-${over ? 'over' : 'ok'})`}
            strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circ}
            style={{
              '--wave-start': waveStart,
              '--wave-mid': waveMid,
              '--wave-end': waveEnd,
              opacity: 0.3,
              animation: 'wave 3s ease-in-out infinite',
            } as React.CSSProperties}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span
            className={`text-4xl font-bold tabular-nums ${over ? 'text-red-500' : 'text-primary'}`}
          >
            {formatGrams(todayGrams)}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
            CO₂ {periodLabel}
          </span>
          {over ? (
            <span className="text-[11px] font-semibold mt-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-500">
              {Math.round(ratio * 100)}% of goal
            </span>
          ) : (
            <span className="text-[11px] font-semibold mt-1 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent-text">
              {formatGrams(remaining)} left
            </span>
          )}
        </div>
      </div>

      {/* Detail card */}
      <div className="w-full glass rounded-xl p-3 space-y-2.5">
        {/* Goal progress bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted">Daily goal: {formatGrams(goalGrams)}</span>
            <span className={over ? 'text-red-500 font-semibold' : 'text-accent-text font-semibold'}>
              {Math.round(ratio * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ring-track overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(100, ratio * 100)}%`,
                background: over
                  ? 'linear-gradient(90deg, #fbbf24, #ef4444)'
                  : 'linear-gradient(90deg, var(--accent-grad-1), var(--accent-grad-2))',
              }}
            />
          </div>
        </div>

        {/* Equivalent impact */}
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-subtle">
          <span className="text-muted">Equivalent to</span>
          <span className="text-secondary font-medium">{equiv.value} {equiv.label}</span>
        </div>

        {/* Top contributing sites */}
        {topSites.length > 0 && (
          <div className="pt-1 border-t border-subtle space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted">Top sources today</span>
            {topSites.map((s) => {
              const sitePct = (s.grams / maxSiteGrams) * 100;
              return (
                <div key={s.host} className="flex items-center gap-2">
                  <span className="text-[10px] text-secondary truncate flex-1 max-w-[120px]">{s.host}</span>
                  <div className="flex-1 h-1 rounded-full bg-ring-track overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent/40"
                      style={{ width: `${sitePct}%`, transition: 'width 0.5s ease' }}
                    />
                  </div>
                  <span className="text-[10px] text-muted tabular-nums w-12 text-right">{formatGrams(s.grams)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
