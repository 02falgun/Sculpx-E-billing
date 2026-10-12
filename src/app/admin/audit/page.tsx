"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/services/api";
import { Database, ShieldCheck, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function AdminAuditPage() {
  const { data: auditData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const res = await auditApi.getAuditLogs({ limit: 50 });
      if (!res.success) throw new Error(res.error?.message || "Failed to load audit logs");
      return res.data;
    },
  });

  const logs = auditData?.logs || [];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-rose-700" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Security &amp; Operations Audit Trail
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Persisted audit trail tracking all administrative actions, staff permissions, room/table mutations, and security events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />}
        >
          Refresh Trail
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Spinner size="lg" className="text-slate-900" />
          <p className="text-xs font-semibold text-slate-500">Loading audit trail...</p>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Audit Records Yet"
          description="Security and operational audit events will appear here as staff perform administrative and configuration actions."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Actor / Role</th>
                <th className="pb-3">Action Event</th>
                <th className="pb-3">Resource</th>
                <th className="pb-3">Details</th>
                <th className="pb-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className="font-semibold text-slate-900 block">{log.actorEmail || "System"}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {log.actorRole || "N/A"}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 font-medium text-slate-700">
                    {log.resource} {log.resourceId ? `(${log.resourceId})` : ""}
                  </td>
                  <td className="py-3 text-slate-500 text-[11px] max-w-xs truncate font-mono">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px] text-slate-400">
                    {log.ipAddress || "127.0.0.1"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
