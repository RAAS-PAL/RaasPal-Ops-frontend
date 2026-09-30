import type { CaseReportSlug } from './api';
import type { CaseBoard, CaseReportRow } from '../types/api';

/**
 * The pending cases per customer: Internal (everything, as Delivery and Cleaning), PCS,
 * Makro and ITS.
 *
 * <p>Nothing is read twice. These views recombine the six sheets already frozen for the
 * day, which slice the boards for daily review - MK apart from the rest of Delivery, the
 * airports and Makro apart from the rest of Cleaning, and every held case moved to On
 * Hold. Put back together, each case counts once:
 *
 * <ul>
 *   <li><b>Delivery</b> = MK + Delivery + On Hold's delivery rows not already on MK (MK
 *       keeps its held cases, so they are on both).</li>
 *   <li><b>Cleaning</b> = Cleaning + Makro + AOTGA + On Hold's cleaning rows.</li>
 *   <li><b>Makro</b> = Makro + On Hold's Makro rows.</li>
 *   <li><b>PCS</b> = Makro (PCS's customer) + any other case naming PCS.</li>
 *   <li><b>ITS</b> = any case naming ISS or ITS.</li>
 * </ul>
 *
 * <p>A row a reviewer took off a sheet stays off. Corrections are made on each sheet's
 * details page, linked from here.
 */

export type CaseCustomerView = 'internal' | 'pcs' | 'makro' | 'its';

/** The sheets each view is made of, so no other has to be read. */
export const NEEDS: Record<CaseCustomerView, CaseReportSlug[]> = {
  internal: ['mk', 'delivery', 'cleaning', 'makro', 'aotga', 'on-hold'],
  pcs: ['mk', 'delivery', 'cleaning', 'makro', 'on-hold'],
  makro: ['makro', 'on-hold'],
  its: ['mk', 'delivery', 'cleaning', 'on-hold'],
};

/** Each sheet's name, as a key of `pendingCases`: `t(SHEET_LABEL[sheet])`. */
export const SHEET_LABEL: Record<CaseReportSlug, string> = {
  mk: 'name.mk',
  delivery: 'name.delivery',
  cleaning: 'name.cleaning',
  makro: 'name.makro',
  aotga: 'name.aotga',
  'on-hold': 'name.onHold',
};

/** A name standing alone, not inside another word: "PCS : Makro" yes, "PCSX" no. */
const PCS = /(^|[^a-z])pcs([^a-z]|$)/i;
const ITS = /(^|[^a-z])(iss|its)([^a-z]|$)/i;

const mentions = (name: RegExp) => (r: CaseReportRow) =>
  (r.project != null && name.test(r.project)) || (r.branch != null && name.test(r.branch));

/**
 * Where a view's rows came from: which sheet, so its details page can be linked, and
 * which board, so the view can be narrowed to cleaning or delivery.
 */
export type Part = { sheet: CaseReportSlug; board: CaseBoard; rows: CaseReportRow[] };

/** Both boards, or one. */
export type CaseScope = 'BOTH' | CaseBoard;

export interface Section {
  key: string;
  title: string;
  /** Whose hold the on-hold box names. */
  holdOwner: string;
  parts: Part[];
}

export type Sheets = Partial<Record<CaseReportSlug, CaseReportRow[]>>;

/** Something to tell the reader about a view; the panel words it (`pendingCases.notes.*`). */
export type CaseNote = { key: 'unplaced'; count: number } | { key: 'itsEmpty' };

const live = (rows: CaseReportRow[] | undefined) => (rows ?? []).filter((r) => !r.removed);

