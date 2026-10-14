import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { syncLocalToCloud } from './entries';

export interface Profile {
  location: string | null;
  grid_factor: number | null;
}

const PROFILE_KEY = 'ct_profile';

async function getLocalProfile(): Promise<Profile | null> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const { [PROFILE_KEY]: p } = await chrome.storage.local.get(PROFILE_KEY);
    return (p as Profile) ?? null;
  }
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as Profile) : null;
}

async function saveLocalProfile(p: Profile): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [PROFILE_KEY]: p });
  } else {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (uid?: string) => {
    // Always load local profile first for instant display
    const local = await getLocalProfile();
    if (local) setProfile(local);

    if (!uid) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('location, grid_factor')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) {
      console.error('profile load error', error.message);
      return;
    }
    const cloudProfile = data ?? { location: null, grid_factor: null };
    setProfile(cloudProfile);
    await saveLocalProfile(cloudProfile);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Load local profile immediately (before auth resolves)
    getLocalProfile().then((p) => {
      if (mounted && p) setProfile(p);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        refreshProfile(data.session.user.id);
        // Sync any local-only entries to cloud on sign-in
        syncLocalToCloud();
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        refreshProfile(sess.user.id);
        syncLocalToCloud();
      } else {
        // Keep local profile on sign-out
        getLocalProfile().then((p) => setProfile(p));
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Keep local profile and entries
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      // Update local immediately
      const current = profile ?? { location: null, grid_factor: null };
      const merged = { ...current, ...updates };
      setProfile(merged);
      await saveLocalProfile(merged);

      // Sync to cloud if signed in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, ...updates });
        if (error) {
          console.warn('Profile cloud sync failed:', error.message);
        }
      }
    },
    [user, profile],
  );

  return {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  };
}
