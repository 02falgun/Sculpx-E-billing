import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function Spinner({ size = "md", label, className, ...props }: SpinnerProps) {
  const sizeStyles = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10",
  };

  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-2 text-neutral-900", className)}
      {...props}
    >
      <Loader2 className={cn("animate-spin", sizeStyles[size])} />
      {label && <span className="text-xs font-medium text-neutral-500">{label}</span>}
      <span className="sr-only">{label || "Loading..."}</span>
    </div>
  );
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-[6px] bg-neutral-200", className)}
      {...props}
    />
  );
}
