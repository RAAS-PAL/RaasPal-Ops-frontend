'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { robotApi } from '@/lib/api';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { RobotDetailModal } from '@/components/RobotDetailModal';
import { ListSkeleton } from '@/components/ui/skeleton';
import { StatusBadge, toneForStatus } from '@/components/ui/status-badge';
import type { RobotResponse, RobotType } from '@/types/api';

const ITEMS_PER_PAGE = 9;

const BRAND_ALIASES: Record<string, string> = {
  gs:  'gausium',
  kn:  'keenon',
  cn:  'cenobot',
  cb:  'cenobot',
};

/* ─── Badges ──────────────────────────────────────────────────────────────── */

function TypeBadge({ type }: { type: RobotType }) {
  const styles: Record<RobotType, string> = {
    CLEANING:  'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
    DELIVERY:  'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
    MOWING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[type]}`}>
      {type}
    </span>
  );
}

function PriceBadge({ robot }: { robot: RobotResponse }) {
  const bandLabels: Partial<Record<RobotResponse['priceBand'], string>> = {
    LOW: '$', MEDIUM: '$$', MODERATE: '$$', HIGH: '$$$', PREMIUM: '$$$$',
  };
  const fmt = (n: number) => '฿' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (robot.rentalPrice != null || robot.sellingPrice != null) {
    return (
      <span className="rounded-full bg-[var(--app-faint)] px-2.5 py-0.5 text-xs font-bold text-[var(--app-muted)]">
        {robot.rentalPrice != null && `${fmt(robot.rentalPrice)}/mo`}
        {robot.rentalPrice != null && robot.sellingPrice != null && ' · '}
        {robot.sellingPrice != null && fmt(robot.sellingPrice)}
      </span>
    );
  }
  if (robot.priceBand) {
    return (
      <span className="rounded-full bg-[var(--app-faint)] px-2.5 py-0.5 text-xs font-bold text-[var(--app-muted)]">
        {bandLabels[robot.priceBand] ?? robot.priceBand}
      </span>
    );
  }
  return null;
}

/* ─── Robot row ───────────────────────────────────────────────────────────── */

function RobotRow({ robot, onClick }: { robot: RobotResponse; onClick: () => void }) {
  const s = robot.spec;
  const specs = [
    s?.speedMs != null             && `${s.speedMs} m/s`,
    s?.batteryWorkTimeSweepHr != null && `${s.batteryWorkTimeSweepHr} hr`,
    s?.widthCleaningMm != null     && `${s.widthCleaningMm} mm`,
  ].filter(Boolean) as string[];

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--app-faint)]"
    >
      {robot.imageUrl ? (
        <img
          src={robot.imageUrl}
          alt={robot.model}
          className="h-9 w-9 shrink-0 rounded-lg object-contain bg-[var(--app-faint)]"
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <Bot className="h-4 w-4" />
        </span>
      )}

      <p className="w-44 shrink-0 truncate text-sm font-semibold text-[var(--app-text)]">{robot.model}</p>

      <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
        <TypeBadge type={robot.robotType} />
        <StatusBadge tone={toneForStatus(robot.testStatus)}>{robot.testStatus}</StatusBadge>
        <PriceBadge robot={robot} />
      </div>

      {specs.length > 0 && (
        <div className="hidden lg:flex items-center gap-4 shrink-0 text-xs text-[var(--app-muted)]">
          {specs.map((v) => <span key={v}>{v}</span>)}
        </div>
      )}

      <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-[var(--app-muted)] opacity-40" />
    </div>
  );
}

/* ─── Pagination ──────────────────────────────────────────────────────────── */

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', totalPages);
  } else if (currentPage >= totalPages - 3) {
    pages.push(1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages);
  }

  const btn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition';

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${btn} border border-[var(--app-border)] text-[var(--app-muted)] hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)] disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-[var(--app-muted)]">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p as number)}
            className={`${btn} ${
              p === currentPage
                ? 'bg-[var(--app-brand)] text-white'
                : 'border border-[var(--app-border)] text-[var(--app-muted)] hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]'
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${btn} border border-[var(--app-border)] text-[var(--app-muted)] hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)] disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Filter tabs ─────────────────────────────────────────────────────────── */

