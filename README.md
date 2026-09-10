# RaasPal Operations Console

The web application the RaasPal team works in. Upload a customer survey, watch AI extract
the requirements, compare ranked robot options, generate and export a proposal, then keep
an eye on the deployed fleet and the reports going out to customers.

Bilingual (English / Thai) throughout, because the people using it and the customers
reading its output are not the same audience.

---

## Snapshot

| | |
|---|---|
| **Type** | Internal operations console — the primary staff-facing frontend |
| **Stack** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 |
| **State** | TanStack Query for server state · Zustand for session state |
| **UI** | Radix UI primitives · shadcn-style component layer · Framer Motion · Lucide icons |
| **i18n** | next-intl, locale-prefixed routing, full English and Thai message catalogues |
| **Backend** | The RaasPal Internal Ops API (Spring Boot) |
| **Hosting** | Vercel |

---

## What you can do in it

**Generate a solution.** Pick a robot type, name the project, upload the customer survey
as Excel, PDF or an image. The AI extracts the requirements, the backend loads the
approved catalogue, and 2–3 ranked robot options come back with fit level, specifications,
pricing and the reasoning behind the ranking.

**Produce a proposal.** Select an option and the AI writes the customer proposal against
the house template. Review it, print it, export it to PDF client-side, or download the
PowerPoint the backend generates.

**Browse the robot catalogue.** Approved models with their specifications, filterable by
type.

**Track solutions and proposals.** Everything generated is kept and reachable later, so a
proposal sent three months ago is still there in the form it went out.

**Read customer reports.** Weekly and monthly fleet performance reports, previewable
before delivery. Customers open their own report through a signed token link at
`/report/[token]` — no account, no login, just the report.

**Monitor CVTE C3 devices.** Online/offline status and battery state for tracked units,
with a compact summary on the dashboard.

**Tools.** Supporting utilities the team uses alongside the main flow.

---

## Routing

Every page lives under a locale segment, so the same route exists in both languages.

```
app/
├── [locale]/
│   ├── login/               Sign in
│   ├── page.tsx             Team dashboard
│   ├── generate-solution/   The upload → extract → recommend → propose flow
│   ├── solutions/           Saved solutions and their recommendations
│   ├── proposals/           Generated proposal history
│   ├── robots/              Approved robot catalogue
│   ├── reports/             Customer performance reports
│   ├── report/
│   │   ├── customer/        Customer-facing report view
│   │   └── [token]/         Signed public report link — no auth required
│   ├── cvte/                CVTE C3 device status
│   └── tools/               Team utilities
└── api/                     Route handlers
```

---

## How it is put together

### `proxy.ts`, not `middleware.ts`

Next.js 16 renamed the file convention from `middleware` to `proxy` to make its
network-boundary role explicit. The exported function must be named `proxy`. It does two
things on every request:

1. **Auth guard.** No `raaspal_token` cookie and not a public route means a redirect to
   the locale-prefixed login page.
2. **Locale routing.** `next-intl` handles detection and prefix injection.

### Two layers of auth state, deliberately

The JWT lives in an **httpOnly cookie** so the proxy layer can make an auth decision
during SSR, before any JavaScript runs. A Zustand store holds the client-side session
view for rendering. The cookie is the security boundary; the store is a convenience.

### Server state is not application state

Anything that comes from the API — robots, solutions, proposals, telemetry — is owned by
TanStack Query, with its cache as the single source of truth. Zustand holds only what is
genuinely local to the session. Nothing that the server knows is duplicated into a store
and left to drift.

### Bilingual by construction

Messages live in `messages/en.json` and `messages/th.json`, not scattered through
components. Thai dates need their own formatting rules, which is why `lib/thai-date.ts`
exists rather than a locale argument sprinkled at call sites.

---

## Project layout

```
app/            Routes (App Router, locale-segmented)
components/     UI components — Radix primitives + composed application components
hooks/          Shared React hooks
lib/
├── api.ts              Typed backend client
├── pdf-export.ts       Client-side PDF generation (jsPDF)
├── reports/            Report assembly — Gausium sourcing, preview, types
├── report-month.ts     Monthly reporting period logic
├── report-week.ts      Weekly reporting period logic
├── robot-spec-fields.ts / robot-types.ts   Catalogue shaping
├── signature-image.ts  CM report signature rendering
├── thai-date.ts        Thai locale date formatting
└── utils.ts
store/auth.ts   Zustand session store
messages/       en.json · th.json
i18n/           next-intl configuration
proxy.ts        Auth guard + locale routing
```

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16, App Router |
| UI runtime | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | Radix UI primitives, shadcn-style composition, `class-variance-authority` |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| HTTP | Axios |
| i18n | next-intl |
| Animation | Framer Motion |
| Icons | Lucide |
| PDF export | jsPDF |

---

## Running locally

### Prerequisites

- Node.js 20+
- The backend API running, or a reachable deployed instance

### Configure

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Run

```bash
npm install
npm run dev          # http://localhost:3000
```

### Checks

```bash
npm run build        # production build
npm run lint         # eslint
npx tsc --noEmit     # types
```

---

## Notes

- `NEXT_PUBLIC_API_URL` is public by definition — the browser calls the backend directly,
  so the backend needs a CORS entry for this app's origin. The RIMS inventory app
  deliberately takes the opposite approach and calls the backend server-side only.
- The signed report route (`/report/[token]`) is intentionally outside the auth guard.
  Access is proven by the token itself, so customers never need an account.
