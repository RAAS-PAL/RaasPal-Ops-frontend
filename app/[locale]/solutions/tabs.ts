/**
 * The Solutions hub's tab ids, shared by the server page and the client hub.
 *
 * <p>These deliberately live outside [[SolutionsHubClient]]. That file is a client
 * module, and a Server Component importing a plain value from one receives a client
 * reference rather than the value itself — so `SOLUTION_TABS.includes(...)` in
 * page.tsx threw "is not a function". Only components survive that boundary; values
 * have to come from a module with no `'use client'`, like this one.
 */

export const SOLUTION_TABS = ['generate', 'solutions', 'proposals'] as const;
export type SolutionTab = (typeof SOLUTION_TABS)[number];
