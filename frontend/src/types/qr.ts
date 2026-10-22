import { ID, Timestamped } from "./common";

export type QRContextType = "ROOM" | "TABLE";

export interface QRContext {
  token: string;
  type: QRContextType;
  identifier: string; // e.g., "301" for ROOM, "5" for TABLE
  displayName: string; // e.g., "Room 301" or "Table 5"
  hotelId: string;
  hotelName: string;
  locationDetails?: {
    floor?: string;
    section?: string;
    capacity?: number;
  };
  isActive: boolean;
  activeOrderId?: ID;
  activeBillId?: ID;
}

export interface Room extends Timestamped {
  id: ID;
  roomNumber: string;
  floor: string;
  guestName?: string;
  roomType?: string;
  capacity?: number;
  status: "OCCUPIED" | "VACANT" | "CLEANING" | "MAINTENANCE";
  qrToken: string;
  notes?: string;
  isActive?: boolean;
}

export interface Table extends Timestamped {
  id: ID;
  tableNumber: string;
  displayName?: string;
  section: string;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILLED";
  qrToken: string;
  activeOrderId?: ID;
  activeBillId?: ID;
  isActive?: boolean;
}
