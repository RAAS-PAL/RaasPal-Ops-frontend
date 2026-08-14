'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { robotApi } from '@/lib/api';
import { ROBOT_TYPES, TYPE_LABELS } from '@/lib/robot-types';
import type { BudgetBand, RobotImportResult, RobotSpecRequest, RobotType, TestStatus } from '@/types/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const numOrNull = (v: string): number | null => v.trim() === '' ? null : parseFloat(v);
const strOrNull = (v: string): string | null => v.trim() === '' ? null : v.trim();
const boolOrNull = (v: boolean): boolean | null => v ? true : null;

/* ─── Spec state ──────────────────────────────────────────────────────────── */

type SpecState = {
  lengthMm: string; widthMm: string; heightMm: string; robotWeightKg: string;
  widthCleaningMm: string; brushPressureKg: string; vacuumPressureKpa: string;
  speedMs: string; noiseLevelDb: string;
  cleaningEfficiencySweepSqmH: string; cleaningEfficiencyScrubSqmH: string;
  cleaningEfficiencyMopSqmH: string; cleaningEfficiencySweepScrubSqmH: string;
  cleaningEfficiencyVacuumSqmH: string;
  tankCapacityCleanL: string; tankCapacityWasteL: string;
  tankCapacityTrashL: string; tankCapacityDustBagL: string;
  cleaningFunctionSweepNoVacuum: boolean; cleaningFunctionSweepVacuum: boolean;
  cleaningFunctionMopDry: boolean; cleaningFunctionMopWet: boolean;
  cleaningFunctionScrubBrushRoller: boolean; cleaningFunctionScrubBrushDisc: boolean;
  navigationLidar2d: boolean; navigationLidar3d: boolean;
  navigationCameraVslam: boolean; spotAi: boolean;
  batteryType: string; batteryVoltageV: string; batteryCapacityAh: string;
  batteryChargingTimeHr: string; batteryWorkTimeSweepHr: string;
  batteryWorkTimeScrubHr: string; batteryWorkTimeSweepVacuumHr: string;
  workStation: boolean; dockCharge: boolean; manualCharge: boolean;
  minimumPassableWidthMm: string; minimumPassableHeightMm: string;
  maximumNarrowCrossMm: string; minimumTurnWidthMm: string;
  minimumEdgeFromWallMm: string; maximumStepHeightMm: string; slopeAngleDeg: string;
  outdoorIndoor: string; ipRating: string; hepa: boolean;
  floorTypePavingBlocks: boolean; floorTypeGranite: boolean; floorTypeMarble: boolean;
  floorTypeTerrazzo: boolean; floorTypeTerracotta: boolean; floorTypeCeramic: boolean;
  floorTypeSmoothConcrete: boolean; floorTypeCoarseConcrete: boolean;
  floorTypeStampedConcrete: boolean; floorTypeAsphalt: boolean; floorTypeEpoxy: boolean;
  floorTypeTile: boolean; floorTypeShortCarpet: boolean; floorTypeLongCarpet: boolean;
  floorTypeSpc: boolean; floorTypeLaminate: boolean; floorTypeVinyl: boolean;
  floorLayout2x2: boolean; floorLayout4x4: boolean; floorLayout8x8: boolean;
  floorLayout10x10: boolean; floorLayout12x12: boolean; floorLayout20x20: boolean;
};

