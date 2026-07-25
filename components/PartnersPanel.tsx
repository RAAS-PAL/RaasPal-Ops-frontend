'use client';

/**
 * PartnersPanel — admin management of distributor/service partners (e.g. PCS).
 *
 * Create partners, enable/disable them (disable is an instant kill-switch for
 * all their keys), mint and revoke API keys (the plaintext is shown once), and
 * assign/un-assign the robot deployments each partner services. Pairs with the
 * backend /api/v1/partners endpoints. Labels are translated via next-intl.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Bot,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Handshake,
  KeyRound,
  Loader2,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { partnerApi, robotUnitApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type {
  ApiKeyResponse,
  CreatedApiKeyResponse,
  PartnerResponse,
  RobotUnitResponse,
} from '@/types/api';

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message ?? fallback;
}

function robotDisplayName(r: RobotUnitResponse): string {
  return r.name ?? [r.brand, r.model].filter(Boolean).join(' ') ?? r.serialNumber;
}

const inputClass =
  'h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]';

export function PartnersPanel() {
  const t = useTranslations('partnersPanel');
  const queryClient = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: partners = [], isLoading, isError } = useQuery({
    queryKey: ['partners'],
    queryFn: () => partnerApi.list().then((r) => r.data.data ?? []),
  });

  const { data: robots = [], isLoading: robotsLoading } = useQuery({
    queryKey: ['robot-units'],
    queryFn: () => robotUnitApi.list().then((r) => r.data.data ?? []),
    // Keep the robots list warm so re-opening a partner is instant, not a refetch.
    staleTime: 60_000,
  });

  const partnerNameById = useMemo(
    () => new Map(partners.map((p) => [p.id, p.name])),
    [partners],
  );

  function refreshPartners() {
    queryClient.invalidateQueries({ queryKey: ['partners'] });
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => partnerApi.create({ name }).then((r) => r.data),
    onSuccess: () => {
      refreshPartners();
      setAdding(false);
      setNewName('');
    },
    onError: (e) => setFormError(errorMessage(e, t('createError'))),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      partnerApi.update(id, { active }).then((r) => r.data),
    onSuccess: refreshPartners,
  });

  function submitCreate() {
    setFormError(null);
    if (!newName.trim()) return setFormError(t('nameRequired'));
    createMutation.mutate(newName.trim());
  }

  /* ── List ──────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
          <Handshake className="h-4 w-4" />
          {t('intro')}
        </div>
        {!adding && (
          <Button type="button" onClick={() => { setAdding(true); setFormError(null); }} className="bg-[var(--app-brand)] text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> {t('newPartner')}
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
          <label className="text-xs font-semibold text-[var(--app-muted)]">{t('partnerName')} *</label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              autoFocus
              className={`${inputClass} max-w-xs`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
              placeholder={t('partnerNamePlaceholder')}
            />
            <Button type="button" onClick={submitCreate} disabled={createMutation.isPending} className="bg-[var(--app-brand)] text-white hover:opacity-90">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('create')}
            </Button>
            <Button
              type="button"
              onClick={() => { setAdding(false); setNewName(''); setFormError(null); }}
              className="border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:border-[var(--app-brand)]"
            >
              {t('cancel')}
            </Button>
          </div>
          {formError && (
            <p className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> {formError}
            </p>
          )}
        </div>
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

      {!isLoading && !isError && partners.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-10 text-center text-sm text-[var(--app-muted)]">
          {t('empty')}
        </div>
      )}

      <ul className="space-y-2">
        {partners.map((p) => {
          const expanded = expandedId === p.id;
          return (
            <li key={p.id} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Handshake className="h-4 w-4 shrink-0 text-[var(--app-brand-dark)]" />
                  <span className="truncate text-sm font-semibold text-[var(--app-text)]">{p.name}</span>
                  <StatusPill active={p.active} activeLabel={t('active')} disabledLabel={t('disabled')} />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActiveMutation.mutate({ id: p.id, active: !p.active })}
                    disabled={toggleActiveMutation.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)] disabled:opacity-50"
                  >
                    <Power className="h-3.5 w-3.5" />
                    {p.active ? t('disable') : t('enable')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : p.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {t('manage')}
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {expanded && (
                <PartnerDetail
                  partner={p}
                  robots={robots}
                  robotsLoading={robotsLoading}
                  partnerNameById={partnerNameById}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Per-partner detail: API keys + serviced robots ───────────────────────── */

function StatusPill({ active, activeLabel, disabledLabel }: { active: boolean; activeLabel: string; disabledLabel: string }) {
  return active ? (
    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
      {activeLabel}
    </span>
  ) : (
    <span className="rounded-full border border-[var(--app-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--app-muted)]">
      {disabledLabel}
    </span>
  );
}

