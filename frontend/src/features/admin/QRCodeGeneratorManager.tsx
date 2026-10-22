"use client";

import * as React from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { useTables, useRooms, useRotateTableQr, useRotateRoomQr } from "@/hooks/useTables";
import { useUIStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  QrCode,
  Printer,
  ExternalLink,
  Download,
  Copy,
  Check,
  UtensilsCrossed,
  BedDouble,
  Search,
  RefreshCw,
  AlertCircle,
  Plus,
} from "lucide-react";
import { ENV } from "@/config";
import { Table, Room } from "@/types";

export function QRCodeGeneratorManager() {
  const {
    data: tables = [],
    isLoading: isLoadingTables,
    isError: isErrorTables,
    refetch: refetchTables,
  } = useTables();

  const {
    data: rooms = [],
    isLoading: isLoadingRooms,
    isError: isErrorRooms,
    refetch: refetchRooms,
  } = useRooms();

  const rotateTableQrMutation = useRotateTableQr();
  const rotateRoomQrMutation = useRotateRoomQr();
  const addToast = useUIStore((s) => s.addToast);

  const [mode, setMode] = React.useState<"TABLE" | "ROOM">("TABLE");
  const [selectedEntityId, setSelectedEntityId] = React.useState<string>("");
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<"ALL" | "TABLE" | "ROOM">("ALL");

  // Base URL for QR links from runtime config or window location
  const baseUrl = React.useMemo(() => {
    if (ENV.APP_URL) return ENV.APP_URL.replace(/\/$/, "");
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:3000";
  }, []);

  // Synchronize selection when mode or records change
  React.useEffect(() => {
    if (mode === "TABLE") {
      if (tables.length > 0) {
        // If current selection is still in tables, keep it, otherwise select first table
        const stillExists = tables.some((t) => t.id === selectedEntityId);
        if (!stillExists) {
          setSelectedEntityId(tables[0].id);
        }
      } else {
        setSelectedEntityId("");
      }
    } else {
      if (rooms.length > 0) {
        const stillExists = rooms.some((r) => r.id === selectedEntityId);
        if (!stillExists) {
          setSelectedEntityId(rooms[0].id);
        }
      } else {
        setSelectedEntityId("");
      }
    }
  }, [mode, tables, rooms, selectedEntityId]);

  // Find currently selected record
  const selectedTable: Table | undefined = React.useMemo(() => {
    if (mode !== "TABLE") return undefined;
    return tables.find((t) => t.id === selectedEntityId) || tables[0];
  }, [mode, tables, selectedEntityId]);

  const selectedRoom: Room | undefined = React.useMemo(() => {
    if (mode !== "ROOM") return undefined;
    return rooms.find((r) => r.id === selectedEntityId) || rooms[0];
  }, [mode, rooms, selectedEntityId]);

  // Compute active preview data from real persisted record
  const selectedPreview = React.useMemo(() => {
    if (mode === "TABLE" && selectedTable) {
      const token = selectedTable.qrToken || "";
      const queryParam = token ? `?token=${encodeURIComponent(token)}` : "";
      const relativeUrl = `/menu/table/${encodeURIComponent(selectedTable.tableNumber)}${queryParam}`;
      const fullUrl = `${baseUrl}${relativeUrl}`;
      return {
        type: "TABLE" as const,
        id: selectedTable.id,
        identifier: selectedTable.tableNumber,
        displayName: selectedTable.displayName || `Table ${selectedTable.tableNumber}`,
        subtext: `${selectedTable.section} • Cap: ${selectedTable.capacity} Guests`,
        qrToken: token,
        status: selectedTable.status,
        relativeUrl,
        fullUrl,
      };
    } else if (mode === "ROOM" && selectedRoom) {
      const token = selectedRoom.qrToken || "";
      const queryParam = token ? `?token=${encodeURIComponent(token)}` : "";
      const relativeUrl = `/menu/room/${encodeURIComponent(selectedRoom.roomNumber)}${queryParam}`;
      const fullUrl = `${baseUrl}${relativeUrl}`;
      return {
        type: "ROOM" as const,
        id: selectedRoom.id,
        identifier: selectedRoom.roomNumber,
        displayName: `Room ${selectedRoom.roomNumber}`,
        subtext: `${selectedRoom.floor} • ${selectedRoom.roomType || "Guestroom"}`,
        qrToken: token,
        status: selectedRoom.status,
        relativeUrl,
        fullUrl,
      };
    }
    return null;
  }, [mode, selectedTable, selectedRoom, baseUrl]);

  // Generate real QR code image
  const generateQRCode = React.useCallback(async (url: string) => {
    if (!url) {
      setQrDataUrl("");
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("Failed to generate QR code", err);
    }
  }, []);

  React.useEffect(() => {
    if (selectedPreview?.fullUrl) {
      generateQRCode(selectedPreview.fullUrl);
    } else {
      setQrDataUrl("");
    }
  }, [selectedPreview?.fullUrl, generateQRCode]);

  const handleCopy = () => {
    if (!selectedPreview) return;
    navigator.clipboard.writeText(selectedPreview.fullUrl);
    setCopied(true);
    addToast({
      type: "success",
      title: "QR URL Copied",
      message: `Direct link for ${selectedPreview.displayName} copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl || !selectedPreview) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `sculpx-qr-${selectedPreview.type.toLowerCase()}-${selectedPreview.identifier}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addToast({
      type: "success",
      title: "PNG Downloaded",
      message: `High-resolution QR saved for ${selectedPreview.displayName}.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRotateCurrentQr = async () => {
    if (!selectedPreview) return;
    try {
      if (selectedPreview.type === "TABLE") {
        await rotateTableQrMutation.mutateAsync(selectedPreview.id);
      } else {
        await rotateRoomQrMutation.mutateAsync(selectedPreview.id);
      }
      addToast({
        type: "success",
        title: "QR Token Rotated",
        message: `A new secure QR token has been generated and persisted for ${selectedPreview.displayName}. Old token invalidated.`,
      });
    } catch (err: any) {
      alert(err?.message || "Failed to rotate QR token");
    }
  };

  // Fleet list composed exclusively from real persisted records
  const fleetList = React.useMemo(() => {
    const list: Array<{
      id: string;
      rawId: string;
      type: "TABLE" | "ROOM";
      identifier: string;
      displayName: string;
      subtext: string;
      qrToken: string;
      routeUrl: string;
      status: string;
      isActive: boolean;
    }> = [];

    tables.forEach((t) => {
      const queryParam = t.qrToken ? `?token=${encodeURIComponent(t.qrToken)}` : "";
      list.push({
        id: `tbl-${t.id}`,
        rawId: t.id,
        type: "TABLE",
        identifier: t.tableNumber,
        displayName: t.displayName || `Table ${t.tableNumber}`,
        subtext: `${t.section} • Cap: ${t.capacity}`,
        qrToken: t.qrToken || "",
        routeUrl: `/menu/table/${encodeURIComponent(t.tableNumber)}${queryParam}`,
        status: t.status,
        isActive: t.isActive !== false,
      });
    });

    rooms.forEach((r) => {
      const queryParam = r.qrToken ? `?token=${encodeURIComponent(r.qrToken)}` : "";
      list.push({
        id: `room-${r.id}`,
        rawId: r.id,
        type: "ROOM",
        identifier: r.roomNumber,
        displayName: `Room ${r.roomNumber}`,
        subtext: `${r.floor} • ${r.roomType || "Suite"}`,
        qrToken: r.qrToken || "",
        routeUrl: `/menu/room/${encodeURIComponent(r.roomNumber)}${queryParam}`,
        status: r.status,
        isActive: r.isActive !== false,
      });
    });

    return list;
  }, [tables, rooms]);

  const filteredFleet = React.useMemo(() => {
    return fleetList.filter((item) => {
      if (filterType !== "ALL" && item.type !== filterType) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.displayName.toLowerCase().includes(q) ||
        item.identifier.toLowerCase().includes(q) ||
        item.subtext.toLowerCase().includes(q) ||
        item.qrToken.toLowerCase().includes(q)
      );
    });
  }, [fleetList, filterType, searchQuery]);

  const isRotating = rotateTableQrMutation.isPending || rotateRoomQrMutation.isPending;

  return (
    <div className="space-y-8 font-sans">
      {/* 1. TOP CREATION & CONFIGURATION CONTROLS */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">
              Dynamic Tent Card & QR Studio
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select any active restaurant table or guestroom to view and print its real, persisted QR code.
            </p>
          </div>

          {/* Type Selector (Table vs Room) */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("TABLE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                mode === "TABLE"
                  ? "bg-black text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span>Table QR ({tables.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("ROOM")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                mode === "ROOM"
                  ? "bg-black text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" />
              <span>Room QR ({rooms.length})</span>
            </button>
          </div>
        </div>

        {/* Error States with Retry */}
        {mode === "TABLE" && isErrorTables && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>Failed to load restaurant tables from backend.</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetchTables()}>
              Retry
            </Button>
          </div>
        )}

        {mode === "ROOM" && isErrorRooms && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>Failed to load guestrooms from backend.</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetchRooms()}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading Indicator */}
        {((mode === "TABLE" && isLoadingTables) || (mode === "ROOM" && isLoadingRooms)) && (
          <div className="flex items-center justify-center py-8 gap-2 text-xs text-neutral-500 font-medium">
            <Spinner size="sm" className="text-neutral-900" />
            <span>Loading {mode === "TABLE" ? "restaurant tables" : "hotel rooms"}...</span>
          </div>
        )}

        {/* Empty States */}
        {mode === "TABLE" && !isLoadingTables && !isErrorTables && tables.length === 0 && (
          <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
            <UtensilsCrossed className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-neutral-900">No restaurant tables configured yet</h4>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Add your dining room tables in Table Management to generate real, scannable guest QR codes.
            </p>
            <div className="pt-4">
              <Link href="/admin/tables">
                <Button size="sm" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                  Go to Table Management
                </Button>
              </Link>
            </div>
          </div>
        )}

        {mode === "ROOM" && !isLoadingRooms && !isErrorRooms && rooms.length === 0 && (
          <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
            <BedDouble className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-neutral-900">No hotel rooms configured yet</h4>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Add guestrooms in Room Management to generate in-room dining tent cards.
            </p>
            <div className="pt-4">
              <Link href="/admin/rooms">
                <Button size="sm" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                  Go to Room Management
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Dynamic Selector Bar for real records */}
        {selectedPreview && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Select {mode === "TABLE" ? "Dining Table" : "Guestroom"}
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900 focus:border-black focus:outline-none"
              >
                {mode === "TABLE"
                  ? tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.tableNumber} — {t.displayName || t.section} ({t.section})
                      </option>
                    ))
                  : rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} — {r.floor} ({r.roomType || "Standard"})
                      </option>
                    ))}
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Destination URL (Persisted Token Context)
              </label>
              <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-800">
                <span className="truncate flex-1">{selectedPreview.fullUrl}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-neutral-500 hover:text-black cursor-pointer"
                  title="Copy URL"
                >
                  {copied ? <Check className="h-4 w-4 text-neutral-900" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="md:col-span-3 flex items-end gap-2 pt-2 md:pt-0">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleRotateCurrentQr}
                disabled={isRotating}
                className="flex-1 font-semibold border-neutral-300"
                leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isRotating ? "animate-spin" : ""}`} />}
              >
                Rotate Token
              </Button>

              <Link href={selectedPreview.relativeUrl} target="_blank">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="font-medium"
                  leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                >
                  Preview
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 2. PRINTABLE TENT CARD DISPLAY */}
      {selectedPreview && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Printable Preview Container */}
          <div className="lg:col-span-7 bg-neutral-100 rounded-xl p-6 flex flex-col items-center justify-center print:bg-white print:p-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-3 print:hidden">
              Printable Tent Card Specification
            </div>

            {/* Actual Tent Card to Print */}
            <div
              id="printable-tent-card"
              className="w-full max-w-sm rounded-xl border border-neutral-300 bg-white p-8 text-center space-y-6 print:border print:border-black print:m-0 print:max-w-none print:w-full"
            >
              {/* Branding Header */}
              <div>
                <h2 className="text-xl font-bold text-neutral-900 tracking-wider uppercase">
                  SCULPX
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 block mt-1">
                  {selectedPreview.type === "TABLE" ? "SCAN TO ORDER" : "IN-ROOM DINING"}
                </span>
              </div>

              {/* High-Resolution Scannable QR Code */}
              <div className="mx-auto w-52 h-52 rounded-lg border border-neutral-200 bg-white p-3 flex flex-col items-center justify-center">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${selectedPreview.displayName}`}
                    className="h-44 w-44 object-contain"
                  />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-neutral-400">
                    <QrCode className="h-16 w-16" />
                  </div>
                )}
              </div>

              {/* Context Badge */}
              <div className="rounded-lg bg-black py-2.5 px-4 text-white">
                <span className="text-[10px] font-medium tracking-widest uppercase text-neutral-400 block">
                  {selectedPreview.type === "TABLE" ? "Dine-In Location" : "Suite Room"}
                </span>
                <span className="text-xl font-bold tracking-tight block mt-0.5">
                  {selectedPreview.displayName}
                </span>
              </div>

              {/* Instructional Footer */}
              <div className="text-xs text-neutral-600 space-y-1 pt-1">
                <p className="font-medium text-neutral-900">
                  {selectedPreview.type === "TABLE"
                    ? "Scan with your phone to browse our menu and order."
                    : "Scan to order from our restaurant directly to your room."}
                </p>
                <p className="text-[10px] text-neutral-400 font-mono">
                  No app download required • Instant order tracking
                </p>
              </div>
            </div>
          </div>

          {/* Action Panel for Active QR */}
          <div className="lg:col-span-5 space-y-4 print:hidden">
            <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                    {selectedPreview.type} QR ACTIVE
                  </span>
                  <span className="text-xs font-mono font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Persisted Token
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 tracking-tight mt-2">
                  {selectedPreview.displayName}
                </h3>
                <p className="text-xs text-neutral-500">{selectedPreview.subtext}</p>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs space-y-2">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Secure Token:</span>
                  <span className="font-mono text-[11px] font-semibold text-neutral-800 break-all select-all">
                    {selectedPreview.qrToken || "No token assigned"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Customer Route:</span>
                  <span className="font-mono text-[11px] text-neutral-700 break-all select-all">
                    {selectedPreview.relativeUrl}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-neutral-200 text-[11px]">
                  <span className="text-neutral-500">Error Correction:</span>
                  <span className="font-medium text-neutral-800">High (Level H)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handlePrint}
                  className="w-full font-semibold"
                  leftIcon={<Printer className="h-4 w-4" />}
                >
                  Print Tent Card
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={handleDownload}
                  className="w-full font-medium"
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Download PNG
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={handleCopy}
                  className="w-full font-medium"
                  leftIcon={copied ? <Check className="h-4 w-4 text-neutral-900" /> : <Copy className="h-4 w-4" />}
                >
                  {copied ? "Link Copied!" : "Copy Customer URL"}
                </Button>

                <Link href={selectedPreview.relativeUrl} target="_blank" className="block">
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full font-medium"
                    leftIcon={<ExternalLink className="h-4 w-4" />}
                  >
                    Open Live Customer Menu
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. REAL QR FLEET DIRECTORY TABLE */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Property QR Code Fleet Directory</h3>
            <p className="text-xs text-neutral-500">
              Persisted QR codes synchronized with Operations Tables &amp; Rooms.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search table or room..."
                className="pl-8 pr-3 py-1.5 rounded-md border border-neutral-300 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  filterType === "ALL" ? "bg-white text-black shadow-xs font-semibold" : "text-neutral-600"
                }`}
              >
                All ({fleetList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("TABLE")}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  filterType === "TABLE" ? "bg-white text-black shadow-xs font-semibold" : "text-neutral-600"
                }`}
              >
                Tables ({tables.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("ROOM")}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  filterType === "ROOM" ? "bg-white text-black shadow-xs font-semibold" : "text-neutral-600"
                }`}
              >
                Rooms ({rooms.length})
              </button>
            </div>
          </div>
        </div>

        {fleetList.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 font-medium">
            No restaurant tables or guestrooms exist in your hotel database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Type</th>
                  <th className="pb-2.5">Entity Name</th>
                  <th className="pb-2.5">Customer Route</th>
                  <th className="pb-2.5">Token Context</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {filteredFleet.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
                        {item.type === "TABLE" ? <UtensilsCrossed className="h-3 w-3" /> : <BedDouble className="h-3 w-3" />}
                        {item.type}
                      </span>
                    </td>

                    <td className="py-2.5 font-semibold text-neutral-900">
                      <div>{item.displayName}</div>
                      <span className="text-[10px] text-neutral-400 font-normal">{item.subtext}</span>
                    </td>

                    <td className="py-2.5 font-mono text-neutral-700">
                      <Link href={item.routeUrl} target="_blank" className="hover:underline">
                        {item.routeUrl}
                      </Link>
                    </td>

                    <td className="py-2.5 font-mono text-[11px] text-neutral-500 max-w-xs truncate">
                      {item.qrToken || "No token"}
                    </td>

                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === "AVAILABLE" || item.status === "VACANT"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setMode(item.type);
                            setSelectedEntityId(item.rawId);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="px-2.5 py-1 rounded border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-medium text-[11px] cursor-pointer"
                        >
                          Select &amp; Preview
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (item.type === "TABLE") {
                                await rotateTableQrMutation.mutateAsync(item.rawId);
                              } else {
                                await rotateRoomQrMutation.mutateAsync(item.rawId);
                              }
                              addToast({
                                type: "success",
                                title: "Token Rotated",
                                message: `Rotated QR token for ${item.displayName}.`,
                              });
                            } catch (err: any) {
                              alert(err?.message || "Failed to rotate token");
                            }
                          }}
                          disabled={isRotating}
                          className="px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-medium text-[11px] cursor-pointer"
                          title="Rotate QR Token"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>

                        <Link href={item.routeUrl} target="_blank">
                          <Button size="sm" variant="outline" className="text-xs px-2" title="Open Customer Menu">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
