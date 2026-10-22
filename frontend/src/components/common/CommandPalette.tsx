"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import {
  Search,
  UtensilsCrossed,
  Grid3X3,
  FileText,
  Receipt,
  ChefHat,
  ShieldCheck,
  QrCode,
  Printer,
  BedDouble,
  ArrowRight,
  Command,
} from "lucide-react";

interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  category: "Operations" | "Customer Scenarios" | "Admin & Hardware";
  icon: React.ElementType;
  badge?: string;
}

const PALETTE_ACTIONS: ActionItem[] = [
  {
    id: "pos",
    title: "Create Staff Order / Open POS",
    subtitle: "Quick food order punch and table tab builder",
    href: "/pos",
    category: "Operations",
    icon: UtensilsCrossed,
  },
  {
    id: "tables",
    title: "Floor Tables & Seating Map",
    subtitle: "Real-time table occupancies and floor captain tools",
    href: "/tables",
    category: "Operations",
    icon: Grid3X3,
  },
  {
    id: "orders",
    title: "Active Orders Queue",
    subtitle: "Live kitchen tickets and dining table orders",
    href: "/orders",
    category: "Operations",
    icon: FileText,
  },
  {
    id: "billing",
    title: "Central Billing & Cashier Desk",
    subtitle: "Open guest tabs, GST tax invoices, and settlements",
    href: "/billing",
    category: "Operations",
    icon: Receipt,
  },
  {
    id: "kds",
    title: "Kitchen Display System (KDS)",
    subtitle: "Line cook prep board and food expedite pass",
    href: "/kitchen",
    category: "Operations",
    icon: ChefHat,
  },
  {
    id: "table-5",
    title: "Table 5 Dining QR (Guest Flow)",
    subtitle: "Simulate restaurant dine-in guest scan and order",
    href: "/menu/table-token-5",
    category: "Customer Scenarios",
    icon: UtensilsCrossed,
    badge: "Table QR",
  },
  {
    id: "room-301",
    title: "Room 301 In-Room Service QR",
    subtitle: "Simulate hotel room guest ordering and room folio charge",
    href: "/menu/room-token-301",
    category: "Customer Scenarios",
    icon: BedDouble,
    badge: "Room QR",
  },
  {
    id: "admin-menu",
    title: "Menu Catalogue & 86 Item Toggles",
    subtitle: "Adjust prices, portions, and mark sold-out items",
    href: "/admin/menu",
    category: "Admin & Hardware",
    icon: UtensilsCrossed,
  },
  {
    id: "admin-printers",
    title: "Thermal Printer Fleet & Print Queue",
    subtitle: "Diagnostic test slips and hardware queue retries",
    href: "/admin/printers",
    category: "Admin & Hardware",
    icon: Printer,
  },
  {
    id: "admin-qr",
    title: "QR Code & Tent Card Generator",
    subtitle: "Generate and print high-resolution table QR tent cards",
    href: "/admin/qr",
    category: "Admin & Hardware",
    icon: QrCode,
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return PALETTE_ACTIONS;
    return PALETTE_ACTIONS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Visual trigger chip for staff navbar */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        title="Open Command Palette (⌘K / Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[11px] font-medium text-slate-300">Quick Command</span>
        <kbd className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 border border-slate-700">
          ⌘K
        </kbd>
      </button>

      {/* Palette Modal */}
      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} maxWidth="md">
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative flex items-center border-b border-slate-100 pb-3">
            <Search className="h-4 w-4 text-slate-400 absolute left-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type an action, station, table or route..."
              className="w-full pl-7 pr-4 py-1 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <kbd className="hidden sm:inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 border border-slate-200">
              ESC
            </kbd>
          </div>

          {/* Action List */}
          <div className="max-h-[50vh] overflow-y-auto space-y-1 pr-1">
            {filtered.length > 0 ? (
              filtered.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleSelect(action.href)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100/80 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                            {action.title}
                          </span>
                          {action.badge && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                              {action.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{action.subtitle}</p>
                      </div>
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No commands matching &quot;{query}&quot;.
              </div>
            )}
          </div>

          {/* Footer Hint */}
          <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Hospitality Command Hub</span>
            <span>Use ⌘K anytime on staff screens</span>
          </div>
        </div>
      </Dialog>
    </>
  );
}
