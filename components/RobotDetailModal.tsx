'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { authApi, robotApi } from '@/lib/api';
import { TYPE_STYLES } from '@/lib/robot-types';
import type { RobotResponse, RobotSpecResponse } from '@/types/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const fmt = (v: number | null | undefined, unit = '') =>
  v != null ? `${v}${unit}` : '—';

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-muted)]">{title}</p>
      {children}
      <div className="border-t border-[var(--app-border)]" />
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--app-muted)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function Tags({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-[var(--app-muted)]">{label}</p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span key={item} className="rounded-full bg-[var(--app-brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--app-brand-dark)]">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--app-muted)]">—</p>
      )}
    </div>
  );
}

/* ─── Spec sections ───────────────────────────────────────────────────────── */

function SpecDetails({ s }: { s: RobotSpecResponse }) {
  const t = useTranslations('robotDetail');
  const fmtBool = (v: boolean | null | undefined) =>
    v === true ? `✓ ${t('yes')}` : v === false ? `✗ ${t('no')}` : '—';
  const cleaningFunctions = [
    [s.cleaningFunctionSweepNoVacuum, t('fn.sweepNoVacuum')],
    [s.cleaningFunctionSweepVacuum,   t('fn.sweepVacuum')],
    [s.cleaningFunctionMopDry,        t('fn.mopDry')],
    [s.cleaningFunctionMopWet,        t('fn.mopWet')],
    [s.cleaningFunctionScrubBrushRoller, t('fn.scrubRoller')],
    [s.cleaningFunctionScrubBrushDisc,   t('fn.scrubDisc')],
  ].filter(([v]) => v === true).map(([, label]) => label as string);

  const navTags = [
    [s.navigationLidar2d,      t('nav.lidar2d')],
    [s.navigationLidar3d,      t('nav.lidar3d')],
    [s.navigationCameraVslam,  t('nav.vslam')],
    [s.spotAi,                 t('nav.spotAi')],
  ].filter(([v]) => v === true).map(([, label]) => label as string);

  const floorTypes = [
    [s.floorTypePavingBlocks,   t('floor.pavingBlocks')],
    [s.floorTypeGranite,        t('floor.granite')],
    [s.floorTypeMarble,         t('floor.marble')],
    [s.floorTypeTerrazzo,       t('floor.terrazzo')],
    [s.floorTypeTerracotta,     t('floor.terracotta')],
    [s.floorTypeCeramic,        t('floor.ceramic')],
    [s.floorTypeSmoothConcrete, t('floor.smoothConcrete')],
    [s.floorTypeCoarseConcrete, t('floor.coarseConcrete')],
    [s.floorTypeStampedConcrete,t('floor.stampedConcrete')],
    [s.floorTypeAsphalt,        t('floor.asphalt')],
    [s.floorTypeEpoxy,          t('floor.epoxy')],
    [s.floorTypeTile,           t('floor.tile')],
    [s.floorTypeShortCarpet,    t('floor.shortCarpet')],
    [s.floorTypeLongCarpet,     t('floor.longCarpet')],
    [s.floorTypeSpc,            t('floor.spc')],
    [s.floorTypeLaminate,       t('floor.laminate')],
    [s.floorTypeVinyl,          t('floor.vinyl')],
  ].filter(([v]) => v === true).map(([, label]) => label as string);

  const floorLayouts = [
    [s.floorLayout2x2,   '2×2'],
    [s.floorLayout4x4,   '4×4'],
    [s.floorLayout8x8,   '8×8'],
    [s.floorLayout10x10, '10×10'],
    [s.floorLayout12x12, '12×12'],
    [s.floorLayout20x20, '20×20'],
  ].filter(([v]) => v === true).map(([, label]) => label as string);

  return (
    <div className="space-y-6">
      <Section title={t('section.physical')}>
        <Grid>
          <Stat label={t('stat.length')} value={fmt(s.lengthMm, ' mm')} />
          <Stat label={t('stat.width')} value={fmt(s.widthMm, ' mm')} />
          <Stat label={t('stat.height')} value={fmt(s.heightMm, ' mm')} />
          <Stat label={t('stat.weight')} value={fmt(s.robotWeightKg, ' kg')} />
        </Grid>
      </Section>

      <Section title={t('section.performance')}>
        <Grid>
          <Stat label={t('stat.speed')} value={fmt(s.speedMs, ' m/s')} />
          <Stat label={t('stat.cleaningWidth')} value={fmt(s.widthCleaningMm, ' mm')} />
          <Stat label={t('stat.brushPressure')} value={fmt(s.brushPressureKg, ' kg')} />
          <Stat label={t('stat.vacuumPressure')} value={fmt(s.vacuumPressureKpa, ' kPa')} />
          <Stat label={t('stat.noise')} value={fmt(s.noiseLevelDb, ' dB')} />
        </Grid>
      </Section>

      <Section title={t('section.efficiency')}>
        <Grid>
          <Stat label={t('stat.sweep')} value={fmt(s.cleaningEfficiencySweepSqmH)} />
          <Stat label={t('stat.scrub')} value={fmt(s.cleaningEfficiencyScrubSqmH)} />
          <Stat label={t('stat.mop')} value={fmt(s.cleaningEfficiencyMopSqmH)} />
          <Stat label={t('stat.sweepScrub')} value={fmt(s.cleaningEfficiencySweepScrubSqmH)} />
          <Stat label={t('stat.vacuum')} value={fmt(s.cleaningEfficiencyVacuumSqmH)} />
        </Grid>
      </Section>

      <Section title={t('section.tank')}>
        <Grid>
          <Stat label={t('stat.cleanWater')} value={fmt(s.tankCapacityCleanL, ' L')} />
          <Stat label={t('stat.wasteWater')} value={fmt(s.tankCapacityWasteL, ' L')} />
          <Stat label={t('stat.trash')} value={fmt(s.tankCapacityTrashL, ' L')} />
          <Stat label={t('stat.dustBag')} value={fmt(s.tankCapacityDustBagL, ' L')} />
        </Grid>
      </Section>

      <Section title={t('section.functions')}>
        <Tags label={t('tags.functions')} items={cleaningFunctions} />
      </Section>

      <Section title={t('section.navigation')}>
        <Tags label={t('tags.navigation')} items={navTags} />
      </Section>

      <Section title={t('section.battery')}>
        <Grid>
          <Stat label={t('stat.batteryType')} value={s.batteryType ?? '—'} />
          <Stat label={t('stat.voltage')} value={fmt(s.batteryVoltageV, ' V')} />
          <Stat label={t('stat.capacity')} value={fmt(s.batteryCapacityAh, ' Ah')} />
          <Stat label={t('stat.chargeTime')} value={fmt(s.batteryChargingTimeHr, ' hr')} />
          <Stat label={t('stat.workSweep')} value={fmt(s.batteryWorkTimeSweepHr, ' hr')} />
          <Stat label={t('stat.workScrub')} value={fmt(s.batteryWorkTimeScrubHr, ' hr')} />
          <Stat label={t('stat.workSweepVac')} value={fmt(s.batteryWorkTimeSweepVacuumHr, ' hr')} />
        </Grid>
      </Section>

      <Section title={t('section.charging')}>
        <Grid>
          <Stat label={t('stat.workStation')} value={fmtBool(s.workStation)} />
          <Stat label={t('stat.dockCharge')} value={fmtBool(s.dockCharge)} />
          <Stat label={t('stat.manualCharge')} value={fmtBool(s.manualCharge)} />
        </Grid>
      </Section>

      <Section title={t('section.passability')}>
        <Grid>
          <Stat label={t('stat.minWidth')} value={fmt(s.minimumPassableWidthMm, ' mm')} />
          <Stat label={t('stat.minHeight')} value={fmt(s.minimumPassableHeightMm, ' mm')} />
          <Stat label={t('stat.maxNarrow')} value={fmt(s.maximumNarrowCrossMm, ' mm')} />
          <Stat label={t('stat.minTurn')} value={fmt(s.minimumTurnWidthMm, ' mm')} />
          <Stat label={t('stat.minEdge')} value={fmt(s.minimumEdgeFromWallMm, ' mm')} />
          <Stat label={t('stat.maxStep')} value={fmt(s.maximumStepHeightMm, ' mm')} />
          <Stat label={t('stat.slope')} value={fmt(s.slopeAngleDeg, '°')} />
        </Grid>
      </Section>

      <Section title={t('section.environment')}>
        <Grid>
          <Stat label={t('stat.indoorOutdoor')} value={s.outdoorIndoor ?? '—'} />
          <Stat label={t('stat.ipRating')} value={s.ipRating ?? '—'} />
          <Stat label={t('stat.hepa')} value={fmtBool(s.hepa)} />
        </Grid>
      </Section>

      <Section title={t('section.floors')}>
        <Tags label={t('tags.surfaces')} items={floorTypes} />
      </Section>

      <Section title={t('section.layouts')}>
        <Tags label={t('tags.tiles')} items={floorLayouts} />
      </Section>
    </div>
  );
}

