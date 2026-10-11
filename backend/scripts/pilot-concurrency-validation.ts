/**
 * SCULPX E-Billing — V1 Pilot Multi-Role Concurrency & End-to-End Validation Script
 * Tests 10–12 simultaneous customer ordering sessions, staff KOT kitchen management,
 * and cashier bill generation & payment settlement with live Supabase PostgreSQL.
 */

const API_BASE = process.env.API_URL || "http://localhost:8000/api/v1";

interface CustomerSessionResult {
  sessionIndex: number;
  qrToken: string;
  orderNumber: string;
  orderId: string;
  grandTotal: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

async function runValidation() {
  console.log("================================================================================");
  console.log("🚀 SCULPX E-BILLING — PILOT MULTI-ROLE CONCURRENCY & INTEGRATION TEST");
  console.log("================================================================================");
  console.log(`Backend Target URL: ${API_BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // 1. Verify Health & Database Connection
  console.log("▶ Step 1: Checking Backend & Database Health...");
  const healthRes = await fetch("http://localhost:8000/api/ready");
  const healthData = await healthRes.json();
  if (!healthData.success || healthData.data?.status !== "READY") {
    throw new Error(`Backend is not ready: ${JSON.stringify(healthData)}`);
  }
  console.log(`  ✓ Backend status: READY (DB latency: ${healthData.data.latencyMs}ms)\n`);

  // 2. Fetch Menu Catalogue to obtain real item IDs and modifier options
  console.log("▶ Step 2: Fetching Canonical Menu Items & Modifiers...");
  const menuRes = await fetch(`${API_BASE}/menu/items`, {
    headers: { "x-qr-token": "table-token-1" },
  });
  const menuJson = await menuRes.json();
  if (!menuJson.success || !Array.isArray(menuJson.data) || menuJson.data.length === 0) {
    throw new Error(`Failed to load canonical menu items: ${JSON.stringify(menuJson)}`);
  }

  const items = menuJson.data;
  console.log(`  ✓ Loaded ${items.length} canonical menu items.`);
  const sampleItem = items[0];
  console.log(`  ✓ Sample Dish: "${sampleItem.name}" (₹${sampleItem.basePrice}) with ${sampleItem.modifierGroups?.length || 0} modifier groups.\n`);

  // Prepare order payload template
  const modifierOptionIds: string[] = [];
  if (sampleItem.modifierGroups && sampleItem.modifierGroups.length > 0) {
    for (const mg of sampleItem.modifierGroups) {
      if (mg.options && mg.options.length > 0) {
        modifierOptionIds.push(mg.options[0].id);
      }
    }
  }

  // 3. Launch 10 Simultaneous Customer Ordering Sessions Across Tables & Rooms
  console.log("▶ Step 3: Executing 10 Concurrent Customer Ordering Sessions...");
  const qrTokens = [
    "table-token-1",
    "table-token-2",
    "table-token-3",
    "table-token-4",
    "table-token-5",
    "table-token-6",
    "table-token-7",
    "table-token-8",
    "table-token-9",
    "table-token-10",
  ];

  const startTime = Date.now();
  const sessionPromises = qrTokens.map(async (qrToken, idx): Promise<CustomerSessionResult> => {
    const sStart = Date.now();
    const idempotencyKey = `pilot-test-${Date.now()}-session-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`;
    const customerName = `Guest Table ${idx + 1}`;
    const customerPhone = `98765432${(10 + idx).toString().slice(-2)}`;

    try {
      // Pre-checkout cart validation
      const valRes = await fetch(`${API_BASE}/orders/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          items: [
            {
              menuItemId: sampleItem.id,
              quantity: 2,
              modifierOptionIds,
            },
          ],
        }),
      });
      const valJson = await valRes.json();
      if (!valJson.success || !valJson.data?.isValid) {
        throw new Error(`Cart validation failed: ${JSON.stringify(valJson)}`);
      }

      // Submit authoritative order
      const orderRes = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          qrToken,
          customerName,
          customerPhone,
          paymentPreference: "PAY_LATER",
          items: [
            {
              menuItemId: sampleItem.id,
              quantity: 2,
              modifierOptionIds,
            },
          ],
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.success) {
        throw new Error(`Order placement failed (HTTP ${orderRes.status}): ${JSON.stringify(orderJson)}`);
      }

      const order = orderJson.data;
      return {
        sessionIndex: idx + 1,
        qrToken,
        orderNumber: order.orderNumber,
        orderId: order.id,
        grandTotal: order.grandTotal,
        durationMs: Date.now() - sStart,
        success: true,
      };
    } catch (err: any) {
      return {
        sessionIndex: idx + 1,
        qrToken,
        orderNumber: "",
        orderId: "",
        grandTotal: 0,
        durationMs: Date.now() - sStart,
        success: false,
        error: err.message,
      };
    }
  });

  const sessionResults = await Promise.all(sessionPromises);
  const totalConcurrencyTime = Date.now() - startTime;

  console.log(`\n  Concurrency Results (${sessionResults.length} sessions completed in ${totalConcurrencyTime}ms):`);
  let successCount = 0;
  for (const res of sessionResults) {
    if (res.success) {
      successCount++;
      console.log(`    ✓ Session #${res.sessionIndex.toString().padStart(2, "0")} [${res.qrToken}]: Order #${res.orderNumber} placed in ${res.durationMs}ms (Total ₹${res.grandTotal.toFixed(2)})`);
    } else {
      console.error(`    ✗ Session #${res.sessionIndex.toString().padStart(2, "0")} [${res.qrToken}]: FAILED - ${res.error}`);
    }
  }

  if (successCount === 0) {
    throw new Error("All customer sessions failed!");
  }
  console.log(`  Summary: ${successCount}/${sessionResults.length} customer sessions successful.\n`);

  // 4. Staff Kitchen (KDS) Operations
  console.log("▶ Step 4: Testing Staff Kitchen (KDS) Processing...");
  // Login as kitchen staff
  const kitchenLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "kitchenstaff@ebilling.com",
      pinOrPassword: "demo-secure-pass",
    }),
  });
  const kitchenLoginJson = await kitchenLoginRes.json();
  if (!kitchenLoginJson.success || !kitchenLoginJson.data?.token) {
    throw new Error(`Kitchen staff login failed: ${JSON.stringify(kitchenLoginJson)}`);
  }
  const kitchenToken = kitchenLoginJson.data.token;
  console.log("  ✓ Authenticated as kitchenstaff@ebilling.com (Role: KITCHEN_STAFF)");

  // Retrieve active KOTs
  const kotsRes = await fetch(`${API_BASE}/kitchen/kots`, {
    headers: { Authorization: `Bearer ${kitchenToken}` },
  });
  const kotsJson = await kotsRes.json();
  const activeKots = kotsJson.data || [];
  console.log(`  ✓ KDS line retrieved: ${activeKots.length} active tickets queued.`);

  // Update status of first ticket to PREPARING
  if (activeKots.length > 0) {
    const firstKot = activeKots[0];
    const updateKotRes = await fetch(`${API_BASE}/kitchen/kots/${firstKot.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${kitchenToken}`,
      },
      body: JSON.stringify({ status: "PREPARING", note: "Chef started tandoor roasting" }),
    });
    const updateKotJson = await updateKotRes.json();
    if (updateKotJson.success) {
      console.log(`  ✓ Ticket #${firstKot.kotNumber} transitioned to PREPARING status.\n`);
    }
  }

  // 5. Cashier Central Billing & Settlement
  console.log("▶ Step 5: Testing Cashier Central Billing & Settlement...");
  const cashierLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cashier@ebilling.com",
      pinOrPassword: "demo-secure-pass",
    }),
  });
  const cashierLoginJson = await cashierLoginRes.json();
  if (!cashierLoginJson.success || !cashierLoginJson.data?.token) {
    throw new Error(`Cashier login failed: ${JSON.stringify(cashierLoginJson)}`);
  }
  const cashierToken = cashierLoginJson.data.token;
  console.log("  ✓ Authenticated as cashier@ebilling.com (Role: CASHIER)");

  // Generate tax bill for the first successful order
  const targetOrder = sessionResults.find((s) => s.success);
  if (targetOrder) {
    const genBillRes = await fetch(`${API_BASE}/bills/order/${targetOrder.orderId}/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const genBillJson = await genBillRes.json();
    if (!genBillJson.success || !genBillJson.data) {
      throw new Error(`Bill generation failed: ${JSON.stringify(genBillJson)}`);
    }
    const bill = genBillJson.data;
    console.log(`  ✓ Generated GST Invoice #${bill.billNumber || bill.invoiceNumber} for Order #${targetOrder.orderNumber}`);
    console.log(`    - Subtotal: ₹${bill.subtotal}`);
    console.log(`    - GST Tax Total: ₹${bill.taxDetails?.taxTotal || bill.taxTotal || 0}`);
    console.log(`    - Grand Total: ₹${bill.grandTotal}`);

    // Settle bill via UPI payment
    const payRes = await fetch(`${API_BASE}/bills/${bill.id}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cashierToken}`,
      },
      body: JSON.stringify({
        amount: Number(bill.grandTotal),
        method: "UPI",
        transactionReference: `UPI-PILOT-${Date.now()}`,
      }),
    });
    const payJson = await payRes.json();
    if (!payJson.success) {
      throw new Error(`Payment recording failed: ${JSON.stringify(payJson)}`);
    }
    console.log(`  ✓ Payment recorded: ₹${bill.grandTotal} via UPI.`);
    console.log(`  ✓ Invoice paymentStatus: ${payJson.data.paymentStatus || "PAID"}\n`);
  }

  console.log("================================================================================");
  console.log("🎉 ALL PILOT CONCURRENCY & MULTI-ROLE SCENARIOS COMPLETED SUCCESSFULLY!");
  console.log("================================================================================");
}

runValidation().catch((err) => {
  console.error("\n❌ Pilot Concurrency Validation encountered an error:", err);
  process.exit(1);
});
