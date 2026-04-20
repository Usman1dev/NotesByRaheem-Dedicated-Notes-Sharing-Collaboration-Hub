import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getDashboardUrl } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, profile, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to correct dashboard once profile is loaded
  useEffect(() => {
    if (user && profile) {
      navigate(getDashboardUrl(profile.role), { replace: true });
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please fill in both fields');
      return;
    }
    setLoading(true);
    setError('');
    const result = await signIn(username.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // useEffect above handles redirect once profile loads
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative z-[1]">
      <Link to="/" className="font-display font-extrabold text-foreground text-lg tracking-tight flex items-center gap-2 absolute top-8 left-8">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot inline-block" />
        NotesByRaheem
      </Link>

      <div className="bg-surface border border-border rounded-xl p-12 w-full max-w-[400px] text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
        <p className="text-muted-foreground text-[0.95rem] mb-8">Enter your credentials to access notes</p>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="username">Username</label>
            <input
              className="w-full p-3 bg-surface2 border border-border rounded-lg text-foreground text-[0.95rem] focus:outline-none focus:border-primary transition-colors"
              type="text"
              id="username"
              placeholder="e.g., raheem"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              autoComplete="username"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="password">Password</label>
            <div className="relative">
              <input
                className="w-full p-3 bg-surface2 border border-border rounded-lg text-foreground text-[0.95rem] focus:outline-none focus:border-primary transition-colors pr-16"
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted-foreground cursor-pointer text-sm hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-7 rounded-[10px] bg-primary text-primary-foreground font-medium text-[0.95rem] border-none cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="mt-6 text-muted-foreground/60 text-xs">
          Credentials are provided by admin. Contact admin if you don't have an account.
        </p>
      </div>
    </div>
  );
}
