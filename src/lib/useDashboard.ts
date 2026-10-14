import { useEffect, useState, useCallback } from 'react';
import type { DashboardData, DayStats, SiteStat, State, GoalSettings } from './types';
import { DEFAULT_GOAL } from './types';
import { getDayKey, getWeekKey } from './carbon';
import { getInitialState } from './gamification';

const STATE_KEY = 'ct_state';
const SITES_KEY = 'ct_sites';
const HISTORY_KEY = 'ct_history';
const GOAL_KEY = 'ct_goal';

async function loadState(): Promise<State> {
  const { [STATE_KEY]: s } = await chrome.storage.local.get(STATE_KEY);
  return s || getInitialState();
}

async function loadHistory(): Promise<Record<string, DayStats>> {
  const { [HISTORY_KEY]: h } = await chrome.storage.local.get(HISTORY_KEY);
  return h || {};
}

async function loadSites(): Promise<Record<string, SiteStat>> {
  const { [SITES_KEY]: s } = await chrome.storage.local.get(SITES_KEY);
  return s || {};
}

async function loadGoal(): Promise<GoalSettings> {
  const { [GOAL_KEY]: g } = await chrome.storage.local.get(GOAL_KEY);
  return g || DEFAULT_GOAL;
}

export function useDashboard(): {
  data: DashboardData | null;
  loading: boolean;
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
  updateGoal: (goal: GoalSettings) => Promise<void>;
} {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [state, historyMap, sitesMap, goal] = await Promise.all([
      loadState(),
      loadHistory(),
      loadSites(),
      loadGoal(),
    ]);

    const day = getDayKey();
    const today = historyMap[day] || null;

    // last 14 days, oldest first
    const history: DayStats[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      history.push(historyMap[k] || { date: k, grams: 0, requests: 0, sites: {} });
    }

    // week total + avg (last 7 entries)
    const week = history.slice(-7);
    const weekTotal = week.reduce((s, d) => s + d.grams, 0);
    const weekAvg = weekTotal / 7;

    const sites = Object.values(sitesMap).sort((a, b) => b.grams - a.grams);

    setData({ state, today, history, sites, weekTotal, weekAvg, goal });
    setLoading(false);
  }, []);

  const reset = useCallback(async () => {
    await chrome.storage.local.remove([STATE_KEY, SITES_KEY, HISTORY_KEY, 'ct_badges_seen', GOAL_KEY]);
    await refresh();
  }, [refresh]);

  const updateGoal = useCallback(async (goal: GoalSettings) => {
    await chrome.storage.local.set({ [GOAL_KEY]: goal });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    // live update when the background writes new data
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local') return;
      if (changes[STATE_KEY] || changes[HISTORY_KEY] || changes[SITES_KEY] || changes[GOAL_KEY]) {
        refresh();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  return { data, loading, refresh, reset, updateGoal };
}
