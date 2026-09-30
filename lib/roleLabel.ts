import type { useTranslations } from 'next-intl';

/**
 * A user's role in the language of the page ("ADMIN" → "ผู้ดูแลระบบ"), from the
 * `profile.account.roles` messages. A role the messages do not know is shown as it is.
 */
export function roleLabel(t: ReturnType<typeof useTranslations>, role: string): string {
  return t.has(role) ? t(role) : role;
}
