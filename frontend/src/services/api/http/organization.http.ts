import { IOrganizationService } from "../interfaces";
import {
  ApiResponse,
  Organization,
  CreateOrganizationInput,
  OnboardFranchiseWizardInput,
  OrganizationStats,
  Location,
} from "@/types";
import { apiClient } from "../client";

export class HttpOrganizationService implements IOrganizationService {
  async getOrganizations(query?: {
    search?: string;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<Organization[]>> {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.type) params.set("type", query.type);
    if (query?.status) params.set("status", query.status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<Organization[]>(`/organizations${qs}`);
  }

  async getOrganizationById(id: string): Promise<ApiResponse<Organization>> {
    return apiClient.get<Organization>(`/organizations/${id}`);
  }

  async createOrganization(data: CreateOrganizationInput): Promise<ApiResponse<Organization>> {
    return apiClient.post<Organization>("/organizations", data);
  }

  async updateOrganization(
    id: string,
    data: Partial<CreateOrganizationInput & { status: string }>
  ): Promise<ApiResponse<Organization>> {
    return apiClient.put<Organization>(`/organizations/${id}`, data);
  }

  async onboardFranchise(
    data: OnboardFranchiseWizardInput
  ): Promise<
    ApiResponse<{
      organization: Organization;
      location?: Location;
      owner?: any;
      locationAdmin?: any;
    }>
  > {
    return apiClient.post<{
      organization: Organization;
      location?: Location;
      owner?: any;
      locationAdmin?: any;
    }>("/organizations/franchise/onboard", data);
  }

  async getOrganizationStats(id: string): Promise<ApiResponse<OrganizationStats>> {
    return apiClient.get<OrganizationStats>(`/organizations/${id}/stats`);
  }
}
