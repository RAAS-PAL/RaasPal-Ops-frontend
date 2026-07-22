'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { recommendationApi, translateApi } from '@/lib/api';
import type {
  RecommendationItemResponse,
  RecommendationResponse,
  RobotSpecResponse,
} from '@/types/api';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { FlowStepper } from '@/components/FlowStepper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Bot,
  ChevronRight,
  FileText,
  Languages,
  Lightbulb,
  Loader2,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

const RANK_STYLES = [
  { color: 'bg-amber-400/20 text-amber-600', icon: Trophy },
  { color: 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]', icon: BadgeCheck },
  { color: 'bg-[var(--app-faint)] text-[var(--app-muted)]', icon: Bot },
];

const FIT_LEVEL_STYLE: Record<string, string> = {
  HIGH: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  LOW: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
};

interface TranslatedOption {
  customerSummaryLines: string[];
  whyLines: string[];
  limitationLines: string[];
  businessValue: string | null;
  missingLines: string[];
  suggestedNextStep: string | null;
}

interface TranslatedData {
  options: Record<string, TranslatedOption>;
  aiExplanation: string | null;
}

/** Strip trailing artifacts left by AI list formatting, e.g. "; (" or ": (" before a sub-list number. */
function cleanLine(s: string): string {
  return s.replace(/[;:]\s*\(?\s*$/, '').trim();
}

/** Split "1) foo. 2) bar." or newline-delimited text into an array of strings. */
function parseIntoLines(text: string): string[] {
  const trimmed = text.trim();
  const byNumber = trimmed.split(/(?=\b\d+[).]\s)/);
  if (byNumber.length > 1) {
    return byNumber
      .filter((part, i) => {
        // Drop the first segment if it was just a preamble intro (e.g. "It offers: (")
        // — cleanLine would strip the trailing ": (" leaving an incomplete sentence.
        if (i === 0 && /[;:]\s*\(?\s*$/.test(part.trim())) return false;
        return true;
      })
      .map((p) => cleanLine(p.replace(/^\d+[).]\s*/, '')))
      .filter(Boolean);
  }
  const byLine = trimmed.split(/\n+/).map((l) => cleanLine(l)).filter(Boolean);
  if (byLine.length > 1) return byLine;
  return [cleanLine(trimmed)].filter(Boolean);
}

function buildSpecChips(spec: RobotSpecResponse): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = [];
  if (spec.lengthMm && spec.widthMm && spec.heightMm) {
    chips.push({ label: 'Body Size', value: `${spec.lengthMm}×${spec.widthMm}×${spec.heightMm} mm` });
  }
  if (spec.widthCleaningMm) {
    chips.push({ label: 'Cleaning Width', value: `${spec.widthCleaningMm} mm` });
  }
  const cleanTank = spec.tankCapacityCleanL != null ? `${spec.tankCapacityCleanL}L` : null;
  const wasteTank = spec.tankCapacityWasteL != null ? `${spec.tankCapacityWasteL}L` : null;
  if (cleanTank || wasteTank) {
    chips.push({ label: 'Tanks (Clean/Waste)', value: [cleanTank, wasteTank].filter(Boolean).join(' / ') });
  }
  if (spec.batteryWorkTimeSweepHr != null) {
    chips.push({ label: 'Battery (Sweep)', value: `${spec.batteryWorkTimeSweepHr} hr` });
  }
  if (spec.batteryWorkTimeScrubHr != null) {
    chips.push({ label: 'Battery (Scrub)', value: `${spec.batteryWorkTimeScrubHr} hr` });
  }
  if (spec.batteryChargingTimeHr != null) {
    chips.push({ label: 'Charge Time', value: `${spec.batteryChargingTimeHr} hr` });
  }
  const navParts: string[] = [];
  if (spec.navigationLidar2d) navParts.push('2D LiDAR');
  if (spec.navigationLidar3d) navParts.push('3D LiDAR');
  if (spec.navigationCameraVslam) navParts.push('VSLAM');
  if (navParts.length) chips.push({ label: 'Navigation', value: navParts.join(', ') });
  if (spec.minimumPassableWidthMm != null) {
    chips.push({ label: 'Min Pass Width', value: `${spec.minimumPassableWidthMm} mm` });
  }
  if (spec.speedMs != null) {
    chips.push({ label: 'Speed', value: `${spec.speedMs} m/s` });
  }
  if (spec.ipRating) chips.push({ label: 'IP Rating', value: spec.ipRating });
  if (spec.workStation != null) {
    chips.push({ label: 'Auto Dock', value: spec.workStation ? 'Yes' : 'No' });
  }
  if (spec.cleaningEfficiencySweepScrubSqmH != null) {
    chips.push({ label: 'Efficiency (Sweep+Scrub)', value: `${spec.cleaningEfficiencySweepScrubSqmH} m²/h` });
  } else {
    if (spec.cleaningEfficiencySweepSqmH != null) {
      chips.push({ label: 'Efficiency (Sweep)', value: `${spec.cleaningEfficiencySweepSqmH} m²/h` });
    }
    if (spec.cleaningEfficiencyScrubSqmH != null) {
      chips.push({ label: 'Efficiency (Scrub)', value: `${spec.cleaningEfficiencyScrubSqmH} m²/h` });
    }
  }
  if (spec.noiseLevelDb != null) {
    chips.push({ label: 'Noise', value: `${spec.noiseLevelDb} dB` });
  }
  return chips;
}

