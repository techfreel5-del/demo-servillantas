import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const orderId = searchParams.get("orderId");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: Record<string, unknown> = {};
    if (since) where.createdAt = { gt: new Date(since) };
    if (orderId) where.orderId = orderId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Error al obtener logs" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.auditLog.deleteMany();
    return NextResponse.json({ cleared: true });
  } catch {
    return NextResponse.json({ error: "Error al limpiar logs" }, { status: 500 });
  }
}
