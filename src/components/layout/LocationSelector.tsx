"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocationStore, useAuthStore } from "@/store";
import { Building2, ChevronDown, Check, Plus, Search, MapPin, Store } from "lucide-react";
import Link from "next/link";

export function LocationSelector() {
  const queryClient = useQueryClient();
  const { locations, activeLocation, fetchLocations, setActiveLocation } = useLocationStore();
  const user = useAuthStore((s) => s.user);

  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Click outside listener
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLocation = (loc: typeof activeLocation) => {
    setActiveLocation(loc);
    setIsOpen(false);
    // Invalidate all active queries to refresh data in tables, rooms, orders, menu, etc.
    queryClient.invalidateQueries();
  };

  const filteredLocations = React.useMemo(() => {
    if (!search.trim()) return locations;
    const q = search.toLowerCase();
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.organization?.name && l.organization.name.toLowerCase().includes(q))
    );
  }, [locations, search]);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left shadow-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
        title="Switch Operational Location"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[180px]">
              {activeLocation?.name || "Select Location"}
            </span>
            {activeLocation?.status === "SUSPENDED" && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-50 text-rose-600 rounded">
                Suspended
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 truncate">
            {activeLocation?.organization?.name ? (
              <span className="text-amber-700 font-medium">{activeLocation.organization.name}</span>
            ) : (
              "Independent Property"
            )}
            {activeLocation?.city ? ` • ${activeLocation.city}` : ""}
          </p>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search locations or franchises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1 space-y-1">
            {filteredLocations.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching locations found
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isSelected = activeLocation?.id === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSelectLocation(loc)}
                    className={`w-full flex items-start justify-between p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? "bg-amber-50/80 border border-amber-200/60"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                          loc.organizationId
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {loc.organizationId ? <Store className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {loc.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">({loc.code})</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {loc.organization?.name || "Independent"} • {loc.currency} ({loc.currencySymbol})
                          {loc.city ? ` • ${loc.city}` : ""}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 text-amber-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {isSuperAdmin && (
            <div className="pt-2 border-t border-slate-100 p-1 flex items-center justify-between gap-2">
              <Link
                href="/admin/locations/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Location</span>
              </Link>
              <Link
                href="/admin/franchises/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Store className="h-3.5 w-3.5" />
                <span>New Franchise</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
