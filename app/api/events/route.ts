import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const orderId = searchParams.get("orderId");
    const source = searchParams.get("source");
    const level = searchParams.get("level");

    const where: Record<string, unknown> = {};
    if (since) where.createdAt = { gt: new Date(since) };
    if (orderId) where.orderId = orderId;
    if (source) where.source = source;
    if (level) where.level = level;

    const [logs, queueStats, dlq, recentOrders] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.outboxEvent.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.outboxEvent.findMany({
        where: { status: "DEAD" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.order.findMany({
        select: { id: true, folio: true, status: true, totalCents: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const stats: Record<string, number> = {};
    for (const q of queueStats) {
      stats[q.status] = q._count;
    }

    return NextResponse.json({ logs, queueStats: stats, dlq, recentOrders });
  } catch {
    return NextResponse.json({ error: "Error al obtener eventos" }, { status: 500 });
  }
}
