import { processQueue } from "@/lib/queue-runner";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const processed = await processQueue();
    return NextResponse.json({ processed });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
