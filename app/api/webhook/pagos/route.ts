import { prisma } from "@/lib/prisma";
import { logAudit, simulateLatency } from "@/lib/audit";
import { verifyWebhookSignature } from "@/lib/payments/signature";
import { webhookPayloadSchema } from "@/lib/schemas";
import { problemResponse, unauthorized } from "@/lib/errors";
import { releaseReservations } from "@/lib/inventory";
import { transition } from "@/lib/orders/stateMachine";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const correlationId = randomUUID().slice(0, 8);
  const startTime = Date.now();
  const rawBody = await req.text();

  try {
    const signature = req.headers.get("x-signature") || "";
    const secret = process.env.WEBHOOK_SECRET || "whsec_demo_123";

    // Verify HMAC signature
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      await logAudit("WEBHOOK", "ERROR", `[401] Firma HMAC invalida - webhook rechazado`, {
        correlationId,
        httpStatus: 401,
      });
      return unauthorized("Firma invalida", correlationId);
    }

    // Validate payload with Zod
    const parsed = webhookPayloadSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      return problemResponse({
        type: "VALIDATION_ERROR",
        title: "Payload de webhook invalido",
        status: 422,
        correlationId,
        errors: parsed.error.issues.map((i) => ({ field: String(i.path.join(".")), message: i.message })),
      });
    }

    const { event, orderId, providerPaymentId, gateway, providerEventId } = parsed.data;

    // Deduplicate by providerEventId
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { providerEventId },
    });

    if (existingEvent) {
      await logAudit("WEBHOOK", "WARN", `[200 OK] Webhook duplicado ignorado (${providerEventId})`, {
        orderId,
        correlationId,
        httpStatus: 200,
      });
      return NextResponse.json({ processed: false, reason: "Duplicate webhook" });
    }

    // Validate state transition
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return problemResponse({ type: "NOT_FOUND", title: "Orden no encontrada", status: 404, correlationId });
    }

    const transitionResult = transition(order.status, event);
    if (!transitionResult.ok) {
      await logAudit("WEBHOOK", "ERROR", `Transicion invalida: ${transitionResult.message}`, {
        orderId,
        correlationId,
        httpStatus: 409,
      });
      return problemResponse({
        type: "INVALID_TRANSITION",
        title: transitionResult.message,
        status: 409,
        correlationId,
        requiresRefund: transitionResult.requiresRefund,
      });
    }

    await logAudit("WEBHOOK", "INFO", `[200 OK] Webhook recibido de ${gateway || "pasarela"} - Evento: ${event}`, {
      orderId,
      correlationId,
      httpStatus: 200,
      metadata: { providerPaymentId, providerEventId },
    });

    await simulateLatency(300, 600);

    // Transactional: record webhook + update order + create outbox event
    await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          providerEventId,
          type: event,
          signatureValid: true,
          processedAt: new Date(),
          payload: rawBody,
        },
      });

      // Update order to new state
      await tx.order.update({
        where: { id: orderId },
        data: { status: transitionResult.to },
      });

      if (event === "payment.approved") {
        await tx.payment.updateMany({
          where: { orderId, status: "PENDING" },
          data: {
            status: "APPROVED",
            providerPaymentId: providerPaymentId || "",
            rawPayload: rawBody,
          },
        });

        // Transactional Outbox: enqueue erp sync
        await tx.outboxEvent.create({
          data: {
            type: "payment.approved",
            aggregateId: orderId,
            correlationId,
            payload: JSON.stringify({ orderId, providerPaymentId }),
            status: "PENDING",
          },
        });
      } else if (event === "payment.rejected") {
        await tx.payment.updateMany({
          where: { orderId, status: "PENDING" },
          data: { status: "REJECTED", rawPayload: rawBody },
        });

        // Release inventory reservations
        await releaseReservations(tx, orderId, "RELEASED");
      }
    });

    if (event === "payment.approved") {
      await logAudit("PAYMENT_GW", "SUCCESS", `Pago confirmado - Orden actualizada a PAGADO`, {
        orderId,
        correlationId,
        durationMs: Date.now() - startTime,
        metadata: { providerPaymentId, gateway },
      });

      await logAudit("QUEUE", "INFO", `payment.approved encolado en Outbox`, {
        orderId,
        correlationId,
      });

      // Trigger queue processing (non-blocking)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      fetch(`${appUrl}/api/queue/process`, { method: "POST" }).catch(() => {});
    } else if (event === "payment.rejected") {
      await logAudit("PAYMENT_GW", "ERROR", `Pago rechazado - Reservas liberadas`, {
        orderId,
        correlationId,
        durationMs: Date.now() - startTime,
      });
    }

    return NextResponse.json({ processed: true, orderId, correlationId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    await logAudit("WEBHOOK", "ERROR", `Error procesando webhook: ${msg}`, { correlationId, httpStatus: 500 });
    return problemResponse({ type: "INTERNAL_ERROR", title: "Error procesando webhook", status: 500, correlationId });
  }
}
