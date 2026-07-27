'use client';

/**
 * RobotsPanel — admin management of robot units and their deployment.
 *
 * Register a robot by serial number, link it to a customer (dropdown), set its
 * report cadence, and manage the list (change cadence inline, or deactivate).
 * Pairs with CustomersPanel. Labels are translated via next-intl ('robots').
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { customerApi, partnerApi, robotUnitApi, telemetryApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type {
  CustomerResponse,
  RegisterRobotRequest,
  ReportCadence,
  RobotUnitResponse,
  UpdateRobotRequest,
} from '@/types/api';

const BRANDS = ['GAUSIUM', 'KEENON', 'CENOBOT'];
// Weekly is intentionally omitted — automated report delivery only sends MONTHLY.
const CADENCES: ReportCadence[] = ['MONTHLY', 'OFF'];
const CADENCE_KEY: Record<ReportCadence, string> = {
  MONTHLY: 'cadenceMonthly',
  WEEKLY: 'cadenceWeekly',
  OFF: 'cadenceOff',
};

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message ?? fallback;
}

function robotDisplayName(r: RobotUnitResponse): string {
  return r.name ?? [r.brand, r.model].filter(Boolean).join(' ') ?? r.serialNumber;
}

/**
 * Dropdown label for a customer. Appends the branch when present so multiple
 * branches of the same company (e.g. two "Mitsubishi Motors") are distinguishable.
 */
function customerLabel(c: CustomerResponse): string {
  return c.branch && c.branch.trim() ? `${c.companyName} — ${c.branch}` : c.companyName;
}

const inputClass =
  'h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]';

const PAGE_SIZE = 10;

