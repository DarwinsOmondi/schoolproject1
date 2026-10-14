// Carbon Tracker — Manifest V3 service worker (self-contained)
// Tracks data transfer via webRequest, converts bytes to CO2, and runs the gamification engine.

// --- carbon math ---------------------------------------------------------
// 1 byte transferred ≈ 0.00002g CO2e (Sustainable Web Design "1byte" model)
const GRAMS_PER_BYTE = 0.00002;
function bytesToGrams(bytes) { return bytes * GRAMS_PER_BYTE; }
function getDayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
function getWeekKey(d = new Date()) {
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  const day = t.getDay() || 7;
  const monday = new Date(t); monday.setDate(t.getDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);
}

// --- gamification --------------------------------------------------------
const LEVELS = [
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

function getInitialState() {
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

function levelFromXp(xp) {
  let lvl = 1;
  for (const l of LEVELS) if (xp >= l.minXp) lvl = l.level;
  return lvl;
}

function ensureStreak(state, day) {
  if (state.lastActiveDay === day) return state;
  if (state.lastActiveDay === null) {
    state.streak = 1;
  } else {
    const gap = daysBetween(state.lastActiveDay, day);
    if (gap === 1) state.streak += 1;
    else if (gap > 1) state.streak = 1;
  }
  state.lastActiveDay = day;
  state.daysTracked += 1;
  return state;
}

function applyEmissions(state, grams) {
  state.totalGrams += grams;
  // XP: minimal — 1 XP per emission event, slightly more for heavy pages
  const xpGain = Math.max(1, Math.round(Math.log10(grams + 10) * 1));
  state.xp += xpGain;
  state.level = levelFromXp(state.xp);
  state.bestDayGrams = Math.max(state.bestDayGrams, grams);
  return state;
}

function checkBadges(state) {
  const b = new Set(state.badges);
  if (state.totalGrams > 0) b.add('first_step');
  if (state.streak >= 3) b.add('streak3');
  if (state.streak >= 7) b.add('streak7');
  if (state.streak >= 30) b.add('streak30');
  if (state.totalGrams >= 100) b.add('saver_100');
  if (state.level >= 5) b.add('level5');
  if (state.level >= 10) b.add('level10');
  state.badges = [...b];
  return state;
}

const BADGE_META = {
  first_step: { name: 'First Step', desc: 'Tracked your first gram of CO2.' },
  mindful: { name: 'Mindful Browser', desc: 'Stayed under 20g in a single day.' },
  streak3: { name: '3-Day Streak', desc: 'Tracked 3 days in a row.' },
  streak7: { name: 'Week Warrior', desc: 'A full 7-day streak!' },
  streak30: { name: 'Carbon Crusher', desc: '30 days of mindful tracking.' },
  low_week: { name: 'Light Week', desc: 'Averaged under 15g/day for a week.' },
  saver_100: { name: 'Century Saver', desc: 'Offset 100g through awareness.' },
  level5: { name: 'Eco Apprentice', desc: 'Reached level 5.' },
  level10: { name: 'Eco Guardian', desc: 'Reached level 10.' },
};

// --- storage keys --------------------------------------------------------
const STATE_KEY = 'ct_state';
const SITES_KEY = 'ct_sites';
const HISTORY_KEY = 'ct_history';
const BADGE_KEY = 'ct_badges_seen';

async function getState() {
  const { [STATE_KEY]: s } = await chrome.storage.local.get(STATE_KEY);
  return s || getInitialState();
}
async function saveState(s) { await chrome.storage.local.set({ [STATE_KEY]: s }); }
async function getHistory() {
  const { [HISTORY_KEY]: h } = await chrome.storage.local.get(HISTORY_KEY);
  return h || {};
}
async function saveHistory(h) { await chrome.storage.local.set({ [HISTORY_KEY]: h }); }
async function getSites() {
  const { [SITES_KEY]: s } = await chrome.storage.local.get(SITES_KEY);
  return s || {};
}
async function saveSites(s) { await chrome.storage.local.set({ [SITES_KEY]: s }); }
async function getSeenBadges() {
  const { [BADGE_KEY]: b } = await chrome.storage.local.get(BADGE_KEY);
  return b || [];
}
async function saveSeenBadges(b) { await chrome.storage.local.set({ [BADGE_KEY]: b }); }

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'unknown'; }
}

// --- tracking via webRequest ---------------------------------------------
const pendingBytes = {};

chrome.webRequest.onBeforeRequest.addListener(
  (d) => {
    if (d.tabId < 0) return;
    pendingBytes[d.requestId] = 0;
    const raw = d.requestBody?.raw;
    if (raw && Array.isArray(raw)) {
      for (const part of raw) {
        if (part && typeof part.byteLength === 'number') {
          pendingBytes[d.requestId] += part.byteLength;
        }
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

chrome.webRequest.onCompleted.addListener(
  async (d) => {
    const reqBytes = pendingBytes[d.requestId] || 0;
    delete pendingBytes[d.requestId];
    const contentLength = Number(
      d.responseHeaders?.find((h) => h.name.toLowerCase() === 'content-length')?.value || 0
    );
    const total = reqBytes + contentLength;
    if (!total || total < 100) return; // ignore tiny beacons
    const grams = bytesToGrams(total);
    const host = hostOf(d.url);
    const day = getDayKey();
    await recordEmissions(grams, host, day);
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

chrome.webRequest.onErrorOccurred.addListener(
  (d) => { delete pendingBytes[d.requestId]; },
  { urls: ['<all_urls>'] }
);

async function recordEmissions(grams, host, day) {
  // history (per day)
  const history = await getHistory();
  const dayStat = history[day] || { date: day, grams: 0, requests: 0, sites: {} };
  dayStat.grams += grams;
  dayStat.requests += 1;
  dayStat.sites[host] = (dayStat.sites[host] || 0) + grams;
  history[day] = dayStat;
  await saveHistory(history);

  // sites (all time)
  const sites = await getSites();
  const site = sites[host] || { host, grams: 0, visits: 0, lastSeen: day };
  site.grams += grams;
  site.visits += 1;
  site.lastSeen = day;
  sites[host] = site;
  await saveSites(sites);

  // gamification
  let state = await getState();
  state = ensureStreak(state, day);
  const before = [...state.badges];
  state = applyEmissions(state, grams);
  state = checkBadges(state);
  await saveState(state);

  // badge notifications
  const newBadges = state.badges.filter((b) => !before.includes(b));
  if (newBadges.length) {
    const seen = await getSeenBadges();
    const fresh = newBadges.filter((b) => !seen.includes(b));
    for (const b of fresh) {
      const meta = BADGE_META[b];
      if (meta) {
        chrome.notifications?.create(`ct_badge_${b}`, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: 'New badge earned!',
          message: `${meta.name} — ${meta.desc}`,
          priority: 2,
        });
      }
    }
    if (fresh.length) await saveSeenBadges([...seen, ...fresh]);
  }
}

// --- daily alarm (streak rollover + badge check) -------------------------
chrome.alarms.create('ct_daily', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== 'ct_daily') return;
  let state = await getState();
  state = ensureStreak(state, getDayKey());
  state = checkBadges(state);
  await saveState(state);
});

// --- initialize streak on install (no fake seed data — real browsing only) ---
chrome.runtime.onInstalled.addListener(async () => {
  let state = await getState();
  state = ensureStreak(state, getDayKey());
  await saveState(state);
});
