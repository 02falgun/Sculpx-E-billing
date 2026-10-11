"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store";
import { mockAuthenticate, getDefaultRouteForRole } from "@/utils/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle, ArrowRight } from "lucide-react";

import { authApi } from "@/services/api";
import { ENV } from "@/config";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = React.useState("admin@ebilling.com");
  const [password, setPassword] = React.useState("demo-secure-pass");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const doLogin = async (targetEmail: string, targetPass?: string) => {
    setLoading(true);
    setError(null);

    const effectivePass =
      targetPass && targetPass !== "••••••••"
        ? targetPass
        : "demo-secure-pass";

    if (!ENV.USE_MOCK_API) {
      try {
        const res = await authApi.login({
          email: targetEmail.trim(),
          pinOrPassword: effectivePass,
        });

        if (!res.success || !res.data) {
          setError(
            res.error?.message ||
              "Invalid credentials. Use a registered pilot staff account (e.g. admin@ebilling.com, manager@ebilling.com, cashier@ebilling.com, waiter@ebilling.com)."
          );
          setLoading(false);
          return;
        }

        setSession(res.data);
        const destination = redirectPath || getDefaultRouteForRole(res.data.user.role);
        router.replace(destination);
        return;
      } catch (err: any) {
        setError(err?.message || "Authentication failed. Could not reach backend server.");
        setLoading(false);
        return;
      }
    }

    // Mock API fallback when explicitly configured for mock-only testing
    setTimeout(() => {
      const session = mockAuthenticate(targetEmail);
      if (!session) {
        setError(
          "Unrecognized staff account. Use a registered hospitality email (e.g. admin@demo.com, waiter@demo.com, kitchen@demo.com, cashier@demo.com)."
        );
        setLoading(false);
        return;
      }

      setSession(session);
      const destination = redirectPath || getDefaultRouteForRole(session.user.role);
      router.replace(destination);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your staff email.");
      return;
    }
    doLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col lg:flex-row">
      {/* LEFT COLUMN: Clean Minimalist Sign In Form (~50%) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20">
        {/* Brand */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-black text-white font-bold text-xs">
              S
            </div>
            <span className="text-sm font-bold tracking-tight uppercase text-black">
              SCULPX
            </span>
          </Link>
        </div>

        {/* Center Content: Sign In Form */}
        <div className="my-10 max-w-sm w-full mx-auto lg:mx-0">
          <div className="space-y-1 mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Sign in to your workspace
            </h1>
            <p className="text-xs text-neutral-500">
              Enter your staff credentials to access your station.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-[6px] border border-neutral-300 bg-neutral-100 text-neutral-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-black mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="staff-email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@demo.com"
              className="w-full"
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="staff-password"
                  className="block text-xs font-semibold text-neutral-700 tracking-wide"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert("Demo System: Any password is accepted for mock accounts.")
                  }
                  className="text-[11px] text-neutral-500 hover:text-black transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="staff-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full font-mono"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2 font-semibold"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Discreet Demo Note for verification without role buttons */}
          <div className="mt-8 pt-6 border-t border-neutral-200 text-left">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1.5">
              Authorized Demo Accounts
            </span>
            <p className="text-[11px] text-neutral-500 leading-relaxed font-mono">
              waiter@demo.com · cashier@demo.com · kitchen@demo.com · manager@demo.com · admin@demo.com
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
          <span>&copy; {new Date().getFullYear()} SCULPX Hospitality</span>
          <Link
            href="/menu/table/T01"
            className="text-xs text-neutral-600 hover:text-black transition-colors"
          >
            Guest Table Menu &rarr;
          </Link>
        </div>
      </div>

      {/* RIGHT COLUMN: Premium Restaurant Visual (~50%) */}
      <div className="w-full lg:w-1/2 relative bg-neutral-950 min-h-[380px] lg:min-h-screen overflow-hidden flex items-end p-8 sm:p-12 lg:p-16">
        <Image
          src="/images/dining.jpg"
          alt="SCULPX Fine Dining Interior"
          fill
          priority
          className="object-cover opacity-60 mix-blend-luminosity filter grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="relative z-10 max-w-md text-white space-y-3">
          <div className="inline-flex items-center gap-2 rounded-[4px] border border-white/20 bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
            SCULPX Grand Hotel
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Restaurant operations, simplified.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 tracking-wide font-medium">
            Orders &middot; Kitchen &middot; Billing &middot; Inventory
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-white text-neutral-900 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-black text-white font-bold text-xs">
              S
            </div>
            <div className="h-2 w-20 bg-neutral-200 rounded" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
