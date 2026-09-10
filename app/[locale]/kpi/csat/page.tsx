import { KpiClient } from '../KpiClient';
import { resolvePeriod, type KpiSearchParams } from '@/lib/kpi/params';

export default async function KpiCsatPage({
  searchParams,
}: {
  searchParams: Promise<KpiSearchParams>;
}) {
  const { period, preset } = resolvePeriod(await searchParams);
  return <KpiClient initialPeriod={period} initialPreset={preset} section="csat" />;
}
