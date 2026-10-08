"use client";

import * as React from "react";
import { usePrinters } from "@/hooks/usePrinters";
import { useUIStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Printer, RefreshCw, CheckCircle2, Clock, AlertTriangle, FileText } from "lucide-react";

export default function AdminPrintJobsPage() {
  const addToast = useUIStore((s) => s.addToast);

  const printJobs = [
    { id: "PJ-1092", document: "KOT Ticket #1042 (Table 05)", printer: "Kitchen Line Thermal", source: "CUSTOMER_QR", time: "02 min ago", status: "PRINTED" },
    { id: "PJ-1091", document: "Guest Tax Invoice #1041 (Table 02)", printer: "Reception Desk Epson", source: "CASHIER", time: "07 min ago", status: "PRINTED" },
    { id: "PJ-1090", document: "KOT Bar Ticket #1040 (Table 08)", printer: "Bar Beverage Printer", source: "WAITER_POS", time: "14 min ago", status: "PRINTED" },
    { id: "PJ-1089", document: "Settlement Receipt #1039 (Room 301)", printer: "Reception Desk Epson", source: "ROOM_SERVICE", time: "22 min ago", status: "FAILED" },
    { id: "PJ-1088", document: "KOT Ticket #1038 (Table 03)", printer: "Kitchen Line Thermal", source: "WAITER_POS", time: "30 min ago", status: "PRINTED" },
  ];

  const handleReprint = (id: string, printer: string) => {
    addToast({
      type: "info",
      title: "Reprint Dispatched",
      message: `Job ${id} re-spooled to ${printer}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-800" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Thermal Print Jobs &amp; Queue
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Hardware spooler logs for Kitchen KOT tickets, reception tax receipts, and bar beverage slips.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="pb-3">Job ID</th>
              <th className="pb-3">Document</th>
              <th className="pb-3">Destination Printer</th>
              <th className="pb-3">Source</th>
              <th className="pb-3">Timestamp</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {printJobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50">
                <td className="py-3 font-mono font-bold text-slate-900">{job.id}</td>
                <td className="py-3 font-semibold text-slate-900">{job.document}</td>
                <td className="py-3 text-slate-600 flex items-center gap-1.5 mt-3">
                  <Printer className="h-3.5 w-3.5 text-slate-400" />
                  <span>{job.printer}</span>
                </td>
                <td className="py-3 font-mono text-[10px] text-slate-500">{job.source}</td>
                <td className="py-3 text-slate-400">{job.time}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      job.status === "PRINTED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {job.status === "PRINTED" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {job.status}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleReprint(job.id, job.printer)}
                  >
                    Reprint
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
