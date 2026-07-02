'use client';

/**
 * CustomersPanel — admin CRUD for customer records (report recipients).
 *
 * List + search, add/edit via an inline form, and delete (blocked by the
 * backend when robots are still deployed to the customer). Customers have no
 * login account in this MVP, so this is plain record management. Labels are
 * translated via next-intl ('customers' namespace).
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Building2,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { customerApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { CustomerRequest, CustomerResponse } from '@/types/api';

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message ?? fallback;
}

const EMPTY_FORM: CustomerRequest = {
  companyName: '',
  industry: '',
  contactEmail: '',
  contactPhone: '',
  branch: '',
  notes: '',
};

function toForm(c: CustomerResponse): CustomerRequest {
  return {
    companyName: c.companyName,
    industry: c.industry ?? '',
    contactEmail: c.contactEmail ?? '',
    contactPhone: c.contactPhone ?? '',
    branch: c.branch ?? '',
    notes: c.notes ?? '',
  };
}

const inputClass =
  'h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]';

const PAGE_SIZE = 10;

export function CustomersPanel() {
  const t = useTranslations('customers');
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  /** null = list view; 'new' = add form; object = edit form. */
  const [editing, setEditing] = useState<CustomerResponse | 'new' | null>(null);
  const [form, setForm] = useState<CustomerRequest>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: customers = [], isLoading, isError } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list().then((r) => r.data.data ?? []),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.companyName, c.contactEmail, c.contactPhone, c.industry]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [customers, query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  }

  const saveMutation = useMutation({
    mutationFn: (body: CustomerRequest) =>
      editing && editing !== 'new'
        ? customerApi.update(editing.id, body).then((r) => r.data)
        : customerApi.create(body).then((r) => r.data),
    onSuccess: () => {
      refresh();
      setEditing(null);
    },
    onError: (e) => setFormError(errorMessage(e, t('saveError'))),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.delete(id).then((r) => r.data),
    onSuccess: refresh,
  });

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing('new');
  }

  function openEdit(c: CustomerResponse) {
    setForm(toForm(c));
    setFormError(null);
    setEditing(c);
  }

  function submit() {
    setFormError(null);
    if (!form.companyName.trim()) {
      setFormError(t('companyRequired'));
      return;
    }
    saveMutation.mutate(form);
  }

  /* ── Add / edit form ───────────────────────────────────────────────────── */
  if (editing) {
    const field = (key: keyof CustomerRequest, value: string) =>
      setForm((f) => ({ ...f, [key]: value }));

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
          <p className="text-sm font-semibold text-[var(--app-text)]">
            {editing === 'new' ? t('addCustomer') : t('editCustomer', { name: editing.companyName })}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-[var(--app-muted)]">{t('companyName')} *</label>
              <input className={inputClass} value={form.companyName} onChange={(e) => field('companyName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--app-muted)]">{t('contactEmail')}</label>
              <input className={inputClass} type="text" value={form.contactEmail ?? ''} onChange={(e) => field('contactEmail', e.target.value)} placeholder="reports@customer.com, ops@customer.com" />
              <p className="text-xs text-[var(--app-muted)]">{t('contactEmailHint')}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--app-muted)]">{t('contactPhone')}</label>
              <input className={inputClass} value={form.contactPhone ?? ''} onChange={(e) => field('contactPhone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--app-muted)]">{t('industry')}</label>
              <input className={inputClass} value={form.industry ?? ''} onChange={(e) => field('industry', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--app-muted)]">{t('branch')}</label>
              <input className={inputClass} value={form.branch ?? ''} onChange={(e) => field('branch', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-[var(--app-muted)]">{t('notes')}</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
                value={form.notes ?? ''}
                onChange={(e) => field('notes', e.target.value)}
              />
            </div>
          </div>

          {formError && (
            <p className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> {formError}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <Button type="button" onClick={submit} disabled={saveMutation.isPending} className="bg-[var(--app-brand)] text-white hover:opacity-90">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing === 'new' ? t('createCustomer') : t('saveChanges')}
            </Button>
            <Button
              type="button"
              onClick={() => setEditing(null)}
              disabled={saveMutation.isPending}
              className="border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:border-[var(--app-brand)]"
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── List view ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-10 pr-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </div>
        <Button type="button" onClick={openAdd} className="bg-[var(--app-brand)] text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> {t('addCustomer')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-sm text-[var(--app-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('loading')}
        </div>
      )}

      {isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {t('loadError')}
        </p>
      )}

      {deleteMutation.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage(deleteMutation.error, t('deleteError'))}
        </p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-10 text-center text-sm text-[var(--app-muted)]">
          {customers.length === 0 ? t('empty') : t('noMatch')}
        </div>
      )}

      <ul className="space-y-2">
        {visible.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
                <Building2 className="h-4 w-4 shrink-0 text-[var(--app-brand-dark)]" />
                <span className="truncate">{c.companyName}</span>
                {c.industry && <span className="text-xs font-normal text-[var(--app-muted)]">· {c.industry}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
                {c.contactEmail && (
                  <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{c.contactEmail}</span>
                )}
                {c.contactPhone && (
                  <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{c.contactPhone}</span>
                )}
                <span>{t('robotCount', { count: c.robotCount })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEdit(c)}
                aria-label={t('editAria', { name: c.companyName })}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(t('deleteConfirm', { name: c.companyName }))) {
                    deleteMutation.mutate(c.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                aria-label={t('deleteAria', { name: c.companyName })}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--app-border)] text-red-500 transition hover:border-red-400 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:border-[var(--app-brand)]"
          >
            {t('loadMore', { count: filtered.length - visibleCount })}
          </Button>
        </div>
      )}
    </div>
  );
}
