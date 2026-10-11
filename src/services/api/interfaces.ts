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
  getRooms(): Promise<ApiResponse<Room[]>>;
  getRoomById(id: string): Promise<ApiResponse<Room>>;
  updateRoomStatus(id: string, status: Room["status"]): Promise<ApiResponse<Room>>;
}

export interface ITableService {
  getTables(): Promise<ApiResponse<Table[]>>;
  getTableById(id: string): Promise<ApiResponse<Table>>;
  updateTableStatus(id: string, status: Table["status"]): Promise<ApiResponse<Table>>;
}

export interface IUserService {
  getUsers(): Promise<ApiResponse<User[]>>;
  createUser(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<ApiResponse<User>>;
  updateUserRole(id: string, role: Role): Promise<ApiResponse<User>>;
}
