"use client";

import * as React from "react";
import { Printer, PrintJob, CreatePrinterDto } from "@/types";
import {
  usePrinters,
  usePrintJobs,
  useCreatePrinter,
  useUpdatePrinter,
  usePingPrinter,
  useTestPrint,
  useRetryPrintJob,
  useReprintJob,
  useCancelPrintJob,
} from "@/hooks/usePrinters";
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
  Copy,
  Plus,
  RefreshCw,
  Power,
  Sliders,
  X,
  FileText,
  Clock,
  HelpCircle,
} from "lucide-react";

export function PrinterFleetManager() {
  const { data: printers = [], isLoading, refetch: refetchPrinters } = usePrinters();
  const { data: printJobsData, isLoading: isLoadingJobs, refetch: refetchJobs } = usePrintJobs();

  const { mutateAsync: createPrinter, isPending: isCreating } = useCreatePrinter();
  const { mutateAsync: updatePrinter, isPending: isUpdating } = useUpdatePrinter();
  const { mutateAsync: pingPrinter, isPending: isPinging } = usePingPrinter();
  const { mutateAsync: testPrint, isPending: isTesting } = useTestPrint();
  const { mutateAsync: retryJob, isPending: isRetrying } = useRetryPrintJob();
  const { mutateAsync: reprintJob, isPending: isReprinting } = useReprintJob();
  const { mutateAsync: cancelJob } = useCancelPrintJob();

  const [activeTab, setActiveTab] = React.useState<"ALL" | "QUEUED" | "FAILED" | "COMPLETED">("ALL");
  const [selectedJobForDetails, setSelectedJobForDetails] = React.useState<PrintJob | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingPrinter, setEditingPrinter] = React.useState<Printer | null>(null);

  // Form state
  const [formName, setFormName] = React.useState("");
  const [formType, setFormType] = React.useState<"KITCHEN" | "BAR" | "BILLING">("KITCHEN");
  const [formIpAddress, setFormIpAddress] = React.useState("192.168.1.200");
  const [formPort, setFormPort] = React.useState(9100);
  const [formStation, setFormStation] = React.useState("Hot Kitchen");
  const [formLocation, setFormLocation] = React.useState("Kitchen Expediter Desk");
  const [formPaperWidth, setFormPaperWidth] = React.useState<58 | 80>(80);

  const printJobs = printJobsData?.data || [];
  const addToast = useUIStore((s) => s.addToast);

  const handleOpenAdd = () => {
    setEditingPrinter(null);
    setFormName("");
    setFormType("KITCHEN");
    setFormIpAddress("192.168.1.200");
    setFormPort(9100);
    setFormStation("Hot Kitchen");
    setFormLocation("Main Kitchen Line");
    setFormPaperWidth(80);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setFormName(printer.name);
    const validTypes: Array<"KITCHEN" | "BAR" | "BILLING"> = ["KITCHEN", "BAR", "BILLING"];
    setFormType(validTypes.includes(printer.type as any) ? (printer.type as any) : "KITCHEN");
    setFormIpAddress(printer.ipAddress || "192.168.1.100");
    setFormPort(printer.port || 9100);
    setFormStation(printer.station || printer.name);
    setFormLocation(printer.location || "Station Desk");
    setFormPaperWidth((printer.paperWidthMm as 58 | 80) || 80);
    setIsAddModalOpen(true);
  };

  const handleSubmitPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPrinter) {
        await updatePrinter({
          id: editingPrinter.id,
          data: {
            name: formName,
            type: formType,
            ipAddress: formIpAddress,
            port: formPort,
            station: formStation,
            location: formLocation,
            paperWidthMm: formPaperWidth,
          },
        });
        addToast({
          type: "success",
          title: "Printer Updated",
          message: `${formName} configuration saved.`,
        });
      } else {
        await createPrinter({
          name: formName,
          type: formType,
          ipAddress: formIpAddress,
          port: formPort,
          station: formStation,
          location: formLocation,
          paperWidthMm: formPaperWidth,
          isActive: true,
          connectionType: "NETWORK_TCP",
        });
        addToast({
          type: "success",
          title: "Printer Added",
          message: `${formName} added to printer fleet.`,
        });
      }
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Action Failed",
        message: err instanceof Error ? err.message : "Failed to save printer",
      });
    }
  };

  const handleTestPrint = async (printer: Printer) => {
    try {
      await testPrint(printer.id);
      addToast({
        type: "success",
        title: "Diagnostic Print Queued",
        message: `Test slip sent to ${printer.name}.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Test Print Failed",
        message: `Could not reach ${printer.name}`,
      });
    }
  };

  const handlePing = async (printer: Printer) => {
    try {
      const res = await pingPrinter(printer.id);
      addToast({
        type: res?.isOnline ? "success" : "warning",
        title: res?.isOnline ? "Printer Online" : "Printer Offline",
        message: `${printer.name}: ${res?.isOnline ? `Responded in ${res.latencyMs || 5}ms` : "No response on TCP port"}`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Ping Error",
        message: `Failed to ping ${printer.name}`,
      });
    }
  };

  const handleToggleActive = async (printer: Printer) => {
    try {
      const newActive = !printer.isActive;
      await updatePrinter({
        id: printer.id,
        data: { isActive: newActive },
      });
      addToast({
        type: "info",
        title: newActive ? "Printer Enabled" : "Printer Disabled",
        message: `${printer.name} is now ${newActive ? "active" : "disabled"}`,
      });
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Toggle Failed",
        message: err instanceof Error ? err.message : "Could not toggle printer",
      });
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await retryJob(jobId);
      addToast({
        type: "success",
        title: "Job Re-Queued",
        message: `Print job #${jobId.slice(0, 8)} returned to queue`,
      });
      setSelectedJobForDetails(null);
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Retry Failed",
        message: err instanceof Error ? err.message : "Could not retry job",
      });
    }
  };

  const handleReprintJob = async (jobId: string) => {
    try {
      await reprintJob({ id: jobId, reason: "Supervisor requested reprint" });
      addToast({
        type: "success",
        title: "Reprint Dispatched",
        message: `Duplicate copy queued with visible watermark banner`,
      });
      setSelectedJobForDetails(null);
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Reprint Failed",
        message: err instanceof Error ? err.message : "Could not reprint ticket",
      });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelJob({ id: jobId, reason: "Cancelled by supervisor" });
      addToast({
        type: "info",
        title: "Job Cancelled",
        message: `Print job #${jobId.slice(0, 8)} removed from queue`,
      });
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Cancellation Failed",
        message: err instanceof Error ? err.message : "Could not cancel job",
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

  const hasOfflinePrinter = printers.some((p) => p.status === "OFFLINE" || p.isOnline === false);
  const failedJobsCount = printJobs.filter((j) => j.status === "FAILED" || j.status === "UNCERTAIN").length;

  const filteredJobs = printJobs.filter((j) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "QUEUED") return j.status === "QUEUED" || j.status === "PENDING" || j.status === "PRINTING";
    if (activeTab === "FAILED") return j.status === "FAILED" || j.status === "UNCERTAIN";
    if (activeTab === "COMPLETED") return j.status === "COMPLETED" || j.status === "PRINTED";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner Alert */}
      {(hasOfflinePrinter || failedJobsCount > 0) && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Hardware Alert:</span>{" "}
            {hasOfflinePrinter && "One or more thermal printers are offline or unreachable. "}
            {failedJobsCount > 0 && `${failedJobsCount} job(s) failed or require supervisor resolution in the queue.`}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs shrink-0"
            onClick={() => {
              refetchPrinters();
              refetchJobs();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      )}

      {/* Fleet Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900">Thermal Printer Fleet</h2>
          <p className="text-xs text-slate-500">
            {printers.length} registered hardware printers • Network ESC/POS &amp; Local Gateways
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchPrinters();
              refetchJobs();
            }}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Status
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Hardware Printer
          </Button>
        </div>
      </div>

      {/* Printer Hardware Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {printers.map((printer) => {
          const isOnline = printer.status === "ONLINE" || printer.isOnline === true;
          const isActive = printer.isActive !== false;

          return (
            <div
              key={printer.id}
              className={`rounded-2xl border p-5 shadow-xs space-y-4 transition-colors ${
                !isActive
                  ? "border-slate-200 bg-slate-50/70 opacity-60"
                  : isOnline
                  ? "border-slate-200 bg-white hover:border-slate-300"
                  : "border-rose-200 bg-white hover:border-rose-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {printer.type}
                    </span>
                    {printer.isDefault && (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">{printer.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {printer.ipAddress ? `${printer.ipAddress}:${printer.port || 9100}` : "Direct Gateway"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      !isActive
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : isOnline
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        !isActive ? "bg-slate-400" : isOnline ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    {!isActive ? "DISABLED" : isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Station / Purpose:</span>
                  <span className="font-semibold text-slate-800">{printer.station || printer.location || "General"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paper Width:</span>
                  <span className="font-semibold text-slate-800">{printer.paperWidthMm || 80}mm Roll</span>
                </div>
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className="font-semibold text-slate-800">{printer.connectionType || "NETWORK_TCP"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold"
                  isLoading={isTesting}
                  onClick={() => handleTestPrint(printer)}
                  leftIcon={<PrinterIcon className="h-3 w-3 text-slate-600" />}
                >
                  Test Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold"
                  isLoading={isPinging}
                  onClick={() => handlePing(printer)}
                  leftIcon={<Wifi className="h-3 w-3 text-slate-600" />}
                >
                  Ping Device
                </Button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(printer)}
                  className="text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                >
                  <Sliders className="h-3 w-3" /> Edit Config
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(printer)}
                  className={`font-semibold flex items-center gap-1 ${
                    isActive ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"
                  }`}
                >
                  <Power className="h-3 w-3" /> {isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Print Queue Section */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recent Hardware Print Queue &amp; Spooler Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Live atomic state machine for kitchen KOTs and cashier receipts
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(["ALL", "QUEUED", "FAILED", "COMPLETED"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 pl-4 pr-3">Job ID</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Reference</th>
                <th className="py-3 px-3">Printer</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Retries</th>
                <th className="py-3 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No print jobs matching current filter.
                  </td>
                </tr>
              ) : (
                filteredJobs.slice(0, 15).map((job) => {
                  const isSuccess = job.status === "COMPLETED" || job.status === "PRINTED";
                  const isFailed = job.status === "FAILED";
                  const isUncertain = job.status === "UNCERTAIN";
                  const isPending = job.status === "QUEUED" || job.status === "PENDING" || job.status === "PRINTING";

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pl-4 pr-3 font-mono font-bold text-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectedJobForDetails(job)}
                          className="hover:underline text-amber-700"
                        >
                          #{job.id.slice(0, 8)}
                        </button>
                        {job.isReprint && (
                          <span className="ml-1 bg-amber-100 text-amber-800 text-[9px] font-bold px-1 rounded">
                            REPRINT
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{job.type || job.jobType}</td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {job.referenceId || "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {job.printerName || job.printer?.name || job.printerId.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            isSuccess
                              ? "bg-emerald-50 text-emerald-700"
                              : isFailed
                              ? "bg-rose-50 text-rose-700"
                              : isUncertain
                              ? "bg-purple-50 text-purple-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{job.retryCount || 0}</td>
                      <td className="py-3 pr-4 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(isFailed || isUncertain) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryJob(job.id)}
                              className="text-xs h-7 px-2"
                              leftIcon={<RotateCcw className="h-3 w-3" />}
                            >
                              Retry
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReprintJob(job.id)}
                            className="text-xs h-7 px-2"
                            leftIcon={<Copy className="h-3 w-3" />}
                          >
                            Reprint
                          </Button>
                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelJob(job.id)}
                              className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
        </div>
      </div>

      {/* Add / Edit Printer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingPrinter ? "Edit Hardware Printer" : "Register Thermal Printer"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPrinter} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Printer Display Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Hot Kitchen Line Epson"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Printer Role / Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden bg-white"
                  >
                    <option value="KITCHEN">KITCHEN (KOT)</option>
                    <option value="BAR">BAR (Beverages)</option>
                    <option value="BILLING">BILLING (Cashier)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Paper Width</label>
                  <select
                    value={formPaperWidth}
                    onChange={(e) => setFormPaperWidth(Number(e.target.value) as 58 | 80)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden bg-white"
                  >
                    <option value={80}>80mm (Standard 3")</option>
                    <option value={58}>58mm (Compact 2")</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">LAN IP Address / Host</label>
                  <input
                    type="text"
                    required
                    value={formIpAddress}
                    onChange={(e) => setFormIpAddress(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={formPort}
                    onChange={(e) => setFormPort(Number(e.target.value))}
                    placeholder="9100"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Station Tag / Routing Purpose</label>
                <input
                  type="text"
                  value={formStation}
                  onChange={(e) => setFormStation(e.target.value)}
                  placeholder="e.g. Hot Kitchen, Tandoor, Cashier"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Physical Location</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Ground Floor Kitchen Desk"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isCreating || isUpdating}
                >
                  {editingPrinter ? "Save Changes" : "Register Printer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Details Modal / Drawer */}
      {selectedJobForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">
                  Print Job #{selectedJobForDetails.id.slice(0, 8)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobForDetails(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-slate-600">
                <div>
                  <span className="text-slate-400">Status:</span>{" "}
                  <span className="font-bold text-slate-900">{selectedJobForDetails.status}</span>
                </div>
                <div>
                  <span className="text-slate-400">Document Type:</span>{" "}
                  <span className="font-bold text-slate-900">{selectedJobForDetails.type || selectedJobForDetails.jobType}</span>
                </div>
                <div>
                  <span className="text-slate-400">Reference:</span>{" "}
                  <span className="font-mono text-slate-900">{selectedJobForDetails.referenceId || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Retries:</span>{" "}
                  <span className="font-bold text-slate-900">{selectedJobForDetails.retryCount} / {selectedJobForDetails.maxRetries}</span>
                </div>
              </div>

              {selectedJobForDetails.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Hardware Diagnostics Error:
                  </div>
                  <p className="font-mono text-[11px] break-all">{selectedJobForDetails.errorMessage}</p>
                </div>
              )}

              {selectedJobForDetails.payload && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payload Snapshot Summary</label>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto">
                    {JSON.stringify(selectedJobForDetails.payload, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                {(selectedJobForDetails.status === "FAILED" || selectedJobForDetails.status === "UNCERTAIN") && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleRetryJob(selectedJobForDetails.id)}
                    isLoading={isRetrying}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  >
                    Retry Job
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReprintJob(selectedJobForDetails.id)}
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
