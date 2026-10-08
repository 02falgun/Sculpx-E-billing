"use client";

import * as React from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { useTables, useRooms } from "@/hooks/useTables";
import { useUIStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  Sparkles,
  Layers,
  Power,
} from "lucide-react";

interface QRItem {
  id: string;
  type: "TABLE" | "ROOM";
  identifier: string; // e.g. "T01" or "301"
  displayName: string;
  subtext: string;
  routeUrl: string;
  isActive: boolean;
}

export function QRCodeGeneratorManager() {
  const { data: tables = [] } = useTables();
  const { data: rooms = [] } = useRooms();
  const addToast = useUIStore((s) => s.addToast);

  const [mode, setMode] = React.useState<"TABLE" | "ROOM">("TABLE");
  const [selectedIdentifier, setSelectedIdentifier] = React.useState<string>("T05");
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<"ALL" | "TABLE" | "ROOM">("ALL");
  const [isBulkPrintOpen, setIsBulkPrintOpen] = React.useState(false);

  // Active status local tracking
  const [statusMap, setStatusMap] = React.useState<Record<string, boolean>>({});

  // Base URL for QR Links
  const baseUrl = React.useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://sculpx-e-billing.vercel.app";
  }, []);

  // Compute active item
  const selectedItem = React.useMemo(() => {
    if (mode === "TABLE") {
      const match = tables.find(
        (t) => `T${t.tableNumber.padStart(2, "0")}` === selectedIdentifier || t.tableNumber === selectedIdentifier
      );
      const rawNum = selectedIdentifier.replace(/^T/i, "") || "05";
      const num = rawNum.padStart(2, "0");
      return {
        type: "TABLE" as const,
        identifier: `T${num}`,
        displayName: `Table ${num}`,
        subtext: match?.section || "Main Dining Pavilion",
        relativeUrl: `/menu/table/T${num}`,
        fullUrl: `${baseUrl}/menu/table/T${num}`,
      };
    } else {
      const match = rooms.find((r) => r.roomNumber === selectedIdentifier);
      const num = selectedIdentifier.replace(/^R/i, "") || "301";
      return {
        type: "ROOM" as const,
        identifier: num,
        displayName: `Room ${num}`,
        subtext: match?.floor || `${num.charAt(0)}th Floor Suite`,
        relativeUrl: `/menu/room/${num}`,
        fullUrl: `${baseUrl}/menu/room/${num}`,
      };
    }
  }, [mode, selectedIdentifier, tables, rooms, baseUrl]);

  // Generate real scannable QR Code using qrcode library
  const generateQRCode = React.useCallback(async (url: string) => {
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
    generateQRCode(selectedItem.fullUrl);
  }, [selectedItem.fullUrl, generateQRCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedItem.fullUrl);
    setCopied(true);
    addToast({
      type: "success",
      title: "QR URL Copied",
      message: `Direct link for ${selectedItem.displayName} copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `sculpx-qr-${selectedItem.type.toLowerCase()}-${selectedItem.identifier.toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addToast({
      type: "success",
      title: "PNG Downloaded",
      message: `High-resolution QR saved for ${selectedItem.displayName}.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleActiveStatus = (key: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  // Fleet list
  const fleetList: QRItem[] = React.useMemo(() => {
    const list: QRItem[] = [];

    // Tables T01 - T08
    const tableNumbers = ["01", "02", "03", "04", "05", "06", "07", "08"];
    tableNumbers.forEach((num) => {
      list.push({
        id: `tbl-T${num}`,
        type: "TABLE",
        identifier: `T${num}`,
        displayName: `Table ${num}`,
        subtext: "Dine-In Restaurant",
        routeUrl: `/menu/table/T${num}`,
        isActive: statusMap[`tbl-T${num}`] !== false,
      });
    });

    // Rooms 301 - 305
    const roomNumbers = ["301", "302", "303", "304", "305"];
    roomNumbers.forEach((num) => {
      list.push({
        id: `room-${num}`,
        type: "ROOM",
        identifier: num,
        displayName: `Room ${num}`,
        subtext: `${num.charAt(0)}th Floor Suite`,
        routeUrl: `/menu/room/${num}`,
        isActive: statusMap[`room-${num}`] !== false,
      });
    });

    return list;
  }, [statusMap]);

  const filteredFleet = React.useMemo(() => {
    return fleetList.filter((item) => {
      if (filterType !== "ALL" && item.type !== filterType) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.displayName.toLowerCase().includes(q) ||
        item.identifier.toLowerCase().includes(q) ||
        item.routeUrl.toLowerCase().includes(q)
      );
    });
  }, [fleetList, filterType, searchQuery]);

  return (
    <div className="space-y-8 font-sans">
      {/* 1. TOP CREATION & CONFIGURATION CONTROLS */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">
              Create &amp; Preview Location QR
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Generate scannable tokens that resolve directly to the guest ordering flow.
            </p>
          </div>

          {/* Type Selector (Table vs Room) */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode("TABLE");
                setSelectedIdentifier("T05");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                mode === "TABLE"
                  ? "bg-black text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span>Table QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("ROOM");
                setSelectedIdentifier("301");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                mode === "ROOM"
                  ? "bg-black text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" />
              <span>Room QR</span>
            </button>
          </div>
        </div>

        {/* Quick Parameters Selector Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Select {mode === "TABLE" ? "Table Number" : "Guestroom Number"}
            </label>
            <select
              value={selectedIdentifier}
              onChange={(e) => setSelectedIdentifier(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900 focus:border-black focus:outline-none"
            >
              {mode === "TABLE" ? (
                <>
                  <option value="T01">Table 01 (Indoor Garden)</option>
                  <option value="T02">Table 02 (Indoor Garden)</option>
                  <option value="T03">Table 03 (Pavilion Center)</option>
                  <option value="T04">Table 04 (Pavilion Center)</option>
                  <option value="T05">Table 05 (Royal Verandah)</option>
                  <option value="T06">Table 06 (Royal Verandah)</option>
                  <option value="T07">Table 07 (Terrace View)</option>
                  <option value="T08">Table 08 (Terrace View)</option>
                </>
              ) : (
                <>
                  <option value="301">Room 301 (3rd Floor Palace Suite)</option>
                  <option value="302">Room 302 (3rd Floor Executive)</option>
                  <option value="303">Room 303 (3rd Floor Deluxe)</option>
                  <option value="304">Room 304 (3rd Floor Deluxe)</option>
                  <option value="305">Room 305 (3rd Floor Penthouse)</option>
                </>
              )}
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Destination URL (Live Route)
            </label>
            <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-800">
              <span className="truncate flex-1">{selectedItem.fullUrl}</span>
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
              variant="primary"
              size="md"
              onClick={() => generateQRCode(selectedItem.fullUrl)}
              className="flex-1 font-semibold"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Regenerate
            </Button>

            <Link href={selectedItem.relativeUrl} target="_blank">
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
      </div>
      {/* 2. PRINTABLE TENT CARD DISPLAY (Hotel Ready) */}
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
                {mode === "TABLE" ? "SCAN TO ORDER" : "IN-ROOM DINING"}
              </span>
            </div>

            {/* High-Resolution Scannable QR Code */}
            <div className="mx-auto w-52 h-52 rounded-lg border border-neutral-200 bg-white p-3 flex flex-col items-center justify-center">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${selectedItem.displayName}`}
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
                {mode === "TABLE" ? "Dine-In Location" : "Suite Room"}
              </span>
              <span className="text-xl font-bold tracking-tight block mt-0.5">
                {selectedItem.displayName}
              </span>
            </div>

            {/* Instructional Footer */}
            <div className="text-xs text-neutral-600 space-y-1 pt-1">
              <p className="font-medium text-neutral-900">
                {mode === "TABLE"
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
                  {selectedItem.type} QR ACTIVE
                </span>
                <span className="text-xs font-mono font-medium text-neutral-600">
                  Ready to scan
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 tracking-tight mt-2">
                {selectedItem.displayName}
              </h3>
              <p className="text-xs text-neutral-500">{selectedItem.subtext}</p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Destination:</span>
                <span className="font-mono font-semibold text-neutral-800">{selectedItem.relativeUrl}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Correction:</span>
                <span className="font-medium text-neutral-800">High (Level H)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Format:</span>
                <span className="font-medium text-neutral-800">PNG / Vector</span>
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

              <Link href={selectedItem.relativeUrl} target="_blank" className="block">
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

      {/* 3. QR FLEET DIRECTORY TABLE */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">QR Code Fleet Directory</h3>
            <p className="text-xs text-neutral-500">
              Active and standby QR codes deployed across dining tables and guestrooms.
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
                Tables (8)
              </button>
              <button
                type="button"
                onClick={() => setFilterType("ROOM")}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  filterType === "ROOM" ? "bg-white text-black shadow-xs font-semibold" : "text-neutral-600"
                }`}
              >
                Rooms (5)
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5">Entity Name</th>
                <th className="pb-2.5">Customer Route</th>
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
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleActiveStatus(item.id)}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer border ${
                        item.isActive
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-neutral-100 text-neutral-500 border-neutral-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${item.isActive ? "bg-white" : "bg-neutral-400"}`} />
                      <span>{item.isActive ? "Active" : "Inactive"}</span>
                    </button>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMode(item.type);
                          setSelectedIdentifier(item.identifier);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="px-2.5 py-1 rounded border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-medium text-[11px] cursor-pointer"
                      >
                        Inspect
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
      </div>
    </div>
  );
}
