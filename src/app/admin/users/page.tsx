"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/services/api";
import { DEMO_USERS, getRoleDisplayName } from "@/utils/auth";
import { Users, ShieldCheck, KeyRound, Mail, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminUsersPage() {
  const { data: apiUsersResponse } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await userApi.getUsers();
      return res.success ? res.data : [];
    },
  });

  const usersList = React.useMemo(() => {
    if (apiUsersResponse && apiUsersResponse.length > 0) {
      return apiUsersResponse.map((u) => {
        const demoCfg = Object.values(DEMO_USERS).find(
          (d) => d.user.id === u.id || d.user.email.toLowerCase() === u.email.toLowerCase(),
        );
        return {
          user: u,
          role: u.role,
          roleName: demoCfg?.roleName || getRoleDisplayName(u.role),
          defaultRoute: demoCfg?.defaultRoute || "/login",
          description: demoCfg?.description || `Access privileges for ${getRoleDisplayName(u.role)}`,
          badgeColor: demoCfg?.badgeColor || "bg-neutral-100 text-neutral-800 border-neutral-200",
        };
      });
    }
    return Object.values(DEMO_USERS);
  }, [apiUsersResponse]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-800" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Hospitality Staff &amp; Roles
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Access levels, station privileges, and employee credentials across floor operations.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="bg-slate-900 hover:bg-slate-800 font-bold"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => alert("Staff invite dispatched.")}
        >
          Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usersList.map((cfg) => (
          <div
            key={cfg.user.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{cfg.user.name}</h3>
                <span className="text-xs font-semibold text-slate-500">{cfg.roleName}</span>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}
              >
                {cfg.role}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{cfg.user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{cfg.user.phoneNumber}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Permissions Granted
              </span>
              <div className="flex flex-wrap gap-1">
                {cfg.user.permissions?.slice(0, 3).map((perm) => (
                  <span
                    key={perm}
                    className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono"
                  >
                    {perm}
                  </span>
                ))}
                {(cfg.user.permissions?.length || 0) > 3 && (
                  <span className="text-[10px] text-slate-400 px-1 font-semibold">
                    +{(cfg.user.permissions?.length || 0) - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
