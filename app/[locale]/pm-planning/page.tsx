import { PmPlanningClient } from './PmPlanningClient';
import { resolveFilters, resolveMonth, resolveView, resolveYear } from '@/lib/pm/params';

/**
 * Search params are read here, server-side, and handed down as plain props — the
 * same shape as the Robots and Reports pages. Reading them in the client with
 * useSearchParams would push the whole planner behind a Suspense boundary,
 * because Next cannot prerender a component that touches the query string.
 */
export default async function PmPlanningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return (
    <PmPlanningClient
      initialView={resolveView(single('view'))}
      initialYear={resolveYear(single('year'))}
      initialMonth={resolveMonth(single('month'))}
      initialFrom={single('from') ?? null}
      initialTo={single('to') ?? null}
      initialFilters={resolveFilters({
        serviceLine: single('serviceLine'),
        region: single('region'),
        zone: single('zone'),
        province: single('province'),
        status: single('status'),
        owner: single('owner'),
        q: single('q'),
      })}
    />
  );
}
