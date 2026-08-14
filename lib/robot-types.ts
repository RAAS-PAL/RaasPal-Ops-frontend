import type { RobotType } from '@/types/api';

/**
 * The robot types the platform models, in the order they are shown.
 *
 * <p>Shared rather than repeated per screen: the catalogue list, the detail modal
 * and both robot forms all enumerate these, and a form offering fewer types than the
 * backend accepts is how a robot ends up filed under the wrong one. Adding a value
 * to the backend `RobotType` enum means adding it here and to `types/api.ts`.
 */
export const ROBOT_TYPES: RobotType[] = [
  'CLEANING',
  'CLEANING_EQUIPMENT',
  'DELIVERY',
  'MOWING',
  'SECURITY',
  'COOKING',
  'RECEPTION',
];

/**
 * English labels for the badges.
 *
 * <p>Badges used to render the raw enum, which was survivable while every value was
 * a single word. `CLEANING_EQUIPMENT` is not a label. The filter tabs are translated
 * through next-intl (`robots.types.*`) instead; these cover the places that are not.
 */
export const TYPE_LABELS: Record<RobotType, string> = {
  CLEANING: 'Cleaning',
  CLEANING_EQUIPMENT: 'Cleaning Equipment',
  DELIVERY: 'Delivery',
  MOWING: 'Mowing',
  SECURITY: 'Security',
  COOKING: 'Cooking',
  RECEPTION: 'Reception',
};

/** One colour per type. A missing entry renders an unstyled badge, so this is
 *  a total record rather than a partial one. */
export const TYPE_STYLES: Record<RobotType, string> = {
  CLEANING: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  CLEANING_EQUIPMENT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400',
  DELIVERY: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  MOWING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  SECURITY: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  COOKING: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  RECEPTION: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
};
