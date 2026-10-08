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
  FileText,
  Sliders,
  Database,
} from "lucide-react";
import { UserWorkspaceMenu } from "./UserWorkspaceMenu";

export function AdminSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

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
      group: "MENU",
      links: [
        { href: "/admin/menu", label: "Menu Catalog", icon: Utensils },
      ],
    },
    {
      group: "INVENTORY",
      links: [
        { href: "/admin/inventory", label: "Inventory Items", icon: Package },
        { href: "/admin/inventory/recipes", label: "Recipes", icon: Layers },
        { href: "/admin/inventory/transactions", label: "Transactions", icon: FileText },
      ],
    },
    {
      group: "QR",
      links: [
        { href: "/admin/qr", label: "QR Management", icon: QrCode },
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
      group: "REPORTS",
      links: [
        { href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
      ],
    },
    {
      group: "SYSTEM",
      links: [
        { href: "/admin/settings", label: "Settings", icon: Settings },
        { href: "/admin/integrations", label: "Integrations", icon: Sliders },
        { href: "/admin/audit", label: "Audit Logs", icon: Database },
      ],
    },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-neutral-200 bg-white min-h-screen p-3.5 flex flex-col justify-between select-none">
      <div className="space-y-4">
        {/* Brand & Role Header */}
        <div className="flex items-center gap-2.5 px-2 py-2 border-b border-neutral-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-black text-white font-bold text-xs">
            {isSuperAdmin ? "SA" : "S"}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-neutral-900 tracking-tight uppercase">
              SCULPX Admin
            </span>
            <span className="text-[10px] text-neutral-500">
              {isSuperAdmin ? "Super Admin" : "Administrator"}
            </span>
          </div>
        </div>

        {/* Grouped Sidebar Items */}
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 scrollbar-thin">
          {navigationGroups.map((grp) => (
            <div key={grp.group}>
              <h4 className="px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
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
                      className={`flex items-center justify-between rounded-[6px] px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-black text-white font-semibold"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{link.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User profile & Sign out */}
      <div className="pt-3 border-t border-neutral-200">
        <UserWorkspaceMenu theme="light" />
      </div>
    </aside>
  );
}
