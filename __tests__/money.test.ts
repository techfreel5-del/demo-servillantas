import { describe, it, expect } from "vitest";
import { formatMXN, calcIVA, calcMSI } from "@/lib/money";

describe("Money utilities", () => {
  describe("formatMXN", () => {
    it("formats cents to MXN currency", () => {
      expect(formatMXN(150000)).toBe("$1,500.00");
    });

    it("handles zero", () => {
      expect(formatMXN(0)).toBe("$0.00");
    });

    it("handles small amounts", () => {
      expect(formatMXN(50)).toBe("$0.50");
    });
  });

  describe("calcIVA", () => {
    it("calculates IVA 16% breakdown", () => {
      const { baseCents, ivaCents } = calcIVA(11600);
      expect(baseCents).toBe(10000);
      expect(ivaCents).toBe(1600);
    });

    it("handles zero total", () => {
      const { baseCents, ivaCents } = calcIVA(0);
      expect(baseCents).toBe(0);
      expect(ivaCents).toBe(0);
    });
  });

  describe("calcMSI", () => {
    it("calculates monthly installments", () => {
      const monthly = calcMSI(120000, 6);
      expect(monthly).toBe(20000);
    });

    it("rounds up for uneven division", () => {
      const monthly = calcMSI(100000, 3);
      expect(monthly).toBe(33334);
    });
  });
});
