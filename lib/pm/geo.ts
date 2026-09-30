import type { useTranslations } from 'next-intl';

/**
 * UPPER_NORTH → "Upper North" / "เหนือตอนบน".
 *
 * The values are the province master's stable keys. A key the messages do not know
 * (a region added on the backend first) falls back to the humanised English rather
 * than throwing, which is what a missing key would do.
 *
 * @param t `useTranslations('pmPlanning')`
 */
export function geoLabel(t: ReturnType<typeof useTranslations>, kind: 'region' | 'zone', value: string): string {
  if (t.has(`${kind}.${value}`)) return t(`${kind}.${value}`);
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}