/** The frozen sheets, split into the pieces the views are made of. */
function pools(sheets: Sheets) {
  // Every MK ticket, removed ones included: a held MK case a reviewer took off the MK
  // sheet must not come back through On Hold.
  const mkTickets = new Set((sheets.mk ?? []).map((r) => r.sourceItemId));
  const onHold = live(sheets['on-hold']);
  const isMakro = (r: CaseReportRow) => (r.project ?? '').toLowerCase().includes('makro');
  const cleaningHeldAll = onHold.filter((r) => r.board === 'CLEANING');
  return {
    mk: live(sheets.mk),
    delivery: live(sheets.delivery),
    deliveryHeld: onHold.filter((r) => r.board === 'DELIVERY' && !mkTickets.has(r.sourceItemId)),
    cleaning: live(sheets.cleaning),
    cleaningHeld: cleaningHeldAll.filter((r) => !isMakro(r)),
    makro: live(sheets.makro),
    makroHeld: cleaningHeldAll.filter(isMakro),
    aot: live(sheets.aotga),
    // Frozen before On Hold recorded each row's board: cannot be placed.
    unplaced: onHold.filter((r) => !r.board).length,
  };
}

export function compose(view: CaseCustomerView, sheets: Sheets): { sections: Section[]; notes: CaseNote[] } {
  const p = pools(sheets);
  const notes: CaseNote[] = [];
  if (p.unplaced > 0) notes.push({ key: 'unplaced', count: p.unplaced });
  const delivery: Part[] = [
    { sheet: 'mk', board: 'DELIVERY', rows: p.mk },
    { sheet: 'delivery', board: 'DELIVERY', rows: p.delivery },
    { sheet: 'on-hold', board: 'DELIVERY', rows: p.deliveryHeld },
  ];
  const otherCleaning: Part[] = [
    { sheet: 'cleaning', board: 'CLEANING', rows: p.cleaning },
    { sheet: 'on-hold', board: 'CLEANING', rows: p.cleaningHeld },
  ];
  const makro: Part[] = [
    { sheet: 'makro', board: 'CLEANING', rows: p.makro },
    { sheet: 'on-hold', board: 'CLEANING', rows: p.makroHeld },
  ];
  const only = (parts: Part[], keep: (r: CaseReportRow) => boolean) =>
    parts.map((part) => ({ ...part, rows: part.rows.filter(keep) }));

  switch (view) {
    case 'internal':
      return {
        notes,
        sections: [
          { key: 'delivery', title: 'Delivery', holdOwner: 'Customer', parts: delivery },
          {
            key: 'cleaning',
            title: 'Cleaning',
            holdOwner: 'Customer',
            parts: [...otherCleaning, ...makro, { sheet: 'aotga', board: 'CLEANING', rows: p.aot }],
          },
        ],
      };
    case 'makro':
      return { notes, sections: [{ key: 'makro', title: 'Makro', holdOwner: 'Makro', parts: makro }] };
    case 'pcs':
      return {
        notes,
        sections: [
          {
            key: 'pcs',
            title: 'PCS',
            holdOwner: 'PCS',
            // Makro is PCS's customer: on monday its rows do not say "PCS", the team
            // adds "PCS : " by hand, so Makro's cases are PCS's without a match.
            parts: [...makro, ...only(otherCleaning, mentions(PCS)), ...only(delivery, mentions(PCS))],
          },
        ],
      };
    case 'its': {
      const parts = [...only(otherCleaning, mentions(ITS)), ...only(delivery, mentions(ITS))];
      if (parts.every((part) => part.rows.length === 0)) {
        notes.push({ key: 'itsEmpty' });
      }
      return { notes, sections: [{ key: 'its', title: 'ITS', holdOwner: 'ITS', parts }] };
    }
  }
}

/**
 * The view narrowed to one board. A section left with no part of that board goes, so
 * Internal on Cleaning is the Cleaning section alone; a mixed one (PCS, ITS) keeps only
 * that board's parts.
 */
export function inScope(sections: Section[], scope: CaseScope): Section[] {
  if (scope === 'BOTH') return sections;
  return sections
    .map((section) => ({ ...section, parts: section.parts.filter((part) => part.board === scope) }))
    .filter((section) => section.parts.length > 0);
}
