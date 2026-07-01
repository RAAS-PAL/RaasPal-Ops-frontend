/**
 * /[locale]/report/customer/[token] — public customer-facing report bundle.
 *
 * Shows every robot deployed to the customer for one month, stacked in a
 * single page. One link per customer per month — what the monthly email links
 * to. PUBLIC (no login) — covered by /report prefix in proxy.ts.
 */
import { setRequestLocale } from 'next-intl/server';
import { CustomerBundleClient } from './CustomerBundleClient';

export default async function CustomerReportBundlePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  return <CustomerBundleClient token={token} />;
}
