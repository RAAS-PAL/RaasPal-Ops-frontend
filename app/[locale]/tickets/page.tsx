import { TicketsClient } from './TicketsClient';
import { resolveRangeKey } from '@/lib/tickets/range';
import { DEFAULT_TICKET_BRAND } from '@/lib/tickets/types';

/**
 * Service-ticket analytics for one robot brand (`?brand=autoxing`), read from the
 * nightly monday snapshot. Search params are resolved here, server-side, and
 * passed down as plain props — the same shape as PM Planning — so the client
 * never touches useSearchParams and the page can still prerender.
 */
export default async function TicketsPage({
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
    <TicketsClient
      brand={(single('brand') ?? DEFAULT_TICKET_BRAND).toLowerCase()}
      initialRange={resolveRangeKey(single('range'))}
      initialScope={single('scope') === 'open' ? 'open' : 'all'}
    />
  );
}
