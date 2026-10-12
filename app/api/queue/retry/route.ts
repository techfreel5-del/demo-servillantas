import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { problemResponse, notFound } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { eventId } = await req.json();

    if (!eventId) {
      return problemResponse({
        type: "VALIDATION_ERROR",
        title: "eventId requerido",
        status: 422,
      });
    }

    const event = await prisma.outboxEvent.findUnique({ where: { id: eventId } });
    if (!event || event.status !== "DEAD") {
      return notFound("Evento en DLQ");
    }

    await prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: "PENDING",
        attempts: 0,
        lastError: null,
        nextAttemptAt: new Date(),
      },
    });

    await logAudit("QUEUE", "INFO", `Evento ${event.type} recuperado de DLQ - Reintentar`, {
      orderId: event.aggregateId,
      correlationId: event.correlationId,
    });

    // Trigger processing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    fetch(`${appUrl}/api/queue/process`, { method: "POST" }).catch(() => {});

    return NextResponse.json({ retried: true, eventId });
  } catch {
    return NextResponse.json({ error: "Error reintentando evento" }, { status: 500 });
  }
}
