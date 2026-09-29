/**
 * The BCP 47 tag `Intl` and `toLocale*String` should use for the page's language: English
 * dates as day-month-year, Thai in the Buddhist era, as the rest of the app shows them.
 */
export const intlLocale = (locale: string): string => (locale === 'th' ? 'th-TH' : 'en-GB');
