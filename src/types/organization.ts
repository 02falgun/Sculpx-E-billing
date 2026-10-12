import { ID, Timestamped } from "./common";

export type OrganizationType = "FRANCHISE" | "INDEPENDENT";
export type EntityStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type LocationType = "RESTAURANT" | "HOTEL" | "COMBINED";

export interface OrganizationMember {
  userId: ID;
  name: string;
  email: string;
  orgRole: string;
}

export interface OrganizationSummaryLocation {
  id: ID;
  name: string;
  code: string;
  locationType: LocationType;
  status: EntityStatus;
  city?: string | null;
  country: string;
  currency: string;
  currencySymbol: string;
}

export interface Organization extends Timestamped {
  id: ID;
  name: string;
  code: string;
  type: OrganizationType;
  legalName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  status: EntityStatus;
  brandSettings?: Record<string, unknown> | null;
  totalLocations?: number;
  activeLocations?: number;
  suspendedLocations?: number;
  locations?: OrganizationSummaryLocation[];
  members?: OrganizationMember[];
}

export interface LocationTaxSettings {
  cgstRate: number;
  sgstRate: number;
  serviceChargeRate: number;
}

export interface LocationEnabledModules {
  accommodation?: boolean;
  restaurant?: boolean;
  inventory?: boolean;
  kds?: boolean;
  [key: string]: boolean | undefined;
}

export interface Location extends Timestamped {
  id: ID;
  organizationId?: ID | null;
  organization?: {
    id: ID;
    name: string;
    code: string;
    type: OrganizationType;
  } | null;
  tenantId: ID;
  name: string;
  code: string;
  locationType: LocationType;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  gstin?: string | null;
  enabledModules?: LocationEnabledModules | null;
  status: EntityStatus;
  taxSettings?: LocationTaxSettings;
  assignedStaffCount?: number;
  tenant?: {
    id: ID;
    name: string;
    slug: string;
    isActive: boolean;
  } | null;
  userAssignments?: Array<{
    id: ID;
    userId: ID;
    role?: string | null;
    isPrimary: boolean;
    user?: {
      id: ID;
      name: string;
      email: string;
      role: string;
    };
  }>;
}

export interface CreateOrganizationInput {
  name: string;
  code: string;
  type?: OrganizationType;
  legalName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  brandSettings?: Record<string, unknown>;
}

export interface OnboardFranchiseWizardInput {
  organization: {
    name: string;
    code: string;
    legalName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    address?: string | null;
    brandSettings?: Record<string, unknown>;
  };
  firstLocation?: {
    name: string;
    code: string;
    locationType?: LocationType;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string;
    timezone?: string;
    currency?: string;
    currencySymbol?: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    gstin?: string | null;
    cgstRate?: number;
    sgstRate?: number;
    serviceChargeRate?: number;
    hasAccommodation?: boolean;
    hasRestaurant?: boolean;
    enabledModules?: Record<string, boolean>;
  };
  franchiseOwner?: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
  };
  locationAdmin?: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
  };
}

export interface CreateLocationInput {
  organizationId?: string | null;
  name: string;
  code: string;
  locationType?: LocationType;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  timezone?: string;
  currency?: string;
  currencySymbol?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  gstin?: string | null;
  cgstRate?: number;
  sgstRate?: number;
  serviceChargeRate?: number;
  hasAccommodation?: boolean;
  hasRestaurant?: boolean;
  enabledModules?: Record<string, boolean>;
  adminName?: string | null;
  adminEmail?: string | null;
  adminPassword?: string | null;
  adminPhone?: string | null;
}

export interface UpdateLocationInput {
  name?: string;
  organizationId?: string | null;
  locationType?: LocationType;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  timezone?: string;
  currency?: string;
  currencySymbol?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  gstin?: string | null;
  cgstRate?: number;
  sgstRate?: number;
  serviceChargeRate?: number;
  hasAccommodation?: boolean;
  hasRestaurant?: boolean;
  enabledModules?: Record<string, boolean> | string[];
  status?: EntityStatus;
}

export interface OrganizationStats {
  organizationId: ID;
  totalLocations: number;
  activeLocations: number;
  suspendedLocations: number;
  totalTables: number;
  totalRooms: number;
  totalOrders: number;
  revenueByCurrency: Record<
    string,
    {
      symbol: string;
      totalRevenue: number;
      ordersCount: number;
    }
  >;
}

export interface LocationStats {
  locationId: ID;
  name: string;
  code: string;
  status: EntityStatus;
  currency: string;
  currencySymbol: string;
  tablesCount: number;
  roomsCount: number;
  qrCount: number;
  categoriesCount: number;
  menuItemsCount: number;
  staffCount: number;
  ordersCount: number;
  totalRevenue: number;
}
