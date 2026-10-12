"use client";

import * as React from "react";
import Link from "next/link";
import {
  QrCode,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  Package,
  Layers,
  ArrowRight,
  BedDouble,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const productPillars = [
    {
      step: "01",
      title: "QR ORDERING",
      tagline: "Guests order from their table or room.",
      desc: "Fast, contactless guest ordering with category filtering, portion modifiers, chef instructions, and instant digital tax invoices. No logins required.",
      link: "/admin/tables",
      linkLabel: "Fleet & QR Setup",
      icon: QrCode,
    },
    {
      step: "02",
      title: "KITCHEN",
      tagline: "KOTs stay organized from order to preparation.",
      desc: "High-contrast kitchen display system with cooking timers, station routing, and ticket progression. Clear visibility for line cooks and expediters.",
      link: "/kitchen",
      linkLabel: "Open Kitchen (KDS)",
      icon: ChefHat,
    },
    {
      step: "03",
      title: "BILLING",
      tagline: "Payments and bills stay connected.",
      desc: "Instant GST invoices, split billing, payment settlement via UPI and cards, and direct printing with audit trails.",
      link: "/cashier",
      linkLabel: "Open Cashier Desk",
      icon: Receipt,
    },
    {
      step: "04",
      title: "INVENTORY",
      tagline: "Know what's available before accepting orders.",
      desc: "Raw ingredient tracking, low stock alerts, recipe-linked depletion formulas, and automated 86 item availability toggles.",
      link: "/admin/inventory",
      linkLabel: "View Inventory",
      icon: Package,
    },
    {
      step: "05",
      title: "OPERATIONS",
      tagline: "Manage tables, rooms and daily activity.",
      desc: "Floor occupancy maps, room service coordination, staff dispatching, and live shift exceptions in real-time.",
      link: "/manager",
      linkLabel: "Launch Operations",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      {/* Masthead */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-black text-white font-bold text-xs">
              S
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold tracking-tight text-neutral-900 uppercase">
                SCULPX
              </span>
              <span className="text-[10px] text-neutral-500">Hospitality Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="hidden sm:inline-flex text-xs font-medium text-neutral-600 hover:text-black transition-colors"
            >
              Admin Dashboard
            </Link>
            <Link href="/login">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Staff Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-12 sm:py-20 space-y-20">
        {/* Minimal Hero */}
        <section className="max-w-3xl space-y-6 text-left">
          <div className="inline-flex items-center gap-2 rounded-[4px] border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-800">
            <span>SCULPX E-Billing &middot; Grand Palace Hotel</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 leading-[1.1]">
            Restaurant operations, connected in one simple system.
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 font-medium tracking-wide">
            QR Ordering &middot; Kitchen &middot; Billing &middot; Inventory &middot; Operations
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <a href="#workspaces">
              <Button variant="secondary" size="lg">
                Explore Platform
              </Button>
            </a>
            <Link href="/login">
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Staff Login
              </Button>
            </Link>
          </div>
        </section>

        {/* Product Pillars: Whitespace & Separators */}
        <section className="space-y-6 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Core Capabilities
            </span>
          </div>

          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {productPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.step}
                  className="py-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-start hover:bg-neutral-50/50 transition-colors p-3 -mx-3 rounded-[6px]"
                >
                  <div className="md:col-span-1 font-mono text-xs text-neutral-400">
                    {pillar.step}
                  </div>
                  <div className="md:col-span-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-neutral-900" />
                      <h3 className="text-sm font-bold text-neutral-900 uppercase">
                        {pillar.title}
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 font-medium">
                      {pillar.tagline}
                    </p>
                  </div>
                  <div className="md:col-span-5 text-xs text-neutral-600 leading-relaxed">
                    {pillar.desc}
                  </div>
                  <div className="md:col-span-2 flex justify-start md:justify-end">
                    <Link href={pillar.link}>
                      <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-3 w-3" />}>
                        {pillar.linkLabel}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Simulator Launchpad */}
        <section id="workspaces" className="space-y-6 pt-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-neutral-900 uppercase">
                Workspaces &amp; Customer Portals
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Role-based stations designed for operational simplicity.
              </p>
            </div>
            <Link href="/login" className="text-xs font-semibold text-neutral-900 hover:underline">
              Sign In to Any Station &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Customer Table */}
            <div className="rounded-[8px] border border-neutral-200 bg-white p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-[10px] font-mono uppercase">Guest Dine-in</span>
                  <UtensilsCrossed className="h-4 w-4 text-neutral-800" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Table 05 QR</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Browse restaurant dishes, customize modifiers, send order.
                </p>
              </div>
              <Link href="/menu/table/T05">
                <Button variant="secondary" size="sm" className="w-full">
                  Open Guest Menu
                </Button>
              </Link>
            </div>

            {/* Customer Room */}
            <div className="rounded-[8px] border border-neutral-200 bg-white p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-[10px] font-mono uppercase">In-Room Dining</span>
                  <BedDouble className="h-4 w-4 text-neutral-800" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Room 301 QR</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Deluxe suite in-room ordering with folio settlement.
                </p>
              </div>
              <Link href="/menu/room/301">
                <Button variant="secondary" size="sm" className="w-full">
                  Open Room Menu
                </Button>
              </Link>
            </div>

            {/* Floor Staff */}
            <div className="rounded-[8px] border border-neutral-200 bg-white p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-[10px] font-mono uppercase">Waitstaff</span>
                  <UtensilsCrossed className="h-4 w-4 text-neutral-800" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Waiter Workspace</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Tables overview, fast mobile POS, fire orders to kitchen.
                </p>
              </div>
              <Link href="/staff">
                <Button variant="secondary" size="sm" className="w-full">
                  Launch /staff
                </Button>
              </Link>
            </div>

            {/* Kitchen */}
            <div className="rounded-[8px] border border-neutral-200 bg-white p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-[10px] font-mono uppercase">Kitchen Cookline</span>
                  <ChefHat className="h-4 w-4 text-neutral-800" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Kitchen Display</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Live KOT tickets, preparation timers, one-tap ready alerts.
                </p>
              </div>
              <Link href="/kitchen">
                <Button variant="secondary" size="sm" className="w-full">
                  Launch /kitchen
                </Button>
              </Link>
            </div>

            {/* Cashier */}
            <div className="rounded-[8px] border border-neutral-200 bg-white p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-[10px] font-mono uppercase">Financial Desk</span>
                  <Receipt className="h-4 w-4 text-neutral-800" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Cashier Settlement</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  GST tax bills, UPI / Card payments, split checks, receipts.
                </p>
              </div>
              <Link href="/cashier">
                <Button variant="secondary" size="sm" className="w-full">
                  Launch /cashier
                </Button>
              </Link>
            </div>

            {/* Manager */}
            <div className="rounded-[8px] border border-neutral-200 bg-white p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-[10px] font-mono uppercase">Shift Governance</span>
                  <ShieldCheck className="h-4 w-4 text-neutral-800" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Floor Operations</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Shift velocity, live table occupancy, operational exceptions.
                </p>
              </div>
              <Link href="/manager">
                <Button variant="secondary" size="sm" className="w-full">
                  Launch /manager
                </Button>
              </Link>
            </div>

            {/* Admin */}
            <div className="rounded-[8px] border border-neutral-200 bg-white p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-[10px] font-mono uppercase">System Central</span>
                  <Layers className="h-4 w-4 text-neutral-800" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Admin Control</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Menu catalog, QR studio, printers fleet, inventory ledger.
                </p>
              </div>
              <Link href="/admin">
                <Button variant="secondary" size="sm" className="w-full">
                  Launch /admin
                </Button>
              </Link>
            </div>

            {/* Direct Login */}
            <div className="rounded-[8px] border border-neutral-900 bg-black text-white p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-[10px] font-mono uppercase">Single Auth</span>
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
                <h4 className="text-sm font-bold text-white">Universal Sign In</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  All internal roles enter via /login and route automatically.
                </p>
              </div>
              <Link href="/login">
                <Button variant="secondary" size="sm" className="w-full">
                  Go to /login
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Monochrome Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8 text-neutral-500 text-xs">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-neutral-900 uppercase">
            <span>SCULPX Hospitality</span>
            <span className="text-neutral-400 font-normal">&middot; Less UI. More clarity.</span>
          </div>

          <div className="flex items-center gap-4 text-neutral-500">
            <Link href="/login" className="hover:text-black transition-colors">
              Staff Sign In
            </Link>
            <span>&middot;</span>
            <Link href="/admin/inventory" className="hover:text-black transition-colors">
              Inventory Ledger
            </Link>
            <span>&middot;</span>
            <Link href="/admin/qr" className="hover:text-black transition-colors">
              QR Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
