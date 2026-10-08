import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { AlertCircle, FolderSearch, RefreshCw } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[8px] border border-neutral-200 bg-white p-8 text-center",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-neutral-100 text-neutral-600 mb-3 border border-neutral-200">
        {icon || <FolderSearch className="h-5 w-5" />}
      </div>
      <h4 className="text-sm font-bold text-neutral-900">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-neutral-500">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Unable to load data. Please check your network and try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[8px] border border-neutral-300 bg-neutral-50 p-8 text-center",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-neutral-200 text-neutral-900 mb-3 border border-neutral-300">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-bold text-neutral-900">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-neutral-600">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="primary"
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          className="mt-4"
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  );
}
