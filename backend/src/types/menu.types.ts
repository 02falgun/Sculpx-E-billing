import type { Dietary } from "@prisma/client";

export interface CategoryFilters {
  isActive?: boolean;
  search?: string;
}

export interface MenuItemFilters {
  categoryId?: string;
  isAvailable?: boolean;
  dietary?: Dietary;
  spiceLevel?: string;
  search?: string;
}
