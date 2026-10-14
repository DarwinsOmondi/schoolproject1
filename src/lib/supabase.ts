import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  storageKey: 'ct_supabase_auth',
  storage: {
      getItem: (key: string) => {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          return new Promise((resolve) => {
            chrome.storage.local.get(key, (res) => resolve((res[key] as string) ?? null));
          });
        }
        return Promise.resolve(localStorage.getItem(key));
      },
      setItem: (key: string, value: string) => {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          return new Promise<void>((resolve) => {
            chrome.storage.local.set({ [key]: value }, () => resolve());
          });
        }
        localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          return new Promise<void>((resolve) => {
            chrome.storage.local.remove(key, () => resolve());
          });
        }
        localStorage.removeItem(key);
        return Promise.resolve();
      },
    },
  },
});
