import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeStock = searchParams.get("includeStock") === "true";

    const branches = await prisma.branch.findMany({
      orderBy: { name: "asc" },
      include: includeStock ? { inventory: { include: { product: true } } } : undefined,
    });

    const result = branches.map((b) => {
      const base = {
        id: b.id,
        code: b.code,
        name: b.name,
        address: b.address,
        city: b.city,
        state: b.state,
        hours: b.hours,
        lat: b.lat,
        lng: b.lng,
        supportsPayAtBranch: b.supportsPayAtBranch,
      };

      if (includeStock && "inventory" in b) {
        const inv = (b as typeof b & { inventory: { physical: number; reserved: number }[] }).inventory;
        return {
          ...base,
          totalProducts: inv.length,
          totalPhysical: inv.reduce((s, i) => s + i.physical, 0),
          totalAvailable: inv.reduce((s, i) => s + Math.max(0, i.physical - i.reserved), 0),
        };
      }

      return base;
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error al obtener sucursales" }, { status: 500 });
  }
}
