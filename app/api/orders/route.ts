import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const branchId = searchParams.get("branchId");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true, service: true } },
          branch: true,
          payments: true,
          invoices: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener ordenes" }, { status: 500 });
  }
}
