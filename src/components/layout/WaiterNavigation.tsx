"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import {
  LayoutDashboard,
  Grid3X3,
  FileText,
  UtensilsCrossed,
  LogOut,
  Bell,
  Sparkles,
} from "lucide-react";

export function WaiterNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const navLinks = [
    { href: "/staff", label: "Overview", icon: LayoutDashboard },
    { href: "/staff/tables", label: "Floor Tables", icon: Grid3X3 },
    { href: "/staff/orders", label: "Active Orders", icon: FileText },
    { href: "/staff/pos", label: "POS / New Order", icon: UtensilsCrossed },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900 text-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Floor Name */}
        <div className="flex items-center gap-6">
          <Link href="/staff" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950 text-sm">
              W
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold tracking-tight">SCULPX Floor Staff</span>
              <span className="text-[10px] text-slate-400">Waitstaff & Table Service</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/staff"
                  ? pathname === "/staff"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-slate-800 text-amber-400 shadow-inner"
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

        {/* Right side: User & Quick POS trigger */}
        <div className="flex items-center gap-3">
          <Link href="/staff/pos" className="hidden sm:block">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 text-xs shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span>Take Order</span>
            </button>
          </Link>

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-white">{user?.name || "Rahul (Waiter)"}</span>
            <span className="text-[10px] text-amber-400 font-medium">Floor Staff</span>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            title="Sign out to Login"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-900/40 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Secondary Sub-nav */}
      <div className="flex md:hidden border-t border-slate-800 px-3 py-1.5 justify-around bg-slate-950/80">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/staff"
              ? pathname === "/staff"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-bold ${
                isActive ? "text-amber-400" : "text-slate-400"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
