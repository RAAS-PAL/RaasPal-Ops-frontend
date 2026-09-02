/**
 * TEMPORARY DIAGNOSTIC — DELETE THIS FILE WHEN THE LOGIN ISSUE IS RESOLVED.
 *
 * Sits in front of the /api/v1/auth/login rewrite (filesystem routes win over
 * afterFiles rewrites) so we can see what the browser actually sends. It logs
 * METADATA ONLY — never the password — then forwards the request unchanged to
 * the real backend and returns its response verbatim.
 *
 * To remove: delete app/api/v1/auth/ and the login POST goes back to being
 * handled by the rewrite in next.config.ts.
 */
import { NextResponse } from "next/server";

const TARGET =
  process.env.BACKEND_PROXY_TARGET?.replace(/\/+$/, "") ?? "http://localhost:8080";

/** Describes a string without revealing it. */
function describe(value: unknown) {
  if (typeof value !== "string") return { type: typeof value, value };
  return {
    length: value.length,
    leadingSpace: value !== value.trimStart(),
    trailingSpace: value !== value.trimEnd(),
    // Non-ASCII often means a smart quote or full-width character from an IME.
    nonAscii: /[^\x20-\x7E]/.test(value),
    firstCharCode: value.charCodeAt(0),
    lastCharCode: value.charCodeAt(value.length - 1),
  };
}

export async function POST(request: Request) {
  const raw = await request.text();

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.log("[login-probe] body was not JSON, length:", raw.length);
  }

  console.log("[login-probe] keys: " + JSON.stringify(Object.keys(parsed)));
  console.log("[login-probe] email: " + JSON.stringify(parsed.email));
  console.log("[login-probe] email meta: " + JSON.stringify(describe(parsed.email)));
  console.log("[login-probe] password meta: " + JSON.stringify(describe(parsed.password)));
  console.log("[login-probe] forwarding to:", `${TARGET}/api/v1/auth/login`);

  const upstream = await fetch(`${TARGET}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw,
  });

  const text = await upstream.text();
  console.log("[login-probe] upstream status:", upstream.status, "body:", text.slice(0, 200));

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
