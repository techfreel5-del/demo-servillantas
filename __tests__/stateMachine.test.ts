import { describe, it, expect } from "vitest";
import {
  transition,
  canTransition,
  getAvailableEvents,
  isTerminalStatus,
} from "@/lib/orders/stateMachine";

describe("Order State Machine", () => {
  describe("transition", () => {
    it("PENDIENTE_PAGO + payment.approved → PAGADO", () => {
      const result = transition("PENDIENTE_PAGO", "payment.approved");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.from).toBe("PENDIENTE_PAGO");
        expect(result.to).toBe("PAGADO");
      }
    });

    it("PENDIENTE_PAGO + payment.rejected → PAGO_RECHAZADO", () => {
      const result = transition("PENDIENTE_PAGO", "payment.rejected");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.to).toBe("PAGO_RECHAZADO");
    });

    it("PENDIENTE_PAGO + payment.pending → PENDIENTE_PAGO (self)", () => {
      const result = transition("PENDIENTE_PAGO", "payment.pending");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.to).toBe("PENDIENTE_PAGO");
    });

    it("PENDIENTE_PAGO + reservation.expired → EXPIRADO", () => {
      const result = transition("PENDIENTE_PAGO", "reservation.expired");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.to).toBe("EXPIRADO");
    });

    it("PAGADO + erp.synced → SINCRONIZADO_ERP", () => {
      const result = transition("PAGADO", "erp.synced");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.to).toBe("SINCRONIZADO_ERP");
    });

    it("SINCRONIZADO_ERP + invoice.stamped → FACTURADO", () => {
      const result = transition("SINCRONIZADO_ERP", "invoice.stamped");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.to).toBe("FACTURADO");
    });

    it("SINCRONIZADO_ERP + invoice.skipped → COMPLETADO", () => {
      const result = transition("SINCRONIZADO_ERP", "invoice.skipped");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.to).toBe("COMPLETADO");
    });
  });

  describe("invalid transitions", () => {
    it("rejects payment.approved on EXPIRADO", () => {
      const result = transition("EXPIRADO", "payment.approved");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.requiresRefund).toBe(true);
    });

    it("rejects payment.approved on PAGO_RECHAZADO", () => {
      const result = transition("PAGO_RECHAZADO", "payment.approved");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.requiresRefund).toBe(true);
    });

    it("rejects erp.synced on PENDIENTE_PAGO", () => {
      const result = transition("PENDIENTE_PAGO", "erp.synced");
      expect(result.ok).toBe(false);
    });

    it("rejects payment.rejected on PAGADO", () => {
      const result = transition("PAGADO", "payment.rejected");
      expect(result.ok).toBe(false);
    });
  });

  describe("canTransition", () => {
    it("returns true for valid transitions", () => {
      expect(canTransition("PENDIENTE_PAGO", "payment.approved")).toBe(true);
    });
    it("returns false for invalid transitions", () => {
      expect(canTransition("FACTURADO", "payment.approved")).toBe(false);
    });
  });

  describe("getAvailableEvents", () => {
    it("returns events for PENDIENTE_PAGO", () => {
      const events = getAvailableEvents("PENDIENTE_PAGO");
      expect(events).toContain("payment.approved");
      expect(events).toContain("payment.rejected");
      expect(events).toContain("payment.pending");
      expect(events).toContain("reservation.expired");
    });

    it("returns empty for terminal states", () => {
      expect(getAvailableEvents("FACTURADO")).toEqual([]);
      expect(getAvailableEvents("COMPLETADO")).toEqual([]);
    });
  });

  describe("isTerminalStatus", () => {
    it("identifies terminal statuses", () => {
      expect(isTerminalStatus("FACTURADO")).toBe(true);
      expect(isTerminalStatus("COMPLETADO")).toBe(true);
      expect(isTerminalStatus("PAGO_RECHAZADO")).toBe(true);
      expect(isTerminalStatus("EXPIRADO")).toBe(true);
    });
    it("identifies non-terminal statuses", () => {
      expect(isTerminalStatus("PENDIENTE_PAGO")).toBe(false);
      expect(isTerminalStatus("PAGADO")).toBe(false);
      expect(isTerminalStatus("SINCRONIZADO_ERP")).toBe(false);
    });
  });
});
