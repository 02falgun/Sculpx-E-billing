export const ROUTES = {
  // Customer Routes
  CUSTOMER: {
    MENU: (qrToken: string) => `/menu/${qrToken}`,
    CART: "/cart",
    CHECKOUT: "/checkout",
    ORDER_TRACKING: (orderId: string) => `/order/${orderId}`,
    BILL: (billId: string) => `/bill/${billId}`,
  },

  // Staff Routes
  STAFF: {
    LOGIN: "/login",
    DASHBOARD: "/dashboard",
    POS: "/pos",
    POS_NEW_ORDER: "/pos/new-order",
    TABLES: "/tables",
    ORDERS: "/orders",
    ORDER_DETAIL: (orderId: string) => `/orders/${orderId}`,
    BILLING: "/billing",
    BILLING_DETAIL: (billId: string) => `/billing/${billId}`,
  },

  // Kitchen Display System
  KITCHEN: {
    ROOT: "/kitchen",
  },

  // Admin Routes
  ADMIN: {
    ROOT: "/admin",
    MENU: "/admin/menu",
    CATEGORIES: "/admin/menu/categories",
    MODIFIERS: "/admin/menu/modifiers",
    ROOMS: "/admin/rooms",
    TABLES: "/admin/tables",
    QR: "/admin/qr",
    INVENTORY: "/admin/inventory",
    INVENTORY_ITEMS: "/admin/inventory/items",
    INVENTORY_RECIPES: "/admin/inventory/recipes",
    INVENTORY_TRANSACTIONS: "/admin/inventory/transactions",
    USERS: "/admin/users",
    REPORTS: "/admin/reports",
    PRINTERS: "/admin/printers",
    PRINT_JOBS: "/admin/print-jobs",
    SETTINGS: "/admin/settings",
  },
} as const;