const EMPTY_SPEC: SpecState = {
  lengthMm: '', widthMm: '', heightMm: '', robotWeightKg: '',
  widthCleaningMm: '', brushPressureKg: '', vacuumPressureKpa: '',
  speedMs: '', noiseLevelDb: '',
  cleaningEfficiencySweepSqmH: '', cleaningEfficiencyScrubSqmH: '',
  cleaningEfficiencyMopSqmH: '', cleaningEfficiencySweepScrubSqmH: '',
  cleaningEfficiencyVacuumSqmH: '',
  tankCapacityCleanL: '', tankCapacityWasteL: '',
  tankCapacityTrashL: '', tankCapacityDustBagL: '',
  cleaningFunctionSweepNoVacuum: false, cleaningFunctionSweepVacuum: false,
  cleaningFunctionMopDry: false, cleaningFunctionMopWet: false,
  cleaningFunctionScrubBrushRoller: false, cleaningFunctionScrubBrushDisc: false,
  navigationLidar2d: false, navigationLidar3d: false,
  navigationCameraVslam: false, spotAi: false,
  batteryType: '', batteryVoltageV: '', batteryCapacityAh: '',
  batteryChargingTimeHr: '', batteryWorkTimeSweepHr: '',
  batteryWorkTimeScrubHr: '', batteryWorkTimeSweepVacuumHr: '',
  workStation: false, dockCharge: false, manualCharge: false,
  minimumPassableWidthMm: '', minimumPassableHeightMm: '',
  maximumNarrowCrossMm: '', minimumTurnWidthMm: '',
  minimumEdgeFromWallMm: '', maximumStepHeightMm: '', slopeAngleDeg: '',
  outdoorIndoor: '', ipRating: '', hepa: false,
  floorTypePavingBlocks: false, floorTypeGranite: false, floorTypeMarble: false,
  floorTypeTerrazzo: false, floorTypeTerracotta: false, floorTypeCeramic: false,
  floorTypeSmoothConcrete: false, floorTypeCoarseConcrete: false,
  floorTypeStampedConcrete: false, floorTypeAsphalt: false, floorTypeEpoxy: false,
  floorTypeTile: false, floorTypeShortCarpet: false, floorTypeLongCarpet: false,
  floorTypeSpc: false, floorTypeLaminate: false, floorTypeVinyl: false,
  floorLayout2x2: false, floorLayout4x4: false, floorLayout8x8: false,
  floorLayout10x10: false, floorLayout12x12: false, floorLayout20x20: false,
};

