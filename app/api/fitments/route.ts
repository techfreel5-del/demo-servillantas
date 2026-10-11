import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const make = searchParams.get("make");
    const model = searchParams.get("model");
    const year = searchParams.get("year");

    // Step 1: list makes
    if (!make) {
      const makes = await prisma.vehicleFitment.findMany({
        select: { make: true },
        distinct: ["make"],
        orderBy: { make: "asc" },
      });
      return NextResponse.json({ makes: makes.map((m) => m.make) });
    }

    // Step 2: list models for make
    if (make && !model) {
      const models = await prisma.vehicleFitment.findMany({
        where: { make },
        select: { model: true },
        distinct: ["model"],
        orderBy: { model: "asc" },
      });
      return NextResponse.json({ models: models.map((m) => m.model) });
    }

    // Step 3: list years for make+model
    if (make && model && !year) {
      const years = await prisma.vehicleFitment.findMany({
        where: { make, model },
        select: { year: true },
        distinct: ["year"],
        orderBy: { year: "desc" },
      });
      return NextResponse.json({ years: years.map((y) => y.year) });
    }

    // Step 4: get recommended tires
    if (make && model && year) {
      const fitments = await prisma.vehicleFitment.findMany({
        where: { make, model, year: parseInt(year) },
      });

      if (fitments.length === 0) {
        return NextResponse.json({ fitments: [], products: [] });
      }

      // Find matching products
      const conditions = fitments.map((f) => ({
        width: f.width,
        aspectRatio: f.aspectRatio,
        rim: f.rim,
      }));

      const products = await prisma.product.findMany({
        where: { OR: conditions },
        include: { inventory: true },
        orderBy: [{ isFeatured: "desc" }, { priceCents: "asc" }],
      });

      return NextResponse.json({
        fitments: fitments.map((f) => ({
          id: f.id,
          make: f.make,
          model: f.model,
          year: f.year,
          version: f.version,
          measure: `${f.width}/${f.aspectRatio} R${f.rim}`,
        })),
        products: products.map((p) => ({
          id: p.id,
          sku: p.sku,
          brand: p.brand,
          model: p.model,
          measure: `${p.width}/${p.aspectRatio} R${p.rim}`,
          priceCents: p.priceCents,
          compareAtPriceCents: p.compareAtPriceCents,
          imageSvgSeed: p.imageSvgSeed,
          isFeatured: p.isFeatured,
          totalStock: p.inventory.reduce((s, i) => s + Math.max(0, i.physical - i.reserved), 0),
        })),
      });
    }

    return NextResponse.json({ makes: [] });
  } catch {
    return NextResponse.json({ error: "Error al buscar compatibilidad" }, { status: 500 });
  }
}
