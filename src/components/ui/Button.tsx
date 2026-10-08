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
      "inline-flex items-center justify-center font-medium select-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] cursor-pointer";

    const variantStyles = {
      primary:
        "bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 border border-black font-semibold",
      secondary:
        "bg-white text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-300 font-semibold",
      outline:
        "bg-transparent text-neutral-900 hover:bg-neutral-100 hover:text-black border border-neutral-300 font-medium",
      ghost:
        "text-neutral-700 hover:text-black hover:bg-neutral-100 active:bg-neutral-200 font-medium",
      danger:
        "bg-neutral-900 text-white hover:bg-black border border-neutral-900 font-semibold",
      success:
        "bg-black text-white hover:bg-neutral-800 border border-black font-semibold",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5 rounded-[6px]",
      md: "h-9 px-3.5 text-xs sm:text-sm gap-2 rounded-[6px]",
      lg: "h-10 px-4 text-sm gap-2 rounded-[6px]",
      icon: "h-8 w-8 p-0 rounded-[6px]",
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
