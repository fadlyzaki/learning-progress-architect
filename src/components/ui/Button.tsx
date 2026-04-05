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
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-[var(--bg-void)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--text-primary)] text-[var(--bg-void)] shadow-[0_12px_24px_rgba(0,0,0,0.14)] hover:opacity-92": variant === "default",
            "border border-[var(--border-color)] bg-transparent text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]": variant === "outline",
            "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]": variant === "ghost",
            "text-[var(--text-primary)] underline-offset-4 hover:underline": variant === "link",
            "bg-[var(--accent-amber)] text-[var(--accent-ink)] shadow-[0_14px_30px_var(--glow-amber)] hover:bg-[var(--accent-amber-strong)]": variant === "accent",
            "bg-red-900/50 text-red-200 hover:bg-red-900/80 dark:text-red-100": variant === "danger",
            "h-11 px-4 py-2.5": size === "default",
            "h-9 px-3.5 text-xs": size === "sm",
            "h-12 px-7 text-sm": size === "lg",
            "h-11 w-11": size === "icon",
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
