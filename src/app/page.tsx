import Link from "next/link";
import {
  QrCode,
  UtensilsCrossed,
  ChefHat,
  ShieldCheck,
  BedDouble,
  Receipt,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const customerEntryPoints = [
    {
      title: "Table 5 Dining QR",
      desc: "Simulate scanning physical QR on restaurant dining table 5",
      href: "/menu/table-token-5",
      type: "TABLE",
      icon: UtensilsCrossed,
      color: "bg-amber-500",
    },
    {
      title: "Room 301 In-Room QR",
      desc: "Simulate scanning in-room service QR in hotel guestroom 301",
      href: "/menu/room-token-301",
      type: "ROOM",
      icon: BedDouble,
      color: "bg-blue-600",
    },
  ];

  const operationalPortals = [
    {
      title: "Staff Point of Sale (POS)",
      desc: "Floor map, table management, walk-in orders & billing desk",
      href: "/dashboard",
      icon: UtensilsCrossed,
      role: "Captains & Cashiers",
    },
    {
      title: "Kitchen Display System (KDS)",
      desc: "High-contrast touch screen for line cooks & expedite pass",
      href: "/kitchen",
      icon: ChefHat,
      role: "Chefs & Kitchen Staff",
    },
    {
      title: "Admin Back-Office",
      desc: "Menu catalog, inventory, printers, users & analytics",
      href: "/admin",
      icon: ShieldCheck,
      role: "Hotel Management",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-6 sm:p-12">
      <div className="mx-auto max-w-5xl w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 font-black text-xl text-slate-950 shadow-lg shadow-amber-500/20">
              R
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Restro E-Billing & QR Platform
              </h1>
              <p className="text-xs text-slate-400">
                The Grand Royal Palace & Resort — Phase 1 Foundation Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">
              Service Layer Active (Mock / REST Ready)
            </span>
          </div>
        </div>

        {/* Section 1: Customer Scenarios */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Customer QR Scenarios (Unified Ordering Flow)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerEntryPoints.map((entry) => {
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="group relative rounded-2xl border border-slate-800 bg-slate-800/50 p-6 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:shadow-xl hover:shadow-amber-500/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${entry.color} shadow-md`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="inline-block rounded-md bg-slate-700/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                          {entry.type} QR Context
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                          {entry.title}
                        </h3>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="mt-3 text-xs text-slate-400 leading-relaxed">{entry.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section 2: Operations & Staff */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Operations & Back-Office Portals
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {operationalPortals.map((portal) => {
              const Icon = portal.icon;
              return (
                <Link
                  key={portal.href}
                  href={portal.href}
                  className="group rounded-2xl border border-slate-800 bg-slate-800/40 p-5 transition-all hover:border-slate-700 hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700/80 text-amber-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                      {portal.role}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{portal.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Architecture Badges */}
        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Core Architecture Principles
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="font-semibold text-amber-400">Layered Separation</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Component ➔ Hook ➔ Service ➔ API</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="font-semibold text-amber-400">Polymorphic QR</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Unified Table & Room Context</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="font-semibold text-amber-400">State Stratification</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Query (Server) + Zustand (Drafts)</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <span className="font-semibold text-amber-400">Centralized Sockets</span>
              <p className="text-[11px] text-slate-400 mt-0.5">1 Tab = 1 Connection + Backoff</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="mx-auto max-w-5xl w-full pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <span>© 2026 Restro E-Billing Platform. Enterprise Edition.</span>
        <div className="flex gap-4">
          <Link href="/docs" className="hover:text-slate-400 transition-colors">
            Documentation
          </Link>
          <Link href="/login" className="hover:text-slate-400 transition-colors">
            Staff Login
          </Link>
        </div>
      </footer>
    </main>
  );
}
