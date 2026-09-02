import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/**
 * Optional server-side proxy to a remote backend, enabled by setting
 * `BACKEND_PROXY_TARGET` in `.env.local` (see the notes there).
 *
 * WHY a proxy rather than just pointing NEXT_PUBLIC_API_URL at the remote host:
 * the deployed backend rejects any request carrying an `Origin` header with a
 * 403 — its CORS_ALLOWED_ORIGINS does not match localhost — so the browser
 * cannot call it directly. Routing `/api/v1/*` through the Next dev server makes
 * the browser request same-origin, and Next forwards it from the server, where
 * no `Origin` header is sent and CORS never applies. The `Authorization: Bearer`
 * header the API client attaches is passed straight through.
 *
 * Unset (the default), this adds no rewrites and the app talks to whatever
 * NEXT_PUBLIC_API_URL points at, exactly as before.
 */
const backendProxyTarget = process.env.BACKEND_PROXY_TARGET?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendProxyTarget) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
