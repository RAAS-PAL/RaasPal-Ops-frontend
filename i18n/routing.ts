/**
 * i18n/routing.ts
 *
 * Single source of truth for locale configuration.
 * `defineRouting` is next-intl v4's typed config builder — it returns a plain
 * object that the middleware, navigation helpers, and getRequestConfig all
 * share, so locales are never hard-coded in more than one place.
 *
 * localePrefix: 'always' (default) means every URL carries the locale prefix:
 *   /       → proxy.ts redirects → /en
 *   /en     → home in English
 *   /th     → home in Thai
 */
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'th'],
  defaultLocale: 'en',
  localePrefix: 'always', // /en /th — explicit, no ambiguity
});

/** Convenience type: 'en' | 'th' */
export type Locale = (typeof routing.locales)[number];
