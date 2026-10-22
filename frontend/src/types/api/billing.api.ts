/**
 * SCULPX E-Billing — Billing & Invoicing API Contracts
 */

import { ID } from "../common";
import { Bill, BillStatus } from "../billing";
import { ApiPaginationQueryParams } from "./common.api";

export interface BillListQueryParams extends ApiPaginationQueryParams {
  status?: BillStatus;
  orderId?: ID;
  startDate?: string;
  endDate?: string;
  hasOutstandingBalance?: boolean;
}

export interface GenerateBillRequestBody {
  orderId: ID;
  customerGstNumber?: string;
}

export interface ApplyDiscountRequestBody {
  type: "PERCENTAGE" | "FLAT";
  value: number;
  code?: string;
  authorizedBy?: ID;
}

export interface VoidBillRequestBody {
  reason: string;
  authorizedBy?: ID;
}
