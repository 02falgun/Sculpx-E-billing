"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { locationApi } from "@/services/api";
import { useLocationStore, useAuthStore } from "@/store";
import {
  MapPin,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Store,
  Hotel,
  UtensilsCrossed,
  Filter,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function LocationsListPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const { activeLocation, setActiveLocation } = useLocationStore();
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const {
    data: locationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminLocationsList"],
    queryFn: async () => {
      const res = await locationApi.getLocations();
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load locations");
      }
      return res.data;
    },
  });

  const locations = locationsData || [];

  const filteredLocations = React.useMemo(() => {
    return locations.filter((loc) => {
      const q = search.toLowerCase();
      const matchesSearch =
        loc.name.toLowerCase().includes(q) ||
        loc.code.toLowerCase().includes(q) ||
        (loc.city && loc.city.toLowerCase().includes(q)) ||
        (loc.organization?.name && loc.organization.name.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "ALL" || loc.status === statusFilter;
      const matchesType = typeFilter === "ALL" || loc.locationType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [locations, search, statusFilter, typeFilter]);

  const totalCount = locations.length;
  const activeCount = locations.filter((l) => l.status === "ACTIVE").length;
  const independentCount = locations.filter((l) => !l.organizationId).length;
  const franchiseCount = locations.filter((l) => Boolean(l.organizationId)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Location Management
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Multi-Tenant
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Operational properties, hotels, and restaurants across franchises and independent businesses.
          </p>
        </div>

        {isSuperAdmin && (
          <Link
            href="/admin/locations/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Location</span>
          </Link>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Locations
          </span>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalCount}</p>
          <p className="mt-1 text-xs text-slate-500">{activeCount} currently active</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Franchise Branches
          </span>
          <p className="mt-2 text-3xl font-black text-indigo-700">{franchiseCount}</p>
          <p className="mt-1 text-xs text-slate-500">Operating under parent brands</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Independent Properties
          </span>
          <p className="mt-2 text-3xl font-black text-emerald-700">{independentCount}</p>
          <p className="mt-1 text-xs text-slate-500">Standalone hotels &amp; bistros</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Scope
          </span>
          <p className="mt-2 text-sm font-bold text-slate-900 truncate">
            {activeLocation?.name || "Global Scope"}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            {activeLocation?.code ? `@${activeLocation.code}` : "None selected"}
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by location name, code, city, or franchise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200"
          >
            <option value="ALL">All Types</option>
            <option value="COMBINED">Combined Hotel &amp; Restro</option>
            <option value="RESTAURANT">Restaurant Only</option>
            <option value="HOTEL">Hotel Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Locations Table / Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Spinner className="h-8 w-8 text-amber-600" />
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading locations catalog...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-rose-900">Failed to load locations</p>
          <p className="text-xs text-rose-700">
            {error instanceof Error ? error.message : "Network error"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-xs font-semibold text-rose-800 bg-rose-100 rounded-lg hover:bg-rose-200"
          >
            Retry
          </button>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="py-16 p-8 rounded-2xl border border-dashed border-slate-300 bg-white text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 mx-auto">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Locations Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? "Try adjusting your search query or filters."
                : "No locations have been created yet. Platform Super Admins can add branches or onboard independent hotels."}
            </p>
          </div>
          {isSuperAdmin && (
            <Link
              href="/admin/locations/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Location</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Organization Type</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Locale &amp; Currency</th>
                  <th className="py-3 px-4">Taxes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLocations.map((loc) => {
                  const isCurrentActive = activeLocation?.id === loc.id;
                  return (
                    <tr
                      key={loc.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentActive ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                              loc.organizationId
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {loc.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{loc.name}</span>
                              {isCurrentActive && (
                                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-amber-100 text-amber-800">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">@{loc.code}</p>
                            {loc.city && (
                              <p className="text-[11px] text-slate-500">
                                {loc.city}, {loc.country}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {loc.organization ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {loc.organization.name}
                            </span>
                            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                              Franchise Branch
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-slate-700 block">Independent</span>
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                              Standalone
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          {loc.locationType === "HOTEL" ? (
                            <Hotel className="h-3.5 w-3.5 text-blue-500" />
                          ) : loc.locationType === "RESTAURANT" ? (
                            <UtensilsCrossed className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                          )}
                          <span>{loc.locationType}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <div>
                          <span className="font-bold text-slate-900">
                            {loc.currency} ({loc.currencySymbol})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{loc.timezone}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {loc.taxSettings ? (
                          <div className="space-y-0.5 text-[11px]">
                            <p>
                              GST: {loc.taxSettings.cgstRate + loc.taxSettings.sgstRate}%
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Service: {loc.taxSettings.serviceChargeRate}%
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            loc.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : loc.status === "SUSPENDED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {loc.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveLocation(loc)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            Select Scope
                          </button>
                          <Link
                            href={`/admin/locations/${loc.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            title="Manage Location"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
