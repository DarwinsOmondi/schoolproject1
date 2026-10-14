import { TrendingDown, TrendingUp, Calendar, Car } from 'lucide-react';
import type { DashboardData, GoalPeriod } from '@/lib/types';
import { GOAL_PRESETS } from '@/lib/types';
import { CarbonRing } from './CarbonRing';
import { formatGrams } from '@/lib/carbon';
import { gramsToEquivalent } from '@/lib/carbon';

interface Props {
  data: DashboardData;
  onGoalChange: (goal: DashboardData['goal']) => Promise<void>;
}

export function OverviewTab({ data, onGoalChange }: Props) {
  const { state, today, history, weekTotal, weekAvg, goal } = data;
  const todayGrams = today?.grams || 0;

  // Compute period grams and label based on goal period
  let periodGrams = todayGrams;
  let periodLabel = 'today';
  if (goal.period === 'weekly') {
    periodGrams = history.slice(-7).reduce((s, d) => s + d.grams, 0);
    periodLabel = 'this week';
  } else if (goal.period === 'monthly') {
    periodGrams = history.reduce((s, d) => s + d.grams, 0) * (30 / 14);
    periodLabel = 'this month';
  }

  const todayVal = history[history.length - 1]?.grams || 0;
  const yestVal = history[history.length - 2]?.grams || 0;
  const diff = todayVal - yestVal;
  const trendUp = diff > 0;

  const equiv = gramsToEquivalent(state.totalGrams);

  const handlePeriodChange = async (period: GoalPeriod) => {
    await onGoalChange({ period, targetGrams: GOAL_PRESETS[period].target });
  };

  return (
    <div className="px-4 py-3 space-y-4 animate-fade-up">
      {/* Period selector */}
      <div className="flex items-center justify-center gap-1.5">
        {(Object.keys(GOAL_PRESETS) as GoalPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              goal.period === p
                ? 'bg-accent/15 text-accent-text border border-accent/30'
                : 'bg-elevated text-secondary border border-subtle hover:bg-input'
            }`}
          >
            {GOAL_PRESETS[p].label}
          </button>
        ))}
      </div>

      {/* Ring + today */}
      <div className="flex flex-col items-center pt-1 pb-2">
        <CarbonRing
          todayGrams={periodGrams}
          goalGrams={goal.targetGrams}
          sites={data.sites}
          periodLabel={periodLabel}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Calendar size={14} />}
          label="This week"
          value={formatGrams(weekTotal)}
          sub={`avg ${formatGrams(weekAvg)}/day`}
        />
        <StatCard
          icon={trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          label="vs yesterday"
          value={`${diff >= 0 ? '+' : ''}${formatGrams(Math.abs(diff))}`}
          sub={trendUp ? 'higher today' : 'lower today'}
          accent={trendUp ? 'text-orange-500' : 'text-accent'}
        />
      </div>

      {/* 14-day sparkline chart */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-secondary">Last 14 days</span>
          <span className="text-[10px] text-muted">grams CO₂</span>
        </div>
        <div className="glass rounded-xl p-2">
          <Sparkline values={history.map((h) => h.grams)} />
        </div>
      </div>

      {/* Total + equivalent */}
      <div className="glass glass-hover rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Lifetime tracked</p>
            <p className="text-lg font-bold text-primary">{formatGrams(state.totalGrams)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted">Equivalent to</p>
            <p className="text-sm font-semibold text-secondary flex items-center gap-1 justify-end">
              <Car size={13} className="text-muted" />
              {equiv.value} {equiv.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'text-primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="glass glass-hover rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-muted mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-base font-bold ${accent}`}>{value}</p>
      <p className="text-[10px] text-muted">{sub}</p>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 320;
  const h = 56;
  const pad = 4;
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1 || 1);

  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return { x, y, v };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${h - pad} L${points[0].x.toFixed(1)},${h - pad} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-grad-1)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent-grad-1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkFill)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={isLast ? 3 : 0}
            fill={isLast ? 'var(--accent)' : 'transparent'}
            className={isLast ? 'animate-glow' : ''}
          />
        );
      })}
    </svg>
  );
}
