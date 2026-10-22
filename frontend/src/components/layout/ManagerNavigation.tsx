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
} from "lucide-react";
import { UserWorkspaceMenu } from "./UserWorkspaceMenu";

export function ManagerNavigation() {
  const pathname = usePathname();

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
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-black text-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Floor Manager */}
        <div className="flex items-center gap-6">
          <Link href="/manager" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white font-bold text-black text-xs">
              S
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold tracking-tight text-white uppercase">
                SCULPX Manager
              </span>
              <span className="text-[10px] text-neutral-400">Shift Operations</span>
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

        {/* Right side: User & Log out */}
        <div className="flex items-center gap-3">
          <div className="pl-2 border-l border-neutral-800">
            <UserWorkspaceMenu theme="dark" />
          </div>
        </div>
      </div>

      {/* Mobile / Tablet scrollable nav */}
      <div className="flex lg:hidden overflow-x-auto border-t border-neutral-800 px-3 py-1.5 gap-2 bg-neutral-950 scrollbar-none">
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
              className={`flex items-center gap-1.5 shrink-0 py-1 px-2.5 rounded-[6px] text-xs font-medium ${
                isActive ? "bg-neutral-900 text-white font-bold border border-neutral-700" : "text-neutral-400"
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
