'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { robotApi } from '@/lib/api';
import { ROBOT_TYPES, TYPE_LABELS } from '@/lib/robot-types';
import type { BudgetBand, RobotResponse, RobotSpecRequest, RobotType, TestStatus } from '@/types/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const numOrNull = (v: string): number | null => v.trim() === '' ? null : parseFloat(v);
const strOrNull = (v: string): string | null => v.trim() === '' ? null : v.trim();
const boolOrNull = (v: boolean): boolean | null => v ? true : null;
const n2s = (v: number | null | undefined): string => v != null ? String(v) : '';
const b2b = (v: boolean | null | undefined): boolean => v === true;
const s2s = (v: string | null | undefined): string => v ?? '';

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

function robotToSpec(robot: RobotResponse): SpecState {
  const s = robot.spec;
  return {
    lengthMm: n2s(s?.lengthMm), widthMm: n2s(s?.widthMm),
    heightMm: n2s(s?.heightMm), robotWeightKg: n2s(s?.robotWeightKg),
    widthCleaningMm: n2s(s?.widthCleaningMm), brushPressureKg: n2s(s?.brushPressureKg),
    vacuumPressureKpa: n2s(s?.vacuumPressureKpa), speedMs: n2s(s?.speedMs),
    noiseLevelDb: n2s(s?.noiseLevelDb),
    cleaningEfficiencySweepSqmH: n2s(s?.cleaningEfficiencySweepSqmH),
    cleaningEfficiencyScrubSqmH: n2s(s?.cleaningEfficiencyScrubSqmH),
    cleaningEfficiencyMopSqmH: n2s(s?.cleaningEfficiencyMopSqmH),
    cleaningEfficiencySweepScrubSqmH: n2s(s?.cleaningEfficiencySweepScrubSqmH),
    cleaningEfficiencyVacuumSqmH: n2s(s?.cleaningEfficiencyVacuumSqmH),
    tankCapacityCleanL: n2s(s?.tankCapacityCleanL), tankCapacityWasteL: n2s(s?.tankCapacityWasteL),
    tankCapacityTrashL: n2s(s?.tankCapacityTrashL), tankCapacityDustBagL: n2s(s?.tankCapacityDustBagL),
    cleaningFunctionSweepNoVacuum: b2b(s?.cleaningFunctionSweepNoVacuum),
    cleaningFunctionSweepVacuum: b2b(s?.cleaningFunctionSweepVacuum),
    cleaningFunctionMopDry: b2b(s?.cleaningFunctionMopDry),
    cleaningFunctionMopWet: b2b(s?.cleaningFunctionMopWet),
    cleaningFunctionScrubBrushRoller: b2b(s?.cleaningFunctionScrubBrushRoller),
    cleaningFunctionScrubBrushDisc: b2b(s?.cleaningFunctionScrubBrushDisc),
    navigationLidar2d: b2b(s?.navigationLidar2d), navigationLidar3d: b2b(s?.navigationLidar3d),
    navigationCameraVslam: b2b(s?.navigationCameraVslam), spotAi: b2b(s?.spotAi),
    batteryType: s2s(s?.batteryType), batteryVoltageV: n2s(s?.batteryVoltageV),
    batteryCapacityAh: n2s(s?.batteryCapacityAh), batteryChargingTimeHr: n2s(s?.batteryChargingTimeHr),
    batteryWorkTimeSweepHr: n2s(s?.batteryWorkTimeSweepHr),
    batteryWorkTimeScrubHr: n2s(s?.batteryWorkTimeScrubHr),
    batteryWorkTimeSweepVacuumHr: n2s(s?.batteryWorkTimeSweepVacuumHr),
    workStation: b2b(s?.workStation), dockCharge: b2b(s?.dockCharge), manualCharge: b2b(s?.manualCharge),
    minimumPassableWidthMm: n2s(s?.minimumPassableWidthMm),
    minimumPassableHeightMm: n2s(s?.minimumPassableHeightMm),
    maximumNarrowCrossMm: n2s(s?.maximumNarrowCrossMm),
    minimumTurnWidthMm: n2s(s?.minimumTurnWidthMm),
    minimumEdgeFromWallMm: n2s(s?.minimumEdgeFromWallMm),
    maximumStepHeightMm: n2s(s?.maximumStepHeightMm), slopeAngleDeg: n2s(s?.slopeAngleDeg),
    outdoorIndoor: s2s(s?.outdoorIndoor), ipRating: s2s(s?.ipRating), hepa: b2b(s?.hepa),
    floorTypePavingBlocks: b2b(s?.floorTypePavingBlocks), floorTypeGranite: b2b(s?.floorTypeGranite),
    floorTypeMarble: b2b(s?.floorTypeMarble), floorTypeTerrazzo: b2b(s?.floorTypeTerrazzo),
    floorTypeTerracotta: b2b(s?.floorTypeTerracotta), floorTypeCeramic: b2b(s?.floorTypeCeramic),
    floorTypeSmoothConcrete: b2b(s?.floorTypeSmoothConcrete),
    floorTypeCoarseConcrete: b2b(s?.floorTypeCoarseConcrete),
    floorTypeStampedConcrete: b2b(s?.floorTypeStampedConcrete),
    floorTypeAsphalt: b2b(s?.floorTypeAsphalt), floorTypeEpoxy: b2b(s?.floorTypeEpoxy),
    floorTypeTile: b2b(s?.floorTypeTile), floorTypeShortCarpet: b2b(s?.floorTypeShortCarpet),
    floorTypeLongCarpet: b2b(s?.floorTypeLongCarpet), floorTypeSpc: b2b(s?.floorTypeSpc),
    floorTypeLaminate: b2b(s?.floorTypeLaminate), floorTypeVinyl: b2b(s?.floorTypeVinyl),
    floorLayout2x2: b2b(s?.floorLayout2x2), floorLayout4x4: b2b(s?.floorLayout4x4),
    floorLayout8x8: b2b(s?.floorLayout8x8), floorLayout10x10: b2b(s?.floorLayout10x10),
    floorLayout12x12: b2b(s?.floorLayout12x12), floorLayout20x20: b2b(s?.floorLayout20x20),
  };
}

