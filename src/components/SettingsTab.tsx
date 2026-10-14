import { useState } from 'react';
import { Trash2, Info, Github, RotateCcw, Target } from 'lucide-react';
import type { GoalSettings, GoalPeriod } from '@/lib/types';
import { GOAL_PRESETS } from '@/lib/types';
import { formatGrams } from '@/lib/carbon';

interface Props {
  onReset: () => Promise<void>;
  goal: GoalSettings;
  onUpdateGoal: (goal: GoalSettings) => Promise<void>;
}

export function SettingsTab({ onReset, goal, onUpdateGoal }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [customTarget, setCustomTarget] = useState(goal.targetGrams.toString());

  const handlePeriodChange = async (period: GoalPeriod) => {
    const target = GOAL_PRESETS[period].target;
    setCustomTarget(target.toString());
    await onUpdateGoal({ period, targetGrams: target });
  };

  const handleCustomTarget = async () => {
    const val = parseFloat(customTarget);
    if (isNaN(val) || val <= 0) return;
    await onUpdateGoal({ ...goal, targetGrams: val });
  };

  const handleReset = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await onReset();
    setCustomTarget(goal.targetGrams.toString());
    setConfirming(false);
  };

  return (
    <div className="px-4 py-3 space-y-4 animate-fade-up">
      {/* Goal */}
      <div>
        <h3 className="text-xs font-semibold text-secondary mb-2">Emission goal</h3>
        <div className="glass rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-accent" />
            <span className="text-xs font-semibold text-primary">Target period</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(GOAL_PRESETS) as GoalPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  goal.period === p
                    ? 'bg-accent/15 text-accent-text border border-accent/30'
                    : 'bg-elevated text-secondary border border-subtle hover:bg-input'
                }`}
              >
                {GOAL_PRESETS[p].label}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted">Custom target</span>
              <span className="text-[11px] text-secondary font-medium">
                {formatGrams(goal.targetGrams)} CO₂ {GOAL_PRESETS[goal.period].label.toLowerCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                onBlur={handleCustomTarget}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="flex-1 glass border border-subtle rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50 transition-colors tabular-nums"
              />
              <span className="text-[11px] text-muted whitespace-nowrap">grams</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-secondary mb-2">How it works</h3>
        <div className="glass rounded-xl p-3 space-y-2">
          <div className="flex gap-2">
            <Info size={14} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-secondary leading-relaxed">
              Carbon Tracker measures the data transferred when you load web pages and estimates
              the resulting CO₂ emissions using the Sustainable Web Design model
              (≈ 0.02mg CO₂ per byte).
            </p>
          </div>
          <div className="flex gap-2">
            <Info size={14} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-secondary leading-relaxed">
              Earn XP for every gram tracked, level up your eco-profile, build daily streaks,
              and unlock badges as you stay mindful of your digital footprint.
            </p>
          </div>
          <div className="flex gap-2">
            <Info size={14} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-secondary leading-relaxed">
              The Log tab lets you manually log drives, food, and energy using real
              route distances from OpenStreetMap and carbon data from Open Food Facts.
              Entries are saved on your device and synced to your cloud account when signed in.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-secondary mb-2">Data</h3>
        <div className="glass rounded-xl p-3">
          <p className="text-[11px] text-secondary leading-relaxed mb-3">
            All data is stored locally on your device. When you sign in, manual entries
            and your location profile also sync to your cloud account so they're available
            across devices. Resetting clears local browsing history, XP, streaks, and badges.
          </p>
          <button
            onClick={handleReset}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
              confirming
                ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                : 'bg-elevated text-secondary border border-subtle hover:bg-input'
            }`}
          >
            {confirming ? <RotateCcw size={13} /> : <Trash2 size={13} />}
            {confirming ? 'Tap again to confirm reset' : 'Reset all data'}
          </button>
        </div>
      </div>

      <div className="text-center pt-1">
        <p className="text-[10px] text-muted flex items-center justify-center gap-1">
          <Github size={11} /> Carbon Tracker v1.0 · Made with care for the planet
        </p>
      </div>
    </div>
  );
}
