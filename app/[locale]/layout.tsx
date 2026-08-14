/**
 * app/[locale]/layout.tsx  — locale root layout
 *
 * WHY this owns <html> + <body>:
 *   The `lang` attribute must be server-rendered with the correct value so
 *   screen-readers and search engines see the right language immediately.
 *   Having it here (rather than the root app/layout.tsx) means we can read
 *   `params.locale` and write e.g. <html lang="th"> for Thai users.
 *
 * WHAT happens here on every request:
 *   1. `params.locale` is validated against our supported list; 404 if unknown.
 *   2. `setRequestLocale` primes the next-intl request-level cache so that
 *      any Server Component in this subtree can call useTranslations() or
 *      getTranslations() without needing async context threading.
 *   3. `getMessages()` reads the messages already loaded by i18n/request.ts
 *      (the plugin calls that file before rendering starts).
 *   4. `NextIntlClientProvider` forwards those messages to all Client
 *      Components so they can call useTranslations() on the client too.
 *
 * generateStaticParams tells Next.js which locale segments to pre-render at
 * build time, so /en and /th are all statically generated.
 */
import type { Metadata } from 'next';
import { Geist_Mono, Inter, Noto_Sans_Thai } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Providers } from '@/app/providers';

/* ─── Fonts ──────────────────────────────────────────────────────────────── */

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Inter carries no Thai glyphs (nor did Geist before it), so without a companion
 * every Thai string — customer names, sites, the whole `th` locale — falls back
 * to whatever font the operating system happens to pick, and looks different on
 * every machine. Listing this after Inter in the stack lets the browser resolve
 * per glyph: Latin from Inter, Thai from here.
 *
 * The printed CM report is unaffected either way — it pins its own Thai stack
 * inline, because a signed document must not change appearance with the theme.
 */
const notoThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['thai'],
  display: 'swap',
});

/* Kept as-is: Inter has no monospace cut, and figures still need one. */
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/* ─── Static params ──────────────────────────────────────────────────────── */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/* ─── Metadata ───────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: {
    default: 'RAAS PAL - Robot Recommendation System',
    template: '%s - RAAS PAL',
  },
  description:
    'AI-powered robot recommendation platform by RAAS PAL. ' +
    'Match the right cleaning robot to your workspace in minutes.',
};

/* ─── Layout ─────────────────────────────────────────────────────────────── */

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;

  // Return 404 for any path segment that isn't a supported locale.
  // (The proxy middleware normally prevents this, but belt-and-suspenders.)
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  // Prime the per-request locale cache for all Server Components below.
  setRequestLocale(locale);

  // Load the messages that i18n/request.ts already fetched for this request.
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${notoThai.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col bg-canvas text-ink antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
