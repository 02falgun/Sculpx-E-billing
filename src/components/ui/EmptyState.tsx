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
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-slate-400 mb-3">
        {icon || <FolderSearch className="h-6 w-6" />}
      </div>
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onAction}>
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
        "flex flex-col items-center justify-center rounded-2xl border border-rose-100 bg-rose-50/40 p-8 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h4 className="text-sm font-bold text-rose-900">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-rose-700">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="danger"
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
