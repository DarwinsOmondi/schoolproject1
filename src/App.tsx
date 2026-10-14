import { useState } from 'react';
import { Leaf, LogOut, LogIn, CloudOff } from 'lucide-react';
import { useDashboard } from '@/lib/useDashboard';
import { useAuth } from '@/lib/useAuth';
import { AuthScreen } from '@/components/AuthScreen';
import { Hero } from '@/components/Hero';
import { Tabs, type TabId } from '@/components/Tabs';
import { OverviewTab } from '@/components/OverviewTab';
import { LogTab } from '@/components/LogTab';
import { BadgesTab } from '@/components/BadgesTab';
import { SitesTab } from '@/components/SitesTab';
import { SettingsTab } from '@/components/SettingsTab';

function App() {
  const { data, loading, reset, updateGoal } = useDashboard();
  const { user, profile, loading: authLoading, signIn, signUp, signOut, updateProfile } = useAuth();
  const [tab, setTab] = useState<TabId>('overview');
  const [showAuth, setShowAuth] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-[480px] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center animate-pulse">
          <Leaf size={22} className="text-accent" />
        </div>
        <p className="text-xs text-muted">Loading…</p>
      </div>
    );
  }

  if (!user && showAuth) {
    const handleAuth = async (email: string, password: string, mode: 'signin' | 'signup') => {
      if (mode === 'signup') {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      setShowAuth(false);
    };
    return (
      <>
        <AuthScreen onAuth={handleAuth} />
        <button
          onClick={() => setShowAuth(false)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-muted hover:text-secondary transition-colors whitespace-nowrap"
        >
          Continue without an account
        </button>
      </>
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-[480px] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center animate-pulse">
          <Leaf size={22} className="text-accent" />
        </div>
        <p className="text-xs text-muted">Loading your footprint…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[480px] text-primary flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-3.5 pb-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--accent-grad-1), var(--accent-grad-2))' }}
          >
            <Leaf size={20} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight">Carbon Tracker</span>
        </div>
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <span className="text-[10px] text-muted hidden sm:inline">{user.email}</span>
              <button
                onClick={() => signOut()}
                className="text-muted hover:text-red-400 transition-colors p-1"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1 text-[10px] text-muted hover:text-accent transition-colors"
              title="Sign in to sync across devices"
            >
              <LogIn size={15} />
              <span className="text-xs font-semibold">Sign in</span>
            </button>
          )}
        </div>
      </header>

      {/* Offline indicator for guest mode */}
      {!user && (
        <div className="mx-4 mt-1 flex items-center gap-1.5 text-[10px] text-muted glass rounded-lg px-2.5 py-1.5">
          <CloudOff size={11} className="text-muted" />
          <span>Local-only mode — entries saved on this device. Sign in to sync.</span>
        </div>
      )}

      <Hero state={data.state} />
      <Tabs active={tab} onChange={setTab} />

      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' && <OverviewTab data={data} onGoalChange={updateGoal} />}
        {tab === 'log' && (
          <LogTab profile={profile} onProfileChange={updateProfile} />
        )}
        {tab === 'badges' && <BadgesTab state={data.state} />}
        {tab === 'sites' && <SitesTab sites={data.sites} />}
        {tab === 'settings' && <SettingsTab onReset={reset} goal={data.goal} onUpdateGoal={updateGoal} />}
      </div>
    </div>
  );
}

export default App;
