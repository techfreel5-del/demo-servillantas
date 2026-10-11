import { describe, it, expect } from "vitest";
import { checkoutSchema, webhookPayloadSchema, erpSyncSchema } from "@/lib/schemas";

describe("Zod Schemas", () => {
  describe("checkoutSchema", () => {
    it("validates a valid checkout payload", () => {
      const result = checkoutSchema.safeParse({
        branchId: "branch-cen",
        items: [{ productId: "prod-1", qty: 4 }],
        email: "test@demo.mx",
        paymentMethod: "TARJETA",
      });
      expect(result.success).toBe(true);
    });

    it("applies defaults for optional fields", () => {
      const result = checkoutSchema.safeParse({
        branchId: "branch-cen",
        items: [{ productId: "prod-1", qty: 2 }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fulfillment).toBe("PICKUP");
        expect(result.data.paymentMethod).toBe("TARJETA");
        expect(result.data.requiresInvoice).toBe(false);
      }
    });

    it("rejects empty branchId", () => {
      const result = checkoutSchema.safeParse({
        branchId: "",
        items: [{ productId: "p", qty: 1 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty items array", () => {
      const result = checkoutSchema.safeParse({
        branchId: "branch-cen",
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects qty <= 0", () => {
      const result = checkoutSchema.safeParse({
        branchId: "branch-cen",
        items: [{ productId: "p", qty: 0 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects qty > 20", () => {
      const result = checkoutSchema.safeParse({
        branchId: "branch-cen",
        items: [{ productId: "p", qty: 21 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid paymentMethod", () => {
      const result = checkoutSchema.safeParse({
        branchId: "branch-cen",
        items: [{ productId: "p", qty: 1 }],
        paymentMethod: "BITCOIN",
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 10 items", () => {
      const items = Array.from({ length: 11 }, (_, i) => ({ productId: `p-${i}`, qty: 1 }));
      const result = checkoutSchema.safeParse({
        branchId: "branch-cen",
        items,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("webhookPayloadSchema", () => {
    it("validates a valid webhook payload", () => {
      const result = webhookPayloadSchema.safeParse({
        event: "payment.approved",
        orderId: "ord-123",
        providerEventId: "evt-456",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid event type", () => {
      const result = webhookPayloadSchema.safeParse({
        event: "payment.unknown",
        orderId: "ord-123",
        providerEventId: "evt-456",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing orderId", () => {
      const result = webhookPayloadSchema.safeParse({
        event: "payment.approved",
        providerEventId: "evt-456",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("erpSyncSchema", () => {
    it("validates a valid ERP sync payload", () => {
      const result = erpSyncSchema.safeParse({ orderId: "ord-123" });
      expect(result.success).toBe(true);
    });

    it("rejects empty orderId", () => {
      const result = erpSyncSchema.safeParse({ orderId: "" });
      expect(result.success).toBe(false);
    });
  });
});
