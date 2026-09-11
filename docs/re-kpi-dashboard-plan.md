# RE KPI Dashboard — Source Analysis & Build Plan

**Status:** planning only — no implementation started
**Created:** 2026-09-07
**Branch:** `feat/re-kpi-dashboard`
**Goal:** replace the manually-built Robot Engineering KPI PowerPoint with a dashboard in the internal Ops console.

---

## 1. The source deck

`Info/624171291100577929_RE_KPI_Report_Jan-Jun2026_Final24July2026.pptx`
Robot Engineering (RE) team KPI report, **Jan–Jun 2026**, 5 slides, board audience.
Bilingual — slides 3–5 are largely Thai, and the KPI definitions are Thai-first.

### Slide 2 — six headline KPIs

| # | KPI | Result | Basis | Splits given in deck |
|---|-----|--------|-------|----------------------|
| 1 | 1st Time Install | **60.9%** | 14/23 | Cleaning 58.8% (10/17) · Delivery 66.7% (4/6) |
| 2 | PM Complete | **90.3%** | 247.9/274.5 tasks (est.) | Cleaning 95.6% · Delivery 81.2% · **Raaspal 95.1% vs YIP 80.0%** |
| 3 | Total CM Cases | **1,458** | Jan–Jun | Cleaning 643 · Delivery 815 · avg 243/month |
| 4 | First Time Fix (FTFR) | **72.3%** | 919/1,270 KPI cases | Cleaning 63.6% (306/480) · Delivery 77.6% (613/790) |
| 5 | SLA / Over SLA | **77.2% / 22.8%** | 980 within / 290 over | Cleaning 66.7% · Delivery 83.5% |
| 6 | CSAT Top Box | **86.2%** | CSAT 96.3%, response rate 53.5% | Install 79.2% · PM 91.9% · CM Delivery 89.7% · CM Cleaning 70.3% |

**Monthly series (Jan→Jun)** — every KPI is also charted by month:

| KPI | Jan | Feb | Mar | Apr | May | Jun |
|-----|-----|-----|-----|-----|-----|-----|
| 1st Time Install | 50% | 80% | 0% | 80% | 75% | 0% |
| PM Complete | 100% | 100% | 91% | 100% | 87% | 87% |
| CM Cases (total) | 330 | 243 | 275 | 177 | 203 | 230 |
| — cleaning / delivery | 184/146 | 112/131 | 139/136 | 66/111 | —/165 | 104/126 |
| FTFR cleaning / delivery | 53%/68% | 71%/79% | 81%/75% | 61%/85% | 38%/81% | 66%/79% |
| SLA within | 67% | 86% | 85% | 74% | 75% | 79% |
| CSAT Top Box | 87% | 87% | 83% | 86% | 88% | 87% |

> Note: the May cleaning CM figure and a few over-SLA values are absent from the deck's labels — confirm against source data before relying on them.

**Board takeaways stated in the deck:** Installation & FTFR are the primary recovery priorities; PM is healthy overall but Delivery PM (81.2%) and YIP (80.0%) lag; Cleaning SLA (66.7%) trails Delivery (83.5%); CSAT Cleaning Repair (70.3%) and survey response (53.5%) need focus.

### Slide 3 — utilization & productivity

| Metric | Value | Note |
|---|---|---|
| Work MD (วันงานจริง) | 969.5 | top 15 field workers only |
| Travel MD (วันเดินทาง) | 832.7 | 46.2% of field workload |
| Total workload MD | 1,802.2 | work + travel |
| Utilization | **91.0%** | against capacity 1,980 MD |
| Helpdesk MD | 139.5 | excluded from field utilization |
| Top work type | CM | 303.0 MD · 23.7% |

**MD conversion factors (load-bearing — the dashboard must reproduce these):**
- Demo / Installation / Training / Modify = **1.0 MD**
- CM = **0.5 MD per job**
- PM: 3 jobs = **1.0 MD**; 2 units = **0.5 MD**
- ส่ง/รับหุ่นยนต์, Unbox, QC, Customer Support, Site Survey, Other = **0.5 MD**
- Meeting = **0.375 MD**
- Travel MD = round-trip time from Software Park ÷ 8 hrs
- Jan–Apr travel is **estimated** from the May–Jun average by type — not measured

