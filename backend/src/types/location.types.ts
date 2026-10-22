/** Raw list filters from the query string (passed through unvalidated). */
export interface ListLocationsQuery {
  organizationId?: string;
  status?: string;
  locationType?: string;
  search?: string;
}

/** Visibility scope for non-super-admins: assigned locations, member organizations or own tenant. */
export interface LocationAccessScope {
  locationIds: string[];
  organizationIds: string[];
  tenantId: string;
}

export interface LocationListFilter {
  access?: LocationAccessScope;
  organizationId?: string;
  status?: string;
  locationType?: string;
  search?: string;
}
