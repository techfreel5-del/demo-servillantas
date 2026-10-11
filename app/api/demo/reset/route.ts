import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { unauthorized } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || new URL(req.url).searchParams.get("token");
  if (token !== (process.env.DEMO_ADMIN_TOKEN || "demo")) {
    return unauthorized("Token de admin invalido");
  }

  try {
    execSync("npx tsx prisma/seed.ts", { cwd: process.cwd(), timeout: 15000 });
    return NextResponse.json({ reset: true, message: "Base de datos reiniciada con datos de demo" });
  } catch {
    return NextResponse.json({ error: "Error reseteando la demo" }, { status: 500 });
  }
}
