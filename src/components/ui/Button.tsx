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
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-zinc-100 text-zinc-900 hover:bg-zinc-200": variant === "default",
            "border border-zinc-800 bg-transparent hover:bg-zinc-800 text-zinc-100": variant === "outline",
            "hover:bg-zinc-800 hover:text-zinc-100 text-zinc-300": variant === "ghost",
            "text-zinc-100 underline-offset-4 hover:underline": variant === "link",
            "bg-amber-500 text-zinc-950 hover:bg-amber-600": variant === "accent",
            "bg-red-900/50 text-red-200 hover:bg-red-900/80": variant === "danger",
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
