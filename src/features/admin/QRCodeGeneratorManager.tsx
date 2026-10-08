"use client";

import * as React from "react";
import Link from "next/link";
import { useTables, useRooms } from "@/hooks/useTables";
import { Button } from "@/components/ui/Button";
import { QrCode, Printer, ExternalLink, UtensilsCrossed, BedDouble } from "lucide-react";

export function QRCodeGeneratorManager() {
  const { data: tables = [] } = useTables();
  const { data: rooms = [] } = useRooms();

  const [mode, setMode] = React.useState<"TABLE" | "ROOM">("TABLE");
  const [selectedIdentifier, setSelectedIdentifier] = React.useState<string>(
    tables[0]?.tableNumber || "5"
  );

  const selectedItem = React.useMemo(() => {
    if (mode === "TABLE") {
      return tables.find((t) => t.tableNumber === selectedIdentifier) || tables[0];
    }
    return rooms.find((r) => r.roomNumber === selectedIdentifier) || rooms[0];
  }, [mode, selectedIdentifier, tables, rooms]);

  const activeToken = selectedItem?.qrToken || "table-token-5";
  const displayName =
    mode === "TABLE" && selectedItem && "tableNumber" in selectedItem
      ? `Table ${selectedItem.tableNumber}`
      : mode === "ROOM" && selectedItem && "roomNumber" in selectedItem
      ? `Room ${selectedItem.roomNumber}`
      : "Dining Location";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Selector Controls (Hidden during print) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("TABLE");
              if (tables.length > 0) setSelectedIdentifier(tables[0].tableNumber);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              mode === "TABLE"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            <span>Table QR Codes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("ROOM");
              if (rooms.length > 0) setSelectedIdentifier(rooms[0].roomNumber);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              mode === "ROOM"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <BedDouble className="h-4 w-4" />
            <span>Room Service QRs</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedIdentifier}
            onChange={(e) => setSelectedIdentifier(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
          >
            {mode === "TABLE"
              ? tables.map((t) => (
                  <option key={t.id} value={t.tableNumber}>
                    Table {t.tableNumber} ({t.section})
                  </option>
                ))
              : rooms.map((r) => (
                  <option key={r.id} value={r.roomNumber}>
                    Room {r.roomNumber} (Floor {r.floor})
                  </option>
                ))}
          </select>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print Tent Card
          </Button>

          <Link href={`/menu/${activeToken}`} target="_blank">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<ExternalLink className="h-4 w-4" />}
            >
              Test Scan Menu
            </Button>
          </Link>
        </div>
      </div>

      {/* Printable Tent Card Mockup */}
      <div className="max-w-md mx-auto rounded-3xl border-2 border-slate-300 bg-white p-8 text-center shadow-lg space-y-6 print:border-none print:shadow-none print:m-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
            Welcome to
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            The Grand Royal Palace & Resort
          </h2>
          <p className="text-xs text-slate-500 mt-1">Contactless Dining & Instant E-Billing</p>
        </div>

        {/* QR Code Container */}
        <div className="mx-auto w-56 h-56 rounded-2xl border-4 border-slate-900 bg-white p-3 flex flex-col items-center justify-center shadow-sm">
          <QrCode className="h-44 w-44 text-slate-900" />
          <span className="text-[10px] font-mono font-bold text-slate-400 mt-1">
            {activeToken}
          </span>
        </div>

        {/* Location Identifier Badge */}
        <div className="inline-block rounded-2xl bg-slate-900 px-6 py-2.5 text-white">
          <span className="text-xs font-semibold text-amber-400 block">Dine-In Location</span>
          <span className="text-xl font-black tracking-tight">{displayName}</span>
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">Point your camera to view menu & order</p>
          <p className="text-[11px] text-slate-400">No application download required • Secure GST e-bill</p>
        </div>
      </div>
    </div>
  );
}
