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
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2",
        {
          "border-transparent bg-zinc-100 text-zinc-900": variant === "default",
          "border-transparent bg-zinc-800 text-zinc-100": variant === "secondary",
          "border-transparent bg-red-900/50 text-red-200": variant === "destructive",
          "border-transparent bg-green-900/50 text-green-200": variant === "success",
          "border-transparent bg-amber-900/50 text-amber-200": variant === "warning",
          "border-transparent bg-blue-900/50 text-blue-200": variant === "info",
          "text-zinc-100 border-zinc-800": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}
