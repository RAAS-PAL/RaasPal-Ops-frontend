import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * StatusBadge — the single way to render an operational status anywhere in
 * the app (solutions, proposals, report sends, device state…).
 *
 * Dot + label so state is never conveyed by colour alone (WCAG), with
 * light/dark pairs tuned for ≥4.5:1 text contrast on both themes.
 */
const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
        danger:  "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
        info:    "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
        neutral: "bg-[var(--app-faint)] text-[var(--app-muted)]",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
)

const dotVariants: Record<NonNullable<StatusTone>, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-red-500",
  info:    "bg-sky-500",
  neutral: "bg-[var(--app-muted)]",
}

export type StatusTone = VariantProps<typeof statusBadgeVariants>["tone"]

/** Map a backend status string to a visual tone. Unknown statuses stay neutral. */
export function toneForStatus(status: string | null | undefined): StatusTone {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
    case "SENT":
    case "ONLINE":
    case "PASSED":
    case "ACTIVE":
    case "VERIFIED":
    case "FINAL":
      return "success"
    case "PENDING":
    case "PROCESSING":
    case "SKIPPED":
      return "warning"
    case "FAILED":
    case "OFFLINE":
    case "ERROR":
    case "REJECTED":
      return "danger"
    case "UNDER_TESTING":
      return "info"
    default:
      return "neutral"
  }
}

function StatusBadge({
  className,
  tone = "neutral",
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusBadgeVariants>) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ tone }), className)}
      {...props}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotVariants[tone ?? "neutral"])} />
      {children}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