function toSpecRequest(s: SpecState): RobotSpecRequest {
  return {
    lengthMm: numOrNull(s.lengthMm), widthMm: numOrNull(s.widthMm),
    heightMm: numOrNull(s.heightMm), robotWeightKg: numOrNull(s.robotWeightKg),
    widthCleaningMm: numOrNull(s.widthCleaningMm),
    brushPressureKg: numOrNull(s.brushPressureKg),
    vacuumPressureKpa: numOrNull(s.vacuumPressureKpa),
    speedMs: numOrNull(s.speedMs), noiseLevelDb: numOrNull(s.noiseLevelDb),
    cleaningEfficiencySweepSqmH: numOrNull(s.cleaningEfficiencySweepSqmH),
    cleaningEfficiencyScrubSqmH: numOrNull(s.cleaningEfficiencyScrubSqmH),
    cleaningEfficiencyMopSqmH: numOrNull(s.cleaningEfficiencyMopSqmH),
    cleaningEfficiencySweepScrubSqmH: numOrNull(s.cleaningEfficiencySweepScrubSqmH),
    cleaningEfficiencyVacuumSqmH: numOrNull(s.cleaningEfficiencyVacuumSqmH),
    tankCapacityCleanL: numOrNull(s.tankCapacityCleanL),
    tankCapacityWasteL: numOrNull(s.tankCapacityWasteL),
    tankCapacityTrashL: numOrNull(s.tankCapacityTrashL),
    tankCapacityDustBagL: numOrNull(s.tankCapacityDustBagL),
    cleaningFunctionSweepNoVacuum: boolOrNull(s.cleaningFunctionSweepNoVacuum),
    cleaningFunctionSweepVacuum: boolOrNull(s.cleaningFunctionSweepVacuum),
    cleaningFunctionMopDry: boolOrNull(s.cleaningFunctionMopDry),
    cleaningFunctionMopWet: boolOrNull(s.cleaningFunctionMopWet),
    cleaningFunctionScrubBrushRoller: boolOrNull(s.cleaningFunctionScrubBrushRoller),
    cleaningFunctionScrubBrushDisc: boolOrNull(s.cleaningFunctionScrubBrushDisc),
    navigationLidar2d: boolOrNull(s.navigationLidar2d),
    navigationLidar3d: boolOrNull(s.navigationLidar3d),
    navigationCameraVslam: boolOrNull(s.navigationCameraVslam),
    spotAi: boolOrNull(s.spotAi),
    batteryType: strOrNull(s.batteryType),
    batteryVoltageV: numOrNull(s.batteryVoltageV),
    batteryCapacityAh: numOrNull(s.batteryCapacityAh),
    batteryChargingTimeHr: numOrNull(s.batteryChargingTimeHr),
    batteryWorkTimeSweepHr: numOrNull(s.batteryWorkTimeSweepHr),
    batteryWorkTimeScrubHr: numOrNull(s.batteryWorkTimeScrubHr),
    batteryWorkTimeSweepVacuumHr: numOrNull(s.batteryWorkTimeSweepVacuumHr),
    workStation: boolOrNull(s.workStation),
    dockCharge: boolOrNull(s.dockCharge),
    manualCharge: boolOrNull(s.manualCharge),
    minimumPassableWidthMm: numOrNull(s.minimumPassableWidthMm),
    minimumPassableHeightMm: numOrNull(s.minimumPassableHeightMm),
    maximumNarrowCrossMm: numOrNull(s.maximumNarrowCrossMm),
    minimumTurnWidthMm: numOrNull(s.minimumTurnWidthMm),
    minimumEdgeFromWallMm: numOrNull(s.minimumEdgeFromWallMm),
    maximumStepHeightMm: numOrNull(s.maximumStepHeightMm),
    slopeAngleDeg: numOrNull(s.slopeAngleDeg),
    outdoorIndoor: strOrNull(s.outdoorIndoor),
    ipRating: strOrNull(s.ipRating),
    hepa: boolOrNull(s.hepa),
    floorTypePavingBlocks: boolOrNull(s.floorTypePavingBlocks),
    floorTypeGranite: boolOrNull(s.floorTypeGranite),
    floorTypeMarble: boolOrNull(s.floorTypeMarble),
    floorTypeTerrazzo: boolOrNull(s.floorTypeTerrazzo),
    floorTypeTerracotta: boolOrNull(s.floorTypeTerracotta),
    floorTypeCeramic: boolOrNull(s.floorTypeCeramic),
    floorTypeSmoothConcrete: boolOrNull(s.floorTypeSmoothConcrete),
    floorTypeCoarseConcrete: boolOrNull(s.floorTypeCoarseConcrete),
    floorTypeStampedConcrete: boolOrNull(s.floorTypeStampedConcrete),
    floorTypeAsphalt: boolOrNull(s.floorTypeAsphalt),
    floorTypeEpoxy: boolOrNull(s.floorTypeEpoxy),
    floorTypeTile: boolOrNull(s.floorTypeTile),
    floorTypeShortCarpet: boolOrNull(s.floorTypeShortCarpet),
    floorTypeLongCarpet: boolOrNull(s.floorTypeLongCarpet),
    floorTypeSpc: boolOrNull(s.floorTypeSpc),
    floorTypeLaminate: boolOrNull(s.floorTypeLaminate),
    floorTypeVinyl: boolOrNull(s.floorTypeVinyl),
    floorLayout2x2: boolOrNull(s.floorLayout2x2),
    floorLayout4x4: boolOrNull(s.floorLayout4x4),
    floorLayout8x8: boolOrNull(s.floorLayout8x8),
    floorLayout10x10: boolOrNull(s.floorLayout10x10),
    floorLayout12x12: boolOrNull(s.floorLayout12x12),
    floorLayout20x20: boolOrNull(s.floorLayout20x20),
  };
}

/* ─── UI primitives ───────────────────────────────────────────────────────── */

const inputCls = 'rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)] transition';
const selectCls = `${inputCls} cursor-pointer`;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5 space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-muted)]">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[var(--app-muted)]">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function NumInput({ label, value, onChange, placeholder, step = 'any' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; step?: string;
}) {
  return (
    <Field label={label}>
      <input className={inputCls} type="number" min="0" step={step} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? '—'} />
    </Field>
  );
}

function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-[var(--app-text)]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-[var(--app-brand)]" />
      {label}
    </label>
  );
}

