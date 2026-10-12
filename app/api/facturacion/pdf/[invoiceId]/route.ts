import { prisma } from "@/lib/prisma";
import { EMISOR_DEMO, REGIMEN_FISCAL, USO_CFDI } from "@/lib/cfdi/catalogs";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: {
          items: { include: { product: true, service: true } },
          branch: true,
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  const order = invoice.order;

  // Generate PDF
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const brand = "#E53935";
  const dark = "#111111";
  const gray = "#666666";
  const lightGray = "#EEEEEE";

  // === HEADER ===
  doc.rect(0, 0, 612, 90).fill(dark);
  doc.fontSize(24).fill("#FFFFFF").text("RODAMAX LLANTAS", 50, 25, { continued: true });
  doc.fontSize(10).fill(brand).text("  SA DE CV", { continued: false });
  doc.fontSize(9).fill("#AAAAAA").text("DOCUMENTO SIN VALIDEZ FISCAL — DEMO", 50, 55);
  doc.fill(brand).rect(0, 88, 612, 3).fill(brand);

  // === FACTURA INFO (right-aligned box) ===
  const infoX = 380;
  doc.roundedRect(infoX, 105, 185, 70, 4).fill("#FFF5F5");
  doc.fontSize(14).fill(brand).text("FACTURA", infoX + 10, 112);
  doc.fontSize(9).fill(dark).text(`Serie: ${invoice.serie}  Folio: ${invoice.folio}`, infoX + 10, 132);
  doc.fontSize(8).fill(gray).text(`Fecha: ${new Date(invoice.stampedAt!).toLocaleDateString("es-MX")}`, infoX + 10, 148);
  doc.text(`Método: PUE  |  Forma: ${invoice.formaPago}`, infoX + 10, 160);

  // === UUID ===
  doc.roundedRect(50, 105, 320, 28, 4).fill(lightGray);
  doc.fontSize(7).fill(gray).text("UUID / Folio Fiscal:", 58, 110);
  doc.fontSize(8).fill(dark).text(invoice.uuid, 58, 121);

  // === EMISOR / RECEPTOR ===
  const y1 = 195;
  doc.roundedRect(50, y1, 250, 80, 4).lineWidth(0.5).stroke("#DDDDDD");
  doc.fontSize(8).fill(brand).text("EMISOR", 60, y1 + 8);
  doc.fontSize(9).fill(dark).text(EMISOR_DEMO.nombre, 60, y1 + 22);
  doc.fontSize(8).fill(gray).text(`RFC: ${EMISOR_DEMO.rfc}`, 60, y1 + 36);
  doc.text(`Régimen: ${REGIMEN_FISCAL[EMISOR_DEMO.regimenFiscal] || EMISOR_DEMO.regimenFiscal}`, 60, y1 + 48);
  doc.text(`C.P.: ${EMISOR_DEMO.lugarExpedicion}`, 60, y1 + 60);

  doc.roundedRect(315, y1, 250, 80, 4).lineWidth(0.5).stroke("#DDDDDD");
  doc.fontSize(8).fill(brand).text("RECEPTOR", 325, y1 + 8);
  doc.fontSize(9).fill(dark).text(invoice.nombreReceptor, 325, y1 + 22);
  doc.fontSize(8).fill(gray).text(`RFC: ${invoice.rfcReceptor}`, 325, y1 + 36);
  doc.text(`Régimen: ${REGIMEN_FISCAL[invoice.regimenFiscalReceptor] || invoice.regimenFiscalReceptor}`, 325, y1 + 48);
  doc.text(`Uso CFDI: ${USO_CFDI[invoice.usoCfdi] || invoice.usoCfdi}  |  C.P.: ${invoice.cpReceptor}`, 325, y1 + 60);

  // === CONCEPTOS TABLE ===
  const tableTop = y1 + 100;
  // Header
  doc.rect(50, tableTop, 515, 22).fill(dark);
  doc.fontSize(8).fill("#FFFFFF");
  doc.text("Clave", 55, tableTop + 6);
  doc.text("Descripción", 110, tableTop + 6);
  doc.text("Cant.", 365, tableTop + 6, { width: 35, align: "center" });
  doc.text("P. Unitario", 405, tableTop + 6, { width: 70, align: "right" });
  doc.text("Importe", 485, tableTop + 6, { width: 75, align: "right" });

  let rowY = tableTop + 24;
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const desc = item.product
      ? `${item.product.brand} ${item.product.model} ${item.product.width}/${item.product.aspectRatio} R${item.product.rim}`
      : item.service
      ? item.service.name
      : "Producto";
    const clave = item.product?.satProductKey || "40111900";
    const unitPrice = item.unitPriceCents / 100 / 1.16;
    const importe = unitPrice * item.qty;

    if (i % 2 === 0) {
      doc.rect(50, rowY - 2, 515, 18).fill("#FAFAFA");
    }

    doc.fontSize(7).fill(gray).text(clave, 55, rowY + 2);
    doc.fontSize(8).fill(dark).text(desc, 110, rowY + 2, { width: 250 });
    doc.fill(dark).text(String(item.qty), 365, rowY + 2, { width: 35, align: "center" });
    doc.text(`$${unitPrice.toFixed(2)}`, 405, rowY + 2, { width: 70, align: "right" });
    doc.text(`$${importe.toFixed(2)}`, 485, rowY + 2, { width: 75, align: "right" });
    rowY += 20;
  }

  // === TOTALES ===
  const totalsY = rowY + 15;
  doc.rect(380, totalsY, 185, 1).fill("#DDDDDD");

  const subtotalVal = invoice.subtotal / 100;
  const ivaVal = invoice.iva / 100;
  const totalVal = invoice.total / 100;

  doc.fontSize(9).fill(gray);
  doc.text("Subtotal:", 390, totalsY + 8, { width: 70, align: "right" });
  doc.fill(dark).text(`$${subtotalVal.toFixed(2)}`, 470, totalsY + 8, { width: 90, align: "right" });

  doc.fill(gray).text("IVA 16%:", 390, totalsY + 24, { width: 70, align: "right" });
  doc.fill(dark).text(`$${ivaVal.toFixed(2)}`, 470, totalsY + 24, { width: 90, align: "right" });

  doc.rect(380, totalsY + 40, 185, 1).fill(brand);
  doc.fontSize(12).fill(brand).text("Total:", 390, totalsY + 48, { width: 70, align: "right" });
  doc.text(`$${totalVal.toFixed(2)} MXN`, 470, totalsY + 48, { width: 90, align: "right" });

  // === SELLO / CADENA ===
  const selloY = totalsY + 85;
  doc.roundedRect(50, selloY, 515, 55, 4).lineWidth(0.5).stroke("#DDDDDD");
  doc.fontSize(7).fill(gray).text("Sello Digital del CFDI:", 60, selloY + 6);
  doc.fontSize(6).fill("#999999").text("DEMO_SELLO_CFD_BASE64...  (documento de demostración)", 60, selloY + 17);
  doc.fontSize(7).fill(gray).text("Sello Digital del SAT:", 60, selloY + 30);
  doc.fontSize(6).fill("#999999").text("DEMO_SELLO_SAT_BASE64...  (documento de demostración)", 60, selloY + 41);

  // === SUCURSAL ===
  const branchY = selloY + 65;
  doc.fontSize(8).fill(gray).text(`Sucursal: ${order.branch.name}  |  ${order.branch.address}, ${order.branch.city}`, 50, branchY);
  doc.text(`Orden: ${order.folio}  |  Correo: ${order.email}`, 50, branchY + 14);

  // === FOOTER ===
  doc.rect(0, 732, 612, 30).fill(dark);
  doc.fontSize(7).fill("#888888").text(
    "Este documento es una representación impresa de un CFDI 4.0 de demostración  •  RodaMax Llantas  •  demo-servillantas.vercel.app",
    50, 740, { width: 512, align: "center" }
  );

  doc.end();

  const pdfBuffer = await pdfReady;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.folio}.pdf"`,
    },
  });
}
