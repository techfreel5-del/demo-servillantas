/**
 * demo-duplicate-webhook.ts — Duplicate webhook deduplication demo
 *
 * Sends the same webhook event multiple times to prove that only the
 * first is processed and subsequent ones are rejected as duplicates.
 *
 * Prerequisites:
 *   1. Server running at BASE_URL
 *   2. An existing order (creates one via checkout first)
 *
 * Usage:
 *   npx tsx scripts/demo-duplicate-webhook.ts [duplicates] [base-url]
 *
 * Example:
 *   npx tsx scripts/demo-duplicate-webhook.ts 3 http://localhost:3000
 */

import { createHmac } from "crypto";

const DUPLICATES = Number(process.argv[2]) || 3;
const BASE = process.argv[3] || "http://localhost:3000";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "whsec_demo_secret_2024";

function sign(payload: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
}

async function createOrder(): Promise<string> {
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `dup-webhook-${Date.now()}`,
    },
    body: JSON.stringify({
      branchId: "branch-cen",
      items: [{ productId: "prod-bri-tur", qty: 2 }],
      email: "webhook@demo.mx",
      paymentMethod: "TARJETA",
    }),
  });

  if (res.status !== 201) {
    const body = await res.json();
    throw new Error(`Checkout failed: ${res.status} ${JSON.stringify(body)}`);
  }

  const { orderId } = await res.json();
  return orderId;
}

async function sendWebhook(orderId: string, providerEventId: string, index: number) {
  const body = JSON.stringify({
    event: "payment.approved",
    orderId,
    providerEventId,
    providerPaymentId: `pay-dup-${Date.now()}`,
    gateway: "DEMO",
  });

  const signature = sign(body);
  const start = performance.now();

  try {
    const res = await fetch(`${BASE}/api/webhook/pagos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
      },
      body,
    });
    const elapsed = (performance.now() - start).toFixed(0);
    const data = await res.json();
    return { index, status: res.status, elapsed, type: data.type, title: data.title };
  } catch (err: any) {
    return { index, status: 0, error: err.message };
  }
}

async function main() {
  console.log(`\n--- Duplicate Webhook Demo ---`);
  console.log(`Duplicates to send: ${DUPLICATES}`);
  console.log(`Endpoint: ${BASE}/api/webhook/pagos\n`);

  // Step 1: Create an order
  console.log("Creating order...");
  const orderId = await createOrder();
  console.log(`Order created: ${orderId}\n`);

  // Step 2: Send same webhook event multiple times
  const providerEventId = `evt-dedup-${Date.now()}`;
  console.log(`Provider Event ID: ${providerEventId}`);
  console.log(`Sending ${DUPLICATES} identical webhooks...\n`);

  const results = [];
  for (let i = 0; i < DUPLICATES; i++) {
    const r = await sendWebhook(orderId, providerEventId, i);
    results.push(r);
    console.log(
      `  [${i}] HTTP ${r.status} ${r.elapsed}ms — ${r.type ?? r.title ?? r.error ?? ""}`
    );
  }

  const accepted = results.filter((r) => r.status === 200);
  const duplicates = results.filter((r) => r.status === 409);
  const others = results.filter((r) => r.status !== 200 && r.status !== 409);

  console.log(`\nSummary:`);
  console.log(`  Accepted:   ${accepted.length} (should be 1)`);
  console.log(`  Duplicates: ${duplicates.length} (should be ${DUPLICATES - 1})`);
  if (others.length) console.log(`  Other:      ${others.length}`);

  const pass = accepted.length === 1 && duplicates.length === DUPLICATES - 1;
  console.log(`\n${pass ? "PASS — Webhook deduplication works" : "FAIL — Check implementation"}\n`);
  process.exit(pass ? 0 : 1);
}

main();
