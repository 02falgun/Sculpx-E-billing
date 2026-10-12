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
  ITenantService,
  IRoleService,
  IAuditService,
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
import { MockTenantService } from "./mock/tenant.mock";
import { MockRoleService } from "./mock/role.mock";
import { MockAuditService } from "./mock/audit.mock";

import {
  HttpMenuService,
  HttpOrderService,
  HttpKitchenService,
  HttpBillingService,
  HttpPaymentService,
  HttpInventoryService,
  HttpPrinterService,
  HttpRoomService,
  HttpTableService,
  HttpUserService,
  HttpAuthService,
  HttpTenantService,
  HttpRoleService,
  HttpAuditService,
} from "./http";

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
const mockTenant = new MockTenantService();
const mockRole = new MockRoleService();
const mockAudit = new MockAuditService();

// Instances of live HTTP services
const httpMenu = new HttpMenuService();
const httpOrder = new HttpOrderService();
const httpKitchen = new HttpKitchenService();
const httpBilling = new HttpBillingService();
const httpPayment = new HttpPaymentService();
const httpInventory = new HttpInventoryService();
const httpPrinter = new HttpPrinterService();
const httpRoom = new HttpRoomService();
const httpTable = new HttpTableService();
const httpUser = new HttpUserService();
const httpAuth = new HttpAuthService();
const httpTenant = new HttpTenantService();
const httpRole = new HttpRoleService();
const httpAudit = new HttpAuditService();

export function getMenuService(): IMenuService {
  return ENV.USE_MOCK_API ? mockMenu : httpMenu;
}

export function getOrderService(): IOrderService {
  return ENV.USE_MOCK_API ? mockOrder : httpOrder;
}

export function getKitchenService(): IKitchenService {
  return ENV.USE_MOCK_API ? mockKitchen : httpKitchen;
}

export function getBillingService(): IBillingService {
  return ENV.USE_MOCK_API ? mockBilling : httpBilling;
}

export function getPaymentService(): IPaymentService {
  return ENV.USE_MOCK_API ? mockPayment : httpPayment;
}

export function getInventoryService(): IInventoryService {
  return ENV.USE_MOCK_API ? mockInventory : httpInventory;
}

export function getPrinterService(): IPrinterService {
  return ENV.USE_MOCK_API ? mockPrinter : httpPrinter;
}

export function getRoomService(): IRoomService {
  return ENV.USE_MOCK_API ? mockRoom : httpRoom;
}

export function getTableService(): ITableService {
  return ENV.USE_MOCK_API ? mockTable : httpTable;
}

export function getUserService(): IUserService {
  return ENV.USE_MOCK_API ? mockUser : httpUser;
}

export function getAuthService(): IAuthService {
  return ENV.USE_MOCK_API ? mockAuth : httpAuth;
}

export function getTenantService(): ITenantService {
  return ENV.USE_MOCK_API ? mockTenant : httpTenant;
}

export function getRoleService(): IRoleService {
  return ENV.USE_MOCK_API ? mockRole : httpRole;
}

export function getAuditService(): IAuditService {
  return ENV.USE_MOCK_API ? mockAudit : httpAudit;
}

// Dynamic proxies for direct hook/component consumption
// These dynamically route to either mock or live HTTP service based on ENV.USE_MOCK_API
export const menuApi = new Proxy({} as IMenuService, {
  get: (_, prop: string | symbol) => (getMenuService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const orderApi = new Proxy({} as IOrderService, {
  get: (_, prop: string | symbol) => (getOrderService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const kitchenApi = new Proxy({} as IKitchenService, {
  get: (_, prop: string | symbol) => (getKitchenService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const billingApi = new Proxy({} as IBillingService, {
  get: (_, prop: string | symbol) => (getBillingService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const paymentApi = new Proxy({} as IPaymentService, {
  get: (_, prop: string | symbol) => (getPaymentService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const inventoryApi = new Proxy({} as IInventoryService, {
  get: (_, prop: string | symbol) => (getInventoryService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const printerApi = new Proxy({} as IPrinterService, {
  get: (_, prop: string | symbol) => (getPrinterService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const roomApi = new Proxy({} as IRoomService, {
  get: (_, prop: string | symbol) => (getRoomService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const tableApi = new Proxy({} as ITableService, {
  get: (_, prop: string | symbol) => (getTableService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const userApi = new Proxy({} as IUserService, {
  get: (_, prop: string | symbol) => (getUserService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const authApi = new Proxy({} as IAuthService, {
  get: (_, prop: string | symbol) => (getAuthService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const tenantApi = new Proxy({} as ITenantService, {
  get: (_, prop: string | symbol) => (getTenantService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const roleApi = new Proxy({} as IRoleService, {
  get: (_, prop: string | symbol) => (getRoleService() as unknown as Record<string | symbol, unknown>)[prop],
});

export const auditApi = new Proxy({} as IAuditService, {
  get: (_, prop: string | symbol) => (getAuditService() as unknown as Record<string | symbol, unknown>)[prop],
});

