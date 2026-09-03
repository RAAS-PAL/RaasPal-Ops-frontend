'use client';

/**
 * CorrectiveMaintenanceReportView — the printable "รายงานการซ่อมบำรุงแก้ไข".
 *
 * Reproduces the RAASPAL paper form one-for-one; the layout is the deliverable,
 * so the structure here is fixed and only the values vary.
 *
 * Labels are hard-coded Thai and deliberately do NOT go through useTranslations().
 * This is a Thai customer-facing document that gets signed and filed — its wording
 * must not change when a staff member switches the app to English.
 */
import Image from 'next/image';
import { useLayoutEffect, useRef, useState } from 'react';
import { formatThaiDate } from '@/lib/thai-date';
import type { CmReportResponse } from '@/types/api';

/**
 * A4 height in the CSS pixels the browser uses for mm — 96dpi by definition, not by
 * the printer's actual resolution.
 */
const A4_HEIGHT_PX = (297 * 96) / 25.4;

/** Largest body type. The size the paper form is designed around. */
const MAX_BODY_PX = 13;

/**
 * Smallest body type. Past this the report stops being something a customer can read
 * and sign, so a genuinely enormous ticket runs to a second sheet instead — that is a
 * better failure than an unreadable one.
 */
const MIN_BODY_PX = 8;

/**
 * Geist (the app font) carries no Thai glyphs, so the printed document would fall
 * back to whatever each machine happens to pick. Pin the platform Thai UI faces
 * instead — all locally installed, so nothing has to load over the network at
 * print time.
 */
const THAI_FONT_STACK =
  '"Leelawadee UI", "Noto Sans Thai", Thonburi, "Sarabun", "Segoe UI", system-ui, sans-serif';

const INK = '#16243a';
const LINE = '#8a94a3';

/**
 * Registered-entity footer, printed on every report.
 *
 * ⚠️ Transcribed from a scan of the paper form — verify against the company
 * registration before this goes to a customer, particularly the transliteration
 * of "PAL" (พอล vs พาล). Wrong details on a document carrying a tax ID are worth
 * getting right.
 */
const COMPANY_FOOTER = [
  'บริษัท ราส พอล จำกัด',
  '99/40 อาคารซอฟต์แวร์ปาร์ค หมู่ที่ 4 ถ.แจ้งวัฒนะ ต.คลองเกลือ อ.ปากเกร็ด จ.นนทบุรี',
  'เลขประจำตัวผู้เสียภาษี 0125563010022',
];

/** One of the four header lines above the table. */
function HeaderRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="font-bold">{label} :</span>
      <span>{value || ' '}</span>
    </>
  );
}

