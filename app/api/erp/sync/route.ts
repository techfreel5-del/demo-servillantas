import { logAudit } from "@/lib/audit";
import { syncOrderWithErp, isErpError } from "@/lib/erp/client";
import { erpSyncSchema } from "@/lib/schemas";
import { problemResponse, unauthorized } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get("x-correlation-id") || "";
  const apiKey = req.headers.get("x-api-key");

  // Auth
  if (apiKey !== (process.env.ERP_API_KEY || "erp_demo_key")) {
    await logAudit("ERP", "ERROR", `[401] API Key invalida`, { correlationId, httpStatus: 401 });
    return unauthorized("API Key invalida", correlationId);
  }

  try {
    const body = await req.json();
    const parsed = erpSyncSchema.safeParse(body);

    if (!parsed.success) {
      return problemResponse({
        type: "VALIDATION_ERROR",
        title: "Payload invalido",
        status: 422,
        correlationId,
        errors: parsed.error.issues.map((i) => ({ field: String(i.path.join(".")), message: i.message })),
      });
    }

    const result = await syncOrderWithErp(parsed.data.orderId, correlationId);

    if (isErpError(result)) {
      return problemResponse({
        type: result.retryable ? "SERVICE_UNAVAILABLE" : "NOT_FOUND",
        title: result.error,
        status: result.status,
        correlationId,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    await logAudit("ERP", "ERROR", `Error en sincronizacion ERP: ${msg}`, { correlationId, httpStatus: 500 });
    return problemResponse({ type: "INTERNAL_ERROR", title: "Error en sincronizacion ERP", status: 500, correlationId });
  }
}