/* ─── Modal ───────────────────────────────────────────────────────────────── */

interface Props {
  robot: RobotResponse;
  onClose: () => void;
}

export function RobotDetailModal({ robot, onClose }: Props) {
  const t = useTranslations('robotDetail');
  const typeT = useTranslations('robots.types');
  const s = robot.spec;
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await authApi.verifyPassword(deletePassword);
      await robotApi.delete(robot.id);
      await queryClient.invalidateQueries({ queryKey: ['robots'] });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? t('incorrectPassword');
      setDeleteError(msg);
      setDeleting(false);
    }
  }

  const statusBg: Record<string, string> = {
    VERIFIED:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    PENDING:      'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    UNDER_TESTING:'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    REJECTED:     'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    DRAFT:        'bg-gray-100 text-gray-500 dark:bg-gray-900/40 dark:text-gray-400',
  };

  const priceLabelMap: Record<string, string> = {
    LOW: '$', MEDIUM: '$$', HIGH: '$$$', PREMIUM: '$$$$',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
        <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-2xl">

          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--app-border)] px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
                <Bot className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-bold text-[var(--app-text)]">{robot.brand}</p>
                <p className="text-sm text-[var(--app-muted)]">{robot.model}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TYPE_STYLES[robot.robotType] ?? ''}`}>
                {typeT.has(robot.robotType.toLowerCase()) ? typeT(robot.robotType.toLowerCase()) : robot.robotType}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBg[robot.testStatus] ?? ''}`}>
                {t.has(`status.${robot.testStatus}`) ? t(`status.${robot.testStatus}`) : robot.testStatus}
              </span>
              {robot.priceBand && (
                <span className="rounded-full bg-[var(--app-faint)] px-2.5 py-0.5 text-xs font-bold text-[var(--app-muted)]">
                  {priceLabelMap[robot.priceBand] ?? robot.priceBand}
                </span>
              )}
              {robot.rentalPrice != null && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {t('rent', { price: robot.rentalPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }) })}
                </span>
              )}
              {robot.sellingPrice != null && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  {t('buy', { price: robot.sellingPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }) })}
                </span>
              )}
              <Link
                href={`/robots/${robot.id}/edit`}
                onClick={onClose}
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('edit')}
              </Link>

              {/* Delete */}
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => { setConfirmDelete(true); setDeletePassword(''); setDeleteError(null); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-muted)] transition hover:border-red-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('delete')}
                </button>
              ) : (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <input
                    autoFocus
                    type="password"
                    placeholder={t('passwordPlaceholder')}
                    value={deletePassword}
                    onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(null); }}
                    className="rounded-lg border border-red-300 bg-[var(--app-panel-alt)] px-2.5 py-1.5 text-xs text-[var(--app-text)] outline-none focus:border-red-500"
                  />
                  {deleteError && (
                    <span className="text-xs font-semibold text-red-500">{deleteError}</span>
                  )}
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting || !deletePassword}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    {t('confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                    className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-faint)]"
                  >
                    {t('cancel')}
                  </button>
                </span>
              )}

              <button
                onClick={onClose}
                aria-label={t('close')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2">
            {robot.imageUrl && (
              <div className="mb-4">
                <img src={robot.imageUrl} alt={`${robot.brand} ${robot.model}`}
                  className="h-40 w-full rounded-xl object-contain bg-[var(--app-faint)]" />
              </div>
            )}

            {robot.datasheetUrl && (
              <a href={robot.datasheetUrl} target="_blank" rel="noopener noreferrer"
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--app-brand-dark)] hover:underline">
                {t('datasheet')}
              </a>
            )}

            {s ? (
              <SpecDetails s={s} />
            ) : (
              <p className="py-10 text-center text-sm text-[var(--app-muted)]">
                {t('noSpec')}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
