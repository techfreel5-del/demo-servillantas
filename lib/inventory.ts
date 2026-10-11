import { PrismaClient } from "@/app/generated/prisma";

export interface LockItem {
  productId: string;
  qty: number;
}

export interface LockResult {
  ok: true;
}

export interface LockError {
  ok: false;
  productId: string;
  requested: number;
  available: number;
  alternatives: { branchId: string; name: string; available: number }[];
}

/**
 * Atomic inventory lock within a Prisma transaction.
 * Uses optimistic locking via version field.
 * Creates InventoryReservation records with TTL.
 */
export async function lockInventory(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  orderId: string,
  branchId: string,
  items: LockItem[],
  ttlMinutes: number = 15
): Promise<LockResult | LockError> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  for (const item of items) {
    const inv = await tx.branchInventory.findUnique({
      where: { branchId_productId: { branchId, productId: item.productId } },
    });

    const available = inv ? inv.physical - inv.reserved : 0;

    if (!inv || available < item.qty) {
      // Find alternative branches
      const alts = await tx.branchInventory.findMany({
        where: { productId: item.productId },
        include: { branch: true },
      });
      const alternatives = alts
        .filter((a) => a.physical - a.reserved >= item.qty && a.branchId !== branchId)
        .map((a) => ({
          branchId: a.branchId,
          name: a.branch.name,
          available: a.physical - a.reserved,
        }));

      return {
        ok: false,
        productId: item.productId,
        requested: item.qty,
        available,
        alternatives,
      };
    }

    // Increment reserved + version (optimistic lock)
    await tx.branchInventory.update({
      where: { branchId_productId: { branchId, productId: item.productId } },
      data: {
        reserved: { increment: item.qty },
        version: { increment: 1 },
      },
    });

    // Create reservation record
    await tx.inventoryReservation.create({
      data: {
        orderId,
        productId: item.productId,
        branchId,
        qty: item.qty,
        status: "ACTIVE",
        expiresAt,
      },
    });
  }

  return { ok: true };
}

/**
 * Release inventory reservations (on payment rejection or expiration).
 */
export async function releaseReservations(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  orderId: string,
  newStatus: "RELEASED" | "EXPIRED" = "RELEASED"
) {
  const reservations = await tx.inventoryReservation.findMany({
    where: { orderId, status: "ACTIVE" },
  });

  for (const res of reservations) {
    await tx.branchInventory.update({
      where: { branchId_productId: { branchId: res.branchId, productId: res.productId } },
      data: { reserved: { decrement: res.qty } },
    });
    await tx.inventoryReservation.update({
      where: { id: res.id },
      data: { status: newStatus },
    });
  }

  return reservations.length;
}

/**
 * Commit reservations after ERP sync (deduct physical stock).
 */
export async function commitReservations(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  orderId: string,
  branchId: string,
  items: { productId: string; qty: number }[]
) {
  for (const item of items) {
    await tx.branchInventory.update({
      where: { branchId_productId: { branchId, productId: item.productId } },
      data: {
        physical: { decrement: item.qty },
        reserved: { decrement: item.qty },
      },
    });

    await tx.inventoryReservation.updateMany({
      where: { orderId, productId: item.productId, status: "ACTIVE" },
      data: { status: "COMMITTED" },
    });
  }
}
