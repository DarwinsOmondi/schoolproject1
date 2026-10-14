import { supabase } from './supabase';

export interface ManualEntry {
  id: string;
  user_id: string;
  category: string;
  activity: string;
  detail: string | null;
  grams: number;
  accuracy: string;
  grid_factor: number | null;
  location: string | null;
  logged_at: string;
  _local?: boolean; // true when only in local storage (not yet synced)
}

const LOCAL_KEY = 'ct_manual_entries';

// --- local storage helpers (chrome.storage or localStorage fallback) ---

async function getLocal(): Promise<ManualEntry[]> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const { [LOCAL_KEY]: arr } = await chrome.storage.local.get(LOCAL_KEY);
    return (arr as ManualEntry[]) ?? [];
  }
  const raw = localStorage.getItem(LOCAL_KEY);
  return raw ? (JSON.parse(raw) as ManualEntry[]) : [];
}

async function saveLocal(entries: ManualEntry[]): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [LOCAL_KEY]: entries });
  } else {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  }
}

function genId(): string {
  return 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// --- public API ---

export async function fetchEntries(): Promise<ManualEntry[]> {
  // Always load from local first for instant display
  const local = await getLocal();

  // If signed in, merge with cloud (cloud is source of truth for synced entries)
  if (supabase.auth.getSession() === null) return local;

  const { data, error } = await supabase
    .from('manual_entries')
    .select('*')
    .order('logged_at', { ascending: false })
    .limit(200);

  if (error) {
    // network error — just return local
    return local;
  }

  const cloud = (data ?? []) as ManualEntry[];
  // Merge: cloud entries replace local synced ones, keep unsynced local entries
  const cloudIds = new Set(cloud.map((e) => e.id));
  const localOnly = local.filter((e) => !cloudIds.has(e.id) && e._local);
  const merged = [...cloud, ...localOnly].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
  );

  // Update local cache with merged result
  await saveLocal(merged);
  return merged;
}

export async function insertEntry(
  entry: Omit<ManualEntry, 'id' | 'user_id' | 'logged_at'>,
): Promise<ManualEntry> {
  const now = new Date().toISOString();
  const localEntry: ManualEntry = {
    ...entry,
    id: genId(),
    user_id: '',
    logged_at: now,
    _local: true,
  };

  // Save to local immediately
  const local = await getLocal();
  local.unshift(localEntry);
  await saveLocal(local);

  // Try to sync to cloud if signed in
  const { data: session } = await supabase.auth.getSession();
  if (session.session?.user) {
    const { data, error } = await supabase
      .from('manual_entries')
      .insert({
        category: entry.category,
        activity: entry.activity,
        detail: entry.detail,
        grams: entry.grams,
        accuracy: entry.accuracy,
        grid_factor: entry.grid_factor,
        location: entry.location,
      })
      .select()
      .single();

    if (!error && data) {
      // Replace local entry with cloud version
      const cloudEntry = data as ManualEntry;
      const entries = await getLocal();
      const updated = entries.map((e) =>
        e.id === localEntry.id ? cloudEntry : e,
      );
      await saveLocal(updated);
      return cloudEntry;
    }
    // Cloud failed — keep local entry, it stays _local: true
  }

  return localEntry;
}

export async function deleteEntry(id: string): Promise<void> {
  // Remove from local
  const local = await getLocal();
  const filtered = local.filter((e) => e.id !== id);
  await saveLocal(filtered);

  // Try to delete from cloud (only if it's a cloud entry)
  if (!id.startsWith('local-')) {
    const { error } = await supabase.from('manual_entries').delete().eq('id', id);
    if (error) {
      // Cloud delete failed — entry already removed locally, will retry on next sync
      console.warn('Cloud delete failed:', error.message);
    }
  }
}

// Sync unsynced local entries to cloud (called on sign-in)
export async function syncLocalToCloud(): Promise<void> {
  const local = await getLocal();
  const unsynced = local.filter((e) => e._local);
  if (unsynced.length === 0) return;

  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) return;

  for (const entry of unsynced) {
    const { data, error } = await supabase
      .from('manual_entries')
      .insert({
        category: entry.category,
        activity: entry.activity,
        detail: entry.detail,
        grams: entry.grams,
        accuracy: entry.accuracy,
        grid_factor: entry.grid_factor,
        location: entry.location,
      })
      .select()
      .single();

    if (!error && data) {
      const cloudEntry = data as ManualEntry;
      const entries = await getLocal();
      const updated = entries.map((e) =>
        e.id === entry.id ? cloudEntry : e,
      );
      await saveLocal(updated);
    }
  }
}
