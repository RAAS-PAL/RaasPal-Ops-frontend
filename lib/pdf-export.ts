import type { GeneratedProposalResponse } from '@/types/api';

const BRAND_COLOR: [number, number, number] = [37, 99, 235];   // #2563eb, the console's brand blue
const TEXT_DARK:  [number, number, number] = [15,  23,  42];   // slate-900
const TEXT_MID:   [number, number, number] = [100, 116, 139];  // slate-500
const WARN_BG:    [number, number, number] = [255, 251, 235];  // amber-50
const WARN_TEXT:  [number, number, number] = [120,  80,   0];  // amber-800

const PAGE_W  = 210;
const PAGE_H  = 297;
const MARGIN  = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

function rgb(doc: InstanceType<typeof import('jspdf').jsPDF>, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function addPageNumber(doc: InstanceType<typeof import('jspdf').jsPDF>, page: number, total: number) {
  doc.setFontSize(8);
  rgb(doc, TEXT_MID);
  doc.text(
    `Page ${page} of ${total}`,
    PAGE_W / 2,
    PAGE_H - 10,
    { align: 'center' },
  );
}

export async function exportProposalToPdf(proposal: GeneratedProposalResponse) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const date = new Date(proposal.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  /* ── Cover header bar ──────────────────────────────────────────────── */
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, PAGE_W, 38, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('RAAS PAL', MARGIN, 17);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 245, 252);
  doc.text('AI Robot Solution & Proposal Generator', MARGIN, 24);
  doc.text('Internal Use Only · RAASPAL Team', MARGIN, 30);

  /* ── Proposal meta block ───────────────────────────────────────────── */
  let y = 50;

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  rgb(doc, TEXT_DARK);
  doc.text('Customer Proposal', MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  rgb(doc, TEXT_MID);
  doc.text(`Proposal: ${proposal.title ?? 'N/A'}`, MARGIN, y);
  y += 6;
  doc.text(`Generated: ${date}`, MARGIN, y);
  y += 6;
  doc.text(`Status: ${proposal.status}`, MARGIN, y);
  y += 4;

  // Divider
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
  y += 10;

  /* ── Proposal content ──────────────────────────────────────────────── */
  const content = proposal.proposalContent ?? 'No content available.';
  const lines = doc.splitTextToSize(content, CONTENT_W) as string[];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  rgb(doc, TEXT_DARK);
  doc.setLineHeightFactor(1.5);

  const LINE_H = 5.5;
  const FOOTER_RESERVE = 18; // space for disclaimer + page number

  for (const line of lines) {
    if (y + LINE_H > PAGE_H - FOOTER_RESERVE) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(line, MARGIN, y);
    y += LINE_H;
  }

  /* ── Disclaimer box on last page ───────────────────────────────────── */
  const DISC_H = 24;
  if (y + DISC_H > PAGE_H - 15) {
    doc.addPage();
    y = MARGIN;
  } else {
    y += 6;
  }

  doc.setFillColor(...WARN_BG);
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, DISC_H, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, WARN_TEXT);
  doc.text('⚠  RAASPAL Verification Required', MARGIN + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  const disclaimer =
    'This proposal was AI-generated from customer requirements and the RAASPAL robot catalog. ' +
    'Final specifications, pricing, and site suitability must be confirmed by the RAASPAL team ' +
    'and an on-site survey before presenting to the customer.';
  const discLines = doc.splitTextToSize(disclaimer, CONTENT_W - 8) as string[];
  let dy = y + 12;
  for (const dl of discLines) {
    doc.text(dl, MARGIN + 4, dy);
    dy += 4.5;
  }

  /* ── Page numbers ──────────────────────────────────────────────────── */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageNumber(doc, i, totalPages);
  }

  /* ── Save ──────────────────────────────────────────────────────────── */
  const filename = `RAASPAL_Proposal_${(proposal.title ?? 'proposal').replace(/\s+/g, '_')}_${date.replace(/\s/g, '-')}.pdf`;
  doc.save(filename);
}
