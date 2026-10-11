import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { notFound } from "@/lib/errors";
import { getAvailableEvents, isTerminalStatus } from "@/lib/orders/stateMachine";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, service: true } },
        branch: true,
        payments: true,
        invoices: true,
        reservations: true,
      },
    });

    if (!order) {
      return notFound("Orden");
    }

    // Get audit timeline
    const timeline = await prisma.auditLog.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
    });

    // Get outbox events for this order
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { aggregateId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      order,
      timeline,
      outboxEvents,
      availableEvents: getAvailableEvents(order.status),
      isTerminal: isTerminalStatus(order.status),
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener orden" }, { status: 500 });
  }
}