function toSpecRequest(s: SpecState): RobotSpecRequest {
  return {
    lengthMm: numOrNull(s.lengthMm), widthMm: numOrNull(s.widthMm),
    heightMm: numOrNull(s.heightMm), robotWeightKg: numOrNull(s.robotWeightKg),
    widthCleaningMm: numOrNull(s.widthCleaningMm), brushPressureKg: numOrNull(s.brushPressureKg),
    vacuumPressureKpa: numOrNull(s.vacuumPressureKpa), speedMs: numOrNull(s.speedMs),
    noiseLevelDb: numOrNull(s.noiseLevelDb),
    cleaningEfficiencySweepSqmH: numOrNull(s.cleaningEfficiencySweepSqmH),
    cleaningEfficiencyScrubSqmH: numOrNull(s.cleaningEfficiencyScrubSqmH),
    cleaningEfficiencyMopSqmH: numOrNull(s.cleaningEfficiencyMopSqmH),
    cleaningEfficiencySweepScrubSqmH: numOrNull(s.cleaningEfficiencySweepScrubSqmH),
    cleaningEfficiencyVacuumSqmH: numOrNull(s.cleaningEfficiencyVacuumSqmH),
    tankCapacityCleanL: numOrNull(s.tankCapacityCleanL), tankCapacityWasteL: numOrNull(s.tankCapacityWasteL),
    tankCapacityTrashL: numOrNull(s.tankCapacityTrashL), tankCapacityDustBagL: numOrNull(s.tankCapacityDustBagL),
    cleaningFunctionSweepNoVacuum: boolOrNull(s.cleaningFunctionSweepNoVacuum),
    cleaningFunctionSweepVacuum: boolOrNull(s.cleaningFunctionSweepVacuum),
    cleaningFunctionMopDry: boolOrNull(s.cleaningFunctionMopDry),
    cleaningFunctionMopWet: boolOrNull(s.cleaningFunctionMopWet),
    cleaningFunctionScrubBrushRoller: boolOrNull(s.cleaningFunctionScrubBrushRoller),
    cleaningFunctionScrubBrushDisc: boolOrNull(s.cleaningFunctionScrubBrushDisc),
    navigationLidar2d: boolOrNull(s.navigationLidar2d), navigationLidar3d: boolOrNull(s.navigationLidar3d),
    navigationCameraVslam: boolOrNull(s.navigationCameraVslam), spotAi: boolOrNull(s.spotAi),
    batteryType: strOrNull(s.batteryType), batteryVoltageV: numOrNull(s.batteryVoltageV),
    batteryCapacityAh: numOrNull(s.batteryCapacityAh), batteryChargingTimeHr: numOrNull(s.batteryChargingTimeHr),
    batteryWorkTimeSweepHr: numOrNull(s.batteryWorkTimeSweepHr),
    batteryWorkTimeScrubHr: numOrNull(s.batteryWorkTimeScrubHr),
    batteryWorkTimeSweepVacuumHr: numOrNull(s.batteryWorkTimeSweepVacuumHr),
    workStation: boolOrNull(s.workStation), dockCharge: boolOrNull(s.dockCharge),
    manualCharge: boolOrNull(s.manualCharge),
    minimumPassableWidthMm: numOrNull(s.minimumPassableWidthMm),
    minimumPassableHeightMm: numOrNull(s.minimumPassableHeightMm),
    maximumNarrowCrossMm: numOrNull(s.maximumNarrowCrossMm),
    minimumTurnWidthMm: numOrNull(s.minimumTurnWidthMm),
    minimumEdgeFromWallMm: numOrNull(s.minimumEdgeFromWallMm),
    maximumStepHeightMm: numOrNull(s.maximumStepHeightMm), slopeAngleDeg: numOrNull(s.slopeAngleDeg),
    outdoorIndoor: strOrNull(s.outdoorIndoor), ipRating: strOrNull(s.ipRating),
    hepa: boolOrNull(s.hepa),
    floorTypePavingBlocks: boolOrNull(s.floorTypePavingBlocks),
    floorTypeGranite: boolOrNull(s.floorTypeGranite), floorTypeMarble: boolOrNull(s.floorTypeMarble),
    floorTypeTerrazzo: boolOrNull(s.floorTypeTerrazzo), floorTypeTerracotta: boolOrNull(s.floorTypeTerracotta),
    floorTypeCeramic: boolOrNull(s.floorTypeCeramic),
    floorTypeSmoothConcrete: boolOrNull(s.floorTypeSmoothConcrete),
    floorTypeCoarseConcrete: boolOrNull(s.floorTypeCoarseConcrete),
    floorTypeStampedConcrete: boolOrNull(s.floorTypeStampedConcrete),
    floorTypeAsphalt: boolOrNull(s.floorTypeAsphalt), floorTypeEpoxy: boolOrNull(s.floorTypeEpoxy),
    floorTypeTile: boolOrNull(s.floorTypeTile), floorTypeShortCarpet: boolOrNull(s.floorTypeShortCarpet),
    floorTypeLongCarpet: boolOrNull(s.floorTypeLongCarpet), floorTypeSpc: boolOrNull(s.floorTypeSpc),
    floorTypeLaminate: boolOrNull(s.floorTypeLaminate), floorTypeVinyl: boolOrNull(s.floorTypeVinyl),
    floorLayout2x2: boolOrNull(s.floorLayout2x2), floorLayout4x4: boolOrNull(s.floorLayout4x4),
    floorLayout8x8: boolOrNull(s.floorLayout8x8), floorLayout10x10: boolOrNull(s.floorLayout10x10),
    floorLayout12x12: boolOrNull(s.floorLayout12x12), floorLayout20x20: boolOrNull(s.floorLayout20x20),
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
        <CheckboxRow key={key} label={label} checked={spec[key] as boolean}
          onChange={(v) => setSpec((s) => ({ ...s, [key]: v }))} />
      ))}
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */

