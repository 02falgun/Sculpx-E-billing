"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  AlertCircle,
  FileText,
  LogOut,
  IndianRupee,
} from "lucide-react";

export function CashierNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const navLinks = [
    { href: "/cashier", label: "Overview", icon: LayoutDashboard },
    { href: "/cashier/bills", label: "Bills & Invoices", icon: Receipt },
    { href: "/cashier/payments", label: "Payments", icon: CreditCard },
    { href: "/cashier/outstanding", label: "Outstanding", icon: AlertCircle },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/20 bg-slate-900 text-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Cashier Station */}
        <div className="flex items-center gap-6">
          <Link href="/cashier" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 font-black text-slate-950 text-sm">
              <IndianRupee className="h-4 w-4 stroke-[3]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold tracking-tight">SCULPX Cashier Desk</span>
              <span className="text-[10px] text-emerald-400">Billing & Settlement Terminal</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/cashier"
                  ? pathname === "/cashier"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shadow-inner"
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

        {/* Right side: Cashier profile & logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-white">{user?.name || "Pooja Verma"}</span>
            <span className="text-[10px] text-emerald-400 font-medium">Head Cashier</span>
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

      {/* Mobile sub navigation */}
      <div className="flex md:hidden border-t border-slate-800 px-3 py-1.5 justify-around bg-slate-950/80">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/cashier"
              ? pathname === "/cashier"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-bold ${
                isActive ? "text-emerald-400" : "text-slate-400"
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
