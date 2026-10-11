import { prisma } from "./prisma";

export type OutboxEventType =
  | "payment.approved"
  | "erp.synced"
  | "invoice.stamped"
  | "invoice.skipped";

export interface CreateOutboxEventInput {
  type: OutboxEventType;
  aggregateId: string;
  correlationId: string;
  payload: Record<string, unknown>;
}

/**
 * Create an outbox event within a Prisma transaction.
 */
export async function createOutboxEvent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  input: CreateOutboxEventInput
) {
  return tx.outboxEvent.create({
    data: {
      type: input.type,
      aggregateId: input.aggregateId,
      correlationId: input.correlationId,
      payload: JSON.stringify(input.payload),
      status: "PENDING",
    },
  });
}

/**
 * Fetch events ready for processing (PENDING or FAILED with backoff elapsed).
 */
export async function fetchProcessableEvents(limit = 5) {
  return prisma.outboxEvent.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/**
 * Mark event as PROCESSING and increment attempt counter.
 */
export async function markProcessing(eventId: string) {
  return prisma.outboxEvent.update({
    where: { id: eventId },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });
}

/**
 * Mark event as DONE after successful processing.
 */
export async function markDone(eventId: string) {
  return prisma.outboxEvent.update({
    where: { id: eventId },
    data: { status: "DONE" },
  });
}

/**
 * Mark event as FAILED or DEAD with exponential backoff.
 * After maxAttempts (default 5), moves to DEAD (DLQ).
 */
export async function markFailed(
  eventId: string,
  currentAttempts: number,
  error: string,
  maxAttempts = 5
) {
  const backoffMs = Math.pow(2, currentAttempts) * 2000;
  const nextStatus = currentAttempts >= maxAttempts ? "DEAD" : "FAILED";

  await prisma.outboxEvent.update({
    where: { id: eventId },
    data: {
      status: nextStatus,
      lastError: error,
      nextAttemptAt: new Date(Date.now() + backoffMs),
    },
  });

  return { nextStatus, backoffMs };
}