export function EditRobotClient() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [robotType, setRobotType] = useState<RobotType>('CLEANING');
  const [testStatus, setTestStatus] = useState<TestStatus>('PENDING');
  const [priceBand, setPriceBand] = useState<BudgetBand | ''>('');
  const [rentalPrice, setRentalPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [datasheetUrl, setDatasheetUrl] = useState('');
  const [spec, setSpec] = useState<SpecState>({} as SpecState);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    robotApi.getById(id)
      .then((res) => {
        const robot = res.data.data;
        setBrand(robot.brand);
        setModel(robot.model);
        setRobotType(robot.robotType);
        setTestStatus(robot.testStatus);
        setPriceBand(robot.priceBand ?? '');
        setRentalPrice(robot.rentalPrice != null ? String(robot.rentalPrice) : '');
        setSellingPrice(robot.sellingPrice != null ? String(robot.sellingPrice) : '');
        setImageUrl(robot.imageUrl ?? '');
        setDatasheetUrl(robot.datasheetUrl ?? '');
        setSpec(robotToSpec(robot));
      })
      .catch(() => setFetchError('Failed to load robot. Please go back and try again.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await robotApi.update(id, {
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
      setSaveError('Failed to save changes. Please check the fields and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--app-brand)]" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {fetchError}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link href="/robots"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--app-muted)] hover:text-[var(--app-brand-dark)] transition">
        <ArrowLeft className="h-4 w-4" />Back to Robots
      </Link>

      <form onSubmit={handleSave} className="max-w-3xl space-y-5">

        <SectionCard title="Basic Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Brand" required>
              <input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} required />
            </Field>
            <Field label="Model" required>
              <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} required />
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

        <SectionCard title="Physical Dimensions">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumInput label="Length (mm)" value={spec.lengthMm} onChange={(v) => setSpec((s) => ({ ...s, lengthMm: v }))} />
            <NumInput label="Width (mm)" value={spec.widthMm} onChange={(v) => setSpec((s) => ({ ...s, widthMm: v }))} />
            <NumInput label="Height (mm)" value={spec.heightMm} onChange={(v) => setSpec((s) => ({ ...s, heightMm: v }))} />
            <NumInput label="Weight (kg)" value={spec.robotWeightKg} onChange={(v) => setSpec((s) => ({ ...s, robotWeightKg: v }))} step="0.1" />
          </div>
        </SectionCard>

        <SectionCard title="Performance">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumInput label="Speed (m/s)" value={spec.speedMs} onChange={(v) => setSpec((s) => ({ ...s, speedMs: v }))} step="0.01" />
            <NumInput label="Clean Width (mm)" value={spec.widthCleaningMm} onChange={(v) => setSpec((s) => ({ ...s, widthCleaningMm: v }))} />
            <NumInput label="Brush Pressure (kg)" value={spec.brushPressureKg} onChange={(v) => setSpec((s) => ({ ...s, brushPressureKg: v }))} step="0.1" />
            <NumInput label="Vacuum Pressure (kPa)" value={spec.vacuumPressureKpa} onChange={(v) => setSpec((s) => ({ ...s, vacuumPressureKpa: v }))} step="0.1" />
            <NumInput label="Noise (dB)" value={spec.noiseLevelDb} onChange={(v) => setSpec((s) => ({ ...s, noiseLevelDb: v }))} step="0.1" />
          </div>
        </SectionCard>

        <SectionCard title="Cleaning Efficiency (sqm/h)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumInput label="Sweep" value={spec.cleaningEfficiencySweepSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencySweepSqmH: v }))} />
            <NumInput label="Scrub" value={spec.cleaningEfficiencyScrubSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencyScrubSqmH: v }))} />
            <NumInput label="Mop" value={spec.cleaningEfficiencyMopSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencyMopSqmH: v }))} />
            <NumInput label="Sweep + Scrub" value={spec.cleaningEfficiencySweepScrubSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencySweepScrubSqmH: v }))} />
            <NumInput label="Vacuum" value={spec.cleaningEfficiencyVacuumSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencyVacuumSqmH: v }))} />
          </div>
        </SectionCard>

        <SectionCard title="Tank Capacity (L)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumInput label="Clean Water" value={spec.tankCapacityCleanL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityCleanL: v }))} step="0.1" />
            <NumInput label="Waste Water" value={spec.tankCapacityWasteL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityWasteL: v }))} step="0.1" />
            <NumInput label="Trash" value={spec.tankCapacityTrashL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityTrashL: v }))} step="0.1" />
            <NumInput label="Dust Bag" value={spec.tankCapacityDustBagL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityDustBagL: v }))} step="0.1" />
          </div>
        </SectionCard>

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

        <SectionCard title="Navigation">
          <CheckboxGrid spec={spec} setSpec={setSpec} items={[
            ['LiDAR 2D', 'navigationLidar2d'],
            ['LiDAR 3D', 'navigationLidar3d'],
            ['Camera vSLAM', 'navigationCameraVslam'],
            ['Spot AI', 'spotAi'],
          ]} />
        </SectionCard>

        <SectionCard title="Battery">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Battery Type">
              <input className={inputCls} value={spec.batteryType} onChange={(e) => setSpec((s) => ({ ...s, batteryType: e.target.value }))} placeholder="e.g. Lithium-Ion" />
            </Field>
            <NumInput label="Voltage (V)" value={spec.batteryVoltageV} onChange={(v) => setSpec((s) => ({ ...s, batteryVoltageV: v }))} step="0.1" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumInput label="Capacity (Ah)" value={spec.batteryCapacityAh} onChange={(v) => setSpec((s) => ({ ...s, batteryCapacityAh: v }))} step="0.1" />
            <NumInput label="Charge Time (hr)" value={spec.batteryChargingTimeHr} onChange={(v) => setSpec((s) => ({ ...s, batteryChargingTimeHr: v }))} step="0.1" />
            <NumInput label="Work Time Sweep (hr)" value={spec.batteryWorkTimeSweepHr} onChange={(v) => setSpec((s) => ({ ...s, batteryWorkTimeSweepHr: v }))} step="0.1" />
            <NumInput label="Work Time Scrub (hr)" value={spec.batteryWorkTimeScrubHr} onChange={(v) => setSpec((s) => ({ ...s, batteryWorkTimeScrubHr: v }))} step="0.1" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumInput label="Work Time Sweep+Vacuum (hr)" value={spec.batteryWorkTimeSweepVacuumHr} onChange={(v) => setSpec((s) => ({ ...s, batteryWorkTimeSweepVacuumHr: v }))} step="0.1" />
          </div>
        </SectionCard>

        <SectionCard title="Charging & Work Station">
          <CheckboxGrid spec={spec} setSpec={setSpec} items={[
            ['Work Station', 'workStation'],
            ['Dock Charge', 'dockCharge'],
            ['Manual Charge', 'manualCharge'],
          ]} />
        </SectionCard>

        <SectionCard title="Passability & Obstacles">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumInput label="Min Passable Width (mm)" value={spec.minimumPassableWidthMm} onChange={(v) => setSpec((s) => ({ ...s, minimumPassableWidthMm: v }))} />
            <NumInput label="Min Passable Height (mm)" value={spec.minimumPassableHeightMm} onChange={(v) => setSpec((s) => ({ ...s, minimumPassableHeightMm: v }))} />
            <NumInput label="Max Narrow Cross (mm)" value={spec.maximumNarrowCrossMm} onChange={(v) => setSpec((s) => ({ ...s, maximumNarrowCrossMm: v }))} />
            <NumInput label="Min Turn Width (mm)" value={spec.minimumTurnWidthMm} onChange={(v) => setSpec((s) => ({ ...s, minimumTurnWidthMm: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumInput label="Min Edge from Wall (mm)" value={spec.minimumEdgeFromWallMm} onChange={(v) => setSpec((s) => ({ ...s, minimumEdgeFromWallMm: v }))} />
            <NumInput label="Max Step Height (mm)" value={spec.maximumStepHeightMm} onChange={(v) => setSpec((s) => ({ ...s, maximumStepHeightMm: v }))} />
            <NumInput label="Slope Angle (°)" value={spec.slopeAngleDeg} onChange={(v) => setSpec((s) => ({ ...s, slopeAngleDeg: v }))} step="0.1" />
          </div>
        </SectionCard>

        <SectionCard title="Environment">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Indoor / Outdoor">
              <input className={inputCls} value={spec.outdoorIndoor} onChange={(e) => setSpec((s) => ({ ...s, outdoorIndoor: e.target.value }))} placeholder="Indoor, Outdoor, Both" />
            </Field>
            <Field label="IP Rating">
              <input className={inputCls} value={spec.ipRating} onChange={(e) => setSpec((s) => ({ ...s, ipRating: e.target.value }))} placeholder="e.g. IP65" />
            </Field>
            <div className="flex items-end pb-2">
              <CheckboxRow label="HEPA Filter" checked={spec.hepa} onChange={(v) => setSpec((s) => ({ ...s, hepa: v }))} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Supported Floor Types">
          <CheckboxGrid spec={spec} setSpec={setSpec} items={[
            ['Paving Blocks', 'floorTypePavingBlocks'], ['Granite', 'floorTypeGranite'],
            ['Marble', 'floorTypeMarble'], ['Terrazzo', 'floorTypeTerrazzo'],
            ['Terracotta', 'floorTypeTerracotta'], ['Ceramic', 'floorTypeCeramic'],
            ['Smooth Concrete', 'floorTypeSmoothConcrete'], ['Coarse Concrete', 'floorTypeCoarseConcrete'],
            ['Stamped Concrete', 'floorTypeStampedConcrete'], ['Asphalt', 'floorTypeAsphalt'],
            ['Epoxy', 'floorTypeEpoxy'], ['Tile', 'floorTypeTile'],
            ['Short Carpet', 'floorTypeShortCarpet'], ['Long Carpet', 'floorTypeLongCarpet'],
            ['SPC', 'floorTypeSpc'], ['Laminate', 'floorTypeLaminate'], ['Vinyl', 'floorTypeVinyl'],
          ]} />
        </SectionCard>

        <SectionCard title="Floor Tile Layouts">
          <CheckboxGrid spec={spec} setSpec={setSpec} items={[
            ['2×2', 'floorLayout2x2'], ['4×4', 'floorLayout4x4'], ['8×8', 'floorLayout8x8'],
            ['10×10', 'floorLayout10x10'], ['12×12', 'floorLayout12x12'], ['20×20', 'floorLayout20x20'],
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
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
