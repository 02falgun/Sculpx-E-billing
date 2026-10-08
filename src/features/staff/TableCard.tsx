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
      className={`relative rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
        isOccupied
          ? "border-amber-300 ring-1 ring-amber-200"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Top row: Table No, Section, and status badge */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {table.section}
          </span>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            Table {table.tableNumber}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <Users className="h-3.5 w-3.5 text-slate-400" />
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
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              title="Change table status"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 top-6 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg text-xs space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleChangeStatus("AVAILABLE")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 font-medium cursor-pointer"
                >
                  Mark Available
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus("OCCUPIED")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-amber-700 hover:bg-amber-50 font-medium cursor-pointer"
                >
                  Mark Occupied
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus("RESERVED")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-blue-700 hover:bg-blue-50 font-medium cursor-pointer"
                >
                  Mark Reserved
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeStatus("BILLED")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-purple-700 hover:bg-purple-50 font-medium cursor-pointer"
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
        <div className="my-3.5 rounded-xl border border-amber-200/60 bg-amber-50/50 p-2.5 text-xs text-amber-900 space-y-1">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-600" /> Active Session
            </span>
            {table.activeOrderId && (
              <Link
                href={`/order/${table.activeOrderId}`}
                className="text-[11px] text-amber-700 hover:underline font-bold"
              >
                #{table.activeOrderId}
              </Link>
            )}
          </div>
          {table.activeBillId && (
            <div className="flex items-center justify-between text-[11px] text-amber-800">
              <span>E-Bill Issued</span>
              <Link
                href={`/bill/${table.activeBillId}`}
                className="font-bold underline"
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
