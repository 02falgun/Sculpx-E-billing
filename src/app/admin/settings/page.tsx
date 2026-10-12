"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "@/services/api";
import { Settings, Building2, Percent, Check, AlertCircle, Save, Globe, UtensilsCrossed, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["currentTenant"],
    queryFn: async () => {
      const res = await tenantApi.getCurrentTenant();
      if (!res.success) throw new Error(res.error?.message || "Failed to load hotel profile");
      return res.data;
    },
  });

  const [name, setName] = React.useState("");
  const [currency, setCurrency] = React.useState("INR");
  const [currencySymbol, setCurrencySymbol] = React.useState("₹");
  const [timezone, setTimezone] = React.useState("Asia/Kolkata");
  const [gstin, setGstin] = React.useState("");
  const [cgstRate, setCgstRate] = React.useState(2.5);
  const [sgstRate, setSgstRate] = React.useState(2.5);
  const [serviceChargeRate, setServiceChargeRate] = React.useState(0);
  const [hasAccommodation, setHasAccommodation] = React.useState(true);
  const [hasRestaurant, setHasRestaurant] = React.useState(true);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Sync state once query resolves
  React.useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setCurrency(tenant.currency || "INR");
      setCurrencySymbol(tenant.currencySymbol || "₹");
      setTimezone(tenant.timezone || "Asia/Kolkata");
      setGstin(tenant.gstin || "");
      setCgstRate(tenant.cgstRate ?? 2.5);
      setSgstRate(tenant.sgstRate ?? 2.5);
      setServiceChargeRate(tenant.serviceChargeRate ?? 0);
      setHasAccommodation(tenant.hasAccommodation ?? true);
      setHasRestaurant(tenant.hasRestaurant ?? true);
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await tenantApi.updateCurrentTenant({
        name: name.trim(),
        currency: currency.trim(),
        currencySymbol: currencySymbol.trim(),
        timezone: timezone.trim(),
        gstin: gstin.trim() || null,
        cgstRate: Number(cgstRate),
        sgstRate: Number(sgstRate),
        serviceChargeRate: Number(serviceChargeRate),
        hasAccommodation,
        hasRestaurant,
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to save settings");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentTenant"] });
      setSuccessMsg("Hotel configuration and tax rules updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to update configuration");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" className="text-slate-900" />
        <p className="text-xs font-semibold text-slate-500">Loading hotel configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-800" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Property &amp; Operational Settings
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure your hotel and restaurant legal details, taxation rules, currency, and active modules.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          className="bg-slate-900 hover:bg-slate-800 font-bold"
          leftIcon={<Save className="h-4 w-4" />}
          isLoading={updateMutation.isPending}
          onClick={handleSubmit}
        >
          Save Changes
        </Button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Legal Identity Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-600" />
            <span>Property Legal Identity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hotel / Restaurant Name *
              </label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sculpx Grand Hotel & Restaurant"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GSTIN / Tax Identification
              </label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 27AABCS1429B1Z"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Currency & Localization Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Globe className="h-4 w-4 text-slate-600" />
            <span>Localization &amp; Currency</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency Code</label>
              <Input
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="e.g. INR, USD, EUR"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency Symbol</label>
              <Input
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="e.g. ₹, $, €"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Operational Timezone</label>
              <Input
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Kolkata, UTC"
              />
            </div>
          </div>
        </div>

        {/* Taxation & Service Charges */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Percent className="h-4 w-4 text-slate-600" />
            <span>Taxation &amp; Surcharges</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">CGST Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={50}
                value={cgstRate}
                onChange={(e) => setCgstRate(Number(e.target.value))}
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SGST Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={50}
                value={sgstRate}
                onChange={(e) => setSgstRate(Number(e.target.value))}
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Discretionary Service Charge (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={50}
                value={serviceChargeRate}
                onChange={(e) => setServiceChargeRate(Number(e.target.value))}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Feature Entitlements */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900">Active Hospitality Modules</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={hasRestaurant}
                onChange={(e) => setHasRestaurant(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-slate-700" /> Restaurant &amp; Dining Tables
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enables floor tables, dining sections, table QR ordering, and restaurant POS billing.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAccommodation}
                onChange={(e) => setHasAccommodation(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-slate-700" /> Hotel Accommodation &amp; Guestrooms
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enables guestroom inventory, in-room dining menus, and room-folio billing integration.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            variant="primary"
            className="bg-slate-900 hover:bg-slate-800 font-bold"
            isLoading={updateMutation.isPending}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
