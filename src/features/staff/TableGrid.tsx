"use client";

import * as React from "react";
import { Table } from "@/types";
import { TableCard } from "./TableCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { LayoutGrid, CheckCircle2, Clock, CalendarDays } from "lucide-react";

interface TableGridProps {
  tables: Table[];
}

export function TableGrid({ tables }: TableGridProps) {
  const [selectedSection, setSelectedSection] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Extract unique sections
  const sections = React.useMemo(() => {
    const list = Array.from(new Set(tables.map((t) => t.section)));
    return ["ALL", ...list];
  }, [tables]);

  // Statistics
  const stats = React.useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === "AVAILABLE").length;
    const occupied = tables.filter((t) => t.status === "OCCUPIED").length;
    const reserved = tables.filter((t) => t.status === "RESERVED").length;
    return { total, available, occupied, reserved };
  }, [tables]);

  // Filter tables
  const filteredTables = React.useMemo(() => {
    return tables.filter((table) => {
      const matchesSection =
        selectedSection === "ALL" || table.section === selectedSection;
      const matchesSearch =
        searchQuery.trim() === "" ||
        table.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.section.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSection && matchesSearch;
    });
  }, [tables, selectedSection, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Overview Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Tables</span>
            <LayoutGrid className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Available</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{stats.available}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Occupied</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{stats.occupied}</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Reserved</span>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-700">{stats.reserved}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {sections.map((section) => {
            const isSelected = selectedSection === section;
            return (
              <button
                key={section}
                type="button"
                onClick={() => setSelectedSection(section)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {section === "ALL" ? "All Sections" : section}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="w-full sm:w-64">
          <SearchInput
            placeholder="Search table number..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
          />
        </div>
      </div>

      {/* Table Cards Grid */}
      {filteredTables.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Tables Found"
          description={
            searchQuery
              ? `No tables match "${searchQuery}" in this section.`
              : "No tables available in the selected section."
          }
          actionLabel="Clear Filters"
          onAction={() => {
            setSelectedSection("ALL");
            setSearchQuery("");
          }}
        />
      )}
    </div>
  );
}
