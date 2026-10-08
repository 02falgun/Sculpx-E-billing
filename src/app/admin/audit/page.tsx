"use client";

import * as React from "react";
import { Database, ShieldCheck, KeyRound, AlertCircle, FileText } from "lucide-react";

export default function AdminAuditPage() {
  const auditLogs = [
    { id: "AUD-8921", actor: "Rajesh Sharma (Admin)", action: "MENU_ITEM_PRICE_UPDATE", target: "Butter Chicken: ₹420 -> ₹440", ip: "192.168.1.45", timestamp: "12 min ago" },
    { id: "AUD-8920", actor: "Vikram Mehta (Manager)", action: "VOID_TICKET_OVERRIDE", target: "Order #ORD-1019 (Table 02)", ip: "192.168.1.18", timestamp: "45 min ago" },
    { id: "AUD-8919", actor: "Pooja Verma (Cashier)", action: "DISCOUNT_COURTESY_APPLIED", target: "Bill #BILL-1040 (10% flat)", ip: "192.168.1.12", timestamp: "1 hour ago" },
    { id: "AUD-8918", actor: "Kavya Kumar (Super Admin)", action: "QR_TOKEN_REGENERATED", target: "Table 05 (New high-res QR)", ip: "192.168.1.1", timestamp: "2 hours ago" },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-rose-700" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Super Admin Audit Trail
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographically chained audit trail tracking all manager overrides, price changes, voids, and hardware reconfigurations.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="pb-3">Audit ID</th>
              <th className="pb-3">Operator</th>
              <th className="pb-3">Action Event</th>
              <th className="pb-3">Target Entity</th>
              <th className="pb-3">IP Address</th>
              <th className="pb-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="py-3 font-mono font-bold text-slate-900">{log.id}</td>
                <td className="py-3 font-semibold text-slate-900">{log.actor}</td>
                <td className="py-3">
                  <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 text-slate-600">{log.target}</td>
                <td className="py-3 font-mono text-[11px] text-slate-400">{log.ip}</td>
                <td className="py-3 text-right text-slate-400">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
