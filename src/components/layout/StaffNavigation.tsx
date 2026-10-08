"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/Badge";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  Receipt,
  FileText,
  LogOut,
  ChefHat,
  ShieldCheck,
} from "lucide-react";

export function StaffNavigation() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const navLinks = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/pos", label: "Point of Sale", icon: UtensilsCrossed },
    { href: "/tables", label: "Floor Tables", icon: Grid3X3 },
    { href: "/orders", label: "Active Orders", icon: FileText },
    { href: "/billing", label: "Billing Desk", icon: Receipt },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900 text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Floor Name */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 font-bold text-slate-950">
              R
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-bold tracking-tight">Restro POS & Floor</span>
              <span className="text-[10px] text-slate-400">Grand Palace Hotel</span>
            </div>
          </Link>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
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

        {/* Right side: Quick Links & Profile */}
        <div className="flex items-center gap-3">
          <Link
            href="/kitchen"
            target="_blank"
            className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ChefHat className="h-3.5 w-3.5 text-amber-400" />
            <span>Open KDS</span>
          </Link>

          <Link
            href="/admin"
            className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span>Admin</span>
          </Link>

          {user && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-white">{user.name}</span>
                <Badge variant="accent" size="sm" className="h-4 py-0 text-[9px] max-w-fit self-end">
                  {user.role}
                </Badge>
              </div>
              <button
                type="button"
                onClick={clearSession}
                title="Logout"
                aria-label="Logout"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
