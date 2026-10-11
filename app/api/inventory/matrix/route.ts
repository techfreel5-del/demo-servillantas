import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [branches, products, inventory] = await Promise.all([
      prisma.branch.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({ orderBy: [{ brand: "asc" }, { model: "asc" }] }),
      prisma.branchInventory.findMany(),
    ]);

    // Build inventory map: branchId -> productId -> { physical, reserved, available }
    const invMap = new Map<string, Map<string, { physical: number; reserved: number; available: number }>>();
    for (const inv of inventory) {
      if (!invMap.has(inv.branchId)) invMap.set(inv.branchId, new Map());
      invMap.get(inv.branchId)!.set(inv.productId, {
        physical: inv.physical,
        reserved: inv.reserved,
        available: Math.max(0, inv.physical - inv.reserved),
      });
    }

    const matrix = products.map((p) => ({
      productId: p.id,
      sku: p.sku,
      brand: p.brand,
      model: p.model,
      measure: `${p.width}/${p.aspectRatio} R${p.rim}`,
      branches: branches.map((b) => {
        const inv = invMap.get(b.id)?.get(p.id);
        return {
          branchId: b.id,
          branchCode: b.code,
          branchName: b.name,
          physical: inv?.physical ?? 0,
          reserved: inv?.reserved ?? 0,
          available: inv?.available ?? 0,
        };
      }),
    }));

    // Summary stats
    const totalPhysical = inventory.reduce((s, i) => s + i.physical, 0);
    const totalReserved = inventory.reduce((s, i) => s + i.reserved, 0);

    return NextResponse.json({
      branches: branches.map((b) => ({ id: b.id, code: b.code, name: b.name })),
      matrix,
      summary: {
        totalProducts: products.length,
        totalBranches: branches.length,
        totalPhysical,
        totalReserved,
        totalAvailable: totalPhysical - totalReserved,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener matriz de inventario" }, { status: 500 });
  }
}
