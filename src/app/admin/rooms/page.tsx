"use client";

import * as React from "react";
import Link from "next/link";
import { useRooms } from "@/hooks/useTables";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { BedDouble, Plus, QrCode, ExternalLink } from "lucide-react";

export default function AdminRoomsPage() {
  const { data: rooms = [], isLoading } = useRooms();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-slate-800" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Guestrooms &amp; Suites
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            In-room dining destinations, guest folio billing, and suite QR management.
          </p>
        </div>

        <Link href="/admin/qr">
          <Button
            variant="primary"
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 font-bold"
            leftIcon={<QrCode className="h-4 w-4" />}
          >
            Manage Room QRs
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Spinner size="lg" className="text-slate-900" />
          <p className="text-xs font-semibold text-slate-500">Loading guestrooms...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {room.floor}
                  </span>
                  <h3 className="text-lg font-black text-slate-900">Room {room.roomNumber}</h3>
                  <span className="text-xs text-slate-500">
                    {room.guestName ? `Guest: ${room.guestName}` : "Vacant Room"}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    room.status === "OCCUPIED"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {room.status}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">{room.qrToken}</span>
                <Link href={`/menu/room/${room.roomNumber}`} target="_blank">
                  <Button size="sm" variant="outline" className="text-xs" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                    Open Menu
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
