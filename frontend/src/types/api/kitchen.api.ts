/**
 * SCULPX E-Billing — Kitchen & KOT API Contracts
 */

import { ID } from "../common";
import { KOT, KOTStatus } from "../kitchen";
import { ApiPaginationQueryParams } from "./common.api";

export interface KOTListQueryParams extends ApiPaginationQueryParams {
  status?: KOTStatus;
  urgency?: "NORMAL" | "HIGH" | "URGENT";
  orderId?: ID;
}

export interface KOTListResponseBody {
  kots: KOT[];
}

export interface UpdateKOTStatusRequestBody {
  status: KOTStatus;
  note?: string;
  stationId?: ID;
}

export interface ExpediteKOTRequestBody {
  urgency: "HIGH" | "URGENT";
  reason: string;
}
