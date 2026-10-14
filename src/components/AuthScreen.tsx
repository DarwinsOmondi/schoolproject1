import { useState } from 'react';
import { Leaf, Mail, Lock, Loader2 } from 'lucide-react';

interface Props {
  onAuth: (email: string, password: string, mode: 'signin' | 'signup') => Promise<void>;
}

export function AuthScreen({ onAuth }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onAuth(email.trim(), password, mode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[480px] text-primary flex flex-col items-center justify-center px-6 animate-fade-up">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 animate-float"
        style={{ background: 'linear-gradient(135deg, var(--accent-grad-1), var(--accent-grad-2))', boxShadow: '0 8px 32px rgba(46, 125, 79, 0.35)' }}
      >
        <Leaf size={38} className="text-white" />
      </div>
      <h1 className="text-xl font-bold mb-1">Carbon Tracker</h1>
      <p className="text-xs text-muted mb-6 text-center">
        {mode === 'signin' ? 'Sign in to sync your footprint' : 'Create an account to start tracking'}
      </p>

      <form onSubmit={submit} className="w-full space-y-3">
        <div className="relative">
          <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full glass border border-subtle rounded-xl pl-11 pr-3 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <div className="relative">
          <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full glass border border-subtle rounded-xl pl-11 pr-3 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--accent-grad-1), var(--accent-grad-2))', boxShadow: '0 4px 16px rgba(46, 125, 79, 0.25)' }}
        >
          {busy && <Loader2 size={18} className="animate-spin" />}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError(null);
        }}
        className="mt-5 text-xs text-accent hover:opacity-80 transition-opacity"
      >
        {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
