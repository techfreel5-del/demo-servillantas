import { prisma } from "./prisma";
import { createHash } from "crypto";

export function hashRequest(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

export type IdempotencyStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface IdempotencyCheckResult {
  status: "new" | "replay" | "mismatch" | "in_progress";
  existingResponse?: { code: number; body: string };
  orderId?: string;
}

export async function checkIdempotencyKey(
  key: string,
  requestHash: string
): Promise<IdempotencyCheckResult> {
  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });

  if (!existing) {
    return { status: "new" };
  }

  if (existing.status === "COMPLETED" && existing.requestHash === requestHash) {
    return {
      status: "replay",
      existingResponse: {
        code: existing.responseCode || 200,
        body: existing.responseBody || "{}",
      },
      orderId: existing.orderId || undefined,
    };
  }

  if (existing.requestHash !== requestHash) {
    return { status: "mismatch" };
  }

  if (existing.status === "IN_PROGRESS") {
    return { status: "in_progress" };
  }

  // Status is FAILED — allow retry
  return { status: "new" };
}

export async function acquireIdempotencyKey(
  key: string,
  requestHash: string
): Promise<boolean> {
  try {
    await prisma.idempotencyKey.upsert({
      where: { key },
      update: { status: "IN_PROGRESS", requestHash },
      create: {
        key,
        requestHash,
        status: "IN_PROGRESS",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function completeIdempotencyKey(
  key: string,
  responseCode: number,
  responseBody: string,
  orderId?: string
) {
  await prisma.idempotencyKey.update({
    where: { key },
    data: {
      status: "COMPLETED",
      responseCode,
      responseBody,
      orderId: orderId || null,
    },
  });
}

export async function failIdempotencyKey(key: string) {
  await prisma.idempotencyKey.updateMany({
    where: { key, status: "IN_PROGRESS" },
    data: { status: "FAILED" },
  }).catch(() => {});
}