/** "YYYY-MM-DD" for a date offset from today — the sync range inputs. */
function isoDate(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const EMPTY_FORM: RegisterRobotRequest = {
  serialNumber: '',
  brand: 'GAUSIUM',
  model: '',
  name: '',
  customerProfileId: '',
  site: '',
  reportCadence: 'MONTHLY',
};

/** Prefill the form from an existing robot (for the edit flow). */
function toForm(r: RobotUnitResponse): RegisterRobotRequest {
  return {
    serialNumber: r.serialNumber,
    brand: r.brand,
    model: r.model ?? '',
    name: r.name ?? '',
    customerProfileId: r.deployment?.customerProfileId ?? '',
    site: r.deployment?.site ?? '',
    reportCadence: r.deployment?.reportCadence ?? 'MONTHLY',
  };
}

export function RobotsPanel() {
  const t = useTranslations('robotsPanel');
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [adding, setAdding] = useState(false);
  /** Selected deployment ids for the bulk cadence action. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** The robot being edited, or null when not editing. */
  const [editing, setEditing] = useState<RobotUnitResponse | null>(null);
  const [form, setForm] = useState<RegisterRobotRequest>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  /* Telemetry sync range — defaults to the last 7 days. */
  const [syncFrom, setSyncFrom] = useState(isoDate(7));
  const [syncTo, setSyncTo] = useState(isoDate(0));
  /** '' = the whole fleet; otherwise sync only that partner's robots. */
  const [syncPartnerId, setSyncPartnerId] = useState('');
  /** Re-read and overwrite reports already stored, instead of skipping them. */
  const [syncRefresh, setSyncRefresh] = useState(false);
  /** Serial currently syncing on its own row, or null. */
  const [syncingSerial, setSyncingSerial] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const cadenceLabel = (c: ReportCadence) => t(CADENCE_KEY[c]);

  const { data: robots = [], isLoading, isError } = useQuery({
    queryKey: ['robot-units'],
    queryFn: () => robotUnitApi.list().then((r) => r.data.data ?? []),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list().then((r) => r.data.data ?? []),
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => partnerApi.list().then((r) => r.data.data ?? []),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return robots;
    return robots.filter((r) =>
      [r.serialNumber, r.name, r.brand, r.model, r.deployment?.customerName, r.deployment?.site]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [robots, query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Selection targets every *filtered* robot with an active deployment (not just
  // the visible page), so "Select all" really means all matching robots.
  const selectableIds = filtered
    .filter((r) => r.deployment)
    .map((r) => r.deployment!.deploymentId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  function toggleSelect(deploymentId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(deploymentId)) next.delete(deploymentId);
      else next.add(deploymentId);
      return next;
    });
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['robot-units'] });
  }

  const registerMutation = useMutation({
    mutationFn: (body: RegisterRobotRequest) => robotUnitApi.register(body).then((r) => r.data),
    onSuccess: () => {
      refresh();
      setAdding(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => setFormError(errorMessage(e, t('registerError'))),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRobotRequest }) =>
      robotUnitApi.update(id, body).then((r) => r.data),
    onSuccess: () => {
      refresh();
      setEditing(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => setFormError(errorMessage(e, t('registerError'))),
  });

  const cadenceMutation = useMutation({
    mutationFn: ({ deploymentId, cadence }: { deploymentId: string; cadence: ReportCadence }) =>
      robotUnitApi.updateCadence(deploymentId, cadence).then((r) => r.data),
    onSuccess: refresh,
  });

  const setAllCadenceMutation = useMutation({
    mutationFn: ({ cadence, ids }: { cadence: ReportCadence; ids?: string[] }) =>
      robotUnitApi.updateAllCadence(cadence, ids).then((r) => r.data),
    onSuccess: () => {
      refresh();
      setSelected(new Set());
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (deploymentId: string) => robotUnitApi.deactivate(deploymentId).then((r) => r.data),
    onSuccess: refresh,
  });

  /**
   * Pull task reports from each robot's brand API into our database. Reports and
   * the partner API read what has been synced, so this is how fresh data appears.
   * Idempotent — re-syncing a range never duplicates rows.
   */
  const syncAllMutation = useMutation({
    mutationFn: () =>
      telemetryApi
        .syncAll(syncFrom, syncTo, syncPartnerId || undefined, syncRefresh)
        .then((r) => r.data),
    onMutate: () => setSyncError(null),
    onError: (e) => setSyncError(errorMessage(e, t('syncError'))),
  });

  const syncOneMutation = useMutation({
    mutationFn: (serialNumber: string) =>
      telemetryApi.sync(serialNumber, syncFrom, syncTo, syncRefresh).then((r) => r.data),
    onMutate: (serialNumber) => {
      setSyncError(null);
      setSyncingSerial(serialNumber);
    },
    onError: (e) => setSyncError(errorMessage(e, t('syncError'))),
    onSettled: () => setSyncingSerial(null),
  });

  const syncing = syncAllMutation.isPending || syncOneMutation.isPending;

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setAdding(true);
  }

  function openEdit(r: RobotUnitResponse) {
    setAdding(false);
    setForm(toForm(r));
    setFormError(null);
    setEditing(r);
  }

  function closeForm() {
    setAdding(false);
    setEditing(null);
    setFormError(null);
  }

  function submit() {
    setFormError(null);
    if (!editing && !form.serialNumber.trim()) return setFormError(t('serialRequired'));
    if (!form.brand?.trim()) return setFormError(t('brandRequired'));
    if (!form.customerProfileId) return setFormError(t('customerRequired'));
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        body: {
          brand: form.brand,
          model: form.model,
          name: form.name,
          customerProfileId: form.customerProfileId,
          site: form.site,
          reportCadence: form.reportCadence,
        },
      });
    } else {
      registerMutation.mutate(form);
    }
  }

  /* ── Register / edit form ──────────────────────────────────────────────── */
  if (adding || editing) {
    const field = (key: keyof RegisterRobotRequest, value: string) =>
      setForm((f) => ({ ...f, [key]: value }));
    const busy = registerMutation.isPending || updateMutation.isPending;

    return (
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
        <p className="text-sm font-semibold text-[var(--app-text)]">
          {editing ? t('editRobot') : t('registerRobot')}
        </p>

        {!editing && customers.length === 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t('noCustomers')}
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">{t('serialNumber')} *</label>
            <input
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              value={form.serialNumber}
              onChange={(e) => field('serialNumber', e.target.value)}
              placeholder="GS401-XXXX-0001"
              disabled={!!editing}
              title={editing ? t('serialImmutable') : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">{t('brand')} *</label>
            <select className={inputClass} value={form.brand} onChange={(e) => field('brand', e.target.value)}>
              {BRANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">{t('model')}</label>
            <input className={inputClass} value={form.model ?? ''} onChange={(e) => field('model', e.target.value)} placeholder="Scrubber 50 Pro" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">{t('nameLabel')}</label>
            <input className={inputClass} value={form.name ?? ''} onChange={(e) => field('name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">{t('customer')} *</label>
            <select className={inputClass} value={form.customerProfileId} onChange={(e) => field('customerProfileId', e.target.value)}>
              <option value="">{t('selectCustomer')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{customerLabel(c)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">{t('site')}</label>
            <input className={inputClass} value={form.site ?? ''} onChange={(e) => field('site', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--app-muted)]">{t('reportCadence')}</label>
            <select className={inputClass} value={form.reportCadence ?? 'MONTHLY'} onChange={(e) => field('reportCadence', e.target.value)}>
              {CADENCES.map((c) => (
                <option key={c} value={c}>{cadenceLabel(c)}</option>
              ))}
            </select>
          </div>
        </div>

        {formError && (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" /> {formError}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Button type="button" onClick={submit} disabled={busy} className="bg-[var(--app-brand)] text-white hover:opacity-90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editing ? t('saveChanges') : t('registerRobot')}
          </Button>
          <Button
            type="button"
            onClick={closeForm}
            disabled={busy}
            className="border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:border-[var(--app-brand)]"
          >
            {t('cancel')}
          </Button>
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
        <div className="flex items-center gap-2">
          <Button type="button" onClick={openAdd} className="bg-[var(--app-brand)] text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> {t('registerRobot')}
          </Button>
        </div>
      </div>

      {/* Telemetry sync: pulls task reports from the brand APIs into our database.
          Reports and the partner API only ever show what has been synced. */}
      <div className="space-y-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
            <RefreshCw className="h-4 w-4 text-[var(--app-brand-dark)]" />
            {t('syncTitle')}
          </span>
          <label className="flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
            {t('syncFrom')}
            <input
              type="date"
              value={syncFrom}
              max={syncTo}
              onChange={(e) => setSyncFrom(e.target.value)}
              className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-xs text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
            {t('syncTo')}
            <input
              type="date"
              value={syncTo}
              min={syncFrom}
              max={isoDate(0)}
              onChange={(e) => setSyncTo(e.target.value)}
              className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-xs text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            />
          </label>
          {/* Scope: the whole fleet, or just one partner's robots — the useful
              unit when onboarding or refreshing a single distributor. */}
          <label className="flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
            {t('syncScope')}
            <select
              value={syncPartnerId}
              onChange={(e) => setSyncPartnerId(e.target.value)}
              className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-xs text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            >
              <option value="">{t('syncScopeAll')}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            onClick={() => syncAllMutation.mutate()}
            disabled={syncing}
            className="bg-[var(--app-brand)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {syncAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncPartnerId
              ? t('syncPartner', { partner: partners.find((p) => p.id === syncPartnerId)?.name ?? '' })
              : t('syncAll')}
          </Button>
        </div>

        {/* Refresh re-reads reports already stored and overwrites them — needed
            after a mapping fix, since a normal sync skips anything it has seen. */}
        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-[var(--app-text)]">
          <input
            type="checkbox"
            checked={syncRefresh}
            onChange={(e) => setSyncRefresh(e.target.checked)}
            disabled={syncing}
            className="h-4 w-4 accent-[var(--app-brand)]"
          />
          {t('syncRefresh')}
        </label>

        <p className="text-xs text-[var(--app-muted)]">
          {syncRefresh ? t('syncRefreshHint') : t('syncHint')}
        </p>

        {syncAllMutation.isPending && (
          <p className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('syncRunning')}
          </p>
        )}

        {syncAllMutation.isSuccess && syncAllMutation.data?.data && (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t('syncAllDone', {
              robots: syncAllMutation.data.data.robotsSynced,
              saved: syncAllMutation.data.data.saved,
              updated: syncAllMutation.data.data.updated,
              duplicates: syncAllMutation.data.data.duplicatesSkipped,
              failed: syncAllMutation.data.data.robotsFailed,
            })}
          </p>
        )}

        {syncOneMutation.isSuccess && syncOneMutation.data?.data && (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t('syncOneDone', {
              serial: syncOneMutation.data.data.serialNumber,
              saved: syncOneMutation.data.data.saved,
              updated: syncOneMutation.data.data.updated,
              duplicates: syncOneMutation.data.data.skipped,
            })}
          </p>
        )}

        {syncError && (
          <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {syncError}
          </p>
        )}
      </div>

      {/* Selection toolbar: select all + bulk cadence for the selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--app-text)]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            disabled={selectableIds.length === 0}
            className="h-4 w-4 accent-[var(--app-brand)]"
          />
          {t('selectAll', { count: selectableIds.length })}
        </label>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--app-muted)]">{t('selectedCount', { count: selected.size })}</span>
            <Button
              type="button"
              onClick={() => {
                if (confirm(t('setSelectedMonthlyConfirm', { count: selected.size }))) {
                  setAllCadenceMutation.mutate({ cadence: 'MONTHLY', ids: [...selected] });
                }
              }}
              disabled={setAllCadenceMutation.isPending}
              className="bg-[var(--app-brand)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {setAllCadenceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
              {t('setSelectedMonthly')}
            </Button>
            <Button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={setAllCadenceMutation.isPending}
              className="border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:border-[var(--app-brand)]"
            >
              {t('clearSelection')}
            </Button>
          </div>
        )}
      </div>

      {setAllCadenceMutation.isSuccess && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CalendarCheck className="h-4 w-4 shrink-0" />
          {t('setAllMonthlyDone', { count: setAllCadenceMutation.data?.data ?? 0 })}
        </p>
      )}

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

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-10 text-center text-sm text-[var(--app-muted)]">
          {robots.length === 0 ? t('empty') : t('noMatch')}
        </div>
      )}

      <ul className="space-y-2">
        {visible.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              {r.deployment && (
                <input
                  type="checkbox"
                  checked={selected.has(r.deployment.deploymentId)}
                  onChange={() => toggleSelect(r.deployment!.deploymentId)}
                  aria-label={t('selectAria', { name: robotDisplayName(r) })}
                  className="h-4 w-4 shrink-0 accent-[var(--app-brand)]"
                />
              )}
              <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
                <Bot className="h-4 w-4 shrink-0 text-[var(--app-brand-dark)]" />
                <span className="truncate">{robotDisplayName(r)}</span>
                <span className="text-xs font-normal text-[var(--app-muted)]">{r.serialNumber}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {r.deployment?.customerName ?? t('unassigned')}
                </span>
                {r.deployment?.site && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.deployment.site}</span>
                )}
              </div>
              </div>
            </div>

            {r.deployment ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => syncOneMutation.mutate(r.serialNumber)}
                  disabled={syncing}
                  title={t('syncOneTitle')}
                  aria-label={t('syncOneAria', { name: robotDisplayName(r) })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)] disabled:opacity-50"
                >
                  {syncingSerial === r.serialNumber ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  aria-label={t('editAria', { name: robotDisplayName(r) })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <select
                  aria-label={t('cadenceAria', { name: robotDisplayName(r) })}
                  value={r.deployment.reportCadence}
                  disabled={cadenceMutation.isPending}
                  onChange={(e) =>
                    cadenceMutation.mutate({ deploymentId: r.deployment!.deploymentId, cadence: e.target.value as ReportCadence })
                  }
                  className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-xs font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
                >
                  {CADENCES.map((c) => (
                    <option key={c} value={c}>{cadenceLabel(c)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t('deactivateConfirm', { name: robotDisplayName(r), customer: r.deployment?.customerName ?? '' }))) {
                      deactivateMutation.mutate(r.deployment!.deploymentId);
                    }
                  }}
                  disabled={deactivateMutation.isPending}
                  aria-label={t('deactivateAria', { name: robotDisplayName(r) })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--app-border)] text-red-500 transition hover:border-red-400 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[var(--app-border)] px-2.5 py-1 text-xs font-semibold text-[var(--app-muted)]">
                  {t('inactive')}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  aria-label={t('editAria', { name: robotDisplayName(r) })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
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
