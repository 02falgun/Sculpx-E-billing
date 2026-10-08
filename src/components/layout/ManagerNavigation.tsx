"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import {
  LayoutDashboard,
  FileText,
  Grid3X3,
  ChefHat,
  Receipt,
  AlertTriangle,
  BarChart3,
  LogOut,
  ShieldAlert,
} from "lucide-react";

export function ManagerNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const navLinks = [
    { href: "/manager", label: "Operations", icon: LayoutDashboard },
    { href: "/manager/orders", label: "Orders", icon: FileText },
    { href: "/manager/tables", label: "Tables", icon: Grid3X3 },
    { href: "/manager/kitchen", label: "Kitchen", icon: ChefHat },
    { href: "/manager/billing", label: "Billing", icon: Receipt },
    { href: "/manager/exceptions", label: "Exceptions", icon: AlertTriangle },
    { href: "/manager/reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-purple-900/30 bg-slate-900 text-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Floor Manager */}
        <div className="flex items-center gap-6">
          <Link href="/manager" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 font-black text-white text-sm">
              M
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold tracking-tight">SCULPX Operations</span>
              <span className="text-[10px] text-purple-300">Floor Manager Workspace</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/manager"
                  ? pathname === "/manager"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-purple-950/70 text-purple-300 border border-purple-500/30 shadow-inner"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side: User & Log out */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-white">{user?.name || "Vikram Mehta"}</span>
            <span className="text-[10px] text-purple-400 font-medium">Floor Manager</span>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-900/40 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile / Tablet scrollable nav */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-800 px-3 py-1.5 gap-2 bg-slate-950/80 scrollbar-none">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/manager"
              ? pathname === "/manager"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 shrink-0 py-1 px-2.5 rounded-lg text-xs font-bold ${
                isActive ? "bg-purple-900/60 text-purple-300 border border-purple-700/50" : "text-slate-400"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
