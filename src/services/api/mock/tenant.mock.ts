import { ITenantService, TenantProfile, PilotReadiness } from "../interfaces";
import { ApiResponse, User } from "@/types";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockTenantService implements ITenantService {
  private tenant: TenantProfile = {
    id: "e1b1d1f0-0000-4000-8000-000000000001",
    name: "Sculpx Grand Hotel & Restaurant",
    code: "SCULPX-01",
    timezone: "Asia/Kolkata",
    currency: "INR",
    currencySymbol: "₹",
    gstin: "27AABCS1429B1Z",
    cgstRate: 2.5,
    sgstRate: 2.5,
    serviceChargeRate: 5.0,
    hasAccommodation: true,
    hasRestaurant: true,
    isActive: true,
  };

  async getCurrentTenant(): Promise<ApiResponse<TenantProfile>> {
    await delay(100);
    return { success: true, data: this.tenant };
  }

  async updateCurrentTenant(data: Partial<TenantProfile>): Promise<ApiResponse<TenantProfile>> {
    await delay(150);
    this.tenant = { ...this.tenant, ...data };
    return { success: true, data: this.tenant, message: "Hotel profile updated" };
  }

  async getReadiness(): Promise<ApiResponse<PilotReadiness>> {
    await delay(100);
    return {
      success: true,
      data: {
        tenant: this.tenant,
        metrics: {
          tablesCount: 5,
          roomsCount: 4,
          menuCategoriesCount: 3,
          menuItemsCount: 12,
          staffCount: 3,
        },
        readiness: {
          percentage: 100,
          isPilotReady: true,
          completedCount: 5,
          totalSteps: 5,
          steps: [
            { key: "profile", label: "Property Profile", completed: true, details: this.tenant.name },
            { key: "tables", label: "Restaurant Tables", completed: true, details: "5 tables configured" },
            { key: "rooms", label: "Hotel Rooms", completed: true, details: "4 rooms configured" },
            { key: "menu", label: "Menu & Categories", completed: true, details: "12 items across 3 categories" },
            { key: "staff", label: "Staff & Permissions", completed: true, details: "3 active staff members" },
          ],
        },
      },
    };
  }

  async onboardHotel(data: Record<string, unknown>): Promise<ApiResponse<{ tenant: TenantProfile; adminUser: User }>> {
    await delay(200);
    const newTenant: TenantProfile = {
      id: `tenant-${Date.now()}`,
      name: (data.name as string) || "New Hotel",
      code: ((data.name as string) || "HOTEL").toUpperCase().replace(/\s+/g, "-"),
      timezone: (data.timezone as string) || "Asia/Kolkata",
      currency: (data.currency as string) || "INR",
      currencySymbol: "₹",
      gstin: (data.gstin as string) || null,
      cgstRate: Number(data.cgstRate) || 2.5,
      sgstRate: Number(data.sgstRate) || 2.5,
      serviceChargeRate: Number(data.serviceChargeRate) || 0,
      hasAccommodation: Boolean(data.hasAccommodation ?? true),
      hasRestaurant: Boolean(data.hasRestaurant ?? true),
      isActive: true,
    };

    const adminUser: User = {
      id: `usr-${Date.now()}`,
      name: (data.adminName as string) || "Hotel Administrator",
      email: (data.adminEmail as string) || "admin@hotel.com",
      role: "ADMIN" as any,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: { tenant: newTenant, adminUser },
      message: "Hotel onboarded successfully",
    };
  }
}
