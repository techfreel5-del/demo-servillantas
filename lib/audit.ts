import { prisma } from "./prisma";

export type AuditSource = "CHECKOUT" | "INVENTORY" | "PAYMENT_GW" | "WEBHOOK" | "QUEUE" | "ERP" | "PAC" | "SYSTEM";
export type AuditLevel = "INFO" | "PROCESSING" | "SUCCESS" | "WARN" | "ERROR";

export async function logAudit(
  source: AuditSource,
  level: AuditLevel,
  message: string,
  options?: {
    orderId?: string;
    correlationId?: string;
    httpStatus?: number;
    durationMs?: number;
    metadata?: Record<string, unknown>;
  }
) {
  return prisma.auditLog.create({
    data: {
      source,
      level,
      message,
      orderId: options?.orderId ?? null,
      correlationId: options?.correlationId ?? "",
      httpStatus: options?.httpStatus ?? null,
      durationMs: options?.durationMs ?? null,
      metadata: options?.metadata ? JSON.stringify(options.metadata) : "{}",
    },
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simulate network latency with random range */
export function simulateLatency(minMs = 300, maxMs = 1500): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return delay(ms);
}

/** Chaos engineering: returns true with given probability */
export function chaos(probability?: number): boolean {
  const rate = probability ?? parseFloat(process.env.CHAOS_ERP_FAILURE_RATE || "0");
  return Math.random() < rate;
}
