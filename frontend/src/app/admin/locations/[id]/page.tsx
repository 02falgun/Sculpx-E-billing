'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Building2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Users,
  Layers,
  DollarSign,
  UtensilsCrossed,
  BedDouble,
  QrCode,
  TrendingUp,
  Receipt,
  UserPlus,
  RefreshCw,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { locationApi } from '@/services/api/factory';
import { Location, LocationStats } from '@/types/organization';
import { useLocationStore } from '@/store/locationStore';

const AVAILABLE_MODULES = [
  { id: 'table_ordering', label: 'Dine-In QR Ordering' },
  { id: 'room_ordering', label: 'Room Service QR' },
  { id: 'pos_billing', label: 'POS & Fast Billing' },
  { id: 'kitchen_kds', label: 'Kitchen KDS' },
  { id: 'inventory', label: 'Inventory & Recipes' },
  { id: 'reports', label: 'Analytics & Financials' },
];

export default function LocationDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locationId = params?.id as string;
  const justCreated = searchParams?.get('created') === 'true';

  const { setActiveLocation } = useLocationStore();

  const [location, setLocation] = useState<Location | null>(null);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(
    justCreated ? 'Location successfully created with isolated operational tenant.' : null
  );

  // Editable Form State
  const [name, setName] = useState('');
  const [locationType, setLocationType] = useState<'RESTAURANT' | 'HOTEL' | 'COMBINED'>('COMBINED');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [gstin, setGstin] = useState('');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  // Suspension Modal / Confirmation
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  // Assign Staff Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('LOCATION_ADMIN');
  const [assigning, setAssigning] = useState(false);

  const fetchLocationData = async () => {
    if (!locationId) return;
    try {
      setLoading(true);
      setError(null);
      const [locRes, statsRes] = await Promise.all([
        locationApi.getLocationById(locationId),
        locationApi.getLocationStats(locationId).catch(() => null),
      ]);

      if (locRes.success && locRes.data) {
        const locData = locRes.data;
        setLocation(locData);

        // Populate form
        setName(locData.name);
        setLocationType(locData.locationType);
        setAddress(locData.address || '');
        setCity(locData.city || '');
        setState(locData.state || '');
        setPostalCode(locData.postalCode || '');
        setCountry(locData.country || 'India');
        setTimezone(locData.timezone || 'Asia/Kolkata');
        setCurrency(locData.currency || 'INR');
        setCurrencySymbol(locData.currencySymbol || '₹');
        setGstin(locData.gstin || '');
        
        if (Array.isArray(locData.enabledModules)) {
          setEnabledModules(locData.enabledModules);
        } else if (locData.enabledModules && typeof locData.enabledModules === 'object') {
          setEnabledModules(Object.keys(locData.enabledModules).filter(k => (locData.enabledModules as any)[k]));
        } else {
          setEnabledModules([]);
        }
      } else {
        throw new Error(locRes.error?.message || 'Location not found');
      }

      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load location details:', err);
      setError(err?.message || 'Failed to fetch location details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationData();
  }, [locationId]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const res = await locationApi.updateLocation(location.id, {
        name: name.trim(),
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
      });

      if (res.success && res.data) {
        setLocation(res.data);
        setSuccessMsg('Location details and operational tenant settings updated successfully.');
      } else {
        throw new Error(res.error?.message || 'Failed to save location changes');
      }
    } catch (err: any) {
      console.error('Failed to update location:', err);
      setError(err?.message || 'Failed to save location changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED', reason?: string) => {
    if (!location) return;
    try {
      setStatusUpdating(true);
      setError(null);
      setSuccessMsg(null);

      const res = await locationApi.updateLocationStatus(location.id, newStatus, reason);
      if (res.success && res.data) {
        setLocation(res.data);
        setShowSuspendModal(false);
        setSuspendReason('');
        setSuccessMsg(
          newStatus === 'SUSPENDED'
            ? 'Location has been SUSPENDED. State-modifying operations are now blocked.'
            : newStatus === 'ACTIVE'
            ? 'Location reactivated. Full operations restored.'
            : 'Location has been archived.'
        );
      } else {
        throw new Error(res.error?.message || 'Failed to change status');
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(err?.message || 'Failed to change location operational status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !assignUserId.trim()) return;

    try {
      setAssigning(true);
      const res = await locationApi.assignUserToLocation(location.id, {
        userId: assignUserId.trim(),
        role: assignRole,
        isPrimary: false,
      });
      if (res.success) {
        setShowAssignModal(false);
        setAssignUserId('');
        setSuccessMsg('Staff member assigned to this location successfully.');
        fetchLocationData();
      } else {
        throw new Error(res.error?.message || 'Failed to assign staff member');
      }
    } catch (err: any) {
      console.error('Failed to assign user:', err);
      setError(err?.message || 'Failed to assign staff member.');
    } finally {
      setAssigning(false);
    }
  };

  const toggleModule = (modId: string) => {
    setEnabledModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleEnterWorkspace = () => {
    if (!location) return;
    setActiveLocation(location);
    router.push('/admin/tables');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm">Loading location operational records...</p>
      </div>
    );
  }

  if (error && !location) {
    return (
      <div className="min-h-screen bg-slate-950 p-10 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Location Not Found</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <Link
            href="/admin/locations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Locations
          </Link>
        </div>
      </div>
    );
  }

  if (!location) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/locations"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white">{location.name}</h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    location.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : location.status === 'SUSPENDED'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {location.status}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {location.code}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {location.city ? `${location.city}, ${location.country}` : location.country}
                <span className="text-slate-600">•</span>
                {location.organization ? (
                  <Link
                    href={`/admin/franchises/${location.organization.id}`}
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    {location.organization.name}
                  </Link>
                ) : (
                  <span className="text-slate-400">Independent Property</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEnterWorkspace}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <ExternalLink className="w-4 h-4" />
              Switch to this Location
            </button>

            {location.status === 'ACTIVE' ? (
              <button
                onClick={() => setShowSuspendModal(true)}
                disabled={statusUpdating}
                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium text-sm rounded-xl transition flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Suspend Location
              </button>
            ) : location.status === 'SUSPENDED' ? (
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={statusUpdating}
                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium text-sm rounded-xl transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Reactivate Location
              </button>
            ) : null}
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="flex-1 font-medium">{successMsg}</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        {/* Suspension Banner */}
        {location.status === 'SUSPENDED' && (
          <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-600/40 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-200">Location Operations Currently Suspended</h3>
              <p className="text-sm text-amber-300/80 mt-1">
                New operational records (orders, room check-ins, table state modifications, inventory deductions)
                are rejected by the API with HTTP 403 <code className="font-mono">LOCATION_SUSPENDED</code>.
                Historical financial and invoice records remain safely preserved and viewable for auditing.
              </p>
            </div>
          </div>
        )}

        {/* Operational Statistics (Database-Backed) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
              Restaurant Tables
            </div>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {stats?.tablesCount ?? 0}
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <BedDouble className="w-4 h-4 text-blue-400" />
              Hotel Rooms
            </div>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {stats?.roomsCount ?? 0}
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <QrCode className="w-4 h-4 text-purple-400" />
              Active QR Tokens
            </div>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {stats?.qrCount ?? 0}
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Layers className="w-4 h-4 text-indigo-400" />
              Menu Items
            </div>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {stats?.menuItemsCount ?? 0}
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Total Orders
            </div>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {stats?.ordersCount ?? 0}
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Recorded Revenue
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
              {location.currencySymbol}
              {(stats?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Editable Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveChanges} className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <h2 className="text-lg font-semibold text-white">Location Configuration</h2>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Changes
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Location Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Location Type
                    </label>
                    <select
                      value={locationType}
                      onChange={(e) => setLocationType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="RESTAURANT">Restaurant Only</option>
                      <option value="HOTEL">Hotel Only</option>
                      <option value="COMBINED">Combined Hotel + Restaurant</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Currency</label>
                    <input
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Currency Symbol</label>
                    <input
                      type="text"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Timezone</label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">GSTIN / Tax ID</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Enabled Modules */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Enabled Hospitality Modules
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {AVAILABLE_MODULES.map((mod) => {
                      const isSelected = enabledModules.includes(mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModule(mod.id)}
                          className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                            isSelected
                              ? 'bg-blue-950/40 border-blue-500/70 text-blue-200'
                              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center ${
                                isSelected ? 'bg-blue-600 text-white' : 'border border-slate-700'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            <span>{mod.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right 1 Col: Tenant Info & Staff Assignments */}
          <div className="space-y-6">
            {/* Operational Tenant Details */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white text-sm">Operational Tenant Security</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Security Boundary ID:</span>
                  <span className="font-mono text-indigo-300 break-all select-all">
                    {location.tenantId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tenant Slug:</span>
                  <span className="font-mono text-slate-200">{location.tenant?.slug || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tenant Operational State:</span>
                  <span
                    className={`font-semibold ${
                      location.tenant?.isActive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {location.tenant?.isActive ? 'ACTIVE IN POSTGRES' : 'DEACTIVATED'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Created On:</span>
                  <span className="text-slate-300">
                    {new Date(location.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Staff & Administrator Assignments */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-white text-sm">Staff Assignments</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 transition"
                  title="Assign Staff Member"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>

              {location.userAssignments && location.userAssignments.length > 0 ? (
                <div className="space-y-2">
                  {location.userAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {assignment.user?.name || 'Staff User'}
                        </p>
                        <p className="text-xs text-slate-400">{assignment.user?.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {assignment.role || assignment.user?.role || 'STAFF'}
                        </span>
                        {assignment.isPrimary && (
                          <span className="block text-[10px] text-emerald-400 font-semibold mt-0.5">
                            Primary
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
                  No staff members currently assigned to this location.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Suspend Modal */}
        {showSuspendModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-bold text-lg text-white">Suspend Location Operations?</h3>
              </div>
              <p className="text-sm text-slate-300">
                Suspending <strong>{location.name}</strong> will block table orders, room service, KDS
                updates, and bill changes. Historical invoices and financial data will remain intact.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">
                  Reason for Suspension (Audit Log)
                </label>
                <textarea
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Scheduled renovation, license renewal, seasonal closure..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('SUSPENDED', suspendReason)}
                  disabled={statusUpdating}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm flex items-center gap-2"
                >
                  {statusUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Suspension
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign User Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleAssignUser}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-purple-400">
                <UserPlus className="w-6 h-6" />
                <h3 className="font-bold text-lg text-white">Assign Staff to Location</h3>
              </div>
              <p className="text-xs text-slate-400">
                Grant authorized access to this specific operational location.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  User ID / UUID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Branch Role
                </label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="LOCATION_ADMIN">Location Admin</option>
                  <option value="HOTEL_ADMIN">Hotel Admin</option>
                  <option value="CHEF">Chef / Kitchen Staff</option>
                  <option value="WAITER">Waiter / Captain</option>
                  <option value="CASHIER">Cashier / Billing</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm flex items-center gap-2"
                >
                  {assigning && <Loader2 className="w-4 h-4 animate-spin" />}
                  Assign User
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
