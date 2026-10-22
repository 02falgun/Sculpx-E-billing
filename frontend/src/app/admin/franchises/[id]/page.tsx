"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationApi } from "@/services/api";
import { useAuthStore } from "@/store";
import {
  Building2,
  MapPin,
  Users,
  Plus,
  ArrowLeft,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Layers,
  ChevronRight,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function FranchiseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orgId = params.id as string;
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const {
    data: org,
    isLoading: isLoadingOrg,
    error: orgError,
  } = useQuery({
    queryKey: ["franchiseOrganization", orgId],
    queryFn: async () => {
      const res = await organizationApi.getOrganizationById(orgId);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load franchise details");
      }
      return res.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["franchiseStats", orgId],
    queryFn: async () => {
      const res = await organizationApi.getOrganizationStats(orgId);
      if (!res.success) return null;
      return res.data;
    },
    enabled: Boolean(orgId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: "ACTIVE" | "SUSPENDED") => {
      const res = await organizationApi.updateOrganization(orgId, { status: newStatus });
      if (!res.success) throw new Error(res.error?.message || "Failed to update status");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchiseOrganization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["franchiseOrganizations"] });
    },
  });

  if (isLoadingOrg) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <Spinner className="h-8 w-8 text-amber-600" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading franchise details...</p>
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-rose-900">Franchise Not Found</h2>
        <p className="text-xs text-rose-700">
          {orgError instanceof Error ? orgError.message : "Unable to retrieve requested franchise."}
        </p>
        <Link
          href="/admin/franchises"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-800 bg-rose-100 rounded-lg hover:bg-rose-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Franchises</span>
        </Link>
      </div>
    );
  }

  const locations = org.locations || [];
  const members = org.members || [];

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Link href="/admin/franchises" className="hover:text-slate-600 transition-colors">
            Franchises
          </Link>
          <span>/</span>
          <span className="text-amber-700 truncate">{org.name}</span>
        </div>

        <Link
          href="/admin/franchises"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Franchises</span>
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 font-black text-xl border border-amber-200/60">
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{org.name}</h1>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                    org.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {org.status}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">Code: @{org.code}</p>
              {org.legalName && (
                <p className="text-xs text-slate-500 mt-1">Legal: {org.legalName}</p>
              )}
            </div>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/admin/locations/new?organizationId=${org.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Branch Location</span>
              </Link>

              {org.status === "ACTIVE" ? (
                <button
                  type="button"
                  onClick={() => updateStatusMutation.mutate("SUSPENDED")}
                  disabled={updateStatusMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  <span>Suspend Org</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => updateStatusMutation.mutate("ACTIVE")}
                  disabled={updateStatusMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>Activate Org</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Corporate contact bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-400 block text-[10px] uppercase">Contact Email</span>
            <p className="font-medium text-slate-900 mt-0.5">{org.contactEmail || "Not specified"}</p>
          </div>
          <div>
            <span className="font-semibold text-slate-400 block text-[10px] uppercase">Contact Phone</span>
            <p className="font-medium text-slate-900 mt-0.5">{org.contactPhone || "Not specified"}</p>
          </div>
          <div>
            <span className="font-semibold text-slate-400 block text-[10px] uppercase">Registered Address</span>
            <p className="font-medium text-slate-900 mt-0.5">{org.address || "Not specified"}</p>
          </div>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Locations
            </span>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.totalLocations}</p>
            <p className="text-xs text-slate-500 mt-1">{stats.activeLocations} active operational</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Tables
            </span>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.totalTables}</p>
            <p className="text-xs text-slate-500 mt-1">Across all authorized branches</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Guest Rooms
            </span>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.totalRooms}</p>
            <p className="text-xs text-slate-500 mt-1">Accommodation suites</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Orders Processed
            </span>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.totalOrders}</p>
            <p className="text-xs text-slate-500 mt-1">Real database records</p>
          </div>
        </div>
      )}

      {/* Currency-Separated Revenue Breakdown */}
      {stats?.revenueByCurrency && Object.keys(stats.revenueByCurrency).length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Revenue Performance by Operating Currency
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(stats.revenueByCurrency).map(([curr, data]) => (
              <div key={curr} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs font-bold text-slate-500 font-mono">
                  {curr} Currency
                </span>
                <p className="text-xl font-black text-slate-900">
                  {data.symbol}
                  {data.totalRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-[11px] text-slate-500">{data.ordersCount} completed orders</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Affiliated Branch Locations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Operating hotels, restaurants, and properties belonging to this franchise.
            </p>
          </div>

          {isSuperAdmin && (
            <Link
              href={`/admin/locations/new?organizationId=${org.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Branch</span>
            </Link>
          )}
        </div>

        {locations.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-white text-center space-y-3">
            <MapPin className="h-8 w-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No Locations Associated Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create the first branch location under this franchise organization to start operations.
            </p>
            {isSuperAdmin && (
              <Link
                href={`/admin/locations/new?organizationId=${org.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Branch</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {loc.name}
                      </h3>
                      <span
                        className={`px-2 py-0.2 text-[10px] font-bold rounded-full border ${
                          loc.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {loc.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">@{loc.code}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {loc.locationType} • {loc.currency} ({loc.currencySymbol})
                      {loc.city ? ` • ${loc.city}` : ""}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/admin/locations/${loc.id}`}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  title="Configure Location"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organization Members Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Organization Governance &amp; Members</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Authorized group admins and franchise owners with delegated organization oversight.
          </p>
        </div>

        {members.length === 0 ? (
          <div className="p-6 rounded-2xl border border-slate-200 bg-white text-center text-xs text-slate-500">
            No specific members assigned at the organization level. Platform Super Admin retains global authority.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {members.map((m) => (
              <div key={m.userId} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-xs">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{m.email}</p>
                  <span className="text-[10px] font-bold text-amber-700 font-mono mt-0.5 block">
                    {m.orgRole}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
