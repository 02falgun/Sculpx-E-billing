"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ArrowLeft,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();

  const sections = [
    {
      title: "Administration",
      links: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/menu", label: "Menu Catalogue", icon: Utensils },
        { href: "/admin/printers", label: "Printers Fleet", icon: Printer },
        { href: "/admin/qr", label: "QR Code Generator", icon: QrCode },
      ],
    },
    {
      title: "Operations",
      links: [
        { href: "/dashboard", label: "Staff Dashboard", icon: LayoutDashboard },
        { href: "/pos", label: "POS Terminal", icon: Utensils },
        { href: "/kitchen", label: "Kitchen Display (KDS)", icon: Layers },
        { href: "/tables", label: "Floor Tables", icon: Grid3X3 },
        { href: "/billing", label: "Billing Desk", icon: BarChart3 },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white min-h-screen p-4 flex flex-col justify-between">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 py-2 mb-6 border-b border-slate-100 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-amber-400 font-black text-sm">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 tracking-tight">Admin Console</span>
            <span className="text-[10px] text-slate-400">Grand Palace Hotel</span>
          </div>
        </div>

        {/* Links list */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {section.title}
              </h4>
              <div className="space-y-0.5">
                {section.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-amber-50 text-amber-700 font-bold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Return to POS */}
      <div className="pt-4 border-t border-slate-100">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to POS Floor</span>
        </Link>
      </div>
    </aside>
  );
}
