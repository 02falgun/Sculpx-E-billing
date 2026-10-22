import type { KotStatus, Prisma } from "@prisma/client";

/** A KOT loaded with its order (table/room) and order items — the shape `kotModel` returns. */
export type KotWithDetails = Prisma.KotGetPayload<{
  include: {
    order: { include: { table: true; room: true } };
    items: { include: { orderItem: true } };
  };
}>;

export interface KotModifier {
  name: string;
  price?: number;
}

export interface FormattedKotItem {
  id: string;
  orderItemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  modifiers: KotModifier[];
  modifiersSummary?: string | null;
  specialInstructions?: string | null;
  status: string;
}

export type KotUrgency = "NORMAL" | "HIGH" | "URGENT";

export interface KotQrContext {
  type: "TABLE" | "ROOM";
  identifier: string;
  displayName: string;
  roomOrTableId?: string;
}

export interface FormattedKOT {
  id: string;
  kotNumber: string;
  orderId: string;
  orderNumber: string;
  status: KotStatus;
  station: string;
  urgency: KotUrgency;
  specialNotes?: string | null;
  acceptedAt?: string | null;
  readyAt?: string | null;
  preparedAt?: string | null;
  servedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  qrContext: KotQrContext;
  items: FormattedKotItem[];
}
