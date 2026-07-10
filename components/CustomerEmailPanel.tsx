'use client';

/**
 * CustomerEmailPanel — "Email customers" tab.
 *
 * A general-purpose channel to email selected customers a free-text message.
 * The email body is EXACTLY what's typed here — no report links, no template —
 * so it's safe for announcements separate from the report automation. Supports
 * search, select-all, pagination, an optional CC list, and sends one private
 * email per customer.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Search,
  Send,
} from 'lucide-react';
import { customerApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { CustomerResponse } from '@/types/api';

const PAGE_SIZE = 10;

function customerLabel(c: CustomerResponse): string {
  return c.branch && c.branch.trim() ? `${c.companyName} — ${c.branch}` : c.companyName;
}

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message ?? fallback;
}

export function CustomerEmailPanel() {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [cc, setCc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: customers = [], isLoading, isError } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list().then((r) => r.data.data ?? []),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.companyName, c.branch, c.contactEmail].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [customers, query]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Select-all targets every *filtered* customer (not just the visible page).
  const filteredIds = filtered.map((c) => c.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(filteredIds));
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sendMutation = useMutation({
    mutationFn: () =>
      customerApi
        .sendAnnouncement({
          customerProfileIds: [...selected],
          subject: subject.trim(),
          message,
          cc: cc.trim() ? cc.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : undefined,
        })
        .then((r) => r.data.data),
    onSuccess: () => setSelected(new Set()),
  });

  function submit() {
    setFormError(null);
    if (selected.size === 0) return setFormError('Select at least one customer.');
    if (!subject.trim()) return setFormError('Enter a subject.');
    if (!message.trim()) return setFormError('Enter a message.');
    const count = selected.size;
    if (!confirm(`Send this email to ${count} customer${count === 1 ? '' : 's'}?`)) return;
    sendMutation.mutate();
  }

  const inputClass =
    'h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]';

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ── Left: choose recipients ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers…"
              className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-9 pr-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            />
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-[var(--app-text)]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              disabled={filteredIds.length === 0}
              className="h-4 w-4 accent-[var(--app-brand)]"
            />
            Select all ({filteredIds.length}) · {selected.size} selected
          </label>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--app-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading customers…
          </div>
        )}
        {isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            Could not load customers.
          </p>
        )}

        <ul className="space-y-2">
          {visible.map((c) => {
            const hasEmail = !!c.contactEmail?.trim();
            return (
              <li key={c.id}>
                <label
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                    hasEmail ? 'cursor-pointer border-[var(--app-border)] bg-[var(--app-panel)]' : 'border-dashed border-[var(--app-border)] opacity-60'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      disabled={!hasEmail}
                      className="h-4 w-4 shrink-0 accent-[var(--app-brand)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--app-text)]">{customerLabel(c)}</span>
                      <span className="block truncate text-xs text-[var(--app-muted)]">
                        {c.contactEmail || 'No contact email'}
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {hasMore && (
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:border-[var(--app-brand)]"
            >
              Load more ({filtered.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>

      {/* ── Right: compose ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
          <p className="text-sm font-semibold text-[var(--app-text)]">Compose message</p>
          <p className="text-xs text-[var(--app-muted)]">
            The email contains only what you type below — no report links or attachments. Each customer gets a
            separate email; CC (optional) is added to every one.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">Subject *</label>
            <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Report system update" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">CC (optional)</label>
            <input className={inputClass} value={cc} onChange={(e) => setCc(e.target.value)} placeholder="team@raaspal.com, manager@raaspal.com" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              placeholder="Type the exact message the customer will receive…"
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            />
          </div>

          {formError && (
            <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> {formError}
            </p>
          )}

          <Button
            type="button"
            onClick={submit}
            disabled={sendMutation.isPending}
            className="w-full bg-[var(--app-brand)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sendMutation.isPending ? 'Sending…' : `Send to ${selected.size} customer${selected.size === 1 ? '' : 's'}`}
          </Button>
        </div>

        {sendMutation.isSuccess && sendMutation.data && (
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {sendMutation.data.sent} sent{sendMutation.data.failed > 0 ? `, ${sendMutation.data.failed} failed` : ''}.
            </p>
            {sendMutation.data.items.filter((i) => !i.ok).length > 0 && (
              <ul className="space-y-0.5 text-xs text-red-600 dark:text-red-400">
                {sendMutation.data.items
                  .filter((i) => !i.ok)
                  .map((i, idx) => (
                    <li key={idx}>
                      <Mail className="mr-1 inline h-3 w-3" />
                      {i.customerName}: {i.error}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
        {sendMutation.isError && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage(sendMutation.error, 'Send failed — check SMTP config and that customers have emails.')}
          </p>
        )}
      </div>
    </div>
  );
}
