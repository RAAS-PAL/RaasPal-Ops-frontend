import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * EmptyState — consistent "no content yet" panel with a suggested next action,
 * so operators are never left staring at a blank region.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)]/60 px-6 py-12 text-center",
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-semibold text-[var(--app-text)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--app-muted)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export { EmptyState }
