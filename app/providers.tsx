/**
 * app/providers.tsx
 * Client-side provider tree: TanStack Query + auth hydration.
 *
 * Wrapped around the app in [locale]/layout.tsx so that both Server and
 * Client Components can consume query state and auth state.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import { restorePlace } from '@/lib/keepPlace';

function AuthHydrator() {
  const { initFromStorage, setUser, token } = useAuthStore();
  const didHydrate = useRef(false);

  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;

    // 1. Load token from localStorage into Zustand state
    initFromStorage();
  }, [initFromStorage]);

  // 2. Once token is available, fetch the current user profile
  useEffect(() => {
    if (!token) return;

    authApi.me()
      .then((res) => {
        if (res.data.success) {
          setUser(res.data.data);
        }
      })
      .catch(() => {
        // Token may be expired — the 401 interceptor in lib/api.ts will
        // remove it from localStorage; proxy.ts will redirect on next nav.
      });
  }, [token, setUser]);

  return null;
}

/**
 * After a language switch, puts the reader back where they were; see lib/keepPlace.
 * Keyed on the locale: the switch keeps the page mounted and re-renders it in the
 * other language, so this has to run on the change, not only when it mounts.
 */
function PlaceRestorer() {
  const locale = useLocale();
  const pathname = usePathname();
  useEffect(() => {
    restorePlace(pathname + window.location.search);
  }, [locale, pathname]);
  return null;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * One client per browser tab, not per mount. Switching language rebuilds everything
 * under [locale], this provider included, and a client made per mount threw away
 * every list already loaded: the whole app went back to skeletons and refetched, which
 * read as the page restarting. On the server a new one per request, so two users'
 * renders never share a cache.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <AuthHydrator />
      <PlaceRestorer />
      {children}
    </QueryClientProvider>
  );
}
