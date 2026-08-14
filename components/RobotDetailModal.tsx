'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { authApi, robotApi } from '@/lib/api';
import { TYPE_LABELS, TYPE_STYLES } from '@/lib/robot-types';
import type { RobotResponse, RobotSpecResponse } from '@/types/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const fmt = (v: number | null | undefined, unit = '') =>
  v != null ? `${v}${unit}` : '—';

const fmtBool = (v: boolean | null | undefined) =>
  v === true ? '✓ Yes' : v === false ? '✗ No' : '—';

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
  const cleaningFunctions = [
    [s.cleaningFunctionSweepNoVacuum, 'Sweep (No Vacuum)'],
    [s.cleaningFunctionSweepVacuum,   'Sweep + Vacuum'],
    [s.cleaningFunctionMopDry,        'Mop Dry'],
    [s.cleaningFunctionMopWet,        'Mop Wet'],
    [s.cleaningFunctionScrubBrushRoller, 'Scrub Roller'],
    [s.cleaningFunctionScrubBrushDisc,   'Scrub Disc'],
  ].filter(([v]) => v === true).map(([, label]) => label as string);

  const navTags = [
    [s.navigationLidar2d,      'LiDAR 2D'],
    [s.navigationLidar3d,      'LiDAR 3D'],
    [s.navigationCameraVslam,  'Camera vSLAM'],
    [s.spotAi,                 'Spot AI'],
  ].filter(([v]) => v === true).map(([, label]) => label as string);

  const floorTypes = [
    [s.floorTypePavingBlocks,   'Paving Blocks'],
    [s.floorTypeGranite,        'Granite'],
    [s.floorTypeMarble,         'Marble'],
    [s.floorTypeTerrazzo,       'Terrazzo'],
    [s.floorTypeTerracotta,     'Terracotta'],
    [s.floorTypeCeramic,        'Ceramic'],
    [s.floorTypeSmoothConcrete, 'Smooth Concrete'],
    [s.floorTypeCoarseConcrete, 'Coarse Concrete'],
    [s.floorTypeStampedConcrete,'Stamped Concrete'],
    [s.floorTypeAsphalt,        'Asphalt'],
    [s.floorTypeEpoxy,          'Epoxy'],
    [s.floorTypeTile,           'Tile'],
    [s.floorTypeShortCarpet,    'Short Carpet'],
    [s.floorTypeLongCarpet,     'Long Carpet'],
    [s.floorTypeSpc,            'SPC'],
    [s.floorTypeLaminate,       'Laminate'],
    [s.floorTypeVinyl,          'Vinyl'],
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
      <Section title="Physical Dimensions">
        <Grid>
          <Stat label="Length" value={fmt(s.lengthMm, ' mm')} />
          <Stat label="Width" value={fmt(s.widthMm, ' mm')} />
          <Stat label="Height" value={fmt(s.heightMm, ' mm')} />
          <Stat label="Weight" value={fmt(s.robotWeightKg, ' kg')} />
        </Grid>
      </Section>

      <Section title="Performance">
        <Grid>
          <Stat label="Speed" value={fmt(s.speedMs, ' m/s')} />
          <Stat label="Cleaning Width" value={fmt(s.widthCleaningMm, ' mm')} />
          <Stat label="Brush Pressure" value={fmt(s.brushPressureKg, ' kg')} />
          <Stat label="Vacuum Pressure" value={fmt(s.vacuumPressureKpa, ' kPa')} />
          <Stat label="Noise Level" value={fmt(s.noiseLevelDb, ' dB')} />
        </Grid>
      </Section>

      <Section title="Cleaning Efficiency (sqm/h)">
        <Grid>
          <Stat label="Sweep" value={fmt(s.cleaningEfficiencySweepSqmH)} />
          <Stat label="Scrub" value={fmt(s.cleaningEfficiencyScrubSqmH)} />
          <Stat label="Mop" value={fmt(s.cleaningEfficiencyMopSqmH)} />
          <Stat label="Sweep + Scrub" value={fmt(s.cleaningEfficiencySweepScrubSqmH)} />
          <Stat label="Vacuum" value={fmt(s.cleaningEfficiencyVacuumSqmH)} />
        </Grid>
      </Section>

      <Section title="Tank Capacity (L)">
        <Grid>
          <Stat label="Clean Water" value={fmt(s.tankCapacityCleanL, ' L')} />
          <Stat label="Waste Water" value={fmt(s.tankCapacityWasteL, ' L')} />
          <Stat label="Trash" value={fmt(s.tankCapacityTrashL, ' L')} />
          <Stat label="Dust Bag" value={fmt(s.tankCapacityDustBagL, ' L')} />
        </Grid>
      </Section>

      <Section title="Cleaning Functions">
        <Tags label="Supported functions" items={cleaningFunctions} />
      </Section>

      <Section title="Navigation">
        <Tags label="Navigation technologies" items={navTags} />
      </Section>

      <Section title="Battery">
        <Grid>
          <Stat label="Type" value={s.batteryType ?? '—'} />
          <Stat label="Voltage" value={fmt(s.batteryVoltageV, ' V')} />
          <Stat label="Capacity" value={fmt(s.batteryCapacityAh, ' Ah')} />
          <Stat label="Charge Time" value={fmt(s.batteryChargingTimeHr, ' hr')} />
          <Stat label="Work Time (Sweep)" value={fmt(s.batteryWorkTimeSweepHr, ' hr')} />
          <Stat label="Work Time (Scrub)" value={fmt(s.batteryWorkTimeScrubHr, ' hr')} />
          <Stat label="Work Time (Sweep+Vac)" value={fmt(s.batteryWorkTimeSweepVacuumHr, ' hr')} />
        </Grid>
      </Section>

      <Section title="Charging & Station">
        <Grid>
          <Stat label="Work Station" value={fmtBool(s.workStation)} />
          <Stat label="Dock Charge" value={fmtBool(s.dockCharge)} />
          <Stat label="Manual Charge" value={fmtBool(s.manualCharge)} />
        </Grid>
      </Section>

      <Section title="Passability & Obstacles">
        <Grid>
          <Stat label="Min Passable Width" value={fmt(s.minimumPassableWidthMm, ' mm')} />
          <Stat label="Min Passable Height" value={fmt(s.minimumPassableHeightMm, ' mm')} />
          <Stat label="Max Narrow Cross" value={fmt(s.maximumNarrowCrossMm, ' mm')} />
          <Stat label="Min Turn Width" value={fmt(s.minimumTurnWidthMm, ' mm')} />
          <Stat label="Min Edge from Wall" value={fmt(s.minimumEdgeFromWallMm, ' mm')} />
          <Stat label="Max Step Height" value={fmt(s.maximumStepHeightMm, ' mm')} />
          <Stat label="Slope Angle" value={fmt(s.slopeAngleDeg, '°')} />
        </Grid>
      </Section>

      <Section title="Environment">
        <Grid>
          <Stat label="Indoor / Outdoor" value={s.outdoorIndoor ?? '—'} />
          <Stat label="IP Rating" value={s.ipRating ?? '—'} />
          <Stat label="HEPA Filter" value={fmtBool(s.hepa)} />
        </Grid>
      </Section>

      <Section title="Supported Floor Types">
        <Tags label="Compatible surfaces" items={floorTypes} />
      </Section>

      <Section title="Floor Tile Layouts">
        <Tags label="Tile size formats" items={floorLayouts} />
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
        ?.response?.data?.message ?? 'Incorrect password';
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
                {TYPE_LABELS[robot.robotType] ?? robot.robotType}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBg[robot.testStatus] ?? ''}`}>
                {robot.testStatus}
              </span>
              {robot.priceBand && (
                <span className="rounded-full bg-[var(--app-faint)] px-2.5 py-0.5 text-xs font-bold text-[var(--app-muted)]">
                  {priceLabelMap[robot.priceBand] ?? robot.priceBand}
                </span>
              )}
              {robot.rentalPrice != null && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  Rent ฿{robot.rentalPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                </span>
              )}
              {robot.sellingPrice != null && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  Buy ฿{robot.sellingPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              )}
              <Link
                href={`/robots/${robot.id}/edit`}
                onClick={onClose}
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>

              {/* Delete */}
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => { setConfirmDelete(true); setDeletePassword(''); setDeleteError(null); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-muted)] transition hover:border-red-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              ) : (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <input
                    autoFocus
                    type="password"
                    placeholder="Your password"
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
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                    className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-faint)]"
                  >
                    Cancel
                  </button>
                </span>
              )}

              <button
                onClick={onClose}
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
                View Datasheet →
              </a>
            )}

            {s ? (
              <SpecDetails s={s} />
            ) : (
              <p className="py-10 text-center text-sm text-[var(--app-muted)]">
                No spec data available for this robot.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
