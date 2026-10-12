"use client";

import * as React from "react";
import { useTables, useCreateTable, useUpdateTable, useRotateTableQr, useDeactivateTable } from "@/hooks/useTables";
import { Spinner } from "@/components/ui/Spinner";
import { Grid3X3, Plus, QrCode, RefreshCw, Trash2, Edit2, Users, ExternalLink, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/types";

export default function AdminTablesPage() {
  const { data: tables = [], isLoading } = useTables();
  const createTableMutation = useCreateTable();
  const updateTableMutation = useUpdateTable();
  const rotateQrMutation = useRotateTableQr();
  const deactivateTableMutation = useDeactivateTable();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingTable, setEditingTable] = React.useState<Table | null>(null);
  const [qrModalTable, setQrModalTable] = React.useState<Table | null>(null);
  const [deactivatingTable, setDeactivatingTable] = React.useState<Table | null>(null);

  // Form states
  const [tableNumber, setTableNumber] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [capacity, setCapacity] = React.useState(4);
  const [section, setSection] = React.useState("Main Dining");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const resetForm = () => {
    setTableNumber("");
    setDisplayName("");
    setCapacity(4);
    setSection("Main Dining");
    setErrorMsg(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: Table) => {
    setEditingTable(t);
    setTableNumber(t.tableNumber);
    setDisplayName(t.displayName || `Table ${t.tableNumber}`);
    setCapacity(t.capacity || 4);
    setSection(t.section || "Main Dining");
    setErrorMsg(null);
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      setErrorMsg("Please enter a table number.");
      return;
    }
    setErrorMsg(null);
    try {
      await createTableMutation.mutateAsync({
        tableNumber: tableNumber.trim(),
        displayName: displayName.trim() || `Table ${tableNumber.trim()}`,
        capacity: Number(capacity) || 4,
        section: section.trim() || "Main Dining",
      });
      setIsAddModalOpen(false);
      resetForm();
      setSuccessMsg(`Table ${tableNumber} created successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create table");
    }
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    setErrorMsg(null);
    try {
      await updateTableMutation.mutateAsync({
        id: editingTable.id,
        data: {
          tableNumber: tableNumber.trim(),
          displayName: displayName.trim(),
          capacity: Number(capacity),
          section: section.trim(),
        },
      });
      setEditingTable(null);
      setSuccessMsg(`Table updated successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update table");
    }
  };

  const handleRotateQr = async (table: Table) => {
    try {
      const res = await rotateQrMutation.mutateAsync(table.id);
      setQrModalTable({ ...table, qrToken: res.qrToken });
      setSuccessMsg(`QR token for Table ${table.tableNumber} rotated successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to rotate QR token");
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingTable) return;
    try {
      await deactivateTableMutation.mutateAsync(deactivatingTable.id);
      setDeactivatingTable(null);
      setSuccessMsg(`Table ${deactivatingTable.tableNumber} deactivated.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to deactivate table");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-slate-800" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dining Tables Fleet
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure restaurant tables, capacities, dining sections, and QR code access tokens.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="bg-slate-900 hover:bg-slate-800 font-bold"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleOpenAdd}
        >
          Add Table
        </Button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Spinner size="lg" className="text-slate-900" />
          <p className="text-xs font-semibold text-slate-500">Loading tables fleet...</p>
        </div>
      ) : tables.length === 0 ? (
        <EmptyState
          title="No Restaurant Tables Configured Yet"
          description="Your dining floor plan is empty. Click below to add your first restaurant table and generate its customer QR code."
          actionLabel="Add First Table"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {table.section}
                    </span>
                    <h3 className="text-lg font-black text-slate-900">
                      {table.displayName || `Table ${table.tableNumber}`}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>Cap: {table.capacity} Guests</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      table.status === "OCCUPIED"
                        ? "bg-amber-100 text-amber-800"
                        : table.status === "RESERVED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {table.status}
                  </span>
                </div>

                <div className="mt-3 p-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                  <div className="truncate mr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">QR Token</span>
                    <span className="font-mono text-[11px] text-slate-600 truncate block">
                      {table.qrToken || "None"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrModalTable(table)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                    title="View QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(table)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit Table"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateQr(table)}
                    disabled={rotateQrMutation.isPending}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Rotate QR Code Token"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeactivatingTable(table)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Deactivate Table"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <a
                  href={`/menu/table/${table.tableNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold text-[11px] hover:underline"
                >
                  <span>Test Menu</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Table Dialog */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Restaurant Table"
        description="Enter the table number, capacity, and restaurant floor section."
      >
        <form onSubmit={handleCreateTable} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Table Number *</label>
              <Input
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. T-01, 12"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Capacity (Seats)</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Garden Table 1"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dining Section / Zone</label>
            <Input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. Main Dining, Terrace, VIP Lounge"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-slate-900 font-bold"
              isLoading={createTableMutation.isPending}
            >
              Create Table
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog
        isOpen={!!editingTable}
        onClose={() => setEditingTable(null)}
        title="Edit Restaurant Table"
        description="Update capacity, section, or display label."
      >
        <form onSubmit={handleUpdateTable} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Table Number</label>
              <Input
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Capacity (Seats)</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dining Section</label>
            <Input
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditingTable(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-slate-900 font-bold"
              isLoading={updateTableMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* QR Details Dialog */}
      <Dialog
        isOpen={!!qrModalTable}
        onClose={() => setQrModalTable(null)}
        title={`Table QR: ${qrModalTable?.displayName || qrModalTable?.tableNumber}`}
        description="Print or scan this QR to order from this table."
      >
        <div className="p-4 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center">
            <QrCode className="h-32 w-32 text-slate-900" />
            <span className="text-xs font-bold text-slate-800 mt-2">
              Table {qrModalTable?.tableNumber}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              {qrModalTable?.section}
            </span>
          </div>

          <div className="text-xs text-slate-500 w-full space-y-1">
            <span className="block font-bold text-slate-700">Digital Order URL:</span>
            <div className="p-2 bg-slate-100 rounded text-slate-800 font-mono text-[11px] select-all break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/menu/table/${qrModalTable?.tableNumber}?token=${qrModalTable?.qrToken}`
                : `/menu/table/${qrModalTable?.tableNumber}`}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRotateQr(qrModalTable!)}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              isLoading={rotateQrMutation.isPending}
            >
              Rotate QR Token
            </Button>
            <Button variant="primary" size="sm" onClick={() => setQrModalTable(null)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Deactivate Table Confirmation Dialog */}
      <Dialog
        isOpen={!!deactivatingTable}
        onClose={() => setDeactivatingTable(null)}
        title="Deactivate Restaurant Table"
        description="Are you sure you want to deactivate this table? It will be archived safely without affecting historical orders."
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600">
            Deactivating <strong className="text-slate-900">Table {deactivatingTable?.tableNumber}</strong> removes it from active floor service. Any existing historical invoices or reports remain intact.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeactivatingTable(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={handleDeactivate}
              isLoading={deactivateTableMutation.isPending}
            >
              Deactivate Table
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
