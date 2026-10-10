/**
 * SCULPX E-Billing — Order Processing API Contracts
 */

import { ID } from "../common";
import { Order, OrderStatus, PaymentPreference, OrderSource, OrderValidationResult } from "../order";
import { ApiPaginationQueryParams } from "./common.api";

export interface CreateOrderItemInput {
  menuItemId: ID;
  quantity: number;
  modifierIds: ID[];
  specialInstructions?: string;
}

export interface ValidateOrderRequestBody {
  qrToken: string;
  items: CreateOrderItemInput[];
}

export interface ValidateOrderResponseBody {
  validation: OrderValidationResult;
}

export interface CreateOrderRequestBody {
  qrToken: string;
  items: CreateOrderItemInput[];
  paymentPreference: PaymentPreference;
  source?: OrderSource;
  customerName?: string;
  customerPhone?: string;
  specialInstructions?: string;
}

export interface CreateOrderResponseBody {
  order: Order;
  assignedKotIds?: ID[];
  billId?: ID;
}

export interface OrderListQueryParams extends ApiPaginationQueryParams {
  status?: OrderStatus;
  qrType?: "TABLE" | "ROOM";
  tableId?: ID;
  roomId?: ID;
  startDate?: string;
  endDate?: string;
}

export interface UpdateOrderStatusRequestBody {
  status: OrderStatus;
  note?: string;
  actorId?: ID;
}

export interface CancelOrderRequestBody {
  reason: string;
  actorId?: ID;
}
