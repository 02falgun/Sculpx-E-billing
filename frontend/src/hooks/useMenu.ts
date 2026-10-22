import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { menuApi } from "@/services/api";

export function useQRContext(qrToken: string) {
  return useQuery({
    queryKey: ["menu", "context", qrToken],
    queryFn: async () => {
      const res = await menuApi.getContextByQrToken(qrToken);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to resolve QR token");
      }
      return res.data;
    },
    enabled: !!qrToken,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["menu", "categories"],
    queryFn: async () => {
      const res = await menuApi.getCategories();
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load categories");
      }
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMenuItems(params?: { categoryId?: string; search?: string }) {
  return useQuery({
    queryKey: ["menu", "items", params?.categoryId || "all", params?.search || ""],
    queryFn: async () => {
      const res = await menuApi.getMenuItems(params);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load menu items");
      }
      return res.data;
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: ["menu", "item", id],
    queryFn: async () => {
      const res = await menuApi.getMenuItemById(id);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load item detail");
      }
      return res.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<import("@/types").MenuItem>) => {
      const res = await menuApi.createMenuItem(item);
      if (!res.success) throw new Error(res.error?.message || "Failed to create menu item");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items"] });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, item }: { id: string; item: Partial<import("@/types").MenuItem> }) => {
      const res = await menuApi.updateMenuItem(id, item);
      if (!res.success) throw new Error(res.error?.message || "Failed to update menu item");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items"] });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await menuApi.deleteMenuItem(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to delete menu item");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items"] });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; displayOrder?: number }) => {
      if (!menuApi.createCategory) throw new Error("Category creation not supported");
      const res = await menuApi.createCategory(data);
      if (!res.success) throw new Error(res.error?.message || "Failed to create category");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; description?: string; displayOrder?: number; isActive?: boolean }> }) => {
      if (!menuApi.updateCategory) throw new Error("Category update not supported");
      const res = await menuApi.updateCategory(id, data);
      if (!res.success) throw new Error(res.error?.message || "Failed to update category");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu", "items"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!menuApi.deleteCategory) throw new Error("Category deletion not supported");
      const res = await menuApi.deleteCategory(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to delete category");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu", "items"] });
    },
  });
}
