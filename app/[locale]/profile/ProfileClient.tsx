'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, UserCircle } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { UserResponse, UserRole } from '@/types/api';

/** The backend's floor for ChangePasswordRequest and for account creation. */
const MIN_PASSWORD_LENGTH = 8;

const ROLE_TONE: Record<UserRole, 'info' | 'neutral' | 'warning'> = {
  ADMIN: 'info',
  RAASPAL_TEAM: 'neutral',
  INVENTORY_STAFF: 'neutral',
  CUSTOMER: 'warning',
};

/**
 * The backend answers a refused change with a 400 whose message is written for
 * the screen ("Your current password is incorrect"), so it is shown as-is. A
 * response with no message is a network or server fault and gets the generic line.
 */
function serverMessage(err: unknown, fallback: string): string {
  const fromResponse = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (fromResponse) return fromResponse;
  return err instanceof Error && err.message ? err.message : fallback;
}

export function ProfileClient() {
  const t = useTranslations('profile');
  const user = useAuthStore((s) => s.user);

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} />

          <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
            {user ? <AccountCard user={user} /> : <AccountSkeleton />}
            <ChangePasswordCard />
          </div>
        </section>
      </div>
    </main>
  );
}

/* ─── Account ─────────────────────────────────────────────────────────────── */

function AccountCard({ user }: { user: UserResponse }) {
  const t = useTranslations('profile.account');
  const locale = useLocale();
  const dateFormat = new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { dateStyle: 'medium' });

  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--app-brand)] text-lg font-bold text-white shadow-sm">
          {user.fullName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <UserCircle className="h-4 w-4 text-[var(--app-brand)]" />
            {t('title')}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--app-muted)]">{t('description')}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label={t('name')}>{user.fullName}</Field>
        <Field label={t('email')}>{user.email}</Field>
        <Field label={t('role')}>
          <StatusBadge tone={ROLE_TONE[user.role] ?? 'neutral'}>{t(`roles.${user.role}`)}</StatusBadge>
        </Field>
        <Field label={t('status')}>
          <StatusBadge tone={user.active ? 'success' : 'danger'}>
            {user.active ? t('active') : t('inactive')}
          </StatusBadge>
        </Field>
        <Field label={t('memberSince')}>{dateFormat.format(new Date(user.createdAt))}</Field>
        <Field label={t('updated')}>{dateFormat.format(new Date(user.updatedAt))}</Field>
      </dl>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Change password ─────────────────────────────────────────────────────── */

type Outcome = { kind: 'success' } | { kind: 'error'; message: string } | null;

function ChangePasswordCard() {
  const t = useTranslations('profile.password');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [outcome, setOutcome] = useState<Outcome>(null);

  const change = useMutation({
    mutationFn: async () => {
      const res = await authApi.changePassword({ currentPassword: current, newPassword: next });
      // The interceptor only throws on non-2xx; a refusal that comes back 200 with
      // success=false (the login form handles the same shape) must not read as done.
      if (!res.data.success) throw new Error(res.data.message ?? t('errors.generic'));
    },
    onSuccess: () => {
      setOutcome({ kind: 'success' });
      setCurrent('');
      setNext('');
      setConfirm('');
    },
    onError: (err) => setOutcome({ kind: 'error', message: serverMessage(err, t('errors.generic')) }),
  });

  // The same three rules the backend applies, checked here first so the obvious
  // mistakes are caught without a round trip. The server remains the authority: a
  // wrong current password can only be found out there.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (next.length < MIN_PASSWORD_LENGTH) {
      setOutcome({ kind: 'error', message: t('errors.tooShort', { min: MIN_PASSWORD_LENGTH }) });
      return;
    }
    if (next !== confirm) {
      setOutcome({ kind: 'error', message: t('errors.mismatch') });
      return;
    }
    if (next === current) {
      setOutcome({ kind: 'error', message: t('errors.same') });
      return;
    }
    setOutcome(null);
    change.mutate();
  };

  const busy = change.isPending;
  const incomplete = !current || !next || !confirm;

  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <KeyRound className="h-4 w-4 text-[var(--app-brand)]" />
        {t('title')}
      </h2>
      <p className="mt-0.5 text-sm text-[var(--app-muted)]">{t('description')}</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <PasswordField
          autoComplete="current-password"
          disabled={busy}
          id="current-password"
          label={t('current')}
          onChange={setCurrent}
          value={current}
        />
        <PasswordField
          autoComplete="new-password"
          disabled={busy}
          hint={t('hint', { min: MIN_PASSWORD_LENGTH })}
          id="new-password"
          label={t('new')}
          onChange={setNext}
          value={next}
        />
        <PasswordField
          autoComplete="new-password"
          disabled={busy}
          id="confirm-password"
          label={t('confirm')}
          onChange={setConfirm}
          value={confirm}
        />

        {outcome?.kind === 'error' && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            {outcome.message}
          </div>
        )}
        {outcome?.kind === 'success' && (
          <div
            className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {t('success')}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            className="h-10 rounded-xl bg-[var(--app-brand)] px-5 font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99]"
            disabled={busy || incomplete}
            type="submit"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              t('submit')
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  disabled: boolean;
  hint?: string;
}) {
  const t = useTranslations('profile.password');
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-[var(--app-text)]" htmlFor={id}>
        {label}
      </Label>
      <div className="relative">
        <Input
          autoComplete={autoComplete}
          className="h-11 rounded-xl border-[var(--app-border)] bg-[var(--app-panel-alt)]/80 pr-10 text-[var(--app-text)] placeholder:text-[var(--app-muted)] transition focus-visible:border-[var(--app-brand)] focus-visible:ring-[var(--app-brand)]"
          disabled={disabled}
          id={id}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required
          type={show ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={show ? t('hide') : t('show')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)]"
          onClick={() => setShow((v) => !v)}
          type="button"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-[var(--app-muted)]">{hint}</p>}
    </div>
  );
}
