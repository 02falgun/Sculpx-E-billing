"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { DEMO_USERS, getRoleDisplayName } from "@/utils/auth";
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  UserCheck,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  BarChart3,
  ShieldCheck,
  KeyRound,
  QrCode,
  LogOut,
} from "lucide-react";

export function DemoRoleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const switchRole = useAuthStore((s) => s.switchRole);
  const logout = useAuthStore((s) => s.logout);

  const [isOpen, setIsOpen] = React.useState(false);

  // If on customer routes, indicate that the current view is Customer / Guest
  const isCustomerRoute =
    pathname.startsWith("/menu") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/bill");

  const currentRoleLabel = isCustomerRoute
    ? "Guest Customer"
    : user
    ? getRoleDisplayName(user.role)
    : "Not Signed In";

  const handleSwitchToRole = (roleKey: string, targetRoute: string) => {
    switchRole(roleKey);
    setIsOpen(false);
    router.push(targetRoute);
  };

  const handleSwitchToCustomer = () => {
    setIsOpen(false);
    router.push("/menu/table/T05");
  };

  return (
    <aside
      aria-label="Development Role Switcher"
      className="fixed bottom-4 right-4 z-50 print:hidden font-sans"
    >
      <div className="bg-slate-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden transition-all duration-200">
        {/* Header Bar */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-slate-900 select-none text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
              DEV PREVIEW
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[11px] text-slate-400">Viewing as:</span>
            <span className="font-bold text-white text-xs">{currentRoleLabel}</span>
          </div>

          <button
            type="button"
            className="text-slate-400 hover:text-white ml-1 p-0.5"
            aria-label="Toggle switcher"
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {/* Expandable Switcher Body */}
        {isOpen && (
          <div className="p-3 border-t border-slate-800 space-y-2 w-72">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Switch Hospitality Workspace
            </div>

            <div className="grid grid-cols-1 gap-1 text-xs">
              {/* Customer View */}
              <button
                type="button"
                onClick={handleSwitchToCustomer}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-all text-left cursor-pointer ${
                  isCustomerRoute
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  <span>Customer (Table 05 QR)</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">/menu/...</span>
              </button>

              {/* Waiter View */}
              <button
                type="button"
                onClick={() => handleSwitchToRole("waiter", "/staff")}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-all text-left cursor-pointer ${
                  user?.role === "WAITER" && !isCustomerRoute
                    ? "bg-blue-600 text-white font-bold"
                    : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4" />
                  <span>Waiter / Staff POS</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">/staff</span>
              </button>

              {/* Cashier View */}
              <button
                type="button"
                onClick={() => handleSwitchToRole("cashier", "/cashier")}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-all text-left cursor-pointer ${
                  user?.role === "CASHIER" && !isCustomerRoute
                    ? "bg-emerald-600 text-white font-bold"
                    : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <span>Cashier Desk</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">/cashier</span>
              </button>

              {/* Kitchen View */}
              <button
                type="button"
                onClick={() => handleSwitchToRole("kitchen", "/kitchen")}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-all text-left cursor-pointer ${
                  user?.role === "KITCHEN_STAFF" && !isCustomerRoute
                    ? "bg-amber-600 text-white font-bold"
                    : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  <span>Kitchen Display (KDS)</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">/kitchen</span>
              </button>

              {/* Manager View */}
              <button
                type="button"
                onClick={() => handleSwitchToRole("manager", "/manager")}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-all text-left cursor-pointer ${
                  user?.role === "MANAGER" && !isCustomerRoute
                    ? "bg-purple-600 text-white font-bold"
                    : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Floor Manager</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">/manager</span>
              </button>

              {/* Admin View */}
              <button
                type="button"
                onClick={() => handleSwitchToRole("admin", "/admin")}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-all text-left cursor-pointer ${
                  user?.role === "ADMIN" && !isCustomerRoute
                    ? "bg-slate-800 text-amber-400 font-bold border border-amber-500/30"
                    : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Administrator</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">/admin</span>
              </button>

              {/* Super Admin View */}
              <button
                type="button"
                onClick={() => handleSwitchToRole("superadmin", "/admin")}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-all text-left cursor-pointer ${
                  user?.role === "SUPER_ADMIN" && !isCustomerRoute
                    ? "bg-rose-700 text-amber-300 font-bold"
                    : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  <span>Super Admin</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">/admin+</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-3 w-3" />
                <span>Sign Out</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-amber-400 hover:underline"
              >
                Go to /login
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
