import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { problemResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { code, subtotalCents } = await req.json();

    if (!code) {
      return problemResponse({
        type: "VALIDATION_ERROR",
        title: "Codigo de cupon requerido",
        status: 422,
      });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        reason: "Cupon no encontrado",
      });
    }

    if (!coupon.active) {
      return NextResponse.json({
        valid: false,
        reason: "Cupon inactivo",
      });
    }

    if (coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json({
        valid: false,
        reason: "Cupon agotado",
      });
    }

    const discountCents = subtotalCents
      ? Math.round((subtotalCents * coupon.discountPercent) / 100)
      : 0;

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountCents,
      remainingUses: coupon.maxUses - coupon.currentUses,
    });
  } catch {
    return NextResponse.json({ error: "Error validando cupon" }, { status: 500 });
  }
}
