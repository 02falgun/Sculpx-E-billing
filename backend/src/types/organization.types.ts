/** Raw list filters from the query string (passed through unvalidated). */
export interface ListOrganizationsQuery {
  search?: string;
  type?: string;
  status?: string;
}

export interface OrganizationListFilter {
  /** Restrict to organizations this user belongs to. */
  memberUserId?: string;
  type?: string;
  status?: string;
  search?: string;
}
