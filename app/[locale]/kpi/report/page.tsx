import { KpiClient } from '../KpiClient';
import { resolveKpi, resolvePeriod, type KpiSearchParams } from '@/lib/kpi/params';

/**
 * The deck's board view. The only KPI area computed from synced tickets, so it
 * is also the only one that answers for a period other than the deck's own.
 */
export default async function KpiReportPage({
  searchParams,
}: {
  searchParams: Promise<KpiSearchParams>;
}) {
  const sp = await searchParams;
  const { period, preset } = resolvePeriod(sp);

  return (
    <KpiClient
      initialKpi={resolveKpi(sp)}
      initialPeriod={period}
      initialPreset={preset}
      section="report"
    />
  );
}
