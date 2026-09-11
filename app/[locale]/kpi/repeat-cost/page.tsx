import { KpiClient } from '../KpiClient';
import { resolvePeriod, type KpiSearchParams } from '@/lib/kpi/params';

export default async function KpiRepeatCostPage({
  searchParams,
}: {
  searchParams: Promise<KpiSearchParams>;
}) {
  const { period, preset } = resolvePeriod(await searchParams);
  return <KpiClient initialPeriod={period} initialPreset={preset} section="repeat-cost" />;
}
