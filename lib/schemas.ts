import { z } from "zod/v4";

// --- Checkout ---

export const checkoutItemSchema = z.object({
  productId: z.string().min(1, "productId requerido"),
  qty: z.number().int().min(1, "Cantidad minima es 1").max(20, "Maximo 20 unidades por producto"),
});

export const checkoutSchema = z.object({
  branchId: z.string().min(1, "Sucursal requerida"),
  items: z.array(checkoutItemSchema).min(1, "Al menos un producto requerido").max(10, "Maximo 10 productos por orden"),
  email: z.email("Email invalido").optional(),
  phone: z.string().max(20).optional(),
  fulfillment: z.enum(["PICKUP", "DELIVERY"]).optional().default("PICKUP"),
  paymentMethod: z.enum(["TARJETA", "DEBITO", "TRANSFERENCIA", "EFECTIVO", "SPEI", "OXXO"]).optional().default("TARJETA"),
  requiresInvoice: z.boolean().optional().default(false),
  fiscalData: z.object({
    rfc: z.string().min(12).max(13).optional(),
    nombre: z.string().max(200).optional(),
    regimen: z.string().max(3).optional(),
    cp: z.string().max(5).optional(),
    usoCfdi: z.string().max(4).optional(),
  }).optional(),
  couponCode: z.string().max(20).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// --- Webhook ---

export const webhookPayloadSchema = z.object({
  event: z.enum(["payment.approved", "payment.rejected", "payment.pending"]),
  orderId: z.string().min(1, "orderId requerido"),
  providerPaymentId: z.string().optional(),
  gateway: z.string().optional(),
  providerEventId: z.string().min(1, "providerEventId requerido"),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// --- ERP Sync ---

export const erpSyncSchema = z.object({
  orderId: z.string().min(1, "orderId requerido"),
});

// --- Facturacion ---

export const facturacionSchema = z.object({
  orderId: z.string().min(1, "orderId requerido"),
});

// --- Catalog Search ---

export const catalogSearchSchema = z.object({
  width: z.string().optional(),
  series: z.string().optional(),
  rim: z.string().optional(),
});
