import {
  ApiResponse,
  PaginatedResult,
  PaginationParams,
  User,
  Role,
  AuthSession,
  LoginCredentials,
  QRContext,
  Room,
  Table,
  Category,
  MenuItem,
  Order,
  CreateOrderPayload,
  OrderValidationResult,
  OrderStatus,
  KOT,
  UpdateKOTStatusPayload,
  Bill,
  Payment,
  RecordPaymentPayload,
  InventoryItem,
  InventoryTransaction,
  Recipe,
  Printer,
  PrintJob,
  CreatePrinterDto,
  UpdatePrinterDto,
} from "@/types";

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<ApiResponse<AuthSession>>;
  logout(): Promise<ApiResponse<void>>;
  getCurrentUser(): Promise<ApiResponse<User>>;
}

export interface IMenuService {
  getContextByQrToken(qrToken: string): Promise<ApiResponse<QRContext>>;
  getCategories(): Promise<ApiResponse<Category[]>>;
  getMenuItems(params?: { categoryId?: string; search?: string }): Promise<ApiResponse<MenuItem[]>>;
  getMenuItemById(id: string): Promise<ApiResponse<MenuItem>>;
  createMenuItem(item: Partial<MenuItem>): Promise<ApiResponse<MenuItem>>;
  updateMenuItem(id: string, item: Partial<MenuItem>): Promise<ApiResponse<MenuItem>>;
  deleteMenuItem(id: string): Promise<ApiResponse<void>>;
  createCategory?(data: { name: string; description?: string; displayOrder?: number }): Promise<ApiResponse<Category>>;
  updateCategory?(id: string, data: Partial<{ name: string; description?: string; displayOrder?: number; isActive?: boolean }>): Promise<ApiResponse<Category>>;
  deleteCategory?(id: string): Promise<ApiResponse<void>>;
}