function CheckboxGrid({ items, spec, setSpec }: {
  items: [string, keyof SpecState][];
  spec: SpecState;
  setSpec: React.Dispatch<React.SetStateAction<SpecState>>;
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      {items.map(([label, key]) => (
        <CheckboxRow
          key={key}
          label={label}
          checked={spec[key] as boolean}
          onChange={(v) => setSpec((s) => ({ ...s, [key]: v }))}
        />
      ))}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */

export function AddRobotClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const importInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'single' | 'import'>('single');

  /* basic fields */
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [robotType, setRobotType] = useState<RobotType>('CLEANING');
  const [testStatus, setTestStatus] = useState<TestStatus>('PENDING');
  const [priceBand, setPriceBand] = useState<BudgetBand | ''>('');
  const [rentalPrice, setRentalPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [datasheetUrl, setDatasheetUrl] = useState('');

  /* spec fields */
  const [spec, setSpec] = useState<SpecState>(EMPTY_SPEC);

  /* form state */
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* import state */
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<RobotType>('CLEANING');
  const [importStatus, setImportStatus] = useState<TestStatus>('PENDING');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<RobotImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  /* ── Handlers ────────────────────────────────────────────────────────── */

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await robotApi.create({
        brand, model, robotType, testStatus,
        priceBand: priceBand || null,
        rentalPrice: numOrNull(rentalPrice),
        sellingPrice: numOrNull(sellingPrice),
        imageUrl: strOrNull(imageUrl),
        datasheetUrl: strOrNull(datasheetUrl),
        spec: toSpecRequest(spec),
      });
      await queryClient.invalidateQueries({ queryKey: ['robots'] });
      router.push('/robots');
    } catch {
      setSaveError('Failed to save robot. Check the fields and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const res = await robotApi.importCatalog(importFile, importType, importStatus);
      setImportResult(res.data.data);
    } catch {
      setImportError('Import failed. Check that your file matches the required column format.');
    } finally {
      setImporting(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 p-4 sm:p-6">

      <Link href="/robots"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--app-muted)] hover:text-[var(--app-brand-dark)] transition">
        <ArrowLeft className="h-4 w-4" />Back to Robots
      </Link>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['single', 'import'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t
                ? 'bg-[var(--app-brand)] text-white'
                : 'border border-[var(--app-border)] text-[var(--app-muted)] hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]'
            }`}>
            {t === 'single' ? 'Single Robot' : 'Import Excel / CSV'}
          </button>
        ))}
      </div>

      {/* ══ Single Robot Form ══════════════════════════════════════════════ */}
      {tab === 'single' && (
        <form onSubmit={handleSave} className="max-w-3xl space-y-5">

          {/* Basic */}
          <SectionCard title="Basic Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Brand" required>
                <input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} required placeholder="e.g. Gausium" />
              </Field>
              <Field label="Model" required>
                <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} required placeholder="e.g. G2" />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Robot Type" required>
                <select className={selectCls} value={robotType} onChange={(e) => setRobotType(e.target.value as RobotType)}>
                  {ROBOT_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Test Status">
                <select className={selectCls} value={testStatus} onChange={(e) => setTestStatus(e.target.value as TestStatus)}>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="UNDER_TESTING">Under Testing</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </Field>
              <Field label="Price Band">
                <select className={selectCls} value={priceBand} onChange={(e) => setPriceBand(e.target.value as BudgetBand | '')}>
                  <option value="">— Select —</option>
                  <option value="LOW">Low ($)</option>
                  <option value="MEDIUM">Medium ($$)</option>
                  <option value="HIGH">High ($$$)</option>
                  <option value="PREMIUM">Premium ($$$$)</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Rental Price (฿ / month)">
                <input className={inputCls} type="number" min="0" step="1" value={rentalPrice}
                  onChange={(e) => setRentalPrice(e.target.value)} placeholder="e.g. 35000" />
              </Field>
              <Field label="Selling Price (฿)">
                <input className={inputCls} type="number" min="0" step="1" value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)} placeholder="e.g. 450000" />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Image URL">
                <input className={inputCls} type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Datasheet URL">
                <input className={inputCls} type="url" value={datasheetUrl} onChange={(e) => setDatasheetUrl(e.target.value)} placeholder="https://…" />
              </Field>
            </div>
          </SectionCard>

          {/* Physical */}
          <SectionCard title="Physical Dimensions">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumInput label="Length (mm)" value={spec.lengthMm} onChange={(v) => setSpec((s) => ({ ...s, lengthMm: v }))} placeholder="750" />
              <NumInput label="Width (mm)" value={spec.widthMm} onChange={(v) => setSpec((s) => ({ ...s, widthMm: v }))} placeholder="560" />
              <NumInput label="Height (mm)" value={spec.heightMm} onChange={(v) => setSpec((s) => ({ ...s, heightMm: v }))} placeholder="370" />
              <NumInput label="Weight (kg)" value={spec.robotWeightKg} onChange={(v) => setSpec((s) => ({ ...s, robotWeightKg: v }))} placeholder="45" step="0.1" />
            </div>
          </SectionCard>

          {/* Performance */}
          <SectionCard title="Performance">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <NumInput label="Speed (m/s)" value={spec.speedMs} onChange={(v) => setSpec((s) => ({ ...s, speedMs: v }))} placeholder="0.8" step="0.01" />
              <NumInput label="Clean Width (mm)" value={spec.widthCleaningMm} onChange={(v) => setSpec((s) => ({ ...s, widthCleaningMm: v }))} placeholder="520" />
              <NumInput label="Brush Pressure (kg)" value={spec.brushPressureKg} onChange={(v) => setSpec((s) => ({ ...s, brushPressureKg: v }))} placeholder="2.5" step="0.1" />
              <NumInput label="Vacuum Pressure (kPa)" value={spec.vacuumPressureKpa} onChange={(v) => setSpec((s) => ({ ...s, vacuumPressureKpa: v }))} placeholder="3.5" step="0.1" />
              <NumInput label="Noise (dB)" value={spec.noiseLevelDb} onChange={(v) => setSpec((s) => ({ ...s, noiseLevelDb: v }))} placeholder="62" step="0.1" />
            </div>
          </SectionCard>

          {/* Cleaning efficiency */}
          <SectionCard title="Cleaning Efficiency (sqm/h)">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <NumInput label="Sweep" value={spec.cleaningEfficiencySweepSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencySweepSqmH: v }))} placeholder="2000" />
              <NumInput label="Scrub" value={spec.cleaningEfficiencyScrubSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencyScrubSqmH: v }))} placeholder="1500" />
              <NumInput label="Mop" value={spec.cleaningEfficiencyMopSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencyMopSqmH: v }))} placeholder="1200" />
              <NumInput label="Sweep + Scrub" value={spec.cleaningEfficiencySweepScrubSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencySweepScrubSqmH: v }))} placeholder="1800" />
              <NumInput label="Vacuum" value={spec.cleaningEfficiencyVacuumSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencyVacuumSqmH: v }))} placeholder="1000" />
            </div>
          </SectionCard>

          {/* Tank capacity */}
          <SectionCard title="Tank Capacity (L)">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumInput label="Clean Water" value={spec.tankCapacityCleanL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityCleanL: v }))} placeholder="40" step="0.1" />
              <NumInput label="Waste Water" value={spec.tankCapacityWasteL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityWasteL: v }))} placeholder="40" step="0.1" />
              <NumInput label="Trash" value={spec.tankCapacityTrashL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityTrashL: v }))} placeholder="30" step="0.1" />
              <NumInput label="Dust Bag" value={spec.tankCapacityDustBagL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityDustBagL: v }))} placeholder="10" step="0.1" />
            </div>
          </SectionCard>

          {/* Cleaning functions */}
          <SectionCard title="Cleaning Functions">
            <CheckboxGrid spec={spec} setSpec={setSpec} items={[
              ['Sweep (No Vacuum)', 'cleaningFunctionSweepNoVacuum'],
              ['Sweep + Vacuum', 'cleaningFunctionSweepVacuum'],
              ['Mop Dry', 'cleaningFunctionMopDry'],
              ['Mop Wet', 'cleaningFunctionMopWet'],
              ['Scrub Brush Roller', 'cleaningFunctionScrubBrushRoller'],
              ['Scrub Brush Disc', 'cleaningFunctionScrubBrushDisc'],
            ]} />
          </SectionCard>

          {/* Navigation */}
          <SectionCard title="Navigation">
            <CheckboxGrid spec={spec} setSpec={setSpec} items={[
              ['LiDAR 2D', 'navigationLidar2d'],
              ['LiDAR 3D', 'navigationLidar3d'],
              ['Camera vSLAM', 'navigationCameraVslam'],
              ['Spot AI', 'spotAi'],
            ]} />
          </SectionCard>

          {/* Battery */}
          <SectionCard title="Battery">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Battery Type">
                <input className={inputCls} value={spec.batteryType} onChange={(e) => setSpec((s) => ({ ...s, batteryType: e.target.value }))} placeholder="e.g. Lithium-Ion" />
              </Field>
              <NumInput label="Voltage (V)" value={spec.batteryVoltageV} onChange={(v) => setSpec((s) => ({ ...s, batteryVoltageV: v }))} placeholder="48" step="0.1" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumInput label="Capacity (Ah)" value={spec.batteryCapacityAh} onChange={(v) => setSpec((s) => ({ ...s, batteryCapacityAh: v }))} placeholder="60" step="0.1" />
              <NumInput label="Charge Time (hr)" value={spec.batteryChargingTimeHr} onChange={(v) => setSpec((s) => ({ ...s, batteryChargingTimeHr: v }))} placeholder="4" step="0.1" />
              <NumInput label="Work Time Sweep (hr)" value={spec.batteryWorkTimeSweepHr} onChange={(v) => setSpec((s) => ({ ...s, batteryWorkTimeSweepHr: v }))} placeholder="4" step="0.1" />
              <NumInput label="Work Time Scrub (hr)" value={spec.batteryWorkTimeScrubHr} onChange={(v) => setSpec((s) => ({ ...s, batteryWorkTimeScrubHr: v }))} placeholder="3" step="0.1" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumInput label="Work Time Sweep+Vacuum (hr)" value={spec.batteryWorkTimeSweepVacuumHr} onChange={(v) => setSpec((s) => ({ ...s, batteryWorkTimeSweepVacuumHr: v }))} placeholder="3.5" step="0.1" />
            </div>
          </SectionCard>

          {/* Charging & station */}
          <SectionCard title="Charging & Work Station">
            <CheckboxGrid spec={spec} setSpec={setSpec} items={[
              ['Work Station', 'workStation'],
              ['Dock Charge', 'dockCharge'],
              ['Manual Charge', 'manualCharge'],
            ]} />
          </SectionCard>

          {/* Passability */}
          <SectionCard title="Passability & Obstacles">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumInput label="Min Passable Width (mm)" value={spec.minimumPassableWidthMm} onChange={(v) => setSpec((s) => ({ ...s, minimumPassableWidthMm: v }))} placeholder="700" />
              <NumInput label="Min Passable Height (mm)" value={spec.minimumPassableHeightMm} onChange={(v) => setSpec((s) => ({ ...s, minimumPassableHeightMm: v }))} placeholder="400" />
              <NumInput label="Max Narrow Cross (mm)" value={spec.maximumNarrowCrossMm} onChange={(v) => setSpec((s) => ({ ...s, maximumNarrowCrossMm: v }))} placeholder="650" />
              <NumInput label="Min Turn Width (mm)" value={spec.minimumTurnWidthMm} onChange={(v) => setSpec((s) => ({ ...s, minimumTurnWidthMm: v }))} placeholder="1200" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <NumInput label="Min Edge from Wall (mm)" value={spec.minimumEdgeFromWallMm} onChange={(v) => setSpec((s) => ({ ...s, minimumEdgeFromWallMm: v }))} placeholder="30" />
              <NumInput label="Max Step Height (mm)" value={spec.maximumStepHeightMm} onChange={(v) => setSpec((s) => ({ ...s, maximumStepHeightMm: v }))} placeholder="20" />
              <NumInput label="Slope Angle (°)" value={spec.slopeAngleDeg} onChange={(v) => setSpec((s) => ({ ...s, slopeAngleDeg: v }))} placeholder="5" step="0.1" />
            </div>
          </SectionCard>

          {/* Environment */}
          <SectionCard title="Environment">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Indoor / Outdoor">
                <input className={inputCls} value={spec.outdoorIndoor} onChange={(e) => setSpec((s) => ({ ...s, outdoorIndoor: e.target.value }))} placeholder="e.g. Indoor, Outdoor, Both" />
              </Field>
              <Field label="IP Rating">
                <input className={inputCls} value={spec.ipRating} onChange={(e) => setSpec((s) => ({ ...s, ipRating: e.target.value }))} placeholder="e.g. IP65" />
              </Field>
              <div className="flex items-end pb-2">
                <CheckboxRow label="HEPA Filter" checked={spec.hepa} onChange={(v) => setSpec((s) => ({ ...s, hepa: v }))} />
              </div>
            </div>
          </SectionCard>

          {/* Floor types */}
          <SectionCard title="Supported Floor Types">
            <CheckboxGrid spec={spec} setSpec={setSpec} items={[
              ['Paving Blocks', 'floorTypePavingBlocks'],
              ['Granite', 'floorTypeGranite'],
              ['Marble', 'floorTypeMarble'],
              ['Terrazzo', 'floorTypeTerrazzo'],
              ['Terracotta', 'floorTypeTerracotta'],
              ['Ceramic', 'floorTypeCeramic'],
              ['Smooth Concrete', 'floorTypeSmoothConcrete'],
              ['Coarse Concrete', 'floorTypeCoarseConcrete'],
              ['Stamped Concrete', 'floorTypeStampedConcrete'],
              ['Asphalt', 'floorTypeAsphalt'],
              ['Epoxy', 'floorTypeEpoxy'],
              ['Tile', 'floorTypeTile'],
              ['Short Carpet', 'floorTypeShortCarpet'],
              ['Long Carpet', 'floorTypeLongCarpet'],
              ['SPC', 'floorTypeSpc'],
              ['Laminate', 'floorTypeLaminate'],
              ['Vinyl', 'floorTypeVinyl'],
            ]} />
          </SectionCard>

          {/* Floor layouts */}
          <SectionCard title="Floor Tile Layouts">
            <CheckboxGrid spec={spec} setSpec={setSpec} items={[
              ['2×2', 'floorLayout2x2'],
              ['4×4', 'floorLayout4x4'],
              ['8×8', 'floorLayout8x8'],
              ['10×10', 'floorLayout10x10'],
              ['12×12', 'floorLayout12x12'],
              ['20×20', 'floorLayout20x20'],
            ]} />
          </SectionCard>

          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              {saveError}
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save Robot'}
            </button>
          </div>
        </form>
      )}

      {/* ══ Import Tab ════════════════════════════════════════════════════ */}
      {tab === 'import' && (
        <div className="max-w-3xl space-y-5">

          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-muted)]">Import Options</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Robot Type" required>
                <select className={selectCls} value={importType} onChange={(e) => setImportType(e.target.value as RobotType)}>
                  {ROBOT_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Test Status">
                <select className={selectCls} value={importStatus} onChange={(e) => setImportStatus(e.target.value as TestStatus)}>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="UNDER_TESTING">Under Testing</option>
                  <option value="VERIFIED">Verified</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition cursor-pointer ${
              dragOver ? 'border-[var(--app-brand)] bg-[var(--app-brand-soft)]'
                       : 'border-[var(--app-border)] bg-[var(--app-panel)] hover:border-[var(--app-brand)]'
            }`}
            onClick={() => importInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setImportFile(f); }}
          >
            <Upload className="h-8 w-8 text-[var(--app-muted)]" />
            {importFile
              ? <p className="text-sm font-semibold text-[var(--app-text)]">{importFile.name}</p>
              : <>
                  <p className="text-sm font-semibold text-[var(--app-text)]">Drop your Excel or CSV file here</p>
                  <p className="text-xs text-[var(--app-muted)]">.xlsx · .xls · .csv — data starts on row 4</p>
                </>
            }
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) setImportFile(e.target.files[0]); }} />
          </div>

          {/* Column guide */}
          <details className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
            <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-[var(--app-text)] select-none">
              Column guide — rows 1–3 are skipped as headers, data starts row 4
            </summary>
            <div className="overflow-x-auto border-t border-[var(--app-border)] px-5 py-3">
              <table className="w-full text-xs text-[var(--app-muted)]">
                <thead><tr className="text-left"><th className="pr-6 pb-1 font-bold">Col</th><th className="pb-1 font-bold">Field</th></tr></thead>
                <tbody>
                  {[
                    ['A','Brand *'], ['B','Model *'], ['C','Length (mm)'], ['D','Width (mm)'], ['E','Height (mm)'],
                    ['F','Weight (kg)'], ['G','Cleaning Width (mm)'], ['H','Brush Pressure (kg)'],
                    ['I','Vacuum Pressure (kPa)'], ['J','Speed (m/s)'], ['K','Noise (dB)'],
                    ['L','Work Station (TRUE/FALSE)'], ['M','Dock Charge'], ['N','Manual Charge'],
                    ['O','Efficiency Sweep (sqm/h)'], ['P','Efficiency Scrub'], ['Q','Efficiency Mop'],
                    ['R','Efficiency Sweep+Scrub'], ['S','Efficiency Vacuum'],
                    ['T','Tank Clean (L)'], ['U','Tank Waste (L)'], ['V','Tank Trash (L)'], ['W','Tank Dust Bag (L)'],
                    ['X','Cleaning: Sweep No Vacuum'], ['Y','Sweep+Vacuum'], ['Z','Mop Dry'],
                    ['AA','Mop Wet'], ['AB','Scrub Brush Roller'], ['AC','Scrub Brush Disc'],
                    ['AD','Navigation: LiDAR 2D'], ['AE','LiDAR 3D'], ['AF','Camera vSLAM'],
                    ['AG','Battery Type'], ['AH','Voltage (V)'], ['AI','Capacity (Ah)'],
                    ['AJ','Charge Time (hr)'], ['AK','Work Time Sweep (hr)'],
                    ['AL','Work Time Scrub (hr)'], ['AM','Work Time Sweep+Vacuum (hr)'],
                    ['AN','Min Passable Width (mm)'], ['AO','Min Passable Height (mm)'],
                    ['AP','Max Narrow Cross (mm)'], ['AQ','Min Turn Width (mm)'],
                    ['AR','Min Edge from Wall (mm)'], ['AS','Max Step Height (mm)'], ['AT','Slope (°)'],
                    ['AU','Spot AI (TRUE/FALSE)'], ['AV','Outdoor/Indoor'], ['AW','IP Rating'], ['AX','HEPA'],
                    ['AY–BQ','Floor Types: Paving Blocks, Granite, Marble, Terrazzo, Terracotta, Ceramic, Smooth Concrete, Coarse Concrete, Stamped Concrete, Asphalt, Epoxy, Tile, Short Carpet, Long Carpet, SPC, Laminate, Vinyl'],
                    ['BR–BW','Floor Layouts: 2×2, 4×4, 8×8, 10×10, 12×12, 20×20'],
                  ].map(([col, field]) => (
                    <tr key={col}>
                      <td className="pr-6 py-0.5 font-mono font-bold text-[var(--app-text)]">{col}</td>
                      <td className="py-0.5">{field}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {importError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              {importError}
            </div>
          )}

          {importResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 space-y-2 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Import complete</p>
              <div className="flex flex-wrap gap-4 text-sm text-emerald-700 dark:text-emerald-400">
                <span>✓ {importResult.imported} imported</span>
                <span>↺ {importResult.updated} updated</span>
                <span>⚠ {importResult.skipped} skipped</span>
              </div>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                  {importResult.errors.map((err, i) => <li key={i}>• {err}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" disabled={!importFile || importing} onClick={handleImport}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              {importing ? 'Importing…' : 'Import File'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
