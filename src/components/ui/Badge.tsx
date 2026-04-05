import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info";
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:ring-offset-2",
        {
          "border-transparent bg-[var(--text-primary)] text-[var(--bg-void)]": variant === "default",
          "border-transparent bg-[var(--bg-surface)] text-[var(--text-primary)]": variant === "secondary",
          "border-transparent bg-red-900/50 text-red-200": variant === "destructive",
          "border-transparent bg-green-900/50 text-green-200": variant === "success",
          "border-transparent bg-amber-900/50 text-amber-200": variant === "warning",
          "border-transparent bg-blue-900/50 text-blue-200": variant === "info",
          "text-[var(--text-primary)] border-[var(--border-color)]": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}
