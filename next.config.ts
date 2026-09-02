import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/**
 * The remote-backend proxy lives in `app/api/v1/[...path]/route.ts`, not here.
 *
 * A rewrite was tried first and does not work: it forwards request headers
 * verbatim, including `Origin`, which browsers attach to every non-GET request
 * even when it is same-origin. The deployed backend 403s any request carrying
 * an `Origin` it does not allow, so GETs succeeded while every POST failed. The
 * route handler rebuilds the request with only the headers the backend needs.
 */
const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
