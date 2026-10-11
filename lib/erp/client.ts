import { prisma } from "../prisma";
import { logAudit, simulateLatency, chaos } from "../audit";

let erpDocCounter = 0;

export interface ErpSyncResult {
  synced: boolean;
  erpDocument: string;
  orderId: string;
}

export interface ErpSyncError {
  error: string;
  status: number;
  retryable: boolean;
}

/**
 * Sync order with ERP system (simulated).
 * Includes chaos engineering, idempotency by externalRef, and latency simulation.
 */
export async function syncOrderWithErp(
  orderId: string,
  correlationId: string
): Promise<ErpSyncResult | ErpSyncError> {
  const startTime = Date.now();

  // Idempotency: check if already synced
  const existing = await prisma.erpStockMovement.findUnique({
    where: { externalRef: orderId },
  });

  if (existing) {
    await logAudit("ERP", "INFO", `ERP sync ya procesado (idempotente) - Doc: ${existing.erpDocumentNumber}`, {
      orderId,
      correlationId,
    });
    return { synced: true, orderId, erpDocument: existing.erpDocumentNumber };
  }

  await logAudit("ERP", "PROCESSING", `Sincronizando con ERP (OkCar) - Descontando inventario fisico...`, {
    orderId,
    correlationId,
  });

  await simulateLatency(800, 2000);

  // Chaos engineering
  if (chaos()) {
    await logAudit("ERP", "ERROR", `ERP no disponible (simulado) - Reintentable`, {
      orderId,
      correlationId,
      httpStatus: 503,
      durationMs: Date.now() - startTime,
    });
    return { error: "ERP temporalmente no disponible", status: 503, retryable: true };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, branch: true },
  });

  if (!order) {
    return { error: "Orden no encontrada", status: 404, retryable: false };
  }

  // Deduct physical inventory and commit reservations
  for (const item of order.items) {
    if (!item.productId || !item.product) continue;

    await prisma.branchInventory.update({
      where: { branchId_productId: { branchId: order.branchId, productId: item.productId } },
      data: {
        physical: { decrement: item.qty },
        reserved: { decrement: item.qty },
      },
    });

    await prisma.inventoryReservation.updateMany({
      where: { orderId, productId: item.productId, status: "ACTIVE" },
      data: { status: "COMMITTED" },
    });
  }

  // Create ERP stock movement
  erpDocCounter++;
  const erpDocNumber = `SAL-2026-${String(erpDocCounter).padStart(5, "0")}`;

  const firstProductItem = order.items.find((i) => i.product);
  if (firstProductItem?.product) {
    await prisma.erpStockMovement.create({
      data: {
        externalRef: orderId,
        productSku: firstProductItem.product.sku,
        branchCode: order.branch.code,
        qty: order.items.filter((i) => i.productId).reduce((s, i) => s + i.qty, 0),
        type: "SALIDA_VENTA",
        erpDocumentNumber: erpDocNumber,
      },
    });
  }

  // Update order status
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "SINCRONIZADO_ERP" },
  });

  await logAudit("ERP", "SUCCESS", `ERP actualizado - Doc: ${erpDocNumber} - Inventario fisico descontado`, {
    orderId,
    correlationId,
    httpStatus: 200,
    durationMs: Date.now() - startTime,
    metadata: { erpDocumentNumber: erpDocNumber, branch: order.branch.code },
  });

  return { synced: true, orderId, erpDocument: erpDocNumber };
}

export function isErpError(result: ErpSyncResult | ErpSyncError): result is ErpSyncError {
  return "error" in result;
}
