import { ENV } from "@/config";
import {
  IMenuService,
  IOrderService,
  IKitchenService,
  IBillingService,
  IPaymentService,
  IInventoryService,
  IPrinterService,
  IRoomService,
  ITableService,
  IUserService,
  IAuthService,
} from "./interfaces";

import { MockMenuService } from "./mock/menu.mock";
import { MockOrderService } from "./mock/order.mock";
import { MockKitchenService } from "./mock/kitchen.mock";
import { MockBillingService } from "./mock/billing.mock";
import { MockPaymentService } from "./mock/payment.mock";
import { MockInventoryService } from "./mock/inventory.mock";
import { MockPrinterService } from "./mock/printer.mock";
import { MockRoomService } from "./mock/room.mock";
import { MockTableService } from "./mock/table.mock";
import { MockUserService, MockAuthService } from "./mock/user.mock";

// Instances of mock services
const mockMenu = new MockMenuService();
const mockOrder = new MockOrderService();
const mockKitchen = new MockKitchenService();
const mockBilling = new MockBillingService();
const mockPayment = new MockPaymentService();
const mockInventory = new MockInventoryService();
const mockPrinter = new MockPrinterService();
const mockRoom = new MockRoomService();
const mockTable = new MockTableService();
const mockUser = new MockUserService();
const mockAuth = new MockAuthService();

export function getMenuService(): IMenuService {
  return mockMenu;
}

export function getOrderService(): IOrderService {
  return mockOrder;
}

export function getKitchenService(): IKitchenService {
  return mockKitchen;
}

export function getBillingService(): IBillingService {
  return mockBilling;
}

export function getPaymentService(): IPaymentService {
  return mockPayment;
}

export function getInventoryService(): IInventoryService {
  return mockInventory;
}

export function getPrinterService(): IPrinterService {
  return mockPrinter;
}

export function getRoomService(): IRoomService {
  return mockRoom;
}

export function getTableService(): ITableService {
  return mockTable;
}

export function getUserService(): IUserService {
  return mockUser;
}

export function getAuthService(): IAuthService {
  return mockAuth;
}

// Singletons for direct hook consumption
export const menuApi = getMenuService();
export const orderApi = getOrderService();
export const kitchenApi = getKitchenService();
export const billingApi = getBillingService();
export const paymentApi = getPaymentService();
export const inventoryApi = getInventoryService();
export const printerApi = getPrinterService();
export const roomApi = getRoomService();
export const tableApi = getTableService();
export const userApi = getUserService();
export const authApi = getAuthService();
