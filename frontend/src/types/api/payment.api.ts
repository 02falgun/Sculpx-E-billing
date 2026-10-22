/**
 * SCULPX E-Billing — Payment Settlement & Refund API Contracts
 */

import { ID } from "../common";
import { Payment, PaymentMethod, Refund } from "../payment";
import { ApiPaginationQueryParams } from "./common.api";

export interface RecordPaymentRequestBody {
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

export interface RecordPaymentResponseBody {
  payment: Payment;
  settledBillStatus: "ISSUED" | "PARTIALLY_PAID" | "PAID";
  remainingDueAmount: number;
}

export interface ProcessRefundRequestBody {
  amount: number;
  reason: string;
  authorizedBy?: ID;
}

export interface ProcessRefundResponseBody {
  refund: Refund;
  updatedPayment: Payment;
}

export interface PaymentListQueryParams extends ApiPaginationQueryParams {
  billId?: ID;
  method?: PaymentMethod;
  status?: string;
  startDate?: string;
  endDate?: string;
}
