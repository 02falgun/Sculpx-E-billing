/**
 * SCULPX E-Billing — Menu Catalog & QR Context API Contracts
 */

import { ID } from "../common";
import { Category, MenuItem, ModifierGroup } from "../menu";
import { QRContext } from "../qr";
import { ApiPaginationQueryParams } from "./common.api";

export interface ResolveQrContextResponseBody {
  context: QRContext;
}

export interface MenuCategoryListResponseBody {
  categories: Category[];
}

export interface MenuItemListQueryParams extends ApiPaginationQueryParams {
  categoryId?: ID;
  dietaryType?: "VEG" | "NON_VEG" | "VEGAN" | "EGG";
  isAvailable?: boolean;
  search?: string;
}

export interface MenuItemListResponseBody {
  items: MenuItem[];
}

export interface CreateMenuItemRequestBody {
  categoryId: ID;
  name: string;
  description: string;
  price: number;
  preparationTimeMinutes: number;
  dietaryType: "VEG" | "NON_VEG" | "VEGAN" | "EGG";
  taxRatePercentage: number;
  imageUrl?: string;
  isAvailable?: boolean;
  isChefSpecial?: boolean;
  isBestseller?: boolean;
  spiceLevel?: 0 | 1 | 2 | 3;
  allergens?: string[];
  modifierGroups?: ModifierGroup[];
}

export interface UpdateMenuItemRequestBody extends Partial<CreateMenuItemRequestBody> {
  isAvailable?: boolean;
}

export interface CreateCategoryRequestBody {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryRequestBody extends Partial<CreateCategoryRequestBody> {}
