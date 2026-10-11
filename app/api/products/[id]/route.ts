import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { notFound } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        inventory: { include: { branch: true } },
      },
    });

    if (!product) {
      return notFound("Producto");
    }

    // Find related services (by rim size)
    const services = await prisma.service.findMany();
    const applicableServices = services.filter(
      (s) => s.code.includes(String(product.rim)) || !s.code.startsWith("INST-")
    );

    // Find compatible vehicles
    const fitments = await prisma.vehicleFitment.findMany({
      where: {
        width: product.width,
        aspectRatio: product.aspectRatio,
        rim: product.rim,
      },
    });

    // Find similar products (same size, different brand)
    const similar = await prisma.product.findMany({
      where: {
        width: product.width,
        aspectRatio: product.aspectRatio,
        rim: product.rim,
        id: { not: product.id },
      },
      take: 4,
    });

    return NextResponse.json({
      product: {
        id: product.id,
        sku: product.sku,
        slug: product.slug,
        brand: product.brand,
        model: product.model,
        width: product.width,
        aspectRatio: product.aspectRatio,
        rim: product.rim,
        measure: `${product.width}/${product.aspectRatio} R${product.rim}`,
        loadIndex: product.loadIndex,
        speedRating: product.speedRating,
        usage: product.usage,
        priceCents: product.priceCents,
        compareAtPriceCents: product.compareAtPriceCents,
        imageSvgSeed: product.imageSvgSeed,
        isFeatured: product.isFeatured,
        description: product.description,
        runFlat: product.runFlat,
        treadwear: product.treadwear,
        traction: product.traction,
        temperature: product.temperature,
        sidewall: product.sidewall,
        loadCapacity: product.loadCapacity,
        plies: product.plies,
        maxLoadKg: product.maxLoadKg,
        originalEquipment: product.originalEquipment,
        satProductKey: product.satProductKey,
      },
      stock: product.inventory.map((inv) => ({
        branchId: inv.branchId,
        branchCode: inv.branch.code,
        branchName: inv.branch.name,
        physical: inv.physical,
        reserved: inv.reserved,
        available: Math.max(0, inv.physical - inv.reserved),
      })),
      services: applicableServices.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        priceCents: s.priceCents,
        perUnit: s.perUnit,
      })),
      compatibleVehicles: fitments.map((f) => ({
        make: f.make,
        model: f.model,
        year: f.year,
        version: f.version,
      })),
      similar: similar.map((p) => ({
        id: p.id,
        slug: p.slug,
        brand: p.brand,
        model: p.model,
        priceCents: p.priceCents,
        compareAtPriceCents: p.compareAtPriceCents,
        imageSvgSeed: p.imageSvgSeed,
        measure: `${p.width}/${p.aspectRatio} R${p.rim}`,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 });
  }
}
