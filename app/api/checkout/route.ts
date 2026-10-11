import { prisma } from "@/lib/prisma";
import { logAudit, simulateLatency } from "@/lib/audit";
import { checkoutSchema } from "@/lib/schemas";
import { problemResponse, validationError, conflict } from "@/lib/errors";
import { checkIdempotencyKey, acquireIdempotencyKey, completeIdempotencyKey, failIdempotencyKey } from "@/lib/idempotency";
import { hashRequest } from "@/lib/idempotency";
import { lockInventory } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

let folioCounter = 0;

function generateFolio(): string {
  folioCounter++;
  return `RDX-${String(folioCounter).padStart(6, "0")}`;
}

export async function POST(req: NextRequest) {
  const correlationId = randomUUID().slice(0, 8);
  const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key");
  const startTime = Date.now();

  if (!idempotencyKey) {
    return problemResponse({
      type: "MISSING_HEADER",
      title: "Idempotency-Key requerida",
      status: 400,
      detail: "Incluye el header Idempotency-Key",
      correlationId,
    });
  }

  try {
    // Validate body with Zod
    const rawBody = await req.json();
    const parseResult = checkoutSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return validationError(
        parseResult.error.issues.map((i) => ({ field: String(i.path.join(".")), message: i.message })),
        correlationId
      );
    }

    const body = parseResult.data;
    const { branchId, items, email, phone, fulfillment, paymentMethod, requiresInvoice, fiscalData, couponCode } = body;

    const requestHash = hashRequest({ branchId, items });

    // 1. Idempotency check
    const idempotencyResult = await checkIdempotencyKey(idempotencyKey, requestHash);

    if (idempotencyResult.status === "replay") {
      await logAudit("CHECKOUT", "INFO", `[200 REPLAY] Orden ya procesada (idempotency key replay)`, {
        orderId: idempotencyResult.orderId,
        correlationId,
        httpStatus: 200,
      });
      const resp = NextResponse.json(
        JSON.parse(idempotencyResult.existingResponse!.body),
        { status: idempotencyResult.existingResponse!.code }
      );
      resp.headers.set("Idempotent-Replayed", "true");
      return resp;
    }

    if (idempotencyResult.status === "mismatch") {
      return problemResponse({
        type: "IDEMPOTENCY_MISMATCH",
        title: "Key reutilizada con payload diferente",
        status: 422,
        correlationId,
      });
    }

    if (idempotencyResult.status === "in_progress") {
      return conflict("Checkout en progreso", undefined, correlationId);
    }

    // Acquire idempotency key
    const acquired = await acquireIdempotencyKey(idempotencyKey, requestHash);
    if (!acquired) {
      return conflict("No se pudo adquirir la key de idempotencia", undefined, correlationId);
    }

    await logAudit("CHECKOUT", "PROCESSING", `Orden recibida - Procesando checkout`, {
      correlationId,
      metadata: { branchId, itemCount: items.length, paymentMethod },
    });

    await simulateLatency(400, 800);

    // 2. Inventory Lock atomico
    await logAudit("INVENTORY", "PROCESSING", `Bloqueando inventario en sucursal...`, { correlationId, metadata: { branchId } });

    const ttlMinutes = parseInt(process.env.RESERVATION_TTL_MINUTES || "15");

    // Recalculate prices from server
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const priceMap = new Map(products.map((p) => [p.id, p.priceCents]));

    const folio = generateFolio();
    let orderId = "";

    try {
      await prisma.$transaction(async (tx) => {
        // Calculate totals
        let subtotalCents = items.reduce((sum, item) => sum + (priceMap.get(item.productId) || 0) * item.qty, 0);
        let discountCents = 0;

        if (couponCode) {
          const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
          if (coupon && coupon.active && coupon.currentUses < coupon.maxUses) {
            discountCents = Math.round(subtotalCents * coupon.discountPercent / 100);
            await tx.coupon.update({ where: { code: couponCode }, data: { currentUses: { increment: 1 } } });
          }
        }

        const shippingCents = fulfillment === "DELIVERY" ? 28300 : 0;
        const totalCents = subtotalCents - discountCents + shippingCents;
        const taxCents = totalCents - Math.round(totalCents / 1.16);

        // Create order first (needed for FK on InventoryReservation)
        const order = await tx.order.create({
          data: {
            folio,
            email: email || "cliente@demo.mx",
            phone: phone || "",
            branchId,
            fulfillment,
            status: "PENDIENTE_PAGO",
            paymentMethod,
            subtotalCents,
            discountCents,
            shippingCents,
            taxCents,
            totalCents,
            requiresInvoice,
            fiscalData: fiscalData ? JSON.stringify(fiscalData) : "{}",
            correlationId,
            couponCode,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                qty: item.qty,
                unitPriceCents: priceMap.get(item.productId) || 0,
              })),
            },
          },
        });

        orderId = order.id;

        // Lock inventory using lib module (with real orderId for FK)
        const lockResult = await lockInventory(tx, orderId, branchId, items, ttlMinutes);

        if (!lockResult.ok) {
          throw new Error(JSON.stringify({
            type: "OUT_OF_STOCK",
            productId: lockResult.productId,
            requested: lockResult.requested,
            available: lockResult.available,
            alternatives: lockResult.alternatives,
          }));
        }

        // Create payment record
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "MERCADOPAGO_SIM",
            status: "PENDING",
            amountCents: totalCents,
            method: paymentMethod,
          },
        });
      });
    } catch (lockError) {
      await failIdempotencyKey(idempotencyKey);

      const msg = lockError instanceof Error ? lockError.message : "Error desconocido";
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === "OUT_OF_STOCK") {
          await logAudit("INVENTORY", "ERROR", `Stock insuficiente para ${parsed.productId}`, {
            correlationId,
            httpStatus: 409,
            metadata: parsed,
          });
          return problemResponse({
            type: "OUT_OF_STOCK",
            title: "Stock insuficiente",
            status: 409,
            detail: `Disponible: ${parsed.available}, Solicitado: ${parsed.requested}`,
            alternatives: parsed.alternatives,
            correlationId,
          });
        }
      } catch {}

      await logAudit("CHECKOUT", "ERROR", `Error en inventory lock: ${msg}`, { correlationId, httpStatus: 500 });
      return problemResponse({ type: "INTERNAL_ERROR", title: "Error en checkout", status: 500, correlationId });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    await logAudit("INVENTORY", "SUCCESS", `Inventario bloqueado - Reserva activa (TTL ${ttlMinutes}min)`, {
      orderId,
      correlationId,
      durationMs: Date.now() - startTime,
    });

    await logAudit("CHECKOUT", "SUCCESS", `Orden ${folio} creada - Total: $${((order!.totalCents) / 100).toFixed(2)} MXN`, {
      orderId,
      correlationId,
      httpStatus: 201,
      durationMs: Date.now() - startTime,
      metadata: { folio, totalCents: order!.totalCents },
    });

    const responseBody = {
      orderId,
      folio,
      status: "PENDIENTE_PAGO",
      totalCents: order!.totalCents,
      redirectUrl: `/pago/simulador?orden=${orderId}`,
      correlationId,
    };

    await completeIdempotencyKey(idempotencyKey, 201, JSON.stringify(responseBody), orderId);

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    await logAudit("CHECKOUT", "ERROR", `Error en checkout: ${msg}`, { correlationId, httpStatus: 500 });

    if (idempotencyKey) {
      await failIdempotencyKey(idempotencyKey);
    }

    return problemResponse({
      type: "INTERNAL_ERROR",
      title: "Error procesando la orden",
      status: 500,
      detail: msg,
      correlationId,
    });
  }
}
