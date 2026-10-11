import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      services.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        priceCents: s.priceCents,
        perUnit: s.perUnit,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Error al obtener servicios" }, { status: 500 });
  }
}
