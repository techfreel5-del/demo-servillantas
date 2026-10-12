import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { fetchProcessableEvents, markProcessing, markDone, markFailed } from "@/lib/outbox";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const events = await fetchProcessableEvents(5);

    if (events.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    let processed = 0;

    for (const event of events) {
      await markProcessing(event.id);

      try {
        if (event.type === "payment.approved") {
          await logAudit("QUEUE", "PROCESSING", `Procesando evento payment.approved`, {
            orderId: event.aggregateId,
            correlationId: event.correlationId,
          });

          const res = await fetch(`${appUrl}/api/erp/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ERP_API_KEY || "erp_demo_key",
              "x-correlation-id": event.correlationId,
            },
            body: JSON.stringify({ orderId: event.aggregateId }),
          });

          if (!res.ok) throw new Error(`ERP responded ${res.status}`);

          // Enqueue next step
          await prisma.outboxEvent.create({
            data: {
              type: "erp.synced",
              aggregateId: event.aggregateId,
              correlationId: event.correlationId,
              payload: JSON.stringify({ orderId: event.aggregateId }),
              status: "PENDING",
            },
          });

          await markDone(event.id);

        } else if (event.type === "erp.synced") {
          const order = await prisma.order.findUnique({ where: { id: event.aggregateId } });

          if (order?.requiresInvoice) {
            await logAudit("QUEUE", "PROCESSING", `Procesando evento erp.synced - Disparando facturacion`, {
              orderId: event.aggregateId,
              correlationId: event.correlationId,
            });

            const res = await fetch(`${appUrl}/api/facturacion/timbrar`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-correlation-id": event.correlationId,
              },
              body: JSON.stringify({ orderId: event.aggregateId }),
            });

            if (!res.ok) throw new Error(`Facturacion responded ${res.status}`);
            await markDone(event.id);
          } else {
            await prisma.order.update({
              where: { id: event.aggregateId },
              data: { status: "COMPLETADO" },
            });

            await logAudit("QUEUE", "SUCCESS", `Orden completada (sin factura solicitada)`, {
              orderId: event.aggregateId,
              correlationId: event.correlationId,
            });

            await markDone(event.id);
          }

        } else if (event.type === "invoice.stamped") {
          await logAudit("QUEUE", "SUCCESS", `Confirmacion enviada al cliente (simulada)`, {
            orderId: event.aggregateId,
            correlationId: event.correlationId,
          });

          await markDone(event.id);
        }

        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        const { nextStatus, backoffMs } = await markFailed(event.id, event.attempts + 1, msg);

        await logAudit("QUEUE", "ERROR", `Error procesando ${event.type}: ${msg} - Reintento ${event.attempts + 1}/5 en ${backoffMs / 1000}s`, {
          orderId: event.aggregateId,
          correlationId: event.correlationId,
          metadata: { attempt: event.attempts + 1, nextRetryMs: backoffMs },
        });

        if (nextStatus === "DEAD") {
          await logAudit("QUEUE", "ERROR", `Evento ${event.type} movido a DLQ despues de 5 intentos`, {
            orderId: event.aggregateId,
            correlationId: event.correlationId,
          });
        }
      }
    }

    // If we processed events that may have enqueued more, process them immediately
    if (processed > 0) {
      const moreEvents = await fetchProcessableEvents(5);
      if (moreEvents.length > 0) {
        // Fire next round non-blocking (works on Vercel unlike setTimeout)
        fetch(`${appUrl}/api/queue/process`, { method: "POST" }).catch(() => {});
      }
    }

    return NextResponse.json({ processed, total: events.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
