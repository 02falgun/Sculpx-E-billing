"use client";

import * as React from "react";
import { useTables } from "@/hooks/useTables";
import { TableGrid } from "@/features/staff/TableGrid";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import { Grid3X3 } from "lucide-react";

export default function WaiterTablesPage() {
  const { data: tables = [], isLoading, error, refetch } = useTables();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-amber-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Floor Tables
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visual restaurant table statuses: Available, Occupied, Billed, and Reserved.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Spinner size="lg" className="text-amber-500" />
          <p className="text-xs font-semibold text-slate-500">Loading floor tables...</p>
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Tables"
          message={error instanceof Error ? error.message : "Error connecting to floor service."}
          onRetry={() => refetch()}
        />
      ) : (
        <TableGrid tables={tables} />
      )}
    </div>
  );
}
