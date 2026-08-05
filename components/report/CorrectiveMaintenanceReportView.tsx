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
import { formatThaiDate } from '@/lib/thai-date';
import type { CmReportResponse } from '@/types/api';

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
}: {
  label: string;
  children: React.ReactNode;
  minHeight?: string;
}) {
  return (
    <div className="grid grid-cols-[30%_1fr] border-b" style={{ borderColor: LINE, minHeight }}>
      <div
        className="flex items-center justify-center border-r px-3 py-2 text-center font-bold"
        style={{ borderColor: LINE }}
      >
        {label}
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
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

  return (
    <main
      className="min-h-dvh bg-[#eef1f6] py-8 print:bg-white print:py-0"
      style={{ fontFamily: THAI_FONT_STACK, color: INK }}
    >
      <div className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col bg-white px-10 py-8 shadow-sm print:shadow-none">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Image
          src="/raas-pal-wordmark.png"
          alt="RAAS PAL"
          width={240}
          height={60}
          priority
          className="h-9 w-auto"
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
        <div className="mt-5 border text-[13px]" style={{ borderColor: LINE }}>
          <TableRow label="รุ่นหุ่นยนต์">{report.robotModel ?? ''}</TableRow>
          <TableRow label="Serial Number">{report.serialNumber ?? ''}</TableRow>
          <TableRow label="รายละเอียดของสาเหตุ">
            <p className="whitespace-pre-wrap">{report.causeDetail ?? ''}</p>
          </TableRow>

          {/* The corrective-detail cell has three fixed sub-blocks; the headings
              are part of the form, not data, so they always render. */}
          <TableRow label="รายละเอียดการแก้ไข" minHeight="240px">
            <div className="space-y-3 py-1">
              <div>
                <p className="font-bold">ผลการตรวจสอบ:</p>
                <p className="whitespace-pre-wrap">{report.inspectionResult ?? ''}</p>
              </div>
              <div>
                <p className="font-bold">การดำเนินการแก้ไข:</p>
                {steps.length > 0 ? (
                  <ol className="space-y-0.5">
                    {steps.map((step, i) => (
                      <li key={i}>{`${i + 1}. ${step}`}</li>
                    ))}
                  </ol>
                ) : null}
              </div>
              <div>
                <p className="font-bold">ผลการทดสอบ:</p>
                <p className="whitespace-pre-wrap">{report.testResult ?? ''}</p>
              </div>
            </div>
          </TableRow>

          <TableRow label="ลงนามผู้ให้บริการ">
            <SignatureCell src={report.providerSignature} alt="ลงนามผู้ให้บริการ" />
          </TableRow>
          {/* Last row: the table's own border closes it, so drop the row rule. */}
          <div className="grid grid-cols-[30%_1fr]">
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
        <div className="mt-auto flex items-end justify-between gap-6 pt-10">
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
