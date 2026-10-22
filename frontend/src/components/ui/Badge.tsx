import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" | "accent";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-black text-white border border-black",
    secondary: "bg-neutral-100 text-neutral-800 border border-neutral-200",
    success: "bg-neutral-900 text-white border border-neutral-900",
    warning: "bg-neutral-100 text-neutral-900 border border-neutral-300",
    destructive: "bg-neutral-100 text-neutral-900 border border-neutral-400 line-through decoration-neutral-500",
    outline: "border border-neutral-300 text-neutral-800 bg-white",
    accent: "bg-neutral-800 text-white border border-neutral-800",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-[4px] tracking-wide transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