/** A label/value row of the main bordered table. */
function TableRow({
  label,
  children,
  minHeight,
  splittable = false,
}: {
  label: string;
  children: React.ReactNode;
  minHeight?: string;
  /**
   * Let this row break across sheets. Set on the free-prose rows, whose length is
   * whatever the technician typed into the ticket.
   */
  splittable?: boolean;
}) {
  return (
    // break-inside-avoid keeps a short label beside its value: without it a row can
    // be split mid-cell, stranding the Thai label on one page and its content on the
    // next.
    //
    // It is wrong for the prose rows, though, and expensively so. A row taller than a
    // sheet cannot be kept whole no matter what it asks for, and the browser responds
    // by moving the entire row to a fresh page before giving up and overflowing it
    // anyway — which left page one two-thirds empty and turned a two-page report into
    // three. Those rows opt out and simply flow.
    <div
      className={`grid grid-cols-[30%_1fr] border-b ${
        splittable ? 'print:break-inside-auto' : 'print:break-inside-avoid'
      }`}
      style={{ borderColor: LINE, minHeight }}
    >
      <div
        className={`flex justify-center border-r px-3 py-2 text-center font-bold ${
          // Centring a label inside a cell that runs over a page break would print it
          // halfway down the following sheet, nowhere near the text it names.
          splittable ? 'items-start' : 'items-center'
        }`}
        style={{ borderColor: LINE }}
      >
        {label}
      </div>
      {/* min-w-0 and overflow-wrap are both load-bearing, and neither is enough alone.
          A grid track sized 1fr still refuses to shrink below its content's min-content
          width, so one long unbroken run widens the column and pushes the text off the
          paper; min-w-0 lets the track shrink, and overflow-wrap gives the run somewhere
          to break. This is not only a defence against pasted junk — Thai is written
          without spaces between words, so a genuine paragraph offers few break
          opportunities of its own. */}
      <div className="min-w-0 px-3 py-2 [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

/**
 * A first guess at body type, from how much there is to fit.
 *
 * <p>Only a starting point. It is what the server renders and what the first paint
 * uses, so the page does not visibly resize under the operator — the real size comes
 * from measuring. Character count cannot decide this on its own: how tall the text
 * runs depends on where it wraps, and Thai wraps nothing like the Latin text a
 * character count is usually calibrated against.
 */
function estimateBodyPx(characters: number): number {
  if (characters <= 1200) return MAX_BODY_PX;
  if (characters <= 2400) return 12;
  if (characters <= 3600) return 11;
  return 10;
}

/** A signature cell: the uploaded photo, or empty space to sign the printout by hand. */
function SignatureCell({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className="h-14" aria-hidden />;
  return (
    <div className="flex h-14 items-center">
      {/* Data URI of unknown intrinsic size — next/image would need width+height
          and gains nothing here (no optimisation possible on a data URI). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-14 w-auto object-contain" />
    </div>
  );
}

export function CorrectiveMaintenanceReportView({ report }: { report: CmReportResponse }) {
  const steps = (report.correctiveActions ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  // Only the free-text fields count. The labels, dates and serial number are fixed
  // length and identical on every report, so including them would just add a constant
  // and blur the thresholds.
  const bodyLength = [
    report.causeDetail,
    report.inspectionResult,
    report.correctiveActions,
    report.testResult,
  ]
    .filter(Boolean)
    .join(' ').length;

  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyPx, setBodyPx] = useState(() => estimateBodyPx(bodyLength));

  /**
   * Shrink the body type until the sheet fits one page.
   *
   * <p>Measured rather than estimated because only the browser knows where Thai wraps,
   * and wrapping is what decides the height. A binary search over the size costs a
   * handful of synchronous layouts on a page that renders once.
   *
   * <p>The sheet carries min-h-[297mm], so when the content fits, scrollHeight is
   * exactly one page — which makes "does it fit" a straight comparison rather than a
   * sum of paddings that would drift the moment the layout changed.
   *
   * <p>useLayoutEffect, not useEffect: this must settle before the browser paints, or
   * an operator who hits print immediately gets the pre-measurement size.
   */
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const body = bodyRef.current;
    if (!sheet || !body) return;

    let cancelled = false;

    const fit = () => {
      if (cancelled) return;
      const fits = () => sheet.scrollHeight <= A4_HEIGHT_PX + 1;

      body.style.fontSize = `${MAX_BODY_PX}px`;
      if (fits()) {
        body.style.fontSize = '';
        setBodyPx(MAX_BODY_PX);
        return;
      }

      // `low` is only ever raised to a size that fitted, so it stays the largest
      // known-good size. If even the floor overflows it stays there and the report
      // takes a second sheet, which is the intended outcome rather than a failure.
      let low = MIN_BODY_PX;
      let high = MAX_BODY_PX;
      for (let i = 0; i < 8; i += 1) {
        const mid = (low + high) / 2;
        body.style.fontSize = `${mid}px`;
        if (fits()) low = mid;
        else high = mid;
      }

      body.style.fontSize = '';
      setBodyPx(Math.floor(low * 10) / 10);
    };

    fit();

    // The Thai faces have different metrics from the fallback, so a measurement taken
    // before they load describes a page that will never be printed.
    document.fonts?.ready.then(fit).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [report]);

  return (
    // print:min-h-0 on both boxes is what keeps this to one sheet. On screen the
    // page mimics A4 (min-h-[297mm]) so the operator sees a realistic preview, but
    // in print that is a *full* sheet's height added on top of the @page margins —
    // so the footer no longer fits and spills onto a second page. In print the
    // @page rule owns the geometry and the content simply flows.
    // [page:cm-report] selects the zero-margin @page rule in globals.css, which is
    // what keeps the browser's timestamp/URL header off a signed document.
    <main
      className="min-h-dvh bg-[#eef1f6] py-8 print:min-h-0 print:bg-white print:py-0 print:[page:cm-report]"
      style={{ fontFamily: THAI_FONT_STACK, color: INK }}
    >
      {/* The padding replaces the @page margin, which is set to 0 in globals.css to
          suppress the browser's URL/timestamp header. Without it the report would print
          flush to the paper edge and clip on most printers.

          It is the same padding on screen and on paper, deliberately. The fitting pass
          measures this box on screen and concludes the report fits one page; if print
          then used different padding, that conclusion would be about a page nobody
          prints. Same reason the type size is no longer stepped down for print. */}
      <div
        ref={sheetRef}
        className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col bg-white px-[13mm] py-[11mm] shadow-sm print:min-h-0 print:max-w-none print:shadow-none"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        {/* self-start is load-bearing: this is a direct child of a flex column, so
            the default align-items:stretch would override w-auto and smear the
            wordmark across the full page width. */}
        <Image
          src="/raas-pal-wordmark.png"
          alt="RAAS PAL"
          width={240}
          height={60}
          priority
          className="h-9 w-auto self-start"
        />

        <div className="mt-4 text-center">
          <h1 className="text-[17px] font-bold leading-tight">รายงานการซ่อมบำรุงแก้ไข</h1>
          <p className="text-[15px] font-bold leading-tight">(Corrective Maintenance Report)</p>
        </div>

        {/* Four identification lines. max-content keeps the long Thai label
            ("เจ้าหน้าที่ผู้เข้าดำเนินการ") on one line instead of wrapping. */}
        <div className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-[13px]">
          <HeaderRow label="วันที่" value={formatThaiDate(report.reportDate)} />
          <HeaderRow label="Ticket No." value={report.ticketNo ?? ''} />
          <HeaderRow label="ชื่อบริษัทลูกค้า" value={report.customerName} />
          <HeaderRow label="เจ้าหน้าที่ผู้เข้าดำเนินการ" value={report.technicianName ?? ''} />
        </div>

        {/* ── Main table ─────────────────────────────────────────────────── */}
        {/* The one box whose type the fitting pass adjusts. Everything above it — the
            wordmark, the title, the four identification lines — is fixed length on
            every report, so shrinking it would buy almost nothing and make two reports
            look like two different forms. */}
        <div
          ref={bodyRef}
          className="mt-5 border leading-relaxed"
          style={{ borderColor: LINE, fontSize: `${bodyPx}px` }}
        >
          <TableRow label="รุ่นหุ่นยนต์">{report.robotModel ?? ''}</TableRow>
          <TableRow label="Serial Number">{report.serialNumber ?? ''}</TableRow>
          <TableRow label="รายละเอียดของสาเหตุ" splittable>
            <p className="whitespace-pre-wrap">{report.causeDetail ?? ''}</p>
          </TableRow>

          {/* The corrective-detail cell has three fixed sub-blocks; the headings
              are part of the form, not data, so they always render. */}
          <TableRow label="รายละเอียดการแก้ไข" minHeight="240px" splittable>
            <div className="space-y-3 py-1">
              <div>
                <p className="font-bold print:break-after-avoid">ผลการตรวจสอบ:</p>
                <p className="whitespace-pre-wrap">{report.inspectionResult ?? ''}</p>
              </div>
              <div>
                <p className="font-bold print:break-after-avoid">การดำเนินการแก้ไข:</p>
                {steps.length > 0 ? (
                  <ol className="space-y-0.5">
                    {steps.map((step, i) => (
                      <li key={i}>{`${i + 1}. ${step}`}</li>
                    ))}
                  </ol>
                ) : null}
              </div>
              <div>
                <p className="font-bold print:break-after-avoid">ผลการทดสอบ:</p>
                <p className="whitespace-pre-wrap">{report.testResult ?? ''}</p>
              </div>
            </div>
          </TableRow>

          <TableRow label="ลงนามผู้ให้บริการ">
            <SignatureCell src={report.providerSignature} alt="ลงนามผู้ให้บริการ" />
          </TableRow>
          {/* Last row: the table's own border closes it, so drop the row rule. */}
          <div className="grid grid-cols-[30%_1fr] print:break-inside-avoid">
            <div
              className="flex items-center justify-center border-r px-3 py-2 text-center font-bold"
              style={{ borderColor: LINE }}
            >
              ลงนามผู้รับบริการ
            </div>
            <div className="px-3 py-2">
              <SignatureCell src={report.receiverSignature} alt="ลงนามผู้รับบริการ" />
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {/* mt-auto pins this to the bottom of the simulated sheet on screen; in
            print there is no forced height to push against, so it simply trails
            the table — which is what keeps it on the same page. */}
        <div className="mt-auto flex items-end justify-between gap-6 pt-10 print:break-inside-avoid">
          <div className="text-[9px] leading-relaxed text-[#6b7785]">
            {COMPANY_FOOTER.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <Image
            src="/raas-pal-wordmark.png"
            alt="RAAS PAL"
            width={200}
            height={50}
            className="h-6 w-auto shrink-0"
          />
        </div>
      </div>
    </main>
  );
}
