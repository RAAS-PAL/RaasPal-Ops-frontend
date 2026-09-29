'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { robotApi } from '@/lib/api';
import { ROBOT_TYPES } from '@/lib/robot-types';
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
  const tf = useTranslations('robotForm');
  const d = useTranslations('robotDetail');
  const typeT = useTranslations('robots.types');
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
      .catch(() => setFetchError(tf('loadFailed')))
      .finally(() => setLoading(false));
  }, [id, tf]);

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
      setSaveError(tf('updateFailed'));
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
        <ArrowLeft className="h-4 w-4" />{tf('back')}
      </Link>

      <form onSubmit={handleSave} className="max-w-3xl space-y-5">

        <SectionCard title={tf('section.basic')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={tf('brand')} required>
              <input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} required />
            </Field>
            <Field label={tf('model')} required>
              <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} required />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={tf('robotType')} required>
              <select className={selectCls} value={robotType} onChange={(e) => setRobotType(e.target.value as RobotType)}>
                {ROBOT_TYPES.map((t) => (
                  <option key={t} value={t}>{typeT(t.toLowerCase())}</option>
                ))}
              </select>
            </Field>
            <Field label={tf('testStatus')}>
              <select className={selectCls} value={testStatus} onChange={(e) => setTestStatus(e.target.value as TestStatus)}>
                <option value="DRAFT">{d('status.DRAFT')}</option>
                <option value="PENDING">{d('status.PENDING')}</option>
                <option value="UNDER_TESTING">{d('status.UNDER_TESTING')}</option>
                <option value="VERIFIED">{d('status.VERIFIED')}</option>
                <option value="REJECTED">{d('status.REJECTED')}</option>
              </select>
            </Field>
            <Field label={tf('priceBand')}>
              <select className={selectCls} value={priceBand} onChange={(e) => setPriceBand(e.target.value as BudgetBand | '')}>
                <option value="">{tf('select')}</option>
                <option value="LOW">{tf('priceLow')}</option>
                <option value="MEDIUM">{tf('priceMedium')}</option>
                <option value="HIGH">{tf('priceHigh')}</option>
                <option value="PREMIUM">{tf('pricePremium')}</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={tf('rental')}>
              <input className={inputCls} type="number" min="0" step="1" value={rentalPrice}
                onChange={(e) => setRentalPrice(e.target.value)} placeholder={tf('example', { value: '35000' })} />
            </Field>
            <Field label={tf('selling')}>
              <input className={inputCls} type="number" min="0" step="1" value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)} placeholder={tf('example', { value: '450000' })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={tf('imageUrl')}>
              <input className={inputCls} type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </Field>
            <Field label={tf('datasheetUrl')}>
              <input className={inputCls} type="url" value={datasheetUrl} onChange={(e) => setDatasheetUrl(e.target.value)} placeholder="https://…" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title={d('section.physical')}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumInput label={`${d('stat.length')} (mm)`} value={spec.lengthMm} onChange={(v) => setSpec((s) => ({ ...s, lengthMm: v }))} />
            <NumInput label={`${d('stat.width')} (mm)`} value={spec.widthMm} onChange={(v) => setSpec((s) => ({ ...s, widthMm: v }))} />
            <NumInput label={`${d('stat.height')} (mm)`} value={spec.heightMm} onChange={(v) => setSpec((s) => ({ ...s, heightMm: v }))} />
            <NumInput label={`${d('stat.weight')} (kg)`} value={spec.robotWeightKg} onChange={(v) => setSpec((s) => ({ ...s, robotWeightKg: v }))} step="0.1" />
          </div>
        </SectionCard>

        <SectionCard title={d('section.performance')}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumInput label={`${d('stat.speed')} (m/s)`} value={spec.speedMs} onChange={(v) => setSpec((s) => ({ ...s, speedMs: v }))} step="0.01" />
            <NumInput label={`${d('stat.cleaningWidth')} (mm)`} value={spec.widthCleaningMm} onChange={(v) => setSpec((s) => ({ ...s, widthCleaningMm: v }))} />
            <NumInput label={`${d('stat.brushPressure')} (kg)`} value={spec.brushPressureKg} onChange={(v) => setSpec((s) => ({ ...s, brushPressureKg: v }))} step="0.1" />
            <NumInput label={`${d('stat.vacuumPressure')} (kPa)`} value={spec.vacuumPressureKpa} onChange={(v) => setSpec((s) => ({ ...s, vacuumPressureKpa: v }))} step="0.1" />
            <NumInput label={`${d('stat.noise')} (dB)`} value={spec.noiseLevelDb} onChange={(v) => setSpec((s) => ({ ...s, noiseLevelDb: v }))} step="0.1" />
          </div>
        </SectionCard>

        <SectionCard title={d('section.efficiency')}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumInput label={d('stat.sweep')} value={spec.cleaningEfficiencySweepSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencySweepSqmH: v }))} />
            <NumInput label={d('stat.scrub')} value={spec.cleaningEfficiencyScrubSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencyScrubSqmH: v }))} />
            <NumInput label={d('stat.mop')} value={spec.cleaningEfficiencyMopSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencyMopSqmH: v }))} />
            <NumInput label={d('stat.sweepScrub')} value={spec.cleaningEfficiencySweepScrubSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencySweepScrubSqmH: v }))} />
            <NumInput label={d('stat.vacuum')} value={spec.cleaningEfficiencyVacuumSqmH} onChange={(v) => setSpec((s) => ({ ...s, cleaningEfficiencyVacuumSqmH: v }))} />
          </div>
        </SectionCard>

        <SectionCard title={d('section.tank')}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumInput label={d('stat.cleanWater')} value={spec.tankCapacityCleanL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityCleanL: v }))} step="0.1" />
            <NumInput label={d('stat.wasteWater')} value={spec.tankCapacityWasteL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityWasteL: v }))} step="0.1" />
            <NumInput label={d('stat.trash')} value={spec.tankCapacityTrashL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityTrashL: v }))} step="0.1" />
            <NumInput label={d('stat.dustBag')} value={spec.tankCapacityDustBagL} onChange={(v) => setSpec((s) => ({ ...s, tankCapacityDustBagL: v }))} step="0.1" />
          </div>
        </SectionCard>

        <SectionCard title={d('section.functions')}>
          <CheckboxGrid spec={spec} setSpec={setSpec} items={[
            [d('fn.sweepNoVacuum'), 'cleaningFunctionSweepNoVacuum'],
            [d('fn.sweepVacuum'), 'cleaningFunctionSweepVacuum'],
            [d('fn.mopDry'), 'cleaningFunctionMopDry'],
            [d('fn.mopWet'), 'cleaningFunctionMopWet'],
            [d('fn.scrubRoller'), 'cleaningFunctionScrubBrushRoller'],
            [d('fn.scrubDisc'), 'cleaningFunctionScrubBrushDisc'],
          ]} />
        </SectionCard>

        <SectionCard title={d('section.navigation')}>
          <CheckboxGrid spec={spec} setSpec={setSpec} items={[
            [d('nav.lidar2d'), 'navigationLidar2d'],
            [d('nav.lidar3d'), 'navigationLidar3d'],
            [d('nav.vslam'), 'navigationCameraVslam'],
            [d('nav.spotAi'), 'spotAi'],
          ]} />
        </SectionCard>

        <SectionCard title={d('section.battery')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={tf('batteryType')}>
              <input className={inputCls} value={spec.batteryType} onChange={(e) => setSpec((s) => ({ ...s, batteryType: e.target.value }))} placeholder={tf('example', { value: 'Lithium-Ion' })} />
            </Field>
            <NumInput label={`${d('stat.voltage')} (V)`} value={spec.batteryVoltageV} onChange={(v) => setSpec((s) => ({ ...s, batteryVoltageV: v }))} step="0.1" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumInput label={`${d('stat.capacity')} (Ah)`} value={spec.batteryCapacityAh} onChange={(v) => setSpec((s) => ({ ...s, batteryCapacityAh: v }))} step="0.1" />
            <NumInput label={tf('chargeTimeHr')} value={spec.batteryChargingTimeHr} onChange={(v) => setSpec((s) => ({ ...s, batteryChargingTimeHr: v }))} step="0.1" />
            <NumInput label={tf('workSweepHr')} value={spec.batteryWorkTimeSweepHr} onChange={(v) => setSpec((s) => ({ ...s, batteryWorkTimeSweepHr: v }))} step="0.1" />
            <NumInput label={tf('workScrubHr')} value={spec.batteryWorkTimeScrubHr} onChange={(v) => setSpec((s) => ({ ...s, batteryWorkTimeScrubHr: v }))} step="0.1" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumInput label={tf('workSweepVacHr')} value={spec.batteryWorkTimeSweepVacuumHr} onChange={(v) => setSpec((s) => ({ ...s, batteryWorkTimeSweepVacuumHr: v }))} step="0.1" />
          </div>
        </SectionCard>

        <SectionCard title={tf('section.chargingStation')}>
          <CheckboxGrid spec={spec} setSpec={setSpec} items={[
            [d('stat.workStation'), 'workStation'],
            [d('stat.dockCharge'), 'dockCharge'],
            [d('stat.manualCharge'), 'manualCharge'],
          ]} />
        </SectionCard>

        <SectionCard title={d('section.passability')}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumInput label={`${d('stat.minWidth')} (mm)`} value={spec.minimumPassableWidthMm} onChange={(v) => setSpec((s) => ({ ...s, minimumPassableWidthMm: v }))} />
            <NumInput label={`${d('stat.minHeight')} (mm)`} value={spec.minimumPassableHeightMm} onChange={(v) => setSpec((s) => ({ ...s, minimumPassableHeightMm: v }))} />
            <NumInput label={`${d('stat.maxNarrow')} (mm)`} value={spec.maximumNarrowCrossMm} onChange={(v) => setSpec((s) => ({ ...s, maximumNarrowCrossMm: v }))} />
            <NumInput label={`${d('stat.minTurn')} (mm)`} value={spec.minimumTurnWidthMm} onChange={(v) => setSpec((s) => ({ ...s, minimumTurnWidthMm: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumInput label={`${d('stat.minEdge')} (mm)`} value={spec.minimumEdgeFromWallMm} onChange={(v) => setSpec((s) => ({ ...s, minimumEdgeFromWallMm: v }))} />
            <NumInput label={`${d('stat.maxStep')} (mm)`} value={spec.maximumStepHeightMm} onChange={(v) => setSpec((s) => ({ ...s, maximumStepHeightMm: v }))} />
            <NumInput label={`${d('stat.slope')} (°)`} value={spec.slopeAngleDeg} onChange={(v) => setSpec((s) => ({ ...s, slopeAngleDeg: v }))} step="0.1" />
          </div>
        </SectionCard>

        <SectionCard title={d('section.environment')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={d('stat.indoorOutdoor')}>
              <input className={inputCls} value={spec.outdoorIndoor} onChange={(e) => setSpec((s) => ({ ...s, outdoorIndoor: e.target.value }))} placeholder={tf('example', { value: 'Indoor, Outdoor, Both' })} />
            </Field>
            <Field label={d('stat.ipRating')}>
              <input className={inputCls} value={spec.ipRating} onChange={(e) => setSpec((s) => ({ ...s, ipRating: e.target.value }))} placeholder={tf('example', { value: 'IP65' })} />
            </Field>
            <div className="flex items-end pb-2">
              <CheckboxRow label={d('stat.hepa')} checked={spec.hepa} onChange={(v) => setSpec((s) => ({ ...s, hepa: v }))} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title={d('section.floors')}>
          <CheckboxGrid spec={spec} setSpec={setSpec} items={[
            [d('floor.pavingBlocks'), 'floorTypePavingBlocks'], [d('floor.granite'), 'floorTypeGranite'],
            [d('floor.marble'), 'floorTypeMarble'], [d('floor.terrazzo'), 'floorTypeTerrazzo'],
            [d('floor.terracotta'), 'floorTypeTerracotta'], [d('floor.ceramic'), 'floorTypeCeramic'],
            [d('floor.smoothConcrete'), 'floorTypeSmoothConcrete'], [d('floor.coarseConcrete'), 'floorTypeCoarseConcrete'],
            [d('floor.stampedConcrete'), 'floorTypeStampedConcrete'], [d('floor.asphalt'), 'floorTypeAsphalt'],
            [d('floor.epoxy'), 'floorTypeEpoxy'], [d('floor.tile'), 'floorTypeTile'],
            [d('floor.shortCarpet'), 'floorTypeShortCarpet'], [d('floor.longCarpet'), 'floorTypeLongCarpet'],
            [d('floor.spc'), 'floorTypeSpc'], [d('floor.laminate'), 'floorTypeLaminate'], [d('floor.vinyl'), 'floorTypeVinyl'],
          ]} />
        </SectionCard>

        <SectionCard title={d('section.layouts')}>
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
            {saving ? tf('saving') : tf('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
}