Views required: utilization per person (top 15 by total field workload), work-type mix, monthly trend.

**Executive actions in deck:** CM is the dominant load → review recurring root causes; travel is high → zone dispatch & route planning; capacity gap → add PM, training, documentation, RCA.

### Slides 4–5 — repeat cost

| Type | KPI volume | Cost events | On-site | Online | Logistics |
|---|---|---|---|---|---|
| Installation revisit ≤30 days | 9 cases (39.1% of 23 installs) | 12 tickets | 8 | 4 | 0 |
| CM repeat repair ≤7 days | 351 cases (27.7% of all) | 146 unique tickets | 85 | 55 | 6 |

**Geographic split (drives the cost model):**
- Install: Local/BKK 3 (25.0%, avg 93 km RT) · Province 9 (75.0%, avg 364 km RT)
- CM: Local/BKK 65 (44.5%, avg 72 km RT) · Province 81 (55.5%, avg 766 km RT)

**Cost model (deck's worked example — illustrative rates, not actuals):**

| Line | Qty | Unit | Total |
|---|---|---|---|
| Install local on-site | 1 | ฿5,280 | ฿5,280 |
| Install province on-site | 7 | ฿11,600 | ฿81,200 |
| Install online | 4 | ฿500 | ฿2,000 |
| CM local on-site | 42 | ฿2,930 | ฿123,060 |
| CM province on-site | 43 | ฿13,149 | ฿565,407 |
| CM online + logistics | 55 + 6 | ฿500 / ฿300 | ฿29,300 |

Totals ≈ **฿806K** repeat cost (Installation ≈ ฿88K, CM ≈ ฿718K) vs **฿466,500** incentive at 500/case (install 14 + CM 919) → gap ≈ **฿340K**.

Cost formula: RE manday + (km × 9) + vehicle/tolls + per-diem/lodging + parts + other.

> **Key principle stated in the deck:** repeat cost must be computed from verifiable ticket/events, *not* by multiplying a KPI denominator. Baht totals stay pending until real km / manday / parts are entered.

---

## 2. Current state — why none of this exists yet

Verified in the backend on 2026-09-07 (checked, not assumed):

- **`cm/entity/CmReport.java` is a service-report _document_, not a case record.** Fields are report date, ticket no, customer, technician, robot model, serial, cause detail, inspection result, corrective actions, test result, signatures. It has **no case open/close timestamps** (→ no SLA), **no resolution/repeat linkage** (→ no FTFR, no repeat detection), and **no survey field** (→ no CSAT).
- **The `casereport` module is a read-only Monday.com _preview_.** `MondayPreviewController` exposes a single `GET /api/v1/case-reports/monday/preview`. There is no entity and no table — nothing is persisted or aggregated.
- **No installation-job, PM-task, manday/travel, CSAT or repeat-cost tables exist** anywhere in the 37 Flyway migrations.

The deck's own footers confirm the real sources are spreadsheets plus Monday.com:
`Plan Jan-Apr 2026` · `Plan May-Jun 2026` · `Template: RE_Productivity_May2026` · `Case_FTFR_SLA Jan–Jun 2026` · `Installation Matched Case Evidence` · `CM Repeat Evidence` · `Pandora Cost Sheet`.

**Conclusion: this is primarily a data-modelling and ingestion project. The charts are the easy third.**

---

## 3. Open decisions (blocking)

1. **Data source** — pick one:
   - *Monday.com sync* — backend already speaks the GraphQL API (`MondayApiClient`, `MondayBoardReader`); add sync + aggregation tables. Live and self-updating; depends on the board's columns being clean.
   - *Spreadsheet import* — Apache POI is already a backend dependency; ingest the existing RE sheets each period. Matches how the team works today; manual each period.
   - *Manual entry* — admin form for monthly figures. Fastest; retypes numbers, no drill-down.
   - *Mock-first* — build the UI against the deck's figures as constants, wire a source later. Zero prod-DB risk.
2. **Period model** — fixed half-year board deck, or rolling monthly dashboard? Determines the schema.
3. **Audience** — internal only, or a shareable/exportable board version? (Tokenised public report links and `jspdf` already exist in the Ops console.)
4. **Charting approach** — see item 12 below.

---

## 4. Task list

### Phase 1 — Backend (`RaasPal-Internal-Ops-backend`)

- [ ] **4.1** Design the KPI schema. Needs: install jobs (1st-time-install + ≤30-day revisit), PM tasks (with Raaspal/YIP vendor split), CM cases (open/close for SLA, resolution linkage for FTFR, ≤7-day repeat), CSAT responses (incl. response rate), workload entries (work/travel MD by person and work type), repeat-cost tickets (on-site/online/logistics, local/province, km).
- [ ] **4.2** Write the Flyway migration, **V38+**. Additive only. ⚠️ See risks.
- [ ] **4.3** Build the ingestion path — shape depends on decision #1.
- [ ] **4.4** Aggregation service: six KPIs with monthly series + Cleaning/Delivery splits; utilization against a **configurable** capacity (1,980 MD for this period); repeat-cost model with the MD conversion factors above.
- [ ] **4.5** Expose `/api/v1/kpi/*`, role-gated to `ADMIN` / `RAASPAL_TEAM`.
- [ ] **4.6** Unit-test the aggregation maths — these are board-facing numbers.

### Phase 2 — Frontend (`RaasPal-Ops-frontend`)

- [ ] **4.7** New `/kpi` route + sidebar entry (or extend `app/[locale]/page.tsx`).
- [ ] **4.8** Types in `types/api.ts`; add a `kpiApi` group to `lib/api.ts` (the single place API calls are declared).
- [ ] **4.9** **Decide charting approach — no chart library is installed.** Deck needs grouped bars, stacked bars (SLA within/over) and monthly trend lines. Existing style is hand-rolled SVG (donut at `components/report/MonthlyReportView.tsx:124`). Either add a library or hand-roll to match.
- [ ] **4.10** Six KPI tiles — reuse the `StatTile` pattern in `components/DashboardStats.tsx` (TanStack Query + skeleton loading).
- [ ] **4.11** Per-KPI trend + split views; utilization and repeat-cost sections if in scope.
- [ ] **4.12** Bilingual copy in `messages/en.json` + `messages/th.json` — **not optional**, the source material is Thai-first.
- [ ] **4.13** Loading / empty / error states; ฿ currency and percentage formatting.

### Phase 3 — Optional

- [ ] **4.14** PDF export for the board handout (`jspdf` already a dependency).
- [ ] **4.15** Public tokenised link reusing the existing `/report/[token]` pattern.

**Critical path:** decision #1 → schema → V38 migration → aggregation → API → UI.
Only **4.9** and **4.12** can start in parallel today.

---

## 5. Risks

- ⚠️ **Local dev and production share ONE Supabase database.** Starting the backend locally applies pending Flyway migrations to production. Use expand-and-contract: add, deploy, *then* drop. A past `DROP COLUMN` broke every inventory query.
- ⚠️ **Never edit a committed `V*.sql`** — Flyway checksums it and refuses to start. Highest applied is **V37**, so new work is **V38+**.
- ⚠️ **These are board-facing numbers.** Any aggregation discrepancy is visible to executives — hence the unit tests in 4.6.
- ⚠️ **Next.js 16 differs from training data.** Check `node_modules/next/dist/docs/` before writing framework code; middleware is `proxy.ts`.
- Deck figures are partly **estimates** (PM tasks "est.", Jan–Apr travel derived from May–Jun averages) and the Baht totals are explicitly illustrative. Don't treat them as ground truth when validating the pipeline.

---

## 6. Reference

- Source deck: `Info/624171291100577929_RE_KPI_Report_Jan-Jun2026_Final24July2026.pptx`
- Backend: `RaasPal-Internal-Ops-backend` (Spring Boot 3.4.5 / Java 21) — `cm/`, `casereport/` modules
- Frontend: `RaasPal-Ops-frontend` (Next.js 16.2.6) — `lib/api.ts`, `components/DashboardStats.tsx`
- Platform docs: `RaasPal-Vault/index.md` (current state), `history.md` (session log)
