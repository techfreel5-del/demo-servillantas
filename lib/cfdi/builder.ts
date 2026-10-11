import { randomUUID } from "crypto";
import { EMISOR_DEMO, FORMA_PAGO, RECEPTOR_PUBLICO_GENERAL } from "./catalogs";

export interface CfdiConcepto {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  claveProdServ: string;
  claveUnidad: string;
}

export interface CfdiInput {
  serie: string;
  folio: string;
  rfcReceptor: string;
  nombreReceptor: string;
  regimenFiscalReceptor: string;
  cpReceptor: string;
  usoCfdi: string;
  formaPago: string;
  subtotal: number;
  iva: number;
  total: number;
  conceptos: CfdiConcepto[];
}

export interface CfdiResult {
  uuid: string;
  folio: string;
  xml: string;
}

/**
 * Build CFDI 4.0 XML with SAT namespaces and TimbreFiscalDigital.
 * This is a demo simulation — no real PAC connection.
 */
export function buildCfdiXml(input: CfdiInput): CfdiResult {
  const uuid = randomUUID().toUpperCase();
  const fechaTimbrado = new Date().toISOString();

  const conceptosXml = input.conceptos
    .map((c) => {
      const importe = c.valorUnitario * c.cantidad;
      const ivaImporte = importe * 0.16;
      return `      <cfdi:Concepto ClaveProdServ="${c.claveProdServ}" Cantidad="${c.cantidad}" ClaveUnidad="${c.claveUnidad}" Descripcion="${escapeXml(c.descripcion)}" ValorUnitario="${c.valorUnitario.toFixed(2)}" Importe="${importe.toFixed(2)}" ObjetoImp="02">
        <cfdi:Impuestos>
          <cfdi:Traslados>
            <cfdi:Traslado Base="${importe.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${ivaImporte.toFixed(2)}"/>
          </cfdi:Traslados>
        </cfdi:Impuestos>
      </cfdi:Concepto>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- DOCUMENTO SIN VALIDEZ FISCAL - DEMO RodaMax Llantas -->
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="4.0" Serie="${input.serie}" Folio="${input.folio}" Fecha="${fechaTimbrado}" FormaPago="${input.formaPago}" MetodoPago="PUE" Moneda="MXN" Exportacion="01" LugarExpedicion="${EMISOR_DEMO.lugarExpedicion}" SubTotal="${input.subtotal.toFixed(2)}" Total="${input.total.toFixed(2)}">
  <cfdi:Emisor Rfc="${EMISOR_DEMO.rfc}" Nombre="${EMISOR_DEMO.nombre}" RegimenFiscal="${EMISOR_DEMO.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${input.rfcReceptor}" Nombre="${escapeXml(input.nombreReceptor)}" DomicilioFiscalReceptor="${input.cpReceptor}" RegimenFiscalReceptor="${input.regimenFiscalReceptor}" UsoCFDI="${input.usoCfdi}"/>
  <cfdi:Conceptos>
${conceptosXml}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${input.iva.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${input.subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${input.iva.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital Version="1.1" UUID="${uuid}" FechaTimbrado="${fechaTimbrado}" SelloCFD="DEMO_SELLO_CFD_BASE64" SelloSAT="DEMO_SELLO_SAT_BASE64" NoCertificadoSAT="00001000000000000001" RfcProvCertif="SAT970701NN3"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

  return { uuid, folio: input.folio, xml };
}

/**
 * Parse fiscal data from order, falling back to public general.
 */
export function parseFiscalData(fiscalDataJson: string) {
  const defaults = { ...RECEPTOR_PUBLICO_GENERAL };
  try {
    const parsed = JSON.parse(fiscalDataJson);
    if (parsed.rfc) {
      return {
        rfc: parsed.rfc || defaults.rfc,
        nombre: parsed.nombre || defaults.nombre,
        regimen: parsed.regimen || defaults.regimen,
        cp: parsed.cp || defaults.cp,
        usoCfdi: parsed.usoCfdi || defaults.usoCfdi,
      };
    }
  } catch {}
  return defaults;
}

/**
 * Generate invoice folio.
 */
let _folioCounter = 0;
export function generateInvoiceFolio(): string {
  const unique = Date.now().toString(36) + (++_folioCounter).toString(36);
  return `F-${unique.toUpperCase().slice(-6)}`;
}

/**
 * Map payment method to SAT forma de pago code.
 */
export function getFormaPago(paymentMethod: string): string {
  return FORMA_PAGO[paymentMethod] || "04";
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
