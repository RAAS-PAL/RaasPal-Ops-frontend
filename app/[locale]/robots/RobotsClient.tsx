'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, LayoutGrid, Plus, Table2 } from 'lucide-react';
import { RobotSpecMatrix } from '@/components/RobotSpecMatrix';
import { Link } from '@/i18n/navigation';
import { robotApi } from '@/lib/api';
import { ROBOT_TYPES, TYPE_LABELS, TYPE_STYLES } from '@/lib/robot-types';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { RobotDetailModal } from '@/components/RobotDetailModal';
import { ListSkeleton } from '@/components/ui/skeleton';
import { StatusBadge, toneForStatus } from '@/components/ui/status-badge';
import type { RobotResponse, RobotType } from '@/types/api';

/**
 * Cards drawn before the reader scrolls, and the number added each time they reach the
 * end. Thirty because these are cards in a grid up to eight wide, not rows: a batch
 * that does not reach the bottom of the window is revealed and immediately asked for
 * again, which works but is visible.
 */
const PAGE_SIZE = 30;

export type RobotsView = 'catalog' | 'specs';

const BRAND_ALIASES: Record<string, string> = {
  gs:  'gausium',
  kn:  'keenon',
  cn:  'cenobot',
  cb:  'cenobot',
};

/* ─── Badges ──────────────────────────────────────────────────────────────── */

function TypeBadge({ type }: { type: RobotType }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TYPE_STYLES[type]}`}>
      {TYPE_LABELS[type]}
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

/* ─── Robot card ──────────────────────────────────────────────────────────── */

/**
 * One model as a card, photo first.
 *
 * <p>Rows suited the catalogue when it was nineteen text entries. Now every model has a
 * product photo, and a photo is the fastest way to recognise a robot — nobody reads
 * "Omnie Roller Brush Version" to work out which machine it is.
 *
 * <p>The image sits in a square of its own on a faint ground. The photos are studio
 * shots on white in wildly different proportions, so `object-contain` inside a fixed
 * square keeps the grid even instead of cropping a ride-on mower to a portrait frame.
 *
 * <p>The brand is not repeated on the card: it is the heading the card sits under.
 */
function RobotCard({ robot, onClick }: { robot: RobotResponse; onClick: () => void }) {
  const s = robot.spec;
  const specs = [
    s?.speedMs != null && `${s.speedMs} m/s`,
    s?.batteryWorkTimeSweepHr != null && `${s.batteryWorkTimeSweepHr} hr`,
    s?.widthCleaningMm != null && `${s.widthCleaningMm} mm`,
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] text-left transition hover:-translate-y-0.5"
    >
      <div className="flex aspect-square w-full items-center justify-center bg-[var(--app-faint)] p-2">
        {robot.imageUrl ? (
          <img
            src={robot.imageUrl}
            alt={robot.model}
            loading="lazy"
            className="h-full w-full object-contain transition group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            <Bot className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <p className="truncate text-[13px] font-bold leading-tight text-[var(--app-text)]" title={robot.model}>
          {robot.model}
        </p>

        <div className="flex flex-wrap items-center gap-1">
          <TypeBadge type={robot.robotType} />
          <StatusBadge tone={toneForStatus(robot.testStatus)}>{robot.testStatus}</StatusBadge>
          <PriceBadge robot={robot} />
        </div>

        {specs.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--app-muted)]">
            {specs.map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}


/* ─── Filter tabs ─────────────────────────────────────────────────────────── */

const TYPE_KEYS: Array<RobotType | 'ALL'> = ['ALL', ...ROBOT_TYPES];

/* ─── Main ────────────────────────────────────────────────────────────────── */

export function RobotsClient({ initialView = 'catalog' }: { initialView?: RobotsView }) {
  const [activeType, setActiveType] = useState<RobotType | 'ALL'>('ALL');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRobot, setSelectedRobot] = useState<RobotResponse | null>(null);
  const [view, setViewState] = useState<RobotsView>(initialView);
  const t = useTranslations('robots');

  // Same approach as ReportsClient: the initial value arrives as a prop from the
  // server component, and switching rewrites the URL directly. Reading it with
  // useSearchParams instead would force the whole page behind a Suspense
  // boundary, since Next cannot prerender a component that reads the query string.
  function setView(next: RobotsView) {
    setViewState(next);
    window.history.replaceState(
      null,
      '',
      next === 'catalog' ? window.location.pathname : `?view=${next}`,
    );
  }

  // The catalogue is edited by hand a few times a week, so it is not worth re-reading
  // on every focus: the default 60s staleTime plus refetchOnWindowFocus meant clicking
  // back into the window could start another full fetch, and this request is not cheap.
  // Fifteen minutes, and only on a real remount.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['robots'],
    queryFn: () => robotApi.getAll(0, 200).then((r) => r.data.data),
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
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
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Both handlers reset the list to its first rows. Keeping a deep position after a
  // filter or a search would strand the reader among rows they did not ask for — and
  // resetting here rather than in an effect means it happens with the change, not in
  // a second render after it.
  function handleTypeChange(type: RobotType | 'ALL') {
    setActiveType(type);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearch(q: string) {
    setSearchQuery(q);
    setVisibleCount(PAGE_SIZE);
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

      {/* View switcher — browse the catalogue, or compare every spec side by side */}
      <div className="flex gap-2 border-b border-[var(--app-border)] pb-3">
        {([
          { id: 'catalog' as const, label: t('viewCatalog'), Icon: LayoutGrid },
          { id: 'specs'   as const, label: t('viewSpecs'),   Icon: Table2 },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              view === id
                ? 'bg-[var(--app-brand)] text-white'
                : 'border border-[var(--app-border)] text-[var(--app-muted)] hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {view === 'specs' && <RobotSpecMatrix />}

      {view === 'catalog' && (
       <>
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
                : t('pageRange', { start: 1, end: visible.length, total: filtered.length })}
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
      {visible.length > 0 && (() => {
        const groups = visible.reduce<Record<string, RobotResponse[]>>((acc, robot) => {
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
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                  {robots.map((robot) => (
                    <RobotCard key={robot.id} robot={robot} onClick={() => setSelectedRobot(robot)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* More rows as the reader reaches the end of the list */}
      <InfiniteScroll
        hasMore={hasMore}
        onReach={() => setVisibleCount((n) => n + PAGE_SIZE)}
        label={t('pageRange', { start: 1, end: visible.length, total: filtered.length })}
      />
       </>
      )}

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
