"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import {
  LayoutDashboard,
  Utensils,
  Layers,
  BedDouble,
  Grid3X3,
  QrCode,
  Package,
  Users,
  BarChart3,
  Printer,
  Settings,
  ShieldCheck,
  KeyRound,
  FileText,
  Sliders,
  Database,
  LogOut,
  Sparkles,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const navigationGroups = [
    {
      group: "OVERVIEW",
      links: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      group: "OPERATIONS",
      links: [
        { href: "/staff/orders", label: "Orders", icon: FileText },
        { href: "/admin/tables", label: "Tables", icon: Grid3X3 },
        { href: "/admin/rooms", label: "Rooms & Suites", icon: BedDouble },
        { href: "/kitchen", label: "Kitchen (KDS)", icon: Layers },
        { href: "/cashier/bills", label: "Billing & Invoices", icon: BarChart3 },
      ],
    },
    {
      group: "CATALOGUE & QR",
      links: [
        { href: "/admin/menu", label: "Menu Catalog", icon: Utensils },
        { href: "/admin/qr", label: "QR Management", icon: QrCode, highlight: true },
      ],
    },
    {
      group: "INVENTORY",
      links: [
        { href: "/admin/inventory", label: "Stock & Recipes", icon: Package },
      ],
    },
    {
      group: "PEOPLE",
      links: [
        { href: "/admin/users", label: "Staff & Permissions", icon: Users },
      ],
    },
    {
      group: "INFRASTRUCTURE",
      links: [
        { href: "/admin/printers", label: "Printers Fleet", icon: Printer },
        { href: "/admin/print-jobs", label: "Print Queue", icon: FileText },
      ],
    },
    {
      group: "ANALYTICS & SYSTEM",
      links: [
        { href: "/admin/reports", label: "Reports & KPIs", icon: BarChart3 },
        { href: "/admin/settings", label: "Property Settings", icon: Settings },
      ],
    },
  ];

  const superAdminGroup = {
    group: "SUPER ADMIN CONTROLS",
    links: [
      { href: "/admin/integrations", label: "Integrations & APIs", icon: Sliders },
      { href: "/admin/audit", label: "System Audit Logs", icon: Database },
    ],
  };

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white min-h-screen p-4 flex flex-col justify-between select-none">
      <div className="space-y-6">
        {/* Brand & Role Header */}
        <div className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-100 pb-4">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-sm shadow-sm ${
              isSuperAdmin
                ? "bg-rose-900 text-amber-300"
                : "bg-slate-900 text-amber-400"
            }`}
          >
            {isSuperAdmin ? "SA" : "S"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-900 tracking-tight">
              SCULPX Admin
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {isSuperAdmin ? "Super Admin (Owner)" : "Hotel Administrator"}
            </span>
          </div>
        </div>

        {/* Grouped Sidebar Items */}
        <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 scrollbar-thin">
          {navigationGroups.map((grp) => (
            <div key={grp.group}>
              <h4 className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                {grp.group}
              </h4>
              <div className="space-y-0.5">
                {grp.links.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    link.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === link.href || pathname.startsWith(`${link.href}/`);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-slate-900 text-white font-bold shadow-xs"
                          : link.highlight
                          ? "text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{link.label}</span>
                      </div>
                      {link.highlight && (
                        <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-900 px-1 rounded">
                          HOT
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Super Admin Section */}
          {isSuperAdmin && (
            <div className="pt-2 border-t border-slate-100">
              <h4 className="px-3 text-[10px] font-black uppercase tracking-wider text-rose-700 mb-1 flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                <span>{superAdminGroup.group}</span>
              </h4>
              <div className="space-y-0.5">
                {superAdminGroup.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        isActive
                          ? "bg-rose-900 text-amber-300"
                          : "text-rose-900 hover:bg-rose-50"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User profile & Sign out */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 truncate">
              {user?.name || "Admin"}
            </span>
            <span className="text-[10px] text-slate-400">
              {user?.email || "admin@demo.com"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
