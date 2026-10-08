"use client";

import * as React from "react";
import { useTables } from "@/hooks/useTables";
import { TableGrid } from "@/features/staff/TableGrid";
import { Spinner } from "@/components/ui/Spinner";
import { Grid3X3, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminTablesPage() {
  const { data: tables = [], isLoading } = useTables();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-slate-800" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dining Tables Fleet
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure floor tables, capacity, dining sections, and QR code assignments.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="bg-slate-900 hover:bg-slate-800 font-bold"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => alert("Table addition is managed by floor layout configuration.")}
        >
          Add Table
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Spinner size="lg" className="text-slate-900" />
          <p className="text-xs font-semibold text-slate-500">Loading tables fleet...</p>
        </div>
      ) : (
        <TableGrid tables={tables} />
      )}
    </div>
  );
}
