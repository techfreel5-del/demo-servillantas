/**
 * demo-race.ts — Race condition demo
 *
 * Fires N concurrent checkout requests with the SAME Idempotency-Key
 * to prove that only ONE order is created and inventory is reserved once.
 *
 * Usage:
 *   npx tsx scripts/demo-race.ts [concurrency] [base-url]
 *
 * Example:
 *   npx tsx scripts/demo-race.ts 5 http://localhost:3000
 */

const CONCURRENCY = Number(process.argv[2]) || 5;
const BASE = process.argv[3] || "http://localhost:3000";

const idempotencyKey = `race-test-${Date.now()}`;

const payload = {
  branchId: "branch-cen",
  items: [{ productId: "prod-bri-tur", qty: 4 }],
  email: "race@demo.mx",
  paymentMethod: "TARJETA",
};

async function fire(index: number) {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}/api/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    const elapsed = (performance.now() - start).toFixed(0);
    const body = await res.json();
    return { index, status: res.status, elapsed, orderId: body.orderId, type: body.type };
  } catch (err: any) {
    return { index, status: 0, error: err.message };
  }
}

async function main() {
  console.log(`\n--- Race Condition Demo ---`);
  console.log(`Idempotency-Key: ${idempotencyKey}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Endpoint: ${BASE}/api/checkout\n`);

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => fire(i))
  );

  const created = results.filter((r) => r.status === 201);
  const conflicts = results.filter((r) => r.status === 409);
  const others = results.filter((r) => r.status !== 201 && r.status !== 409);

  console.log("Results:");
  for (const r of results) {
    const tag =
      r.status === 201 ? "CREATED" : r.status === 409 ? "CONFLICT" : `HTTP ${r.status}`;
    console.log(
      `  [${r.index}] ${tag} ${r.elapsed ?? "?"}ms ${r.orderId ?? r.type ?? r.error ?? ""}`
    );
  }

  console.log(`\nSummary:`);
  console.log(`  Created:   ${created.length} (should be 1)`);
  console.log(`  Conflicts: ${conflicts.length} (should be ${CONCURRENCY - 1})`);
  if (others.length) console.log(`  Other:     ${others.length}`);

  const pass = created.length === 1 && conflicts.length === CONCURRENCY - 1;
  console.log(`\n${pass ? "PASS — Idempotency works correctly" : "FAIL — Check implementation"}\n`);
  process.exit(pass ? 0 : 1);
}

main();
