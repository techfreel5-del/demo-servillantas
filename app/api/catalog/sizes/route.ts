import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const width = searchParams.get("width");
    const series = searchParams.get("series");

    if (!width && !series) {
      const widths = await prisma.product.findMany({
        select: { width: true },
        distinct: ["width"],
        orderBy: { width: "asc" },
      });
      return NextResponse.json({ widths: widths.map((w) => w.width) });
    }

    if (width && !series) {
      const seriesList = await prisma.product.findMany({
        where: { width: parseInt(width) },
        select: { aspectRatio: true },
        distinct: ["aspectRatio"],
        orderBy: { aspectRatio: "asc" },
      });
      return NextResponse.json({ series: seriesList.map((s) => s.aspectRatio) });
    }

    if (width && series) {
      const rims = await prisma.product.findMany({
        where: { width: parseInt(width), aspectRatio: parseInt(series) },
        select: { rim: true },
        distinct: ["rim"],
        orderBy: { rim: "asc" },
      });
      return NextResponse.json({ rims: rims.map((r) => r.rim) });
    }

    return NextResponse.json({ widths: [], series: [], rims: [] });
  } catch {
    return NextResponse.json({ error: "Error al obtener medidas" }, { status: 500 });
  }
}
