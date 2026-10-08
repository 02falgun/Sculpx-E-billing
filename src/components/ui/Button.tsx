import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] cursor-pointer";

    const variantStyles = {
      primary:
        "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-amber-500/40 shadow-xs font-semibold",
      secondary:
        "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 focus-visible:ring-slate-800/40 shadow-xs font-semibold",
      outline:
        "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 active:bg-slate-100 focus-visible:ring-slate-400/40 shadow-xs font-semibold",
      ghost:
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400/40 font-semibold",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500/40 shadow-xs font-semibold",
      success:
        "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500/40 shadow-xs font-semibold",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
      md: "h-9.5 px-4 text-xs sm:text-sm gap-2 rounded-xl",
      lg: "h-11 px-5 text-sm sm:text-base gap-2.5 rounded-xl",
      icon: "h-9 w-9 p-0 rounded-lg",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
