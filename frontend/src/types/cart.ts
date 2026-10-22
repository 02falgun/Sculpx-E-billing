import { ID } from "./common";
import { MenuItem, Modifier } from "./menu";
import { QRContext } from "./qr";

export interface SelectedModifier {
  modifierGroupId: ID;
  modifierGroupName: string;
  modifierId: ID;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // client-generated unique uuid for this specific configuration
  menuItemId: ID;
  item: MenuItem;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  specialInstructions?: string;
  unitPrice: number; // base price + modifier prices
  totalPrice: number; // unitPrice * quantity
}

export interface CartSummary {
  subtotal: number;
  estimatedTax: number;
  estimatedTotal: number;
  totalItems: number;
}

export interface CartState {
  items: CartItem[];
  qrContext: QRContext | null;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}
