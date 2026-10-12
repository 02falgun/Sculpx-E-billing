"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizationApi } from "@/services/api";
import { OnboardFranchiseWizardInput } from "@/types";
import {
  Building2,
  MapPin,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Store,
  Layers,
  Settings,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function CreateFranchiseWizardPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = React.useState<number>(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Form State
  const [formData, setFormData] = React.useState({
    // Step 1: Org Details
    name: "",
    code: "",
    legalName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",

    // Step 2: Brand & Modules
    businessType: "HOSPITALITY_CHAIN",
    primaryColor: "#d97706",
    enableAccommodation: true,
    enableRestaurant: true,
    enableInventory: true,
    enableKds: true,

    // Step 3: First Location (Optional toggle)
    createFirstLocation: true,
    locationName: "",
    locationCode: "",
    locationType: "COMBINED" as "RESTAURANT" | "HOTEL" | "COMBINED",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    timezone: "Asia/Kolkata",
    currency: "INR",
    currencySymbol: "₹",
    gstin: "",
    cgstRate: 2.5,
    sgstRate: 2.5,
    serviceChargeRate: 5.0,

    // Step 4: Initial Access
    provisionOwner: true,
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerPhone: "",

    provisionAdmin: false,
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPhone: "",
  });

  const updateForm = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Auto-generate code from name
  const handleNameChange = (name: string) => {
    updateForm("name", name);
    if (!formData.code || formData.code === slugify(formData.name)) {
      updateForm("code", slugify(name));
    }
  };

  const handleLocationNameChange = (locName: string) => {
    updateForm("locationName", locName);
    if (!formData.locationCode || formData.locationCode === slugify(formData.locationName)) {
      updateForm("locationCode", slugify(locName));
    }
  };

  function slugify(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  // Step Validation
  const validateStep = (step: number): boolean => {
    setErrorMessage(null);
    if (step === 1) {
      if (!formData.name.trim() || formData.name.length < 2) {
        setErrorMessage("Franchise organization name must be at least 2 characters.");
        return false;
      }
      if (!formData.code.trim() || formData.code.length < 2) {
        setErrorMessage("A unique franchise slug/code is required (letters, numbers, hyphens).");
        return false;
      }
      return true;
    }
    if (step === 2) {
      return true;
    }
    if (step === 3) {
      if (formData.createFirstLocation) {
        if (!formData.locationName.trim() || formData.locationName.length < 2) {
          setErrorMessage("First location name must be at least 2 characters.");
          return false;
        }
        if (!formData.locationCode.trim() || formData.locationCode.length < 2) {
          setErrorMessage("Location unique code is required.");
          return false;
        }
      }
      return true;
    }
    if (step === 4) {
      if (formData.provisionOwner) {
        if (!formData.ownerName.trim()) {
          setErrorMessage("Franchise owner name is required.");
          return false;
        }
        if (!formData.ownerEmail.includes("@")) {
          setErrorMessage("A valid franchise owner email address is required.");
          return false;
        }
        if (formData.ownerPassword.length < 8) {
          setErrorMessage("Franchise owner password must be at least 8 characters.");
          return false;
        }
      }
      if (formData.createFirstLocation && formData.provisionAdmin) {
        if (!formData.adminName.trim()) {
          setErrorMessage("Location administrator name is required.");
          return false;
        }
        if (!formData.adminEmail.includes("@")) {
          setErrorMessage("A valid location administrator email address is required.");
          return false;
        }
        if (formData.adminPassword.length < 8) {
          setErrorMessage("Location administrator password must be at least 8 characters.");
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(3) || !validateStep(4)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: OnboardFranchiseWizardInput = {
      organization: {
        name: formData.name.trim(),
        code: formData.code.trim().toLowerCase(),
        legalName: formData.legalName.trim() || null,
        contactEmail: formData.contactEmail.trim() || null,
        contactPhone: formData.contactPhone.trim() || null,
        address: formData.address.trim() || null,
        brandSettings: {
          businessType: formData.businessType,
          primaryColor: formData.primaryColor,
        },
      },
      ...(formData.createFirstLocation
        ? {
            firstLocation: {
              name: formData.locationName.trim(),
              code: formData.locationCode.trim().toLowerCase(),
              locationType: formData.locationType,
              city: formData.city.trim() || null,
              state: formData.state.trim() || null,
              postalCode: formData.postalCode.trim() || null,
              country: formData.country,
              timezone: formData.timezone,
              currency: formData.currency,
              currencySymbol: formData.currencySymbol,
              gstin: formData.gstin.trim() || null,
              cgstRate: Number(formData.cgstRate),
              sgstRate: Number(formData.sgstRate),
              serviceChargeRate: Number(formData.serviceChargeRate),
              hasAccommodation: formData.enableAccommodation,
              hasRestaurant: formData.enableRestaurant,
              enabledModules: {
                accommodation: formData.enableAccommodation,
                restaurant: formData.enableRestaurant,
                inventory: formData.enableInventory,
                kds: formData.enableKds,
              },
            },
          }
        : {}),
      ...(formData.provisionOwner
        ? {
            franchiseOwner: {
              name: formData.ownerName.trim(),
              email: formData.ownerEmail.trim().toLowerCase(),
              password: formData.ownerPassword,
              phone: formData.ownerPhone.trim() || null,
            },
          }
        : {}),
      ...(formData.createFirstLocation && formData.provisionAdmin
        ? {
            locationAdmin: {
              name: formData.adminName.trim(),
              email: formData.adminEmail.trim().toLowerCase(),
              password: formData.adminPassword,
              phone: formData.adminPhone.trim() || null,
            },
          }
        : {}),
    };

    try {
      const res = await organizationApi.onboardFranchise(payload);
      if (res.success && res.data) {
        router.push(`/admin/franchises/${res.data.organization.id}`);
      } else {
        setErrorMessage(res.error?.message || "Failed to onboard franchise organization");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Network error during franchise onboarding"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: "Organization Details", icon: Building2 },
    { num: 2, title: "Brand Configuration", icon: Layers },
    { num: 3, title: "First Location", icon: MapPin },
    { num: 4, title: "Initial Access", icon: UserCheck },
    { num: 5, title: "Review & Launch", icon: ShieldCheck },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Wizard Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          <Link href="/admin/franchises" className="hover:text-slate-600 transition-colors">
            Franchises
          </Link>
          <span>/</span>
          <span className="text-amber-700">New Onboarding</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Create Franchise Organization
          </h1>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Step {currentStep} of 5
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Set up a parent hospitality organization with isolated branch locations and administrative governance.
        </p>
      </div>

      {/* Wizard Stepper Progress Bar */}
      <div className="grid grid-cols-5 gap-2 border-b border-slate-200 pb-5">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <div
              key={s.num}
              className={`flex flex-col items-center sm:items-start gap-1 p-2 rounded-xl transition-all ${
                isActive
                  ? "bg-amber-50/80 border border-amber-200 text-amber-900"
                  : isDone
                  ? "text-emerald-700"
                  : "text-slate-400"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-amber-600 text-white"
                      : isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.num}
                </div>
                <span className="hidden sm:inline text-xs font-bold truncate">{s.title}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 font-medium">
            <p className="font-bold">Validation Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        {/* STEP 1: Organization Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 1: Organization Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary corporate identity and legal contact information for the franchise group.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Franchise Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grand Heritage Palace Group"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unique Slug / Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. grand-heritage"
                  value={formData.code}
                  onChange={(e) => updateForm("code", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Legal Entity Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grand Heritage Hospitality Private Ltd"
                  value={formData.legalName}
                  onChange={(e) => updateForm("legalName", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Contact Email
                </label>
                <input
                  type="email"
                  placeholder="contact@grandheritage.com"
                  value={formData.contactEmail}
                  onChange={(e) => updateForm("contactEmail", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.contactPhone}
                  onChange={(e) => updateForm("contactPhone", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Headquarters Registered Address
                </label>
                <input
                  type="text"
                  placeholder="100 Marine Lines, Mumbai"
                  value={formData.address}
                  onChange={(e) => updateForm("address", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Business & Brand Configuration */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 2: Brand &amp; Modules</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure brand defaults and enabled hospitality services across the organization.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Organization Archetype
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => updateForm("businessType", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="HOSPITALITY_CHAIN">Hotel &amp; Resort Chain</option>
                  <option value="RESTAURANT_FRANCHISE">Multi-Branch Restaurant Franchise</option>
                  <option value="BOUTIQUE_COLLECTION">Boutique Luxury Properties</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Accent Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => updateForm("primaryColor", e.target.value)}
                    className="h-9 w-12 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => updateForm("primaryColor", e.target.value)}
                    className="flex-1 px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Enabled Hospitality Modules (Default for branches)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableRestaurant}
                    onChange={(e) => updateForm("enableRestaurant", e.target.checked)}
                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Dining &amp; Restaurant Operations
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Table QR ordering, floor maps, POS billing
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableAccommodation}
                    onChange={(e) => updateForm("enableAccommodation", e.target.checked)}
                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Rooms &amp; Suites (Accommodation)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      In-room dining QR ordering, room guest billing
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableKds}
                    onChange={(e) => updateForm("enableKds", e.target.checked)}
                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Kitchen Display System (KDS)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Live station routing, KOT lifecycle, kitchen timers
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableInventory}
                    onChange={(e) => updateForm("enableInventory", e.target.checked)}
                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Inventory &amp; Recipes
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Stock depletion, recipe ingredient mapping
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: First Location */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Step 3: Initial Branch Location</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Optionally provision the flagship location now, or launch with branches pending.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.createFirstLocation}
                  onChange={(e) => updateForm("createFirstLocation", e.target.checked)}
                  className="h-4 w-4 rounded text-amber-600"
                />
                <span>Create Flagship Location Now</span>
              </label>
            </div>

            {formData.createFirstLocation ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Location Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai Flagship Property"
                    value={formData.locationName}
                    onChange={(e) => handleLocationNameChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Location Unique Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. mum-flagship"
                    value={formData.locationCode}
                    onChange={(e) => updateForm("locationCode", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Location Operational Type
                  </label>
                  <select
                    value={formData.locationType}
                    onChange={(e) => updateForm("locationType", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="COMBINED">Combined Hotel &amp; Restaurant</option>
                    <option value="RESTAURANT">Standalone Restaurant</option>
                    <option value="HOTEL">Boutique Hotel Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={formData.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IANA Timezone</label>
                  <input
                    type="text"
                    placeholder="e.g. Asia/Kolkata"
                    value={formData.timezone}
                    onChange={(e) => updateForm("timezone", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Currency Code &amp; Symbol</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="INR"
                      value={formData.currency}
                      onChange={(e) => updateForm("currency", e.target.value)}
                      className="px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="₹"
                      value={formData.currencySymbol}
                      onChange={(e) => updateForm("currencySymbol", e.target.value)}
                      className="px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 27AABCS9999Z1Z"
                    value={formData.gstin}
                    onChange={(e) => updateForm("gstin", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tax Rates (CGST % / SGST %)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="CGST 2.5"
                      value={formData.cgstRate}
                      onChange={(e) => updateForm("cgstRate", e.target.value)}
                      className="px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="SGST 2.5"
                      value={formData.sgstRate}
                      onChange={(e) => updateForm("sgstRate", e.target.value)}
                      className="px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                Organization will be created without an initial location. You can create and attach locations later from the Super Admin location management desk.
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Initial Access Provisioning */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 4: Initial Access Provisioning</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provision credentials for the Franchise Owner and optional Location Administrator.
              </p>
            </div>

            {/* Franchise Owner Section */}
            <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-amber-600" />
                  Franchise Owner Account
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.provisionOwner}
                    onChange={(e) => updateForm("provisionOwner", e.target.checked)}
                    className="h-4 w-4 rounded text-amber-600"
                  />
                  <span>Provision Owner Now</span>
                </label>
              </div>

              {formData.provisionOwner && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Owner Full Name</label>
                    <input
                      type="text"
                      placeholder="Rajesh Singhania"
                      value={formData.ownerName}
                      onChange={(e) => updateForm("ownerName", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Owner Login Email</label>
                    <input
                      type="email"
                      placeholder="owner@franchise.com"
                      value={formData.ownerEmail}
                      onChange={(e) => updateForm("ownerEmail", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={formData.ownerPassword}
                      onChange={(e) => updateForm("ownerPassword", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98000 00000"
                      value={formData.ownerPhone}
                      onChange={(e) => updateForm("ownerPhone", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Location Admin Section */}
            {formData.createFirstLocation && (
              <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Flagship Branch Administrator Account
                  </span>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.provisionAdmin}
                      onChange={(e) => updateForm("provisionAdmin", e.target.checked)}
                      className="h-4 w-4 rounded text-emerald-600"
                    />
                    <span>Provision Branch Admin</span>
                  </label>
                </div>

                {formData.provisionAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Administrator Name</label>
                      <input
                        type="text"
                        placeholder="General Manager"
                        value={formData.adminName}
                        onChange={(e) => updateForm("adminName", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Admin Email</label>
                      <input
                        type="email"
                        placeholder="gm.mumbai@franchise.com"
                        value={formData.adminEmail}
                        onChange={(e) => updateForm("adminEmail", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={formData.adminPassword}
                        onChange={(e) => updateForm("adminPassword", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Admin Phone</label>
                      <input
                        type="text"
                        placeholder="+91 98000 00001"
                        value={formData.adminPhone}
                        onChange={(e) => updateForm("adminPhone", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Review & Confirmation */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Step 5: Review &amp; Confirmation</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify configuration details before executing the atomic multi-tenant transaction.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Org Summary */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-900 block text-sm">Franchise Organization</span>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Code:</strong> @{formData.code}</p>
                  <p><strong>Legal Name:</strong> {formData.legalName || "N/A"}</p>
                  <p><strong>Contact:</strong> {formData.contactEmail || "N/A"}</p>
                </div>
              </div>

              {/* Location Summary */}
              {formData.createFirstLocation ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-bold text-slate-900 block text-sm">First Branch Location</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <p><strong>Location:</strong> {formData.locationName} ({formData.locationCode})</p>
                    <p><strong>Type:</strong> {formData.locationType}</p>
                    <p><strong>City / Country:</strong> {formData.city || "N/A"}, {formData.country}</p>
                    <p><strong>Timezone / Currency:</strong> {formData.timezone} • {formData.currency} ({formData.currencySymbol})</p>
                    <p><strong>Taxes:</strong> CGST {formData.cgstRate}% / SGST {formData.sgstRate}%</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic">No initial location specified (will be created later).</p>
              )}

              {/* Provisioned Accounts */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-900 block text-sm">Account Provisioning</span>
                <div className="space-y-1 text-slate-600">
                  {formData.provisionOwner ? (
                    <p>✓ Franchise Owner: <strong>{formData.ownerName}</strong> ({formData.ownerEmail})</p>
                  ) : (
                    <p className="italic">No franchise owner account provisioned.</p>
                  )}
                  {formData.createFirstLocation && formData.provisionAdmin && (
                    <p>✓ Location Administrator: <strong>{formData.adminName}</strong> ({formData.adminEmail})</p>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>
                  All records will be committed atomically with zero dummy business data. The branch will start in clean pilot mode.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Previous Step</span>
            </button>
          ) : (
            <Link
              href="/admin/franchises"
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </Link>
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="h-4 w-4 text-white" />
                  <span>Onboarding Franchise...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Execute Franchise Onboarding</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
