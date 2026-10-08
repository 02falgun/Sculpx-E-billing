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
  Sparkles,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const customerEntryPoints = [
    {
      title: "Table 05 Dining QR",
      context: "Table 05 • Heritage Dining Pavilion",
      desc: "Simulate a restaurant guest scanning a table QR code. Browse categorized digital menus, customize portion modifiers, send live orders to the kitchen, and view digital GST tax invoices.",
      href: "/menu/table/T05",
      type: "DINE-IN TABLE",
      icon: UtensilsCrossed,
      color: "bg-amber-600 text-white",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200/80",
      features: ["Contactless Ordering", "Instant KOT Fire", "Digital E-Bill"],
    },
    {
      title: "Room 301 In-Room Dining QR",
      context: "Room 301 • Deluxe Palace Suite",
      desc: "Simulate an in-room dining guest ordering from bed or desk. Select culinary specialties with specific chef instructions, charge food directly to the room folio, and receive order status updates.",
      href: "/menu/room/301",
      type: "IN-ROOM SERVICE",
      icon: BedDouble,
      color: "bg-slate-900 text-amber-400",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-200/80",
      features: ["Room Folio Charge", "Delivery Notes", "Live Order Tracking"],
    },
  ];

  const operationalPortals = [
    {
      title: "Waiter / Floor Staff",
      role: "Waitstaff & Captains",
      desc: "Table occupancy overview, quick table-side order entry, fire KOT tickets, and immediate service attention requests.",
      href: "/staff",
      icon: UtensilsCrossed,
      badge: "Floor Velocity",
      highlight: "Speed + tables + POS",
    },
    {
      title: "Cashier Settlement Desk",
      role: "Cashiers & Front Desk",
      desc: "Instant GST invoice settlement, UPI QR/Card processing, bill splitting, courtesy discounts, and thermal receipts.",
      href: "/cashier",
      icon: Receipt,
      badge: "Financial Desk",
      highlight: "Today's collections & billing",
    },
    {
      title: "Kitchen Display System (KDS)",
      role: "Expediters & Chefs",
      desc: "High-contrast multi-column KOT board with real-time cooking timers, overdue urgency alerts, and one-tap prep progression.",
      href: "/kitchen",
      icon: ChefHat,
      badge: "Kitchen Line",
      highlight: "Touch-friendly cook line display",
      targetBlank: true,
    },
    {
      title: "Floor Manager Operations",
      role: "Restaurant Managers",
      desc: "Real-time floor velocity, hardware alerts (printer offline), delayed order bottlenecks, and shift exceptions.",
      href: "/manager",
      icon: ShieldCheck,
      badge: "Shift Governance",
      highlight: "Operational exceptions & status",
    },
    {
      title: "Hotel Admin & QR Studio",
      role: "Management & Owners",
      desc: "Full menu catalog manager, real scannable QR generator with tent card exporter, thermal printer fleet, and audit logs.",
      href: "/admin",
      icon: QrCode,
      badge: "System Administration",
      highlight: "QR engine & hardware fleet",
    },
  ];

  const architecturePillars = [
    {
      title: "Layered Clean Architecture",
      desc: "Strict separation between UI components, TanStack Query hooks, data services, and REST/mock layer.",
      tag: "Maintainability",
    },
    {
      title: "Polymorphic QR Engine",
      desc: "Single unified token contract adapting dynamically between Restaurant Tables and Hotel Guestrooms.",
      tag: "Zero Redundancy",
    },
    {
      title: "State Stratification",
      desc: "Server caching with TanStack Query combined with resilient client-side Zustand cart and POS drafts.",
      tag: "Zero Drift",
    },
    {
      title: "Centralized Live WebSockets",
      desc: "Single shared socket instance per tab with automatic exponential backoff and instant broadcast updates.",
      tag: "Real-time Sync",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Luxury Masthead */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-serif font-black text-amber-400 text-lg shadow-xs">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-slate-900">
                  Restro E-Billing
                </span>
                <span className="hidden sm:inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/80">
                  Enterprise Suite
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                The Grand Royal Palace & Resort
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200/80">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Live Operational System</span>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <span>Staff Login</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-8 sm:py-12 space-y-12">
        {/* Hero Welcome Banner */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="max-w-2xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200/80">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Hospitality Technology Suite</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Contactless QR Dining, Kitchen Expedite &amp; Digital E-Billing
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed pt-1">
              Welcome to the unified operations portal for The Grand Royal Palace &amp; Resort. Select an active guest dining scenario or launch a staff terminal below.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> QR Code Ordering
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Live Kitchen KDS
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Instant GST E-Invoice
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Thermal Printer Fleet
              </span>
            </div>
          </div>
        </section>

        {/* Section 1: Customer Scenarios */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Guest Digital Dining Scenarios
                </h2>
                <p className="text-xs text-slate-500">
                  Simulate contactless ordering from the guest&apos;s mobile device
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {customerEntryPoints.map((entry) => {
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-amber-400 hover:shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${entry.color} shadow-xs group-hover:scale-105 transition-transform`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${entry.badgeColor} mb-1`}
                          >
                            {entry.type}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                            {entry.title}
                          </h3>
                        </div>
                      </div>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-500">
                      {entry.context}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {entry.desc}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {entry.features.map((feat) => (
                        <span
                          key={feat}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
                    <span>Launch Guest Order Experience</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section 2: Operational Portals */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Hospitality Operations &amp; Management Stations
                </h2>
                <p className="text-xs text-slate-500">
                  Operational touchpoints designed for waitstaff, kitchen expeditors, and hotel managers
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {operationalPortals.map((portal) => {
              const Icon = portal.icon;
              return (
                <Link
                  key={portal.href}
                  href={portal.href}
                  target={portal.targetBlank ? "_blank" : undefined}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 group-hover:bg-slate-900 group-hover:text-amber-400 transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200/60">
                        {portal.role}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors flex items-center justify-between">
                        <span>{portal.title}</span>
                        {portal.targetBlank && (
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {portal.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                    <span className="text-[11px] text-slate-400">{portal.highlight}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                      Open <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section 3: Architecture & Enterprise Standards */}
        <section className="space-y-4">
          <div className="border-b border-slate-200/80 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Architecture &amp; Enterprise Reliability Standards
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {architecturePillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {pillar.title}
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                    {pillar.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Refined Luxury Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              The Grand Royal Palace &amp; Resort
            </span>
            <span>•</span>
            <span>Restro E-Billing &amp; QR Dining Platform</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/dashboard"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              POS Floor
            </Link>
            <Link
              href="/kitchen"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              KDS Display
            </Link>
            <Link
              href="/admin"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Admin Back-Office
            </Link>
            <Link
              href="/docs"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
