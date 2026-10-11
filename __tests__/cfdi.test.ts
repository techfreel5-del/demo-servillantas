import { describe, it, expect } from "vitest";
import { buildCfdiXml, parseFiscalData, generateInvoiceFolio, getFormaPago } from "@/lib/cfdi/builder";
import { EMISOR_DEMO, RECEPTOR_PUBLICO_GENERAL, FORMA_PAGO, REGIMEN_FISCAL } from "@/lib/cfdi/catalogs";

describe("CFDI Builder", () => {
  describe("buildCfdiXml", () => {
    it("generates valid CFDI 4.0 XML", () => {
      const result = buildCfdiXml({
        serie: "RDX",
        folio: "F-TEST01",
        rfcReceptor: "XAXX010101000",
        nombreReceptor: "PUBLICO EN GENERAL",
        regimenFiscalReceptor: "616",
        cpReceptor: "06600",
        usoCfdi: "S01",
        formaPago: "04",
        subtotal: 1000,
        iva: 160,
        total: 1160,
        conceptos: [
          { descripcion: "Llanta Bridgestone Turanza", cantidad: 4, valorUnitario: 250, claveProdServ: "40111900", claveUnidad: "H87" },
        ],
      });

      expect(result.uuid).toMatch(/^[A-F0-9-]{36}$/);
      expect(result.folio).toBe("F-TEST01");
      expect(result.xml).toContain('xmlns:cfdi="http://www.sat.gob.mx/cfd/4"');
      expect(result.xml).toContain('Version="4.0"');
      expect(result.xml).toContain('Serie="RDX"');
      expect(result.xml).toContain('Folio="F-TEST01"');
      expect(result.xml).toContain('FormaPago="04"');
      expect(result.xml).toContain('MetodoPago="PUE"');
      expect(result.xml).toContain('Moneda="MXN"');
      expect(result.xml).toContain(EMISOR_DEMO.rfc);
      expect(result.xml).toContain(EMISOR_DEMO.nombre);
      expect(result.xml).toContain('ClaveProdServ="40111900"');
      expect(result.xml).toContain('ClaveUnidad="H87"');
      expect(result.xml).toContain("TimbreFiscalDigital");
      expect(result.xml).toContain(result.uuid);
      expect(result.xml).toContain("DEMO_SELLO_CFD_BASE64");
      expect(result.xml).toContain("DOCUMENTO SIN VALIDEZ FISCAL");
    });

    it("escapes XML special characters in descriptions", () => {
      const result = buildCfdiXml({
        serie: "RDX",
        folio: "F-ESC",
        rfcReceptor: "TEST",
        nombreReceptor: "Empresa & CIA <S.A.>",
        regimenFiscalReceptor: "601",
        cpReceptor: "06600",
        usoCfdi: "G03",
        formaPago: "03",
        subtotal: 100,
        iva: 16,
        total: 116,
        conceptos: [
          { descripcion: 'Llanta "Premium" 205/55', cantidad: 1, valorUnitario: 100, claveProdServ: "40111900", claveUnidad: "H87" },
        ],
      });

      expect(result.xml).toContain("&amp;");
      expect(result.xml).toContain("&lt;");
      expect(result.xml).toContain("&gt;");
      expect(result.xml).toContain("&quot;");
    });
  });

  describe("parseFiscalData", () => {
    it("parses valid fiscal data", () => {
      const data = parseFiscalData(JSON.stringify({ rfc: "ABC123456789", nombre: "Mi Empresa", regimen: "601" }));
      expect(data.rfc).toBe("ABC123456789");
      expect(data.nombre).toBe("Mi Empresa");
      expect(data.regimen).toBe("601");
    });

    it("returns defaults for empty/invalid JSON", () => {
      const data = parseFiscalData("{}");
      expect(data.rfc).toBe(RECEPTOR_PUBLICO_GENERAL.rfc);
      expect(data.nombre).toBe(RECEPTOR_PUBLICO_GENERAL.nombre);
    });

    it("returns defaults for malformed JSON", () => {
      const data = parseFiscalData("not json");
      expect(data.rfc).toBe(RECEPTOR_PUBLICO_GENERAL.rfc);
    });
  });

  describe("generateInvoiceFolio", () => {
    it("generates F- prefixed folio", () => {
      const folio = generateInvoiceFolio();
      expect(folio).toMatch(/^F-[A-Z0-9]{6}$/);
    });

    it("generates unique folios", () => {
      const a = generateInvoiceFolio();
      const b = generateInvoiceFolio();
      expect(a).not.toBe(b);
    });
  });

  describe("getFormaPago", () => {
    it("maps known payment methods", () => {
      expect(getFormaPago("TARJETA")).toBe("04");
      expect(getFormaPago("DEBITO")).toBe("28");
      expect(getFormaPago("TRANSFERENCIA")).toBe("03");
      expect(getFormaPago("EFECTIVO")).toBe("01");
      expect(getFormaPago("SPEI")).toBe("03");
    });

    it("defaults to 04 for unknown methods", () => {
      expect(getFormaPago("BITCOIN")).toBe("04");
    });
  });

  describe("catalogs", () => {
    it("REGIMEN_FISCAL has common entries", () => {
      expect(REGIMEN_FISCAL["601"]).toBe("General de Ley Personas Morales");
      expect(REGIMEN_FISCAL["616"]).toBe("Sin obligaciones fiscales");
    });

    it("FORMA_PAGO maps correctly", () => {
      expect(FORMA_PAGO.TARJETA).toBe("04");
      expect(FORMA_PAGO.OXXO).toBe("01");
    });

    it("EMISOR_DEMO has required fields", () => {
      expect(EMISOR_DEMO.rfc).toBe("EKU9003173C9");
      expect(EMISOR_DEMO.regimenFiscal).toBe("601");
    });
  });
});
