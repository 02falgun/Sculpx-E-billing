"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { organizationApi } from "@/services/api";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Users,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Store,
  ChevronRight,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function FranchisesListPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const { data: orgsData, isLoading, error, refetch } = useQuery({
    queryKey: ["franchiseOrganizations"],
    queryFn: async () => {
      const res = await organizationApi.getOrganizations();
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load organizations");
      }
      return res.data;
    },
  });

  const organizations = orgsData || [];

  const filteredOrganizations = React.useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.code.toLowerCase().includes(search.toLowerCase()) ||
        (org.legalName && org.legalName.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" || org.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [organizations, search, statusFilter]);

  const totalFranchises = organizations.length;
  const totalLocationsAcrossFranchises = organizations.reduce(
    (acc, org) => acc + (org.totalLocations || 0),
    0
  );
  const activeLocationsAcrossFranchises = organizations.reduce(
    (acc, org) => acc + (org.activeLocations || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Franchise Organizations
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Super Admin
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage parent hospitality groups, multi-unit brands, and affiliated branch locations.
          </p>
        </div>

        <Link
          href="/admin/franchises/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Create Franchise</span>
        </Link>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Franchises
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900">{totalFranchises}</p>
          <p className="mt-1 text-xs text-slate-500">Database-backed parent organizations</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Affiliated Locations
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900">
            {totalLocationsAcrossFranchises}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {activeLocationsAcrossFranchises} active operational branches
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Platform Architecture
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-900">Independent + Multi-Tenant</p>
          <p className="mt-1 text-xs text-slate-500">Zero forced franchise bundling</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by franchise name, slug, or legal entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 shrink-0">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Spinner className="h-8 w-8 text-amber-600" />
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading franchise organizations...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-rose-900">Failed to load organizations</p>
          <p className="text-xs text-rose-700">
            {error instanceof Error ? error.message : "An unexpected network error occurred"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-xs font-semibold text-rose-800 bg-rose-100 rounded-lg hover:bg-rose-200"
          >
            Retry Request
          </button>
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <div className="py-16 p-8 rounded-2xl border border-dashed border-slate-300 bg-white text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 mx-auto">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {search || statusFilter !== "ALL"
                ? "No matching franchises found"
                : "No Franchise Organizations Yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search || statusFilter !== "ALL"
                ? "Try clearing your search filters to view all registered organizations."
                : "Only the platform Super Admin can create franchise groups and assign multi-location branches."}
            </p>
          </div>
          {search || statusFilter !== "ALL" ? (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Clear Filters
            </button>
          ) : (
            <Link
              href="/admin/franchises/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Launch Onboarding Wizard</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrganizations.map((org) => {
            const locCount = org.totalLocations || 0;
            const activeLocCount = org.activeLocations || 0;
            const suspendedLocCount = org.suspendedLocations || 0;

            return (
              <div
                key={org.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-sm">
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                          {org.name}
                        </h2>
                        <span className="text-xs font-mono text-slate-400">@{org.code}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${
                        org.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : org.status === "SUSPENDED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {org.status}
                    </span>
                  </div>

                  {org.legalName && (
                    <p className="text-xs text-slate-500 line-clamp-1 italic">
                      Legal: {org.legalName}
                    </p>
                  )}

                  {/* Operational Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Locations
                      </span>
                      <p className="text-base font-bold text-slate-900 mt-0.5">
                        {locCount}
                        <span className="text-[10px] font-medium text-slate-500 ml-1">
                          ({activeLocCount} active)
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Members
                      </span>
                      <p className="text-base font-bold text-slate-900 mt-0.5">
                        {org.members?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Branch preview */}
                  {org.locations && org.locations.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Branch Properties:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                        {org.locations.slice(0, 3).map((l) => (
                          <span
                            key={l.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-md"
                          >
                            <MapPin className="h-2.5 w-2.5 text-slate-400" />
                            {l.name}
                          </span>
                        ))}
                        {org.locations.length > 3 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-50 rounded">
                            +{org.locations.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(org.createdAt).toLocaleDateString()}
                  </span>

                  <Link
                    href={`/admin/franchises/${org.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
                  >
                    <span>Manage Franchise</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