export interface IOrderService {
  validateOrder(payload: CreateOrderPayload): Promise<ApiResponse<OrderValidationResult>>;
  createOrder(
    payload: CreateOrderPayload,
    options?: { idempotencyKey?: string }
  ): Promise<ApiResponse<Order>>;
  getOrderById(id: string): Promise<ApiResponse<Order>>;
  getOrders(params?: {
    status?: OrderStatus;
    qrType?: "ROOM" | "TABLE";
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<Order>>>;
  updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<ApiResponse<Order>>;
  cancelOrder(id: string, reason: string): Promise<ApiResponse<Order>>;
}

export interface IKitchenService {
  getActiveKOTs(): Promise<ApiResponse<KOT[]>>;
  getKOTById(id: string): Promise<ApiResponse<KOT>>;
  updateKOTStatus(id: string, payload: UpdateKOTStatusPayload): Promise<ApiResponse<KOT>>;
}

export interface IBillingService {
  getBillById(id: string): Promise<ApiResponse<Bill>>;
  getBillByOrderId(orderId: string): Promise<ApiResponse<Bill>>;
  getAllBills(params?: {
    status?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<Bill>>>;
  generateBillForOrder(orderId: string): Promise<ApiResponse<Bill>>;
  applyDiscount(
    billId: string,
    discount: { type: "PERCENTAGE" | "FLAT"; value: number; code?: string },
  ): Promise<ApiResponse<Bill>>;
  voidBill(billId: string, reason: string): Promise<ApiResponse<Bill>>;
}

export interface IPaymentService {
  recordPayment(payload: RecordPaymentPayload): Promise<ApiResponse<Payment>>;
  processRefund(
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<ApiResponse<Payment>>;
}

export interface IInventoryService {
  getItems(params?: {
    isLowStock?: boolean;
    search?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<InventoryItem>>>;
  getItemById(id: string): Promise<ApiResponse<InventoryItem>>;
  getTransactions(params?: {
    itemId?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<InventoryTransaction>>>;
  recordStockAdjustment(
    itemId: string,
    quantityChange: number,
    reason: string,
    type: "RESTOCK" | "USAGE" | "WASTAGE" | "ADJUSTMENT",
  ): Promise<ApiResponse<InventoryTransaction>>;
  getRecipes(): Promise<ApiResponse<Recipe[]>>;
}

export interface IPrinterService {
  getPrinters(): Promise<ApiResponse<Printer[]>>;
  getPrinterById?(id: string): Promise<ApiResponse<Printer>>;
  createPrinter?(data: CreatePrinterDto): Promise<ApiResponse<Printer>>;
  updatePrinter?(id: string, data: UpdatePrinterDto): Promise<ApiResponse<Printer>>;
  deletePrinter?(id: string): Promise<ApiResponse<{ deleted: boolean; deactivated: boolean }>>;
  pingPrinter?(id: string): Promise<ApiResponse<{ isOnline: boolean; latencyMs?: number; printer: Printer }>>;
  testPrint?(printerId: string): Promise<ApiResponse<PrintJob>>;
  getPrintJobs(params?: {
    status?: string;
    printerId?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<PrintJob>>>;
  getPrintJobById?(id: string): Promise<ApiResponse<PrintJob>>;
  retryPrintJob(id: string): Promise<ApiResponse<PrintJob>>;
  reprintJob(id: string, reason?: string): Promise<ApiResponse<PrintJob>>;
  cancelPrintJob?(id: string, reason?: string): Promise<ApiResponse<PrintJob>>;
  createPrintJob(payload: {
    printerId?: string;
    type: "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT" | "TEST_PAGE";
    referenceId?: string;
    station?: string;
    payload?: Record<string, unknown>;
  }): Promise<ApiResponse<PrintJob>>;
}

export interface IRoomService {
  getRooms(params?: { includeInactive?: boolean; floor?: string }): Promise<ApiResponse<Room[]>>;
  getRoomById(id: string): Promise<ApiResponse<Room>>;
  createRoom?(data: { roomNumber: string; floor: string; roomType?: string; capacity?: number }): Promise<ApiResponse<Room>>;
  updateRoom?(id: string, data: Partial<{ roomNumber: string; floor: string; roomType: string; capacity: number; status: Room["status"]; guestName?: string; folioId?: string; isActive: boolean }>): Promise<ApiResponse<Room>>;
  updateRoomStatus(id: string, status: Room["status"]): Promise<ApiResponse<Room>>;
  rotateRoomQr?(id: string): Promise<ApiResponse<{ roomId: string; qrToken: string }>>;
  deactivateRoom?(id: string): Promise<ApiResponse<null>>;
}

export interface ITableService {
  getTables(params?: { includeInactive?: boolean; section?: string }): Promise<ApiResponse<Table[]>>;
  getTableById(id: string): Promise<ApiResponse<Table>>;
  createTable?(data: { tableNumber: string; displayName: string; capacity: number; section: string }): Promise<ApiResponse<Table>>;
  updateTable?(id: string, data: Partial<{ tableNumber: string; displayName: string; capacity: number; section: string; status: Table["status"]; isActive: boolean }>): Promise<ApiResponse<Table>>;
  updateTableStatus(id: string, status: Table["status"]): Promise<ApiResponse<Table>>;
  rotateTableQr?(id: string): Promise<ApiResponse<{ tableId: string; qrToken: string }>>;
  deactivateTable?(id: string): Promise<ApiResponse<null>>;
}

export interface IUserService {
  getUsers(): Promise<ApiResponse<User[]>>;
  createUser(user: Omit<User, "id" | "createdAt" | "updatedAt"> & { password?: string }): Promise<ApiResponse<User>>;
  updateUser?(id: string, data: Partial<{ name: string; phoneNumber?: string | null; role: Role; isActive: boolean }>): Promise<ApiResponse<User>>;
  updateUserRole(id: string, role: Role): Promise<ApiResponse<User>>;
  updateUserPermissions?(id: string, permissions: string[]): Promise<ApiResponse<{ id: string; permissions: string[] }>>;
  resetPassword?(id: string, newPassword: string): Promise<ApiResponse<null>>;
  revokeSessions?(id: string): Promise<ApiResponse<null>>;
  deactivateUser?(id: string): Promise<ApiResponse<null>>;
  deleteUser?(id: string): Promise<ApiResponse<null>>;
}

export interface TenantProfile {
  id: string;
  name: string;
  code: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  gstin?: string | null;
  cgstRate: number;
  sgstRate: number;
  serviceChargeRate: number;
  hasAccommodation: boolean;
  hasRestaurant: boolean;
  isActive: boolean;
  settings?: Record<string, unknown>;
}

export interface PilotReadiness {
  tenant: Partial<TenantProfile>;
  metrics: {
    tablesCount: number;
    roomsCount: number;
    menuCategoriesCount: number;
    menuItemsCount: number;
    staffCount: number;
  };
  readiness: {
    percentage: number;
    isPilotReady: boolean;
    completedCount: number;
    totalSteps: number;
    steps: Array<{
      key: string;
      label: string;
      completed: boolean;
      details: string;
    }>;
  };
}

export interface ITenantService {
  getCurrentTenant(): Promise<ApiResponse<TenantProfile>>;
  updateCurrentTenant(data: Partial<TenantProfile>): Promise<ApiResponse<TenantProfile>>;
  getReadiness(): Promise<ApiResponse<PilotReadiness>>;
  onboardHotel(data: Record<string, unknown>): Promise<ApiResponse<{ tenant: TenantProfile; adminUser: User }>>;
}

export interface IRoleService {
  getPermissionCatalog(): Promise<ApiResponse<{ catalog: Array<{ key: string; name: string; category: string; description: string; isSensitive?: boolean }>; roleDefaults: Record<string, string[]>; roles: string[] }>>;
  getCustomRoles(): Promise<ApiResponse<Array<{ id: string; name: string; description?: string; baseRole: Role; permissions: string[] }>>>;
  createCustomRole(data: { name: string; description?: string; baseRole: Role; permissions: string[] }): Promise<ApiResponse<unknown>>;
  updateCustomRole(id: string, data: Partial<{ name: string; description?: string; baseRole: Role; permissions: string[] }>): Promise<ApiResponse<unknown>>;
  deleteCustomRole(id: string): Promise<ApiResponse<null>>;
}

export interface IAuditService {
  getAuditLogs(query?: { limit?: number; offset?: number; action?: string; resource?: string }): Promise<ApiResponse<{ logs: Array<{ id: string; actorEmail?: string; actorRole?: string; action: string; resource: string; resourceId?: string; details?: Record<string, unknown>; ipAddress?: string; createdAt: string }>; total: number }>>;
}

export interface IOrganizationService {
  getOrganizations(query?: { search?: string; type?: string; status?: string }): Promise<ApiResponse<import("@/types").Organization[]>>;
  getOrganizationById(id: string): Promise<ApiResponse<import("@/types").Organization>>;
  createOrganization(data: import("@/types").CreateOrganizationInput): Promise<ApiResponse<import("@/types").Organization>>;
  updateOrganization(id: string, data: Partial<import("@/types").CreateOrganizationInput & { status: string }>): Promise<ApiResponse<import("@/types").Organization>>;
  onboardFranchise(data: import("@/types").OnboardFranchiseWizardInput): Promise<ApiResponse<{ organization: import("@/types").Organization; location?: import("@/types").Location; owner?: any; locationAdmin?: any }>>;
  getOrganizationStats(id: string): Promise<ApiResponse<import("@/types").OrganizationStats>>;
}

export interface ILocationService {
  getLocations(query?: { organizationId?: string; status?: string; locationType?: string; search?: string }): Promise<ApiResponse<import("@/types").Location[]>>;
  getLocationById(id: string): Promise<ApiResponse<import("@/types").Location>>;
  createLocation(data: import("@/types").CreateLocationInput): Promise<ApiResponse<{ location: import("@/types").Location; tenant: any; adminUser?: any }>>;
  updateLocation(id: string, data: import("@/types").UpdateLocationInput): Promise<ApiResponse<import("@/types").Location>>;
  updateLocationStatus(id: string, status: string, reason?: string): Promise<ApiResponse<import("@/types").Location>>;
  assignUserToLocation(id: string, data: { userId: string; role?: string; isPrimary?: boolean }): Promise<ApiResponse<any>>;
  getLocationStats(id: string): Promise<ApiResponse<import("@/types").LocationStats>>;
}

