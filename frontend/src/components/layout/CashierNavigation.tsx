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
  IndianRupee,
} from "lucide-react";
import { UserWorkspaceMenu } from "./UserWorkspaceMenu";

export function CashierNavigation() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/cashier", label: "Overview", icon: LayoutDashboard },
    { href: "/cashier/bills", label: "Bills & Invoices", icon: Receipt },
    { href: "/cashier/payments", label: "Payments", icon: CreditCard },
    { href: "/cashier/outstanding", label: "Outstanding", icon: AlertCircle },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-black text-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Cashier Station */}
        <div className="flex items-center gap-6">
          <Link href="/cashier" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white font-bold text-black text-xs">
              S
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold tracking-tight text-white uppercase">
                SCULPX Cashier
              </span>
              <span className="text-[10px] text-neutral-400">Billing &amp; Settlement</span>
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
                  className={`flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-neutral-900 text-white font-semibold border border-neutral-700"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side: Cashier profile & logout */}
        <div className="flex items-center gap-3">
          <div className="pl-2 border-l border-neutral-800">
            <UserWorkspaceMenu theme="dark" />
          </div>
        </div>
      </div>

      {/* Mobile sub navigation */}
      <div className="flex md:hidden border-t border-neutral-800 px-3 py-1.5 justify-around bg-neutral-950">
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
              className={`flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-medium ${
                isActive ? "text-white font-bold" : "text-neutral-400"
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
