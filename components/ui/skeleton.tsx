import * as React from "react"

import { cn } from "@/lib/utils"

/** Shimmer placeholder that reserves layout space while data loads. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-[var(--app-faint)]", className)}
      {...props}
    />
  )
}

/** A stack of row-shaped skeletons matching the app's dense list rows. */
function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
        >
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, ListSkeleton }
