import { Lock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { State } from '@/lib/types';
import { BADGES } from '@/lib/gamification';

interface Props {
  state: State;
}

export function BadgesTab({ state }: Props) {
  const earned = new Set(state.badges);

  return (
    <div className="px-4 py-3 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-secondary">
          {earned.size} of {BADGES.length} earned
        </span>
        <span className="text-[10px] text-muted">Keep browsing mindfully</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BADGES.map((b) => {
          const isEarned = earned.has(b.id);
          const Icon = (LucideIcons as any)[b.icon] || Lock;
          return (
            <div
              key={b.id}
              className={`relative rounded-xl border p-3 text-center transition-all ${
                isEarned
                  ? 'glass-strong border-accent/30'
                  : 'glass border-subtle opacity-50'
              }`}
            >
              <div
                className={`mx-auto mb-1.5 w-10 h-10 rounded-full flex items-center justify-center ${
                  isEarned ? 'bg-accent/20 text-accent animate-pop-in' : 'bg-elevated text-muted'
                }`}
              >
                <Icon size={20} />
              </div>
              <p className={`text-[11px] font-semibold leading-tight ${isEarned ? 'text-primary' : 'text-muted'}`}>
                {b.name}
              </p>
              <p className="text-[9px] text-muted leading-tight mt-0.5">{b.desc}</p>
              {!isEarned && (
                <div className="absolute top-1.5 right-1.5">
                  <Lock size={10} className="text-muted" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
