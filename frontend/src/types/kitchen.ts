import { ID, Timestamped } from "./common";
import { QRContext } from "./qr";

export type KOTStatus =
  | "NEW"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

export interface KOTItem {
  id: ID;
  menuItemId: ID;
  name: string;
  quantity: number;
  modifiers: { name: string }[];
  specialInstructions?: string;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
}

export interface KOT extends Timestamped {
  id: ID;
  kotNumber: string; // e.g., "KOT-1042"
  orderId: ID;
  orderNumber: string;
  qrContext: QRContext;
  items: KOTItem[];
  status: KOTStatus;
  urgency: "NORMAL" | "HIGH" | "URGENT";
  specialNotes?: string;
  acceptedAt?: string;
  preparedAt?: string;
  servedAt?: string;
}

export interface UpdateKOTStatusPayload {
  status: KOTStatus;
  note?: string;
}
