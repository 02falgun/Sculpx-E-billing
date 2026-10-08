# 13. Admin Back-Office Operations, Hardware Fleet Management & QR Provisioning

Date: 2026-10-09

## Status

Accepted

## Context

Restaurant administrators and floor managers require an operational control center to supervise sales metrics, oversee menu item availability/86-lists in real-time, monitor thermal printer fleets (ESC/POS KOT and receipt printers), and generate printable QR code tent cards for dining tables.

## Decision

We designed and implemented a unified Back-Office Admin module (`src/features/admin/` and `/admin` routes):
1. **Admin Layout & Navigation (`src/app/admin/layout.tsx`, `AdminSidebar`)**:
   - Sidebar navigation linking Overview, Menu Catalog, Thermal Printers, and QR Tent Cards.
   - Quick-action buttons to jump directly to Staff POS, Active Orders, or Kitchen Display.
2. **Dashboard Overview (`AdminDashboardOverview.tsx`)**:
   - Real-time KPI summaries: Today's gross revenue, active orders count, active dining tables, and operational printer fleet status.
   - Live revenue velocity metrics, category breakdowns, and low-inventory / out-of-stock alerts.
3. **Menu Catalog Management (`MenuCatalogManager.tsx`)**:
   - Instant search and category filtering across the entire culinary catalog.
   - In-place availability toggle (86-ing items) to immediately reflect out-of-stock items in customer menus.
   - Item creation and price inspection interface.
4. **Thermal Printer Fleet & Job Queue Manager (`PrinterFleetManager.tsx`)**:
   - Monitor ESC/POS network and USB thermal printers (KOT, Receipt, Bar).
   - Real-time connection status (online, degraded, offline) and paper-level monitoring.
   - Print job audit log with instant retry capabilities for failed or jammed jobs.
5. **QR Code Tent Card Generator & Provisioning (`QRCodeGeneratorManager.tsx`)**:
   - Dynamic SVG table QR generation based on table identifiers and encryption tokens.
   - Single-table preview and bulk-print/export tent cards formatted for standard acrylic table stands.
6. **Custom Printer Hooks (`usePrinters.ts`)**:
   - `usePrinters`, `usePrintJobs`, `useCreatePrintJob`, `useRetryPrintJob` integrating TanStack Query with optimistic cache invalidation.

## Consequences

- Full operational visibility for management without requiring access to raw database tables or manual printer terminal reboots.
- Complete separation of concerns: Admin components communicate cleanly with mock printer and menu services, fully prepared for backend REST/GraphQL drop-in.
