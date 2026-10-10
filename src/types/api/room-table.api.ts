/**
 * SCULPX E-Billing — Tables, Rooms & Hospitality Context Contracts
 */

import { ID } from "../common";
import { Table, Room } from "../qr";

export interface UpdateTableStatusRequestBody {
  status: Table["status"];
  currentOrderId?: ID;
}

export interface UpdateRoomStatusRequestBody {
  status: Room["status"];
  currentGuestName?: string;
  guestPhone?: string;
  roomFolioId?: string;
}

export interface CreateTableRequestBody {
  number: string;
  section: string;
  capacity: number;
}

export interface CreateRoomRequestBody {
  number: string;
  floor: number;
  type: string;
}
