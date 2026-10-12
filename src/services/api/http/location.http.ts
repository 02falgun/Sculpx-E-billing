import { ILocationService } from "../interfaces";
import {
  ApiResponse,
  Location,
  CreateLocationInput,
  UpdateLocationInput,
  LocationStats,
} from "@/types";
import { apiClient } from "../client";

export class HttpLocationService implements ILocationService {
  async getLocations(query?: {
    organizationId?: string;
    status?: string;
    locationType?: string;
    search?: string;
  }): Promise<ApiResponse<Location[]>> {
    const params = new URLSearchParams();
    if (query?.organizationId) params.set("organizationId", query.organizationId);
    if (query?.status) params.set("status", query.status);
    if (query?.locationType) params.set("locationType", query.locationType);
    if (query?.search) params.set("search", query.search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<Location[]>(`/locations${qs}`);
  }

  async getLocationById(id: string): Promise<ApiResponse<Location>> {
    return apiClient.get<Location>(`/locations/${id}`);
  }

  async createLocation(
    data: CreateLocationInput
  ): Promise<ApiResponse<{ location: Location; tenant: any; adminUser?: any }>> {
    return apiClient.post<{ location: Location; tenant: any; adminUser?: any }>(
      "/locations",
      data
    );
  }

  async updateLocation(
    id: string,
    data: UpdateLocationInput
  ): Promise<ApiResponse<Location>> {
    return apiClient.put<Location>(`/locations/${id}`, data);
  }

  async updateLocationStatus(
    id: string,
    status: string,
    reason?: string
  ): Promise<ApiResponse<Location>> {
    return apiClient.put<Location>(`/locations/${id}/status`, { status, reason });
  }

  async assignUserToLocation(
    id: string,
    data: { userId: string; role?: string; isPrimary?: boolean }
  ): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/locations/${id}/assign-user`, data);
  }

  async getLocationStats(id: string): Promise<ApiResponse<LocationStats>> {
    return apiClient.get<LocationStats>(`/locations/${id}/stats`);
  }
}