function PartnerDetail({
  partner,
  robots,
  robotsLoading,
  partnerNameById,
}: {
  partner: PartnerResponse;
  robots: RobotUnitResponse[];
  robotsLoading: boolean;
  partnerNameById: Map<string, string>;
}) {
  const t = useTranslations('partnersPanel');
  const queryClient = useQueryClient();
  const [keyLabel, setKeyLabel] = useState('');
  const [minted, setMinted] = useState<CreatedApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignSel, setAssignSel] = useState<Set<string>>(new Set());

  const { data: keys = [], isLoading: keysLoading } = useQuery({
    queryKey: ['partner-keys', partner.id],
    queryFn: () => partnerApi.listKeys(partner.id).then((r) => r.data.data ?? []),
  });

  function refreshKeys() {
    queryClient.invalidateQueries({ queryKey: ['partner-keys', partner.id] });
  }
  function refreshRobots() {
    queryClient.invalidateQueries({ queryKey: ['robot-units'] });
  }

  const mintMutation = useMutation({
    mutationFn: (label: string) =>
      partnerApi.createKey(partner.id, { label: label.trim() || null }).then((r) => r.data),
    onSuccess: (res) => {
      setMinted(res.data);
      setKeyLabel('');
      setCopied(false);
      refreshKeys();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => partnerApi.revokeKey(keyId).then((r) => r.data),
    onSuccess: refreshKeys,
  });

  const assignMutation = useMutation({
    mutationFn: (deploymentIds: string[]) =>
      partnerApi.assignDeployments(partner.id, deploymentIds).then((r) => r.data),
    onSuccess: () => { setAssignSel(new Set()); setAssignSearch(''); refreshRobots(); },
  });

  const unassignMutation = useMutation({
    mutationFn: (deploymentId: string) =>
      partnerApi.assignDeployment(deploymentId, null).then((r) => r.data),
    onSuccess: refreshRobots,
  });

  const assigned = robots.filter((r) => r.deployment && r.deployment.partnerId === partner.id);
  const assignable = robots.filter((r) => r.deployment && r.deployment.partnerId !== partner.id);

  const q = assignSearch.trim().toLowerCase();
  const assignableFiltered = q
    ? assignable.filter((r) =>
        [robotDisplayName(r), r.serialNumber, r.brand, r.model, r.deployment?.customerName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q))
    : assignable;
  const filteredIds = assignableFiltered.map((r) => r.deployment!.deploymentId);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => assignSel.has(id));

  function toggleSel(id: string) {
    setAssignSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelAllFiltered() {
    setAssignSel((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function copyKey(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable (insecure context) — user can select manually */
    }
  }

  return (
    <div className="space-y-6 border-t border-[var(--app-border)] bg-[var(--app-panel-alt)] p-4">
      {/* ── API keys ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
          <KeyRound className="h-4 w-4 text-[var(--app-brand-dark)]" /> {t('keysTitle')}
        </div>

        {minted && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {t('mintedTitle')}
              </p>
              <button type="button" onClick={() => setMinted(null)} className="text-amber-700 hover:opacity-70 dark:text-amber-300" aria-label={t('dismiss')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-amber-300 bg-white px-2 py-1.5 font-mono text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-100">
                {minted.apiKey}
              </code>
              <Button type="button" onClick={() => copyKey(minted.apiKey)} className="bg-[var(--app-brand)] text-white hover:opacity-90">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('mintedWarning')}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} max-w-xs`}
            value={keyLabel}
            onChange={(e) => setKeyLabel(e.target.value)}
            placeholder={t('keyLabelPlaceholder')}
          />
          <Button
            type="button"
            onClick={() => mintMutation.mutate(keyLabel)}
            disabled={mintMutation.isPending}
            className="bg-[var(--app-brand)] text-white hover:opacity-90"
          >
            {mintMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('mintKey')}
          </Button>
        </div>

        {keysLoading ? (
          <p className="text-xs text-[var(--app-muted)]">{t('loading')}</p>
        ) : keys.length === 0 ? (
          <p className="text-xs text-[var(--app-muted)]">{t('noKeys')}</p>
        ) : (
          <ul className="space-y-1.5">
            {keys.map((k) => (
              <KeyRow key={k.id} k={k} onRevoke={() => {
                if (confirm(t('revokeConfirm'))) revokeMutation.mutate(k.id);
              }} revoking={revokeMutation.isPending} t={t} />
            ))}
          </ul>
        )}
      </section>

      {/* ── Serviced robots ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
          <Bot className="h-4 w-4 text-[var(--app-brand-dark)]" /> {t('robotsTitle')}
        </div>

        {/* Persistent, searchable multi-select box — stays open on outside clicks
            (unlike a native <select>), so many robots can be ticked and assigned
            in one action. Search matches robot name, serial, brand, and customer. */}
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]">
          <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--app-muted)]" />
            <input
              className="h-8 w-full bg-transparent text-sm text-[var(--app-text)] outline-none"
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              placeholder={t('assignSearchPlaceholder')}
            />
          </div>

          {robotsLoading && robots.length === 0 ? (
            <p className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--app-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('loading')}
            </p>
          ) : assignable.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[var(--app-muted)]">{t('noAssignableRobots')}</p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center justify-between gap-2 border-b border-[var(--app-border)] px-3 py-2 text-xs">
                <span className="flex items-center gap-2 font-semibold text-[var(--app-text)]">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelAllFiltered}
                    disabled={filteredIds.length === 0}
                    className="h-4 w-4 accent-[var(--app-brand)]"
                  />
                  {t('selectAllFiltered', { count: filteredIds.length })}
                </span>
                <span className="text-[var(--app-muted)]">{t('selectedCount', { count: assignSel.size })}</span>
              </label>

              <ul className="max-h-64 overflow-y-auto">
                {assignableFiltered.length === 0 ? (
                  <li className="px-3 py-3 text-xs text-[var(--app-muted)]">{t('noMatch')}</li>
                ) : (
                  assignableFiltered.map((r) => {
                    const id = r.deployment!.deploymentId;
                    const otherPartner = r.deployment?.partnerId
                      ? partnerNameById.get(r.deployment.partnerId)
                      : null;
                    return (
                      <li key={id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--app-panel-alt)]">
                          <input
                            type="checkbox"
                            checked={assignSel.has(id)}
                            onChange={() => toggleSel(id)}
                            className="h-4 w-4 shrink-0 accent-[var(--app-brand)]"
                          />
                          {/* Left: robot identity (grows, truncates) */}
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Bot className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" />
                            <span className="truncate font-medium text-[var(--app-text)]">{robotDisplayName(r)}</span>
                            <span className="shrink-0 text-xs text-[var(--app-muted)]">{r.serialNumber}</span>
                          </div>
                          {/* Right: customer — fixed-width column so names line up vertically for scanning */}
                          <div
                            title={r.deployment?.customerName ?? undefined}
                            className="flex w-72 shrink-0 items-center gap-1 border-l border-[var(--app-border)] pl-3 text-xs text-[var(--app-muted)] sm:w-80"
                          >
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{r.deployment?.customerName}</span>
                            {otherPartner && (
                              <span className="ml-auto shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                                {t('assignedElsewhere', { partner: otherPartner })}
                              </span>
                            )}
                          </div>
                        </label>
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          )}
        </div>

        <Button
          type="button"
          onClick={() => assignSel.size > 0 && assignMutation.mutate([...assignSel])}
          disabled={assignSel.size === 0 || assignMutation.isPending}
          className="bg-[var(--app-brand)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('assignSelected', { count: assignSel.size })}
        </Button>

        {robotsLoading && robots.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('loading')}
          </p>
        ) : assigned.length === 0 ? (
          <p className="text-xs text-[var(--app-muted)]">{t('noRobotsAssigned')}</p>
        ) : (
          <ul className="space-y-1.5">
            {assigned.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2">
                {/* Left: robot identity (grows, truncates) */}
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[var(--app-text)]">
                  <Bot className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" />
                  <span className="truncate font-medium">{robotDisplayName(r)}</span>
                  <span className="shrink-0 text-xs text-[var(--app-muted)]">{r.serialNumber}</span>
                </div>
                {/* Right: customer — fixed-width column aligned with the assign box above */}
                <div
                  title={r.deployment?.customerName ?? undefined}
                  className="flex w-72 shrink-0 items-center gap-1 border-l border-[var(--app-border)] pl-3 text-xs text-[var(--app-muted)] sm:w-80"
                >
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{r.deployment?.customerName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t('unassignConfirm', { robot: robotDisplayName(r), partner: partner.name }))) {
                      unassignMutation.mutate(r.deployment!.deploymentId);
                    }
                  }}
                  disabled={unassignMutation.isPending}
                  aria-label={t('unassign')}
                  className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[var(--app-border)] px-2 text-xs text-red-500 transition hover:border-red-400 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t('unassign')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KeyRow({
  k,
  onRevoke,
  revoking,
  t,
}: {
  k: ApiKeyResponse;
  onRevoke: () => void;
  revoking: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const lastUsed = k.lastUsedAt
    ? t('keyLastUsed', { date: new Date(k.lastUsedAt).toLocaleDateString() })
    : t('keyNeverUsed');
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <code className="rounded bg-[var(--app-panel-alt)] px-1.5 py-0.5 font-mono text-xs text-[var(--app-text)]">{k.keyPrefix}…</code>
        {k.label && <span className="truncate text-xs text-[var(--app-muted)]">{k.label}</span>}
        <span className="text-xs text-[var(--app-muted)]">· {lastUsed}</span>
        {!k.active && (
          <span className="rounded-full border border-[var(--app-border)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--app-muted)]">{t('keyRevoked')}</span>
        )}
      </div>
      {k.active && (
        <button
          type="button"
          onClick={onRevoke}
          disabled={revoking}
          className="flex h-8 items-center gap-1 rounded-lg border border-[var(--app-border)] px-2 text-xs text-red-500 transition hover:border-red-400 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-3.5 w-3.5" /> {t('revoke')}
        </button>
      )}
    </li>
  );
}
