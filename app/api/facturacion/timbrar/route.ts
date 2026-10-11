import { prisma } from "@/lib/prisma";
import { logAudit, simulateLatency } from "@/lib/audit";
import { buildCfdiXml, parseFiscalData, generateInvoiceFolio, getFormaPago } from "@/lib/cfdi/builder";
import { EMISOR_DEMO } from "@/lib/cfdi/catalogs";
import { facturacionSchema } from "@/lib/schemas";
import { problemResponse, notFound } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get("x-correlation-id") || "";
  const startTime = Date.now();
  let orderId = "";

  try {
    const body = await req.json();
    const parsed = facturacionSchema.safeParse(body);

    if (!parsed.success) {
      return problemResponse({
        type: "VALIDATION_ERROR",
        title: "Payload invalido",
        status: 422,
        correlationId,
      });
    }

    orderId = parsed.data.orderId;

    await logAudit("PAC", "PROCESSING", `Generando CFDI 4.0 - Conectando con PAC simulado...`, {
      orderId,
      correlationId,
    });

    await simulateLatency(1000, 2500);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true, service: true } }, branch: true },
    });

    if (!order) {
      await logAudit("PAC", "ERROR", `Orden ${orderId} no encontrada`, { orderId, correlationId, httpStatus: 404 });
      return notFound("Orden", correlationId);
    }

    const fiscal = parseFiscalData(order.fiscalData);
    const invoiceFolio = generateInvoiceFolio();
    const subtotalCents = order.subtotalCents - order.discountCents;
    const subtotal = subtotalCents / 100 / 1.16;
    const iva = subtotalCents / 100 - subtotal;
    const total = subtotalCents / 100;

    // Build conceptos
    const conceptos = order.items.map((item) => {
      const unitPrice = item.unitPriceCents / 100 / 1.16;
      if (item.product) {
        return {
          descripcion: `${item.product.brand} ${item.product.model} ${item.product.width}/${item.product.aspectRatio} R${item.product.rim}`,
          cantidad: item.qty,
          valorUnitario: unitPrice,
          claveProdServ: item.product.satProductKey || "40111900",
          claveUnidad: "H87",
        };
      }
      if (item.service) {
        return {
          descripcion: item.service.name,
          cantidad: item.qty,
          valorUnitario: unitPrice,
          claveProdServ: item.service.satProductKey || "78181500",
          claveUnidad: item.service.satUnitKey || "E48",
        };
      }
      return {
        descripcion: "Producto",
        cantidad: item.qty,
        valorUnitario: unitPrice,
        claveProdServ: "40111900",
        claveUnidad: "H87",
      };
    });

    const cfdi = buildCfdiXml({
      serie: "RDX",
      folio: invoiceFolio,
      rfcReceptor: fiscal.rfc,
      nombreReceptor: fiscal.nombre,
      regimenFiscalReceptor: fiscal.regimen,
      cpReceptor: fiscal.cp,
      usoCfdi: fiscal.usoCfdi,
      formaPago: getFormaPago(order.paymentMethod),
      subtotal,
      iva,
      total,
      conceptos,
    });

    // Save invoice
    await prisma.invoice.create({
      data: {
        orderId,
        uuid: cfdi.uuid,
        serie: "RDX",
        folio: invoiceFolio,
        rfcEmisor: EMISOR_DEMO.rfc,
        rfcReceptor: fiscal.rfc,
        nombreReceptor: fiscal.nombre,
        regimenFiscalReceptor: fiscal.regimen,
        cpReceptor: fiscal.cp,
        usoCfdi: fiscal.usoCfdi,
        formaPago: getFormaPago(order.paymentMethod),
        subtotal: Math.round(subtotal * 100),
        iva: Math.round(iva * 100),
        total: Math.round(total * 100),
        xml: cfdi.xml,
        status: "TIMBRADA",
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "FACTURADO" },
    });

    // Create outbox event for invoice stamped
    await prisma.outboxEvent.create({
      data: {
        type: "invoice.stamped",
        aggregateId: orderId,
        correlationId,
        payload: JSON.stringify({ orderId, uuid: cfdi.uuid, folio: invoiceFolio }),
        status: "PENDING",
      },
    });

    await logAudit("PAC", "SUCCESS", `CFDI 4.0 timbrado - UUID: ${cfdi.uuid.slice(0, 8)}... Folio: ${invoiceFolio}`, {
      orderId,
      correlationId,
      httpStatus: 200,
      durationMs: Date.now() - startTime,
      metadata: {
        uuid: cfdi.uuid,
        folio: invoiceFolio,
        rfcEmisor: EMISOR_DEMO.rfc,
        rfcReceptor: fiscal.rfc,
        total,
      },
    });

    await logAudit("SYSTEM", "SUCCESS", `Pipeline completo: PENDIENTE_PAGO -> PAGADO -> SINCRONIZADO_ERP -> FACTURADO | Folio: ${invoiceFolio}`, {
      orderId,
      correlationId,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ facturado: true, orderId, cfdi: { uuid: cfdi.uuid, folio: invoiceFolio } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    await logAudit("PAC", "ERROR", `Error en facturacion: ${msg}`, {
      orderId,
      correlationId,
      httpStatus: 500,
      durationMs: Date.now() - startTime,
    });
    return problemResponse({ type: "INTERNAL_ERROR", title: "Error en facturacion", status: 500, correlationId });
  }
}
