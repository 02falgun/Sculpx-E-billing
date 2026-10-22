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
  Building2,
  MapPin,
} from "lucide-react";
import { UserWorkspaceMenu } from "./UserWorkspaceMenu";

export interface AdminSidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function AdminSidebar({ onNavigate, isMobile = false }: AdminSidebarProps = {}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const navigationGroups = [
    {
      group: "OVERVIEW",
      links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
    },
    ...(isSuperAdmin
      ? [
          {
            group: "ORGANIZATIONS",
            links: [
              { href: "/admin/franchises", label: "Franchises", icon: Building2 },
              { href: "/admin/locations", label: "Locations", icon: MapPin },
            ],
          },
        ]
      : []),
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
      links: [{ href: "/admin/menu", label: "Menu Catalog", icon: Utensils }],
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
      links: [{ href: "/admin/qr", label: "QR Management", icon: QrCode }],
    },
    {
      group: "PEOPLE",
      links: [{ href: "/admin/users", label: "Staff & Permissions", icon: Users }],
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
      links: [{ href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 }],
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

  const content = (
    <div className="flex h-full min-h-0 flex-col gap-4 select-none">
      {/* Brand & Role Header (Shown only on desktop aside; on mobile Drawer header displays it) */}
      {!isMobile && (
        <div className="flex shrink-0 items-center gap-2.5 px-2 py-2 border-b border-neutral-100 pb-3">
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
      )}

      {/* Grouped Sidebar Items: the only scrolling region, fills the space between header and profile */}
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
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
                    onClick={() => onNavigate?.()}
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
      </nav>

      {/* User profile & Sign out */}
      <div className="shrink-0 pt-3 border-t border-neutral-200">
        <UserWorkspaceMenu theme="light" />
      </div>
    </div>
  );

  if (isMobile) {
    return <div className="h-full min-h-0">{content}</div>;
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-neutral-200 bg-white p-3.5 select-none lg:flex">
      {content}
    </aside>
  );
}
