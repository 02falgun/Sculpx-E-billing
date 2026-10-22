"use client";

import * as React from "react";
import { useTables } from "@/hooks/useTables";
import { TableGrid } from "@/features/staff/TableGrid";
import { Spinner } from "@/components/ui/Spinner";
import { Grid3X3 } from "lucide-react";

export default function ManagerTablesPage() {
  const { data: tables = [], isLoading } = useTables();

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Floor Occupancy &amp; Tables
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Monitor table turns, section covers, and guest seating dynamics.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Spinner size="lg" className="text-purple-600" />
          <p className="text-xs font-semibold text-slate-500">Loading tables...</p>
        </div>
      ) : (
        <TableGrid tables={tables} />
      )}
    </div>
  );
}
