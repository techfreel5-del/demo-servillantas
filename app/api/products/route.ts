import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const width = searchParams.get("width");
    const series = searchParams.get("series");
    const rim = searchParams.get("rim");
    const brand = searchParams.get("brand");
    const usage = searchParams.get("usage");
    const runFlat = searchParams.get("runFlat");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "featured";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const q = searchParams.get("q");

    // Build where clause
    const where: Record<string, unknown> = {};
    if (width) where.width = parseInt(width);
    if (series) where.aspectRatio = parseInt(series);
    if (rim) where.rim = parseInt(rim);
    if (brand) where.brand = brand;
    if (usage) where.usage = usage;
    if (runFlat === "true") where.runFlat = true;
    if (minPrice || maxPrice) {
      where.priceCents = {};
      if (minPrice) (where.priceCents as Record<string, number>).gte = parseInt(minPrice) * 100;
      if (maxPrice) (where.priceCents as Record<string, number>).lte = parseInt(maxPrice) * 100;
    }
    if (q) {
      where.OR = [
        { brand: { contains: q } },
        { model: { contains: q } },
        { description: { contains: q } },
      ];
    }

    // Sorting
    const orderBy: Record<string, string>[] = [];
    switch (sort) {
      case "price_asc": orderBy.push({ priceCents: "asc" }); break;
      case "price_desc": orderBy.push({ priceCents: "desc" }); break;
      case "brand": orderBy.push({ brand: "asc" }, { model: "asc" }); break;
      case "newest": orderBy.push({ createdAt: "desc" }); break;
      default: orderBy.push({ isFeatured: "desc" }, { priceCents: "asc" }); break;
    }

    // Count total
    const total = await prisma.product.count({ where });

    // Fetch products with pagination
    const products = await prisma.product.findMany({
      where,
      include: {
        inventory: branchId ? { where: { branchId } } : true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Build facets (aggregations)
    const [brands, usages, widths, rims, priceRange] = await Promise.all([
      prisma.product.groupBy({ by: ["brand"], _count: true, where, orderBy: { brand: "asc" } }),
      prisma.product.groupBy({ by: ["usage"], _count: true, where, orderBy: { usage: "asc" } }),
      prisma.product.groupBy({ by: ["width"], _count: true, where, orderBy: { width: "asc" } }),
      prisma.product.groupBy({ by: ["rim"], _count: true, where, orderBy: { rim: "asc" } }),
      prisma.product.aggregate({ where, _min: { priceCents: true }, _max: { priceCents: true } }),
    ]);

    const items = products.map((p) => {
      const inv = branchId ? p.inventory[0] : null;
      const totalStock = branchId ? null : p.inventory.reduce((s, i) => s + Math.max(0, i.physical - i.reserved), 0);
      const available = inv ? Math.max(0, inv.physical - inv.reserved) : totalStock;
      return {
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        brand: p.brand,
        model: p.model,
        width: p.width,
        aspectRatio: p.aspectRatio,
        rim: p.rim,
        loadIndex: p.loadIndex,
        speedRating: p.speedRating,
        usage: p.usage,
        priceCents: p.priceCents,
        compareAtPriceCents: p.compareAtPriceCents,
        imageSvgSeed: p.imageSvgSeed,
        isFeatured: p.isFeatured,
        description: p.description,
        runFlat: p.runFlat,
        treadwear: p.treadwear,
        traction: p.traction,
        temperature: p.temperature,
        sidewall: p.sidewall,
        loadCapacity: p.loadCapacity,
        plies: p.plies,
        maxLoadKg: p.maxLoadKg,
        originalEquipment: p.originalEquipment,
        available,
        measure: `${p.width}/${p.aspectRatio} R${p.rim}`,
      };
    });

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      facets: {
        brands: brands.map((b) => ({ value: b.brand, count: b._count })),
        usages: usages.map((u) => ({ value: u.usage, count: u._count })),
        widths: widths.map((w) => ({ value: w.width, count: w._count })),
        rims: rims.map((r) => ({ value: r.rim, count: r._count })),
        priceRange: {
          min: priceRange._min.priceCents ? priceRange._min.priceCents / 100 : 0,
          max: priceRange._max.priceCents ? priceRange._max.priceCents / 100 : 0,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}
