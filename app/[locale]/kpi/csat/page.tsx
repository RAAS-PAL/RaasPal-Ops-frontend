import { KpiClient } from '../KpiClient';
import { resolvePeriod, resolveSurvey, type KpiSearchParams } from '@/lib/kpi/params';

export default async function KpiCsatPage({
  searchParams,
}: {
  searchParams: Promise<KpiSearchParams>;
}) {
  const sp = await searchParams;
  const { period, preset } = resolvePeriod(sp);
  return (
    <KpiClient
      initialPeriod={period}
      initialPreset={preset}
      initialSurvey={resolveSurvey(sp)}
      section="csat"
    />
  );
}
