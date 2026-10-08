# ADR 0009: Digital GST E-Billing and Multi-Channel Payment Settlement Portal

## Status
Accepted

## Context
In Phase 5, we implement the digital e-billing and payment portal at `/bill/[billId]`.
To fulfill modern Indian tax compliance and luxury hospitality guest expectations, the bill must:
1. Provide an official itemized GST Tax Invoice featuring hotel branding, GSTIN, and FSSAI credentials with CGST (2.5%) and SGST (2.5%) tax segregation.
2. Accommodate dynamic gratuity / tip contributions for kitchen and floor staff.
3. Offer multi-channel payment options matching hotel dining contexts (UPI QR, Credit/Debit card with simulated instant settlement, Room Folio charges, and Cash Desk settlement).
4. Provide immediate digital receipts with print/PDF layout styling, WhatsApp/SMS sharing, and a 5-star experience rating mechanism.

## Decision
1. **Dynamic Route `/bill/[billId]` with Order Fallback**:
   - Resolves bill by ID via `useBill(billId)` or generates the bill automatically if queried via order ID.
   - Listens to real-time payment and bill updates through `useBillingUpdates(billId)`.
2. **Official GST Invoice Header & Itemized Breakdown (`InvoiceHeader` & `InvoiceItemsTable`)**:
   - Outlines hotel registration, table/room dining identifiers, item descriptions, rates, quantities, taxes, round-off, and net payable balance.
   - Clean `@media print` CSS enables direct printing or saving as PDF without browser navigation chrome.
3. **Gratuity Selector (`TipSelector`)**:
   - Supports 0%, 5%, 10%, ₹50, ₹100 presets or custom tip values with live balance recalculation.
4. **Context-Adaptive Multi-Channel Payment Modal (`PaymentModal`)**:
   - Displays UPI QR with copyable VPA, Card simulation with demo autofill, and Room Folio charge options.
   - Seamlessly executes `useRecordPayment()` mutation, updating `bill.paidAmount`, `bill.dueAmount`, and setting status to `PAID`.
5. **Post-Payment Verified Seal & Rating (`DigitalReceiptActions`)**:
   - Renders verified green payment stamp, SMS/WhatsApp digital link delivery modal, and dining experience star rating.

## Consequences
- 100% paperless billing workflow compliant with Indian hospitality GST requirements.
- Backwards and forwards compatibility between table and room dining modes.
- Verified with 56 tests passing across all 19 test suites.
- Production build passes cleanly.
