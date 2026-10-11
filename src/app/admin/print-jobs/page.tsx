"use client";

import * as React from "react";
import { usePrintJobs, useRetryPrintJob, useReprintJob, useCancelPrintJob } from "@/hooks/usePrinters";
import { useUIStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { PrintJob } from "@/types";
import {
  Printer,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  RotateCcw,
  Copy,
  X,
  HelpCircle,
} from "lucide-react";

export default function AdminPrintJobsPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedJob, setSelectedJob] = React.useState<PrintJob | null>(null);

  const { data: printJobsData, isLoading, refetch } = usePrintJobs({
    status: statusFilter,
  });

  const { mutateAsync: retryJob, isPending: isRetrying } = useRetryPrintJob();
  const { mutateAsync: reprintJob, isPending: isReprinting } = useReprintJob();
  const { mutateAsync: cancelJob } = useCancelPrintJob();

  const addToast = useUIStore((s) => s.addToast);
  const printJobs = printJobsData?.data || [];

  const handleRetry = async (jobId: string) => {
    try {
      await retryJob(jobId);
      addToast({
        type: "success",
        title: "Print Job Retried",
        message: `Job #${jobId.slice(0, 8)} re-queued for execution.`,
      });
      setSelectedJob(null);
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Retry Failed",
        message: err instanceof Error ? err.message : "Failed to retry job",
      });
    }
  };

  const handleReprint = async (jobId: string) => {
    try {
      await reprintJob({ id: jobId, reason: "Admin Print Queue reprint" });
      addToast({
        type: "success",
        title: "Reprint Dispatched",
        message: `Duplicate copy queued with watermark header.`,
      });
      setSelectedJob(null);
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Reprint Failed",
        message: err instanceof Error ? err.message : "Failed to reprint job",
      });
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      await cancelJob({ id: jobId, reason: "Cancelled from Print Jobs monitor" });
      addToast({
        type: "info",
        title: "Job Cancelled",
        message: `Job #${jobId.slice(0, 8)} cancelled.`,
      });
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Cancellation Failed",
        message: err instanceof Error ? err.message : "Failed to cancel job",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
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

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            {["all", "QUEUED", "PRINTING", "COMPLETED", "FAILED", "UNCERTAIN"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] transition-all ${
                  statusFilter === s ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <Button size="sm" variant="outline" onClick={() => refetch()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Spinner size="md" className="text-amber-500" />
            <p className="text-xs text-slate-400 font-medium">Loading hardware print queue...</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Job ID</th>
                <th className="pb-3">Document Type</th>
                <th className="pb-3">Reference</th>
                <th className="pb-3">Destination Printer</th>
                <th className="pb-3">Initiated By</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {printJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No print jobs found in queue.
                  </td>
                </tr>
              ) : (
                printJobs.map((job) => {
                  const isCompleted = job.status === "COMPLETED" || job.status === "PRINTED";
                  const isFailed = job.status === "FAILED";
                  const isUncertain = job.status === "UNCERTAIN";
                  const isQueued = job.status === "QUEUED" || job.status === "PENDING" || job.status === "PRINTING";

                  return (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => setSelectedJob(job)}
                          className="hover:underline text-amber-700 font-mono"
                        >
                          #{job.id.slice(0, 8)}
                        </button>
                        {job.isReprint && (
                          <span className="ml-1 bg-amber-100 text-amber-800 text-[9px] font-bold px-1 rounded">
                            REPRINT
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-semibold text-slate-900">{job.type || job.jobType}</td>
                      <td className="py-3 font-mono text-slate-500 text-[11px]">{job.referenceId || "—"}</td>
                      <td className="py-3 text-slate-600 flex items-center gap-1.5 mt-2">
                        <Printer className="h-3.5 w-3.5 text-slate-400" />
                        <span>{job.printerName || job.printer?.name || job.printerId.slice(0, 8)}</span>
                      </td>
                      <td className="py-3 text-[11px] text-slate-500">{job.initiatedBy || "SYSTEM"}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isFailed
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : isUncertain
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(isFailed || isUncertain) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              onClick={() => handleRetry(job.id)}
                            >
                              Retry
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={() => handleReprint(job.id)}
                          >
                            Reprint
                          </Button>
                          {isQueued && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleCancel(job.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">
                  Print Job #{selectedJob.id.slice(0, 8)}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-slate-600">
                <div>
                  <span className="text-slate-400">Status:</span>{" "}
                  <span className="font-bold text-slate-900">{selectedJob.status}</span>
                </div>
                <div>
                  <span className="text-slate-400">Type:</span>{" "}
                  <span className="font-bold text-slate-900">{selectedJob.type || selectedJob.jobType}</span>
                </div>
                <div>
                  <span className="text-slate-400">Reference:</span>{" "}
                  <span className="font-mono text-slate-900">{selectedJob.referenceId || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Retries:</span>{" "}
                  <span className="font-bold text-slate-900">{selectedJob.retryCount} / {selectedJob.maxRetries}</span>
                </div>
              </div>

              {selectedJob.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Hardware Diagnostic Error:
                  </div>
                  <p className="font-mono text-[11px] break-all">{selectedJob.errorMessage}</p>
                </div>
              )}

              {selectedJob.payload && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payload Snapshot</label>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto">
                    {JSON.stringify(selectedJob.payload, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                {(selectedJob.status === "FAILED" || selectedJob.status === "UNCERTAIN") && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleRetry(selectedJob.id)}
                    isLoading={isRetrying}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  >
                    Retry Job
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReprint(selectedJob.id)}
                  isLoading={isReprinting}
                  leftIcon={<Copy className="h-3.5 w-3.5" />}
                >
                  Issue Reprint Copy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
