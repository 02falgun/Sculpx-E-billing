import { Order, OrderStatus } from "./order";
import { KOT, KOTStatus } from "./kitchen";
import { Bill } from "./billing";
import { Payment } from "./payment";
import { PrintJob } from "./printer";

export type WebSocketEventType =
  | "ORDER_CREATED"
  | "ORDER_CONFIRMED"
  | "ORDER_UPDATED"
  | "ORDER_CANCELLED"
  | "KOT_CREATED"
  | "KOT_UPDATED"
  | "KOT_STATUS_UPDATED"
  | "KOT_READY"
  | "ORDER_PREPARING"
  | "ORDER_READY"
  | "ORDER_SERVED"
  | "BILL_UPDATED"
  | "PAYMENT_UPDATED"
  | "PRINT_JOB_UPDATED"
  | "HEARTBEAT"
  | "SUBSCRIBE"
  | "UNSUBSCRIBE"
  | "RECONNECTED";

export type WebSocketConnectionState =
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED"
  | "RECONNECTING"
  | "ERROR";

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  topic?: string; // e.g. "orders:all", "order:ord-123", "kitchen:kots", "billing:bill-456"
  payload: T;
  timestamp: string;
  id: string; // for deduplication
}

export type OrderEventPayload = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  order: Order;
};

export type KOTEventPayload = {
  kotId: string;
  kotNumber: string;
  status: KOTStatus;
  kot: KOT;
};

export type BillEventPayload = {
  billId: string;
  bill: Bill;
};

export type PaymentEventPayload = {
  paymentId: string;
  payment: Payment;
  billId: string;
};

export type PrintJobEventPayload = {
  jobId: string;
  printJob: PrintJob;
};
