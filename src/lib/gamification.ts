import type { BadgeId, BadgeMeta, State } from './types';

export const LEVELS: { level: number; title: string; minXp: number }[] = [
  { level: 1, title: 'Seedling', minXp: 0 },
  { level: 2, title: 'Sprout', minXp: 10 },
  { level: 3, title: 'Sapling', minXp: 25 },
  { level: 4, title: 'Young Tree', minXp: 45 },
  { level: 5, title: 'Eco Apprentice', minXp: 70 },
  { level: 6, title: 'Eco Explorer', minXp: 100 },
  { level: 7, title: 'Eco Defender', minXp: 135 },
  { level: 8, title: 'Eco Champion', minXp: 175 },
  { level: 9, title: 'Eco Steward', minXp: 220 },
  { level: 10, title: 'Eco Guardian', minXp: 270 },
];

export const BADGES: BadgeMeta[] = [
  { id: 'first_step', name: 'First Step', desc: 'Tracked your first gram of CO₂.', icon: 'Footprints' },
  { id: 'mindful', name: 'Mindful Browser', desc: 'Stayed under 20g in a single day.', icon: 'Brain' },
  { id: 'streak3', name: '3-Day Streak', desc: 'Tracked 3 days in a row.', icon: 'Flame' },
  { id: 'streak7', name: 'Week Warrior', desc: 'A full 7-day streak!', icon: 'Award' },
  { id: 'streak30', name: 'Carbon Crusher', desc: '30 days of mindful tracking.', icon: 'Trophy' },
  { id: 'low_week', name: 'Light Week', desc: 'Averaged under 15g/day for a week.', icon: 'Feather' },
  { id: 'saver_100', name: 'Century Saver', desc: 'Offset 100g through awareness.', icon: 'PiggyBank' },
  { id: 'level5', name: 'Eco Apprentice', desc: 'Reached level 5.', icon: 'Leaf' },
  { id: 'level10', name: 'Eco Guardian', desc: 'Reached level 10.', icon: 'ShieldCheck' },
];

export function getInitialState(): State {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDay: null,
    totalGrams: 0,
    bestDayGrams: 0,
    daysTracked: 0,
    badges: [],
  };
}

export function levelFromXp(xp: number): number {
  let lvl = 1;
  for (const l of LEVELS) if (xp >= l.minXp) lvl = l.level;
  return lvl;
}

export function levelInfo(level: number) {
  const idx = Math.min(level, LEVELS.length) - 1;
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  return { current, next };
}

export function levelProgress(xp: number): { pct: number; toNext: number; current: number; next: number | null } {
  const level = levelFromXp(xp);
  const { current, next } = levelInfo(level);
  if (!next) return { pct: 100, toNext: 0, current: current.minXp, next: null };
  const span = next.minXp - current.minXp;
  const into = xp - current.minXp;
  return { pct: Math.min(100, (into / span) * 100), toNext: next.minXp - xp, current: current.minXp, next: next.minXp };
}

export function badgeMeta(id: BadgeId): BadgeMeta | undefined {
  return BADGES.find((b) => b.id === id);
}
