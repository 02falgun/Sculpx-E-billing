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
          className={`inline-flex items-center gap-1.5 rounded-[4px] bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-800 border border-neutral-300 ${className || ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
          Available
        </span>
      );
    case "OCCUPIED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-[4px] bg-black px-2 py-0.5 text-[11px] font-semibold text-white border border-black ${className || ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          Occupied
        </span>
      );
    case "RESERVED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-[4px] bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-900 border border-neutral-400 ${className || ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
          Reserved
        </span>
      );
    case "BILLED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-[4px] bg-neutral-800 px-2 py-0.5 text-[11px] font-semibold text-white border border-neutral-800 ${className || ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
          Billed
        </span>
      );
    default:
      return null;
  }
}
