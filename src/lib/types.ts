export interface DayStats {
  date: string; // YYYY-MM-DD
  grams: number;
  requests: number;
  sites: Record<string, number>; // host -> grams
}

export interface SiteStat {
  host: string;
  grams: number;
  visits: number;
  lastSeen: string;
}

export type BadgeId =
  | 'first_step'
  | 'mindful'
  | 'streak3'
  | 'streak7'
  | 'streak30'
  | 'low_week'
  | 'saver_100'
  | 'level5'
  | 'level10';

export interface BadgeMeta {
  id: BadgeId;
  name: string;
  desc: string;
  icon: string; // lucide icon name
}

export interface State {
  xp: number;
  level: number;
  streak: number;
  lastActiveDay: string | null; // day key
  totalGrams: number;
  bestDayGrams: number;
  daysTracked: number;
  badges: BadgeId[];
}

export type GoalPeriod = 'daily' | 'weekly' | 'monthly';

export interface GoalSettings {
  period: GoalPeriod;
  targetGrams: number;
}

export const DEFAULT_GOAL: GoalSettings = { period: 'daily', targetGrams: 20 };

export const GOAL_PRESETS: Record<GoalPeriod, { label: string; target: number }> = {
  daily: { label: 'Daily', target: 20 },
  weekly: { label: 'Weekly', target: 100 },
  monthly: { label: 'Monthly', target: 400 },
};

export interface DashboardData {
  state: State;
  today: DayStats | null;
  history: DayStats[]; // last 14 days, oldest first
  sites: SiteStat[]; // sorted by grams desc
  weekTotal: number;
  weekAvg: number;
  goal: GoalSettings;
}
