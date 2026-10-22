"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table } from "@/types";
import { usePOSStore } from "@/store";
import { useUpdateTableStatus } from "@/hooks/useTables";
import { TableStatusBadge } from "./TableStatusBadge";
import { Button } from "@/components/ui/Button";
import {
  Users,
  UtensilsCrossed,
  Receipt,
  MoreVertical,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";

interface TableCardProps {
  table: Table;
}

export function TableCard({ table }: TableCardProps) {
  const router = useRouter();
  const setSelectedTable = usePOSStore((s) => s.setSelectedTable);
  const { mutateAsync: updateStatus, isPending } = useUpdateTableStatus();
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  const handleOpenPOS = () => {
    setSelectedTable(table);
    router.push("/pos");
  };

  const handleChangeStatus = async (newStatus: Table["status"]) => {
    setShowStatusMenu(false);
    await updateStatus({ id: table.id, status: newStatus });
  };

  const isOccupied = table.status === "OCCUPIED";

  return (
    <div
      className={`relative rounded-lg border bg-white p-4 transition-all ${
        isOccupied
          ? "border-neutral-400"
          : "border-neutral-200 hover:border-neutral-300"
      }`}
    >
      {/* Top row: Table No, Section, and status badge */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            {table.section}
          </span>
          <h3 className="text-base font-bold text-neutral-900 tracking-tight">
            Table {table.tableNumber}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
            <Users className="h-3.5 w-3.5 text-neutral-400" />
            <span>Cap: {table.capacity} Guests</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <TableStatusBadge status={table.status} />

          {/* Status switcher popover toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="p-1 text-neutral-400 hover:text-neutral-800 rounded hover:bg-neutral-100 cursor-pointer"
              title="Change table status"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 top-6 z-20 w-36 rounded-md border border-neutral-200 bg-white p-1 shadow-md text-xs space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleChangeStatus("AVAILABLE")}
                  className="w-full text-left px-2.5 py-1.5 rounded text-neutral-800 hover:bg-neutral-100 font-medium cursor-pointer"
                >
                  Mark Available
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus("OCCUPIED")}
                  className="w-full text-left px-2.5 py-1.5 rounded text-neutral-800 hover:bg-neutral-100 font-medium cursor-pointer"
                >
                  Mark Occupied
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus("RESERVED")}
                  className="w-full text-left px-2.5 py-1.5 rounded text-neutral-800 hover:bg-neutral-100 font-medium cursor-pointer"
                >
                  Mark Reserved
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus("BILLED")}
                  className="w-full text-left px-2.5 py-1.5 rounded text-neutral-800 hover:bg-neutral-100 font-medium cursor-pointer"
                >
                  Mark Billed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Order / Bill info */}
      {isOccupied && (
        <div className="my-3 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 text-xs text-neutral-800 space-y-1">
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-1 text-neutral-600">
              <Clock className="h-3 w-3 text-neutral-500" /> Active Session
            </span>
            {table.activeOrderId && (
              <Link
                href={`/order/${table.activeOrderId}`}
                className="text-[11px] text-neutral-900 hover:underline font-mono font-semibold"
              >
                #{table.activeOrderId}
              </Link>
            )}
          </div>
          {table.activeBillId && (
            <div className="flex items-center justify-between text-[11px] text-neutral-600">
              <span>E-Bill Issued</span>
              <Link
                href={`/bill/${table.activeBillId}`}
                className="font-medium text-neutral-900 underline"
              >
                View Bill
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Action footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
        <Button
          type="button"
          variant={isOccupied ? "outline" : "primary"}
          size="sm"
          className="flex-1 font-bold text-xs"
          onClick={handleOpenPOS}
          leftIcon={<UtensilsCrossed className="h-3.5 w-3.5" />}
        >
          {isOccupied ? "Add to Order" : "New Order"}
        </Button>

        {table.activeBillId && (
          <Link href={`/bill/${table.activeBillId}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs px-2.5"
              title="View Digital E-Bill"
            >
              <Receipt className="h-3.5 w-3.5 text-slate-700" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
