import { create } from "zustand";
import { Location } from "@/types";
import { locationApi, apiClient } from "@/services/api";

interface LocationStoreState {
  locations: Location[];
  activeLocation: Location | null;
  isLoading: boolean;
  error: string | null;

  setLocations: (locations: Location[]) => void;
  setActiveLocation: (location: Location | null) => void;
  fetchLocations: () => Promise<Location[]>;
  switchLocationById: (locationId: string) => void;
}

export const useLocationStore = create<LocationStoreState>()((set, get) => ({
  locations: [],
  activeLocation: null,
  isLoading: false,
  error: null,

  setLocations: (locations) => {
    const currentActive = get().activeLocation;
    let nextActive = currentActive;

    // If current active location is not in the new list, pick the first active one
    if (!currentActive || !locations.some((l) => l.id === currentActive.id)) {
      const savedId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("restro_active_location_id")
          : null;

      const matchingSaved = locations.find((l) => l.id === savedId);
      nextActive = matchingSaved || locations.find((l) => l.status === "ACTIVE") || locations[0] || null;
    }

    if (nextActive) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("restro_active_location_id", nextActive.id);
        window.localStorage.setItem("restro_active_tenant_id", nextActive.tenantId);
      }
      apiClient.setActiveLocationId(nextActive.id);
      apiClient.setActiveTenantId(nextActive.tenantId);
    }

    set({ locations, activeLocation: nextActive });
  },

  setActiveLocation: (location) => {
    if (typeof window !== "undefined") {
      if (location) {
        window.localStorage.setItem("restro_active_location_id", location.id);
        window.localStorage.setItem("restro_active_tenant_id", location.tenantId);
      } else {
        window.localStorage.removeItem("restro_active_location_id");
        window.localStorage.removeItem("restro_active_tenant_id");
      }
    }
    apiClient.setActiveLocationId(location?.id || null);
    apiClient.setActiveTenantId(location?.tenantId || null);

    set({ activeLocation: location });
  },

  fetchLocations: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await locationApi.getLocations();
      if (res.success && Array.isArray(res.data)) {
        get().setLocations(res.data);
        set({ isLoading: false });
        return res.data;
      } else {
        set({
          isLoading: false,
          error: res.error?.message || "Failed to load locations",
        });
        return [];
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error fetching locations";
      set({ isLoading: false, error: msg });
      return [];
    }
  },

  switchLocationById: (locationId) => {
    const found = get().locations.find((l) => l.id === locationId);
    if (found) {
      get().setActiveLocation(found);
    }
  },
}));
