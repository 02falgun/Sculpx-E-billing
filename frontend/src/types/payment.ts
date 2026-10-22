import { ID, Timestamped } from "./common";

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "UPI"
  | "ROOM_CHARGE"
  | "NET_BANKING";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export interface Refund extends Timestamped {
  id: ID;
  paymentId: ID;
  amount: number;
  reason: string;
  processedBy: string;
  status: "REQUESTED" | "PROCESSED" | "REJECTED";
}

export interface Payment extends Timestamped {
  id: ID;
  billId: ID;
  orderId: ID;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
  roomChargeDetails?: {
    roomNumber: string;
    guestName: string;
    roomFolioId?: string;
  };
  cardLastFour?: string;
  upiId?: string;
  notes?: string;
  refunds?: Refund[];
}

export interface RecordPaymentPayload {
  billId: ID;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  roomChargeDetails?: {
    roomNumber: string;
    guestName: string;
    roomFolioId?: string;
  };
  cardLastFour?: string;
  upiId?: string;
  notes?: string;
}
