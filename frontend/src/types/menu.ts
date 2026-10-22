import { ID, Timestamped } from "./common";

export type DietaryType = "VEG" | "NON_VEG" | "VEGAN" | "EGG";

export interface Modifier extends Timestamped {
  id: ID;
  name: string;
  price: number;
  isAvailable: boolean;
  isDefault?: boolean;
}

export interface ModifierGroup extends Timestamped {
  id: ID;
  name: string;
  description?: string;
  minSelections: number; // 0 for optional, 1+ for required
  maxSelections: number; // 1 for single-choice (radio), >1 for multi-choice (checkbox)
  isRequired: boolean;
  modifiers: Modifier[];
}

export interface Category extends Timestamped {
  id: ID;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  itemCount?: number;
}

export interface MenuItem extends Timestamped {
  id: ID;
  categoryId: ID;
  categoryName?: string;
  name: string;
  description: string;
  price: number;
  preparationTimeMinutes: number;
  dietaryType: DietaryType;
  imageUrl?: string;
  isAvailable: boolean;
  isChefSpecial?: boolean;
  isBestseller?: boolean;
  taxRatePercentage: number;
  modifierGroups?: ModifierGroup[];
  allergens?: string[];
  spiceLevel?: 0 | 1 | 2 | 3; // 0 = mild, 3 = very hot
}
