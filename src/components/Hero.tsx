import { Flame } from 'lucide-react';
import type { State } from '@/lib/types';
import { levelInfo, levelProgress } from '@/lib/gamification';

interface Props {
  state: State;
}

export function Hero({ state }: Props) {
  const { current, next } = levelInfo(state.level);
  const prog = levelProgress(state.xp);

  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white animate-float"
          style={{
            background: 'linear-gradient(135deg, var(--accent-grad-1), var(--accent-grad-2))',
            boxShadow: '0 4px 16px rgba(46, 125, 79, 0.3)',
          }}
        >
          {state.level}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-primary truncate">{current.title}</h2>
            {state.streak > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                <Flame size={11} />
                {state.streak}
              </span>
            )}
          </div>
          <p className="text-xs text-secondary">
            Level {state.level} · {state.xp.toLocaleString()} XP
          </p>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted mb-1">
          <span>{current.title}</span>
          <span>{next ? `${prog.toNext} XP to ${next.title}` : 'Max level'}</span>
        </div>
        <div className="h-2 rounded-full bg-ring-track overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${prog.pct}%`,
              background: 'linear-gradient(90deg, var(--accent-grad-1), var(--accent-grad-2))',
            }}
          />
        </div>
      </div>
    </div>
  );
}
