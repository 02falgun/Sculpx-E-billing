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
    default: "bg-slate-900 text-white border border-slate-800",
    secondary: "bg-slate-100 text-slate-700 border border-slate-200/80",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
    warning: "bg-amber-50 text-amber-800 border border-amber-200/80",
    destructive: "bg-rose-50 text-rose-800 border border-rose-200/80",
    outline: "border border-slate-200 text-slate-700 bg-white shadow-2xs",
    accent: "bg-amber-50 text-amber-800 border border-amber-300 font-semibold",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-full tracking-wide transition-colors",
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
