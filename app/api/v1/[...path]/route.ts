/**
 * Dev-only proxy to a remote backend, enabled by BACKEND_PROXY_TARGET in
 * .env.local (see the notes there). Forwards everything under /api/v1/*.
 *
 * WHY a route handler instead of a next.config.ts rewrite:
 * a rewrite forwards request headers verbatim, including `Origin` — and
 * browsers attach `Origin` to every non-GET request, even a same-origin one.
 * The deployed backend rejects any request carrying an `Origin` it does not
 * allow, so every POST through a rewrite came back 403 while GETs succeeded.
 * That produced two confusing symptoms: "Sync failed" on the report page, and
 * a login that reported "Invalid email or password" (a 403 body carries no
 * `message`, so the form fell back to its default text).
 *
 * This handler rebuilds the request with only the headers the backend needs,
 * so no `Origin` is ever sent and CORS never applies.
 */
import { NextResponse } from "next/server";

const TARGET =
  process.env.BACKEND_PROXY_TARGET?.replace(/\/+$/, "") ?? "http://localhost:8080";

/**
 * Only these travel upstream. Notably absent: `Origin` and `Referer` (which
 * trigger the CORS rejection) and `Cookie` (the backend authenticates with the
 * Bearer token; the cookie is the Next-side SSR signal and is not its business).
 */
const FORWARDED_HEADERS = ["authorization", "content-type", "accept"];

async function forward(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url);
  const url = `${TARGET}${incoming.pathname}${incoming.search}`;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // GET/HEAD must not carry a body, and Node's fetch rejects one outright.
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
  } catch (error) {
    // The backend is unreachable (wrong URL, no network, cold start). Say so
    // plainly rather than letting it surface as an opaque 500.
    return NextResponse.json(
      {
        success: false,
        message: `Proxy could not reach ${TARGET}: ${(error as Error).message}`,
      },
      { status: 502 },
    );
  }

  // Pass the body through untouched so JSON, text and binary all survive.
  const payload = await upstream.arrayBuffer();
  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  return new NextResponse(payload, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
