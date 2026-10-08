"use client";

import * as React from "react";
import { Settings, Building2, Receipt, Percent, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-800" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Property &amp; Operational Settings
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Hospitality branding, GSTIN taxation parameters, service charges, and station defaults.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-600" />
          <span>Property Legal Identity</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hotel / Restaurant Name</label>
            <Input defaultValue="The Grand Royal Palace & Resort" readOnly className="text-xs font-medium" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
            <Input defaultValue="27AABCT3518Q1Z5" readOnly className="text-xs font-mono font-bold" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Percent className="h-4 w-4 text-slate-600" />
          <span>Taxation &amp; Surcharges</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">CGST Rate (%)</label>
            <Input defaultValue="2.5%" readOnly className="text-xs font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">SGST Rate (%)</label>
            <Input defaultValue="2.5%" readOnly className="text-xs font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Service Charge (%)</label>
            <Input defaultValue="5.0% (Discretionary)" readOnly className="text-xs font-mono" />
          </div>
        </div>
      </div>
    </div>
  );
}
