"use client";

import * as React from "react";
import { Printer } from "@/types";
import { usePrinters, usePrintJobs, useCreatePrintJob, useRetryPrintJob } from "@/hooks/usePrinters";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useUIStore } from "@/store";
import {
  Printer as PrinterIcon,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCheck,
} from "lucide-react";

export function PrinterFleetManager() {
  const { data: printers = [], isLoading } = usePrinters();
  const { data: printJobsData } = usePrintJobs();
  const { mutateAsync: createPrintJob, isPending: isTesting } = useCreatePrintJob();
  const { mutateAsync: retryJob } = useRetryPrintJob();

  const printJobs = printJobsData?.data || [];
  const addToast = useUIStore((s) => s.addToast);

  const handleTestPrint = async (printer: Printer) => {
    try {
      await createPrintJob({
        printerId: printer.id,
        type: "KOT",
        referenceId: `diag-${Date.now()}`,
      });

      addToast({
        type: "success",
        title: "Test Print Dispatched",
        message: `Diagnostic slip queued on ${printer.name} (${printer.ipAddress || "USB/Network"})`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Printer Unreachable",
        message: `Failed to connect to ${printer.name}`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Spinner size="lg" className="text-amber-500" />
        <p className="text-xs font-semibold text-slate-500">Checking printer fleet...</p>
      </div>
    );
  }

  const hasOfflinePrinter = printers.some((p) => p.status === "OFFLINE");

  return (
    <div className="space-y-8">
      {hasOfflinePrinter && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Hardware Alert:</span> One or more thermal printers are offline or unreachable. KOT tickets will queue until connection is restored.
          </div>
        </div>
      )}

      {/* Printer Hardware Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {printers.map((printer) => {
          const isOnline = printer.status === "ONLINE";
          return (
            <div
              key={printer.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {printer.type}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">{printer.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{printer.ipAddress || "Direct USB"}</p>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    isOnline
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isOnline ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  {printer.status}
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="font-semibold text-slate-800">{printer.location}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paper Width:</span>
                  <span className="font-semibold text-slate-800">{printer.paperWidthMm}mm Roll</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold"
                isLoading={isTesting}
                onClick={() => handleTestPrint(printer)}
                leftIcon={<PrinterIcon className="h-3.5 w-3.5 text-slate-600" />}
              >
                Diagnostic Test Print
              </Button>
            </div>
          );
        })}
      </div>

      {/* Recent Print Queue Ledger */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Recent Hardware Print Queue
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 pl-4 pr-3">Job ID</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Printer</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Retries</th>
                <th className="py-3 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {printJobs.slice(0, 5).map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pl-4 pr-3 font-mono font-bold text-slate-800">
                    #{job.id}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700">{job.type}</td>
                  <td className="py-3 px-3 text-slate-500">{job.printerName}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        job.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : job.status === "FAILED"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{job.retryCount}</td>
                  <td className="py-3 pr-4 pl-3 text-right">
                    {job.status === "FAILED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryJob(job.id)}
                        className="text-xs"
                      >
                        Retry
                      </Button>
                    )}
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
