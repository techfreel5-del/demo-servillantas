import { prisma } from "@/lib/prisma";
import { logAudit, simulateLatency } from "@/lib/audit";
import { fetchProcessableEvents, markProcessing, markDone, markFailed } from "@/lib/outbox";
import { syncOrderWithErp, isErpError } from "@/lib/erp/client";
import { buildCfdiXml, parseFiscalData, generateInvoiceFolio, getFormaPago } from "@/lib/cfdi/builder";
import { EMISOR_DEMO } from "@/lib/cfdi/catalogs";

const MAX_ROUNDS = 5;

async function processPaymentApproved(orderId: string, correlationId: string) {
  await logAudit("QUEUE", "PROCESSING", `Procesando evento payment.approved`, {
    orderId, correlationId,
  });

  const result = await syncOrderWithErp(orderId, correlationId);

  if (isErpError(result)) {
    throw new Error(`ERP: ${result.error} (${result.status})`);
  }

  await prisma.outboxEvent.create({
    data: {
      type: "erp.synced",
      aggregateId: orderId,
      correlationId,
      payload: JSON.stringify({ orderId }),
      status: "PENDING",
    },
  });
}

async function processErpSynced(orderId: string, correlationId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true, service: true } }, branch: true },
  });

  if (!order) throw new Error("Orden no encontrada");

  if (!order.requiresInvoice) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "COMPLETADO" },
    });

    await logAudit("QUEUE", "SUCCESS", `Orden completada (sin factura solicitada)`, {
      orderId, correlationId,
    });
    return;
  }

  await logAudit("QUEUE", "PROCESSING", `Procesando evento erp.synced - Disparando facturacion`, {
    orderId, correlationId,
  });

  const startTime = Date.now();

  await logAudit("PAC", "PROCESSING", `Generando CFDI 4.0 - Conectando con PAC simulado...`, {
    orderId, correlationId,
  });

  await simulateLatency(1000, 2500);

  const fiscal = parseFiscalData(order.fiscalData);
  const invoiceFolio = generateInvoiceFolio();
  const subtotalCents = order.subtotalCents - order.discountCents;
  const subtotal = subtotalCents / 100 / 1.16;
  const iva = subtotalCents / 100 - subtotal;
  const total = subtotalCents / 100;

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

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "FACTURADO" },
  });

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
    orderId, correlationId,
    httpStatus: 200,
    durationMs: Date.now() - startTime,
    metadata: { uuid: cfdi.uuid, folio: invoiceFolio, rfcEmisor: EMISOR_DEMO.rfc, rfcReceptor: fiscal.rfc, total },
  });

  await logAudit("SYSTEM", "SUCCESS", `Pipeline completo: PENDIENTE_PAGO -> PAGADO -> SINCRONIZADO_ERP -> FACTURADO | Folio: ${invoiceFolio}`, {
    orderId, correlationId,
    durationMs: Date.now() - startTime,
  });
}

async function processInvoiceStamped(orderId: string, correlationId: string) {
  await logAudit("QUEUE", "SUCCESS", `Confirmacion enviada al cliente (simulada)`, {
    orderId, correlationId,
  });
}

export async function processQueue(): Promise<number> {
  let totalProcessed = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const events = await fetchProcessableEvents(5);
    if (events.length === 0) break;

    let roundProcessed = 0;

    for (const event of events) {
      await markProcessing(event.id);

      try {
        if (event.type === "payment.approved") {
          await processPaymentApproved(event.aggregateId, event.correlationId);
        } else if (event.type === "erp.synced") {
          await processErpSynced(event.aggregateId, event.correlationId);
        } else if (event.type === "invoice.stamped") {
          await processInvoiceStamped(event.aggregateId, event.correlationId);
        }

        await markDone(event.id);
        roundProcessed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        const { nextStatus, backoffMs } = await markFailed(event.id, event.attempts + 1, msg);

        await logAudit("QUEUE", "ERROR", `Error procesando ${event.type}: ${msg} - Reintento ${event.attempts + 1}/5 en ${backoffMs / 1000}s`, {
          orderId: event.aggregateId,
          correlationId: event.correlationId,
          metadata: { attempt: event.attempts + 1, nextRetryMs: backoffMs },
        });

        if (nextStatus === "DEAD") {
          await logAudit("QUEUE", "ERROR", `Evento ${event.type} movido a DLQ despues de 5 intentos`, {
            orderId: event.aggregateId,
            correlationId: event.correlationId,
          });
        }
      }
    }

    totalProcessed += roundProcessed;
    if (roundProcessed === 0) break;
  }

  return totalProcessed;
}