const TYPE_KEYS: Array<RobotType | 'ALL'> = ['ALL', 'CLEANING', 'DELIVERY', 'MOWING'];

/* ─── Main ────────────────────────────────────────────────────────────────── */

export function RobotsClient() {
  const [activeType, setActiveType] = useState<RobotType | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRobot, setSelectedRobot] = useState<RobotResponse | null>(null);
  const t = useTranslations('robots');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['robots'],
    queryFn: () => robotApi.getAll(0, 200).then((r) => r.data.data),
  });

  const all = [...(data?.content ?? [])].sort((a, b) => {
    const brandCmp = a.brand.localeCompare(b.brand);
    return brandCmp !== 0 ? brandCmp : a.model.localeCompare(b.model);
  });

  const query = searchQuery.trim().toLowerCase();
  const expanded = BRAND_ALIASES[query] ?? query;
  const searched = query
    ? all.filter((r) => {
        const brand = r.brand.toLowerCase();
        const model = r.model.toLowerCase();
        return brand.includes(query) || model.includes(query) || brand.includes(expanded);
      })
    : all;

  const filtered = activeType === 'ALL' ? searched : searched.filter((r) => r.robotType === activeType);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  function handleTypeChange(type: RobotType | 'ALL') {
    setActiveType(type);
    setCurrentPage(1);
  }

  function handleSearch(q: string) {
    setSearchQuery(q);
    setCurrentPage(1);
  }

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow="Catalog"
            title={t('title')}
            searchPlaceholder={t('searchPlaceholder')}
            searchValue={searchQuery}
            onSearchChange={handleSearch}
          />
          <div className="space-y-5 p-4 sm:p-6">

      {/* Filter tabs + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TYPE_KEYS.map((key) => {
            const label = t(`types.${key === 'ALL' ? 'all' : key.toLowerCase()}`);
            const count = key === 'ALL'
              ? searched.length
              : searched.filter((r) => r.robotType === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTypeChange(key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  activeType === key
                    ? 'bg-[var(--app-brand)] text-white'
                    : 'border border-[var(--app-border)] text-[var(--app-muted)] hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]'
                }`}
              >
                {label}
                {!isLoading && <span className="ml-1.5 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && filtered.length > 0 && (
            <p className="text-sm text-[var(--app-muted)]">
              {query
                ? t('searchResults', { count: filtered.length, query: searchQuery })
                : t('pageRange', { start: pageStart + 1, end: Math.min(pageStart + ITEMS_PER_PAGE, filtered.length), total: filtered.length })}
            </p>
          )}
          <Link
            href="/robots/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t('addRobot')}
          </Link>
        </div>
      </div>

      {/* States */}
      {isLoading && <ListSkeleton rows={6} />}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {t('failedToLoad')}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-16 text-center">
          <Bot className="mx-auto h-8 w-8 text-[var(--app-muted)]" />
          <p className="mt-3 text-sm text-[var(--app-muted)]">
            {query
              ? t('searchResults', { count: 0, query: searchQuery })
              : t('noneInCategory')}
          </p>
        </div>
      )}

      {/* Brand groups */}
      {paginated.length > 0 && (() => {
        const groups = paginated.reduce<Record<string, RobotResponse[]>>((acc, robot) => {
          (acc[robot.brand] ??= []).push(robot);
          return acc;
        }, {});
        return (
          <div className="space-y-5">
            {Object.entries(groups).map(([brand, robots]) => (
              <div key={brand} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-[var(--app-muted)]">
                    {brand}
                  </span>
                  <div className="flex-1 border-t border-[var(--app-border)]" />
                  <span className="shrink-0 text-xs text-[var(--app-muted)] opacity-60">
                    {t('modelCount', { count: robots.length })}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] divide-y divide-[var(--app-border)]">
                  {robots.map((robot) => (
                    <RobotRow key={robot.id} robot={robot} onClick={() => setSelectedRobot(robot)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Detail modal */}
      {selectedRobot && (
        <RobotDetailModal robot={selectedRobot} onClose={() => setSelectedRobot(null)} />
      )}
    </div>
        </section>
      </div>
    </main>
  );
}
