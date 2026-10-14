import { Globe } from 'lucide-react';
import type { SiteStat } from '@/lib/types';
import { formatGrams } from '@/lib/carbon';

interface Props {
  sites: SiteStat[];
}

export function SitesTab({ sites }: Props) {
  const top = sites.slice(0, 12);
  const maxGrams = top[0]?.grams || 1;

  return (
    <div className="px-4 py-3 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-secondary">Top emitting sites</span>
        <span className="text-[10px] text-muted">all-time</span>
      </div>
      {top.length === 0 ? (
        <p className="text-xs text-muted text-center py-6">No sites tracked yet.</p>
      ) : (
        <div className="space-y-1.5">
          {top.map((s) => {
            const pct = (s.grams / maxGrams) * 100;
            return (
              <div key={s.host} className="relative rounded-lg overflow-hidden glass glass-hover">
                <div
                  className="absolute inset-0 bg-accent/10 rounded-lg"
                  style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
                />
                <div className="relative flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe size={12} className="text-muted flex-shrink-0" />
                    <span className="text-xs font-medium text-primary truncate">{s.host}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted">{s.visits} visits</span>
                    <span className="text-xs font-semibold text-primary tabular-nums">{formatGrams(s.grams)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
