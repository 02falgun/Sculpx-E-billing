'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Building2,
  ArrowLeft,
  ShieldCheck,
  DollarSign,
  Layers,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { organizationApi, locationApi } from '@/services/api/factory';
import { Organization } from '@/types/organization';

const AVAILABLE_MODULES = [
  { id: 'table_ordering', label: 'Dine-In QR Ordering', description: 'Table ordering with digital QR menus' },
  { id: 'room_ordering', label: 'Room Service QR', description: 'In-room guest ordering for hotels' },
  { id: 'pos_billing', label: 'POS & Fast Billing', description: 'Counter billing, payments, and splits' },
  { id: 'kitchen_kds', label: 'Kitchen KDS', description: 'Real-time kitchen order tickets & station routing' },
  { id: 'inventory', label: 'Inventory & Recipes', description: 'Stock tracking, reorders, and ingredient mapping' },
  { id: 'reports', label: 'Analytics & Financials', description: 'Revenue insights, shift summaries, and exports' },
];

export default function NewLocationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedOrgId = searchParams?.get('organizationId') || '';

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [organizationId, setOrganizationId] = useState<string>(preselectedOrgId);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [locationType, setLocationType] = useState<'RESTAURANT' | 'HOTEL' | 'COMBINED'>('COMBINED');
  
  // Address & Regional
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // Tax & Legal
  const [gstin, setGstin] = useState('');

  // Modules
  const [enabledModules, setEnabledModules] = useState<string[]>([
    'table_ordering',
    'pos_billing',
    'kitchen_kds',
    'reports'
  ]);

  // Initial Admin
  const [provisionAdmin, setProvisionAdmin] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    async function fetchOrgs() {
      try {
        setLoadingOrgs(true);
        const res = await organizationApi.getOrganizations({ status: 'ACTIVE' });
        if (res.success && Array.isArray(res.data)) {
          setOrganizations(res.data);
        }
        if (preselectedOrgId && !organizationId) {
          setOrganizationId(preselectedOrgId);
        }
      } catch (err: any) {
        console.error('Failed to load organizations', err);
      } finally {
        setLoadingOrgs(false);
      }
    }
    fetchOrgs();
  }, [preselectedOrgId]);

  // Auto-generate code from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!code || code === name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30);
      setCode(slug);
    }
  };

  const toggleModule = (modId: string) => {
    setEnabledModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Location name is required');
      return;
    }

    if (!code.trim()) {
      setError('Unique location code is required');
      return;
    }

    if (provisionAdmin && (!adminName.trim() || !adminEmail.trim())) {
      setError('Initial Administrator name and email are required when provisioning an admin');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        organizationId: organizationId ? organizationId : undefined,
        name: name.trim(),
        code: code.trim().toLowerCase(),
        locationType,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        country: country.trim(),
        timezone,
        currency,
        currencySymbol,
        gstin: gstin.trim() || undefined,
        enabledModules,
      };

      if (provisionAdmin) {
        payload.initialAdmin = {
          name: adminName.trim(),
          email: adminEmail.trim(),
          phone: adminPhone.trim() || undefined,
          password: adminPassword.trim() || undefined,
        };
      }

      const res = await locationApi.createLocation(payload);
      if (res.success && res.data?.location?.id) {
        router.push(`/admin/locations/${res.data.location.id}?created=true`);
      } else {
        throw new Error(res.error?.message || 'Failed to create location');
      }
    } catch (err: any) {
      console.error('Failed to create location:', err);
      setError(err?.message || 'Failed to create location. Verify unique code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/locations"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-400" />
                Add Operational Location
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Deploy an independent business branch or expand an existing franchise organization.
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-mono">
            SUPER_ADMIN ONLY
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Creation Error</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: Ownership & Hierarchy */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Organization & Hierarchy</h2>
                <p className="text-xs text-slate-400">
                  Assign this branch to a parent franchise or operate as an independent property.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  Parent Organization
                  <span className="text-slate-500 font-normal normal-case">(Optional)</span>
                </label>
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  disabled={loadingOrgs}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Independent Business (No Franchise Parent)</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.code}) — {org.type}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Independent properties do not report to franchise group owners.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Location Type <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['RESTAURANT', 'HOTEL', 'COMBINED'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLocationType(type)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition text-center ${
                        locationType === type
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {type === 'COMBINED' ? 'Hotel + Dine' : type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Identity & Location Details */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Location Identity & Address</h2>
                <p className="text-xs text-slate-400">
                  Property branding and geographic location details.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Location Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sculpx Grand Hotel & Diner"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Unique Code / Slug <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sculpx-grand-diner"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 transition"
                />
                <p className="text-xs text-slate-500">Must be unique across the platform.</p>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104 Marine Drive, Nariman Point"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">State / Region</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Postal Code</label>
                  <input
                    type="text"
                    placeholder="400021"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Country</label>
                  <input
                    type="text"
                    placeholder="India"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Financial & Localization */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Financial & Localization Defaults</h2>
                <p className="text-xs text-slate-400">
                  Currency, timezone, and fiscal identifiers for billing isolation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Currency Code</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="INR"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Currency Symbol</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="₹"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Timezone (IANA)</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Kolkata"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  GSTIN / Tax Registration Number
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AADCS1234F1Z8"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500 transition"
                />
                <p className="text-xs text-slate-500">
                  Printed on all customer invoices generated at this branch.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: Hospitality Modules */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Hospitality Modules</h2>
                <p className="text-xs text-slate-400">
                  Select feature sets activated for staff and customer interfaces at this branch.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_MODULES.map((mod) => {
                const isSelected = enabledModules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/60 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800/70 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 transition ${
                        isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-700'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{mod.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 5: Initial Administrator Provisioning */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Branch Administrator Account</h2>
                  <p className="text-xs text-slate-400">
                    Secure credentials for initial location management.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={provisionAdmin}
                  onChange={(e) => setProvisionAdmin(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs text-slate-300 font-medium">Provision Admin Account</span>
              </label>
            </div>

            {provisionAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Admin Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required={provisionAdmin}
                    placeholder="e.g. Rajesh Kumar"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Admin Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required={provisionAdmin}
                    placeholder="admin.grand@sculpx.in"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Temporary Initial Password
                  </label>
                  <input
                    type="password"
                    placeholder="Leave empty for auto-generated password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition"
                  />
                  <p className="text-xs text-slate-500">
                    If left blank, a secure random password will be assigned and an invitation email generated.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
            <Link
              href="/admin/locations"
              className="px-6 py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 font-medium text-sm transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-900/30 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Location...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Create & Provision Location
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