function RobotImage({ imageUrl, model, size = 144 }: { imageUrl: string | null; model: string; size?: number }) {
  const [hasError, setHasError] = useState(false);
  const dim = `h-[${size}px] w-[${size}px]`;
  if (!imageUrl || hasError) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-xl bg-[var(--app-faint)]"
        style={{ width: size, height: size }}
      >
        <Bot className="h-10 w-10 text-[var(--app-muted)] opacity-30" />
      </div>
    );
  }
  return (
    <Image
      alt={model}
      className="shrink-0 rounded-xl bg-[var(--app-faint)] object-contain p-2"
      height={size}
      onError={() => setHasError(true)}
      src={imageUrl}
      style={{ width: size, height: size }}
      unoptimized
      width={size}
    />
  );
}

function BulletList({ items, color = 'bg-[var(--app-muted)]' }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm leading-5 text-[var(--app-text)]">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full opacity-60 ${color}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

/* ─── Summary column card (shown in the grid) ───────────────────────────────── */

function RobotSummaryCard({
  item,
  rankLabels,
  onClick,
  translated,
}: {
  item: RecommendationItemResponse;
  rankLabels: string[];
  onClick: () => void;
  translated?: TranslatedOption;
}) {
  const style = RANK_STYLES[item.rankPosition - 1] ?? RANK_STYLES[2];
  const label = rankLabels[item.rankPosition - 1] ?? rankLabels[2];
  const RankIcon = style.icon;
  const fitKey = item.fitLevel?.toUpperCase() ?? '';
  const fitStyle = FIT_LEVEL_STYLE[fitKey] ?? null;
  const summaryLines = translated?.customerSummaryLines
    ?? (item.customerSummary || item.whyRecommended ? parseIntoLines(item.customerSummary || item.whyRecommended!) : []);

  return (
    <button
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] text-left shadow-sm transition hover:border-[var(--app-brand)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-brand)]"
      onClick={onClick}
      type="button"
    >
      {/* Rank header strip */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${style.color}`}>
        <div className="flex items-center gap-1.5">
          <RankIcon className="h-4 w-4" />
          <span className="text-xs font-bold">{label}</span>
        </div>
        {fitStyle && item.fitLevel && (
          <Badge className={`text-[10px] font-semibold ${fitStyle}`} variant="secondary">
            {item.fitLevel} Fit
          </Badge>
        )}
      </div>

      {/* Image + identity */}
      <div className="flex flex-col items-center gap-3 px-5 pt-5 pb-3">
        <RobotImage imageUrl={item.robot.imageUrl} model={item.robot.model} size={96} />
        <div className="text-center">
          <h3 className="text-base font-bold text-[var(--app-text)]">{item.robot.model}</h3>
          <p className="mt-0.5 text-sm text-[var(--app-muted)]">{item.robot.brand}</p>
        </div>
      </div>

      {/* Price */}
      {(item.robot.rentalPrice != null || item.robot.sellingPrice != null) && (
        <div className="flex flex-wrap justify-center gap-3 px-5 pb-3 text-sm">
          {item.robot.rentalPrice != null && (
            <span className="text-[var(--app-muted)]">
              Rental:{' '}
              <span className="font-semibold text-[var(--app-text)]">
                ฿{item.robot.rentalPrice.toLocaleString()}/mo
              </span>
            </span>
          )}
          {item.robot.sellingPrice != null && (
            <span className="text-[var(--app-muted)]">
              Buy:{' '}
              <span className="font-semibold text-[var(--app-text)]">
                ฿{item.robot.sellingPrice.toLocaleString()}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Customer-friendly summary bullet list */}
      {summaryLines.length > 0 && (
        <div className="mx-4 mb-4 rounded-lg border border-emerald-200 border-l-4 border-l-emerald-400 bg-emerald-50/80 px-4 py-3 dark:border-emerald-800/30 dark:border-l-emerald-500 dark:bg-emerald-950/40">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Why this robot?
            </p>
          </div>
          <ul className="space-y-2">
            {summaryLines.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                <span className="text-sm leading-5 text-emerald-900 dark:text-emerald-200">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View details hint */}
      <div className="mt-auto flex items-center justify-center gap-1 border-t border-[var(--app-border)] px-4 py-3 text-xs font-semibold text-[var(--app-muted)] transition group-hover:text-[var(--app-brand)]">
        View full details
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

/* ─── Detail modal (full info + select button) ──────────────────────────────── */

function RobotDetailModal({
  item,
  rankLabels,
  onClose,
  onSelect,
  translated,
}: {
  item: RecommendationItemResponse;
  rankLabels: string[];
  onClose: () => void;
  onSelect: () => void;
  translated?: TranslatedOption;
}) {
  const t = useTranslations('generateSolution.recommendation');
  const style = RANK_STYLES[item.rankPosition - 1] ?? RANK_STYLES[2];
  const label = rankLabels[item.rankPosition - 1] ?? rankLabels[2];
  const RankIcon = style.icon;
  const fitKey = item.fitLevel?.toUpperCase() ?? '';
  const fitStyle = FIT_LEVEL_STYLE[fitKey] ?? null;
  const specChips = item.robot.spec ? buildSpecChips(item.robot.spec) : [];
  const whyLines = translated?.whyLines ?? (item.whyRecommended ? parseIntoLines(item.whyRecommended) : []);
  const limitationLines = translated?.limitationLines ?? (item.limitations ? parseIntoLines(item.limitations) : []);
  const missingLines = translated?.missingLines ?? (item.missingInformation ? parseIntoLines(item.missingInformation) : []);
  const businessValue = translated?.businessValue ?? item.businessValue;
  const suggestedNextStep = translated?.suggestedNextStep ?? item.suggestedNextStep;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-2xl">

        {/* Modal rank header */}
        <div className={`flex shrink-0 items-center justify-between px-5 py-3 ${style.color}`}>
          <div className="flex items-center gap-2">
            <RankIcon className="h-5 w-5" />
            <span className="font-bold">{label}</span>
            {fitStyle && item.fitLevel && (
              <Badge className={`text-xs font-semibold ${fitStyle}`} variant="secondary">
                {item.fitLevel} Fit
              </Badge>
            )}
          </div>
          <button
            className="rounded-lg p-1 opacity-60 transition hover:opacity-100"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto">

          {/* Identity + select */}
          <div className="flex flex-wrap items-start gap-4 p-5">
            <RobotImage imageUrl={item.robot.imageUrl} model={item.robot.model} size={120} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h3 className="text-xl font-bold text-[var(--app-text)]">{item.robot.model}</h3>
              <p className="text-sm font-semibold text-[var(--app-muted)]">{item.robot.brand}</p>
              {(item.robot.rentalPrice != null || item.robot.sellingPrice != null) && (
                <div className="flex flex-wrap gap-4 text-sm">
                  {item.robot.rentalPrice != null && (
                    <span className="text-[var(--app-muted)]">
                      Rental:{' '}
                      <span className="font-semibold text-[var(--app-text)]">
                        ฿{item.robot.rentalPrice.toLocaleString()}/mo
                      </span>
                    </span>
                  )}
                  {item.robot.sellingPrice != null && (
                    <span className="text-[var(--app-muted)]">
                      Purchase:{' '}
                      <span className="font-semibold text-[var(--app-text)]">
                        ฿{item.robot.sellingPrice.toLocaleString()}
                      </span>
                    </span>
                  )}
                </div>
              )}
              <div className="pt-1">
                <Button
                  className="gap-1.5 bg-[var(--app-brand)] text-sm text-white hover:bg-[var(--app-brand-dark)]"
                  onClick={onSelect}
                  size="sm"
                  type="button"
                >
                  {t('selectRobot')}
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Key Specs */}
          {specChips.length > 0 && (
            <div className="border-t border-[var(--app-border)] px-5 py-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-muted)]">
                Key Specs
              </p>
              <div className="flex flex-wrap gap-2">
                {specChips.map((chip) => (
                  <div
                    key={chip.label}
                    className="rounded-lg border border-[var(--app-border)] bg-[var(--app-faint)] px-3 py-1.5"
                  >
                    <p className="text-[10px] font-semibold uppercase leading-none text-[var(--app-muted)]">
                      {chip.label}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--app-text)]">{chip.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why Recommended / Limitations */}
          {(whyLines.length > 0 || limitationLines.length > 0) && (
            <div className="grid gap-5 border-t border-[var(--app-border)] p-5 sm:grid-cols-2">
              {whyLines.length > 0 && (
                <div>
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                    {t('whyRecommended')}
                  </p>
                  <BulletList items={whyLines} color="bg-emerald-500" />
                </div>
              )}
              {limitationLines.length > 0 && (
                <div>
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                    {t('limitations')}
                  </p>
                  <BulletList items={limitationLines} color="bg-amber-500" />
                </div>
              )}
            </div>
          )}

          {/* Business Value */}
          {businessValue && (
            <div className="border-t border-[var(--app-border)] px-5 py-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-brand)]">
                Business Value
              </p>
              <p className="text-sm leading-5 text-[var(--app-text)]">{businessValue}</p>
            </div>
          )}

          {/* Missing Information */}
          {missingLines.length > 0 && (
            <div className="border-t border-[var(--app-border)] px-5 py-4">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/30">
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Missing Information
                  </p>
                </div>
                <BulletList items={missingLines} color="bg-amber-500 dark:bg-amber-400" />
              </div>
            </div>
          )}

          {/* Suggested Next Step */}
          {suggestedNextStep && (
            <div className="border-t border-[var(--app-border)] px-5 py-4">
              <div className="rounded-lg border border-[var(--app-brand-soft)] bg-[var(--app-brand-soft)]/20 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-[var(--app-brand)]" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--app-brand)]">
                    Suggested Next Step
                  </p>
                </div>
                <p className="text-sm leading-5 text-[var(--app-text)]">{suggestedNextStep}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

interface RecommendationClientProps {
  locale: string;
  solutionType: string;
}

function RecommendationInner({ solutionType }: Pick<RecommendationClientProps, 'solutionType'>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('generateSolution.recommendation');
  const reqId = searchParams.get('reqId');
  const recId = searchParams.get('recId');
  const solutionName = searchParams.get('solutionName') ?? undefined;

  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RecommendationItemResponse | null>(null);
  const [translatedData, setTranslatedData] = useState<TranslatedData | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    const catchErr = (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('errorGeneric'),
      );
    };

    if (recId) {
      recommendationApi
        .getById(recId)
        .then((res) => {
          if (res.data.success) setRecommendation(res.data.data);
          else setError(res.data.message ?? t('failedGenerate'));
        })
        .catch(catchErr)
        .finally(() => setLoading(false));
    } else if (reqId) {
      recommendationApi
        .generate(reqId, solutionName ? { name: solutionName } : undefined)
        .then((res) => {
          if (res.data.success) setRecommendation(res.data.data);
          else setError(res.data.message ?? t('failedGenerate'));
        })
        .catch(catchErr)
        .finally(() => setLoading(false));
    } else {
      setError(t('noRequirementId'));
      setLoading(false);
    }
  }, [reqId, recId, solutionName]);

  async function handleTranslate() {
    if (!recommendation) return;
    if (translatedData) { setTranslatedData(null); return; }

    const texts: string[] = [];
    const slots: Array<{ key: string; type: string; start: number; count: number }> = [];

    function addSlot(key: string, type: string, items: string[]) {
      if (!items.length) return;
      slots.push({ key, type, start: texts.length, count: items.length });
      texts.push(...items);
    }

    for (const item of recommendation.options) {
      const summaryLines = parseIntoLines(item.customerSummary || item.whyRecommended || '');
      addSlot(item.id, 'customerSummary', summaryLines);
      const whyLines = item.whyRecommended ? parseIntoLines(item.whyRecommended) : [];
      addSlot(item.id, 'why', whyLines);
      const limitLines = item.limitations ? parseIntoLines(item.limitations) : [];
      addSlot(item.id, 'limitations', limitLines);
      if (item.businessValue) addSlot(item.id, 'businessValue', [item.businessValue]);
      const missingLines = item.missingInformation ? parseIntoLines(item.missingInformation) : [];
      addSlot(item.id, 'missing', missingLines);
      if (item.suggestedNextStep) addSlot(item.id, 'nextStep', [item.suggestedNextStep]);
    }
    if (recommendation.aiExplanation) addSlot('__ai__', 'aiExplanation', [recommendation.aiExplanation]);

    if (!texts.length) return;
    setTranslating(true);
    try {
      const res = await translateApi.toThai(texts);
      const tr = res.data.data.translations;
      const result: TranslatedData = { options: {}, aiExplanation: null };
      for (const slot of slots) {
        const slice = tr.slice(slot.start, slot.start + slot.count);
        if (slot.key === '__ai__') {
          result.aiExplanation = slice[0] ?? null;
        } else {
          if (!result.options[slot.key]) {
            result.options[slot.key] = { customerSummaryLines: [], whyLines: [], limitationLines: [], businessValue: null, missingLines: [], suggestedNextStep: null };
          }
          const o = result.options[slot.key];
          if (slot.type === 'customerSummary') o.customerSummaryLines = slice;
          else if (slot.type === 'why') o.whyLines = slice;
          else if (slot.type === 'limitations') o.limitationLines = slice;
          else if (slot.type === 'businessValue') o.businessValue = slice[0] ?? null;
          else if (slot.type === 'missing') o.missingLines = slice;
          else if (slot.type === 'nextStep') o.suggestedNextStep = slice[0] ?? null;
        }
      }
      setTranslatedData(result);
    } catch {
      // silently fail — keep English content
    } finally {
      setTranslating(false);
    }
  }

  function handleSelect(item: RecommendationItemResponse) {
    if (!recommendation) return;
    router.push(
      `/generate-solution/${solutionType}/proposal?itemId=${item.id}&recId=${recommendation.id}`,
      { locale },
    );
  }

  const rankLabels = [t('rankBest'), t('rank2'), t('rank3')];

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />

        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t('eyebrow')}
            searchPlaceholder="Search customers, sites, robot criteria"
            title={t('title')}
          />

          <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
            {/* Back link */}
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]"
              href={`/generate-solution/${solutionType}/upload`}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToUpload')}
            </Link>

            {/* Pipeline position */}
            <FlowStepper current="recommendation" />

            {/* Header */}
            <div className="bg-aurora animate-aurora relative overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-[var(--app-brand-glow)]">
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-100">{t('step')}</p>
              <h2 className="mt-2 text-2xl font-bold">{t('heading')}</h2>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center gap-4 py-16">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--app-brand)]" />
                <p className="font-semibold text-[var(--app-text)]">{t('loading')}</p>
                <p className="text-sm text-[var(--app-muted)]">{t('loadingSub')}</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Results */}
            {recommendation && !loading && (
              <>
                {/* Instruction hint + translate toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--app-muted)]">
                    Click any option to view full details and select it.
                  </p>
                  <Button
                    className="gap-1.5 text-xs"
                    disabled={translating}
                    onClick={handleTranslate}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {translating
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Languages className="h-3.5 w-3.5" />}
                    {translatedData ? 'Back to English' : 'แปลเป็นภาษาไทย'}
                  </Button>
                </div>

                {/* Comparison columns grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {recommendation.options
                    .slice()
                    .sort((a, b) => a.rankPosition - b.rankPosition)
                    .map((item) => (
                      <RobotSummaryCard
                        key={item.id}
                        item={item}
                        onClick={() => setSelectedItem(item)}
                        rankLabels={rankLabels}
                        translated={translatedData?.options[item.id]}
                      />
                    ))}
                </div>

                {/* AI summary — below the columns */}
                {recommendation.aiExplanation && (
                  <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
                    <p className="mb-2 text-xs font-semibold uppercase text-[var(--app-muted)]">
                      {t('aiSummary')}
                    </p>
                    <p className="text-sm leading-6 text-[var(--app-text)]">
                      {translatedData?.aiExplanation ?? recommendation.aiExplanation}
                    </p>
                    <p className="mt-3 text-xs italic text-[var(--app-muted)]">
                      {t('verificationNote')}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Detail modal */}
      {selectedItem && (
        <RobotDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSelect={() => handleSelect(selectedItem)}
          rankLabels={rankLabels}
          translated={translatedData?.options[selectedItem.id]}
        />
      )}
    </main>
  );
}

/** Outer wrapper provides a Suspense boundary for useSearchParams(). */
export function RecommendationClient(props: RecommendationClientProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)]">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--app-brand)]" />
        </main>
      }
    >
      <RecommendationInner solutionType={props.solutionType} />
    </Suspense>
  );
}
