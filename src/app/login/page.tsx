"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store";
import { DEMO_USERS, mockAuthenticate, getDefaultRouteForRole } from "@/utils/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ShieldCheck,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  BarChart3,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);

  const [email, setEmail] = React.useState("admin@demo.com");
  const [password, setPassword] = React.useState("••••••••");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // If already authenticated and user visits /login, give them a shortcut to their workspace
  const handleQuickLogin = (roleKey: string) => {
    const demo = DEMO_USERS[roleKey];
    if (!demo) return;
    setEmail(demo.user.email);
    setPassword("demo-secure-pass");
    doLogin(demo.user.email);
  };

  const doLogin = (targetEmail: string) => {
    setLoading(true);
    setError(null);

    setTimeout(() => {
      const session = mockAuthenticate(targetEmail);
      if (!session) {
        setError("Invalid email address. Please select one of the demo hospitality accounts below.");
        setLoading(false);
        return;
      }

      setSession(session);
      const destination = getDefaultRouteForRole(session.user.role);
      router.push(destination);
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your employee email address.");
      return;
    }
    doLogin(email);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Subtle Hospitality Branding */}
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-slate-900 text-amber-400 font-black text-xl mb-3 shadow-sm">
          S
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">SCULPX</h1>
        <p className="text-xs uppercase tracking-widest font-semibold text-slate-500 mt-0.5">
          Hospitality Operations Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900">Sign in to your station</h2>
            <p className="text-xs text-slate-500 mt-1">
              Access your role-specific station using your staff credentials.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Staff Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@demo.com"
                className="w-full text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password / PIN
                </label>
                <button
                  type="button"
                  onClick={() => alert("Demo Mode: Any password or PIN is accepted for verified demo staff.")}
                  className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm font-mono"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full font-bold bg-slate-900 hover:bg-slate-800 text-white mt-2"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign in to Workspace
            </Button>
          </form>

          {/* Quick Demo Stations Selector */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                1-Click Demo Profiles
              </span>
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                Mock Auth Ready
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => handleQuickLogin("waiter")}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-blue-700">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-blue-600" />
                  <span>Waiter / Staff</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  waiter@demo.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("cashier")}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                  <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Cashier Desk</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  cashier@demo.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("kitchen")}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-amber-700">
                  <ChefHat className="h-3.5 w-3.5 text-amber-600" />
                  <span>Kitchen (KDS)</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  kitchen@demo.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("manager")}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-purple-700">
                  <BarChart3 className="h-3.5 w-3.5 text-purple-600" />
                  <span>Floor Manager</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  manager@demo.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("admin")}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-slate-900">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
                  <span>Administrator</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  admin@demo.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("superadmin")}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-rose-700">
                  <KeyRound className="h-3.5 w-3.5 text-rose-600" />
                  <span>Super Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  superadmin@demo.com
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Back to Customer Experience Link */}
        <div className="text-center mt-6">
          <Link
            href="/menu/table-token-5"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
          >
            <span>Are you a guest? Open Table 05 Guest Menu</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
