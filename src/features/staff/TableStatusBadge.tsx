"use client";

import * as React from "react";
import { Table } from "@/types";

interface TableStatusBadgeProps {
  status: Table["status"];
  className?: string;
}

export function TableStatusBadge({ status, className }: TableStatusBadgeProps) {
  switch (status) {
    case "AVAILABLE":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 ${className || ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Available
        </span>
      );
    case "OCCUPIED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200 ${className || ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Occupied
        </span>
      );
    case "RESERVED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200 ${className || ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Reserved
        </span>
      );
    case "BILLED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200 ${className || ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          Billed
        </span>
      );
    default:
      return null;
  }
}
