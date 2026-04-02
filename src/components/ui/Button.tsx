import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link" | "accent" | "danger"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-[var(--bg-void)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-secondary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--text-primary)] text-[var(--bg-void)] hover:opacity-90": variant === "default",
            "border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-surface)] text-[var(--text-primary)]": variant === "outline",
            "hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] text-[var(--text-secondary)]": variant === "ghost",
            "text-[var(--text-primary)] underline-offset-4 hover:underline": variant === "link",
            "bg-[var(--accent-amber)] text-[var(--accent-ink)] hover:bg-[var(--accent-amber-strong)]": variant === "accent",
            "bg-red-900/50 text-red-200 hover:bg-red-900/80 dark:text-red-100": variant === "danger",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
