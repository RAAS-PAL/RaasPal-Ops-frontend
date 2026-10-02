import type { PmPlanDateChange } from './types';

/**
 * Sends a move or an undo, asking the person first when the visit is completed.
 *
 * The server has the last word: it reads the visit's status from monday, and answers
 * NEEDS_CONFIRMATION when monday shows it completed. `askFirst` is for when the grid
 * already shows it completed, so the question comes before anything is sent rather
 * than after a round trip.
 *
 * Resolves to null when the person said no.
 */
export async function sendWithCompletedCheck(
  send: (confirmCompleted: boolean) => Promise<PmPlanDateChange>,
  ask: () => Promise<boolean>,
  askFirst = false,
): Promise<PmPlanDateChange | null> {
  if (askFirst) {
    return (await ask()) ? send(true) : null;
  }
  const first = await send(false);
  if (first.outcome !== 'NEEDS_CONFIRMATION') return first;
  return (await ask()) ? send(true) : null;
}
