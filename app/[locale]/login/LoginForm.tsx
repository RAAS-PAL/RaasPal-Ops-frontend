/**
 * app/[locale]/login/LoginForm.tsx
 *
 * Client component — handles the login form, API call, and post-login redirect.
 * Accepts `locale` so it can build the redirect URL with the correct prefix.
 */

'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginFormProps {
  locale: string;
}

export function LoginForm({ locale }: LoginFormProps) {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function attemptLogin() {
    const res = await authApi.login({ email, password });
    if (!res.data.success) throw new Error(res.data.message ?? 'Login failed');
    return res.data.data;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;
      try {
        result = await attemptLogin();
      } catch (err: unknown) {
        // No response = network error (cold start / timeout). Auto-retry once.
        const hasResponse = !!(err as { response?: unknown })?.response;
        if (!hasResponse) {
          setError('Server is starting up, retrying…');
          await new Promise((r) => setTimeout(r, 3000));
          result = await attemptLogin();
        } else {
          throw err;
        }
      }

      const { accessToken, user } = result;

      login(accessToken, user);

      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken }),
      });

      router.push('/', { locale });
    } catch (err: unknown) {
      const hasResponse = !!(err as { response?: unknown })?.response;
      const message = hasResponse
        ? ((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid email or password')
        : 'Server is unavailable. Please try again in a moment.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-[var(--app-text)]" htmlFor="email">
          Email
        </Label>
        <Input
          autoComplete="email"
          className="h-11 rounded-xl border-[var(--app-border)] bg-[var(--app-panel-alt)]/80 text-[var(--app-text)] placeholder:text-[var(--app-muted)] transition focus-visible:border-[var(--app-brand)] focus-visible:ring-[var(--app-brand)]"
          disabled={loading}
          id="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="specialist@raaspal.com"
          required
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-[var(--app-text)]" htmlFor="password">
          Password
        </Label>
        <div className="relative">
          <Input
            autoComplete="current-password"
            className="h-11 rounded-xl border-[var(--app-border)] bg-[var(--app-panel-alt)]/80 pr-10 text-[var(--app-text)] placeholder:text-[var(--app-muted)] transition focus-visible:border-[var(--app-brand)] focus-visible:ring-[var(--app-brand)]"
            disabled={loading}
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
          />
          <button
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)]"
            onClick={() => setShowPassword((v) => !v)}
            type="button"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <Button
        className="h-11 w-full rounded-xl bg-[var(--app-brand)] font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:ring-[var(--app-brand)] active:scale-[0.99]"
        disabled={loading}
        type="submit"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
