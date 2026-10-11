/**
 * Order State Machine
 *
 * PENDIENTE_PAGO ──(payment.approved)──▶ PAGADO ──(erp.synced)──▶ SINCRONIZADO_ERP ──(invoice.stamped)──▶ FACTURADO
 *       │                                  │                                              └─(no invoice)─▶ COMPLETADO
 *       ├─(payment.rejected)──▶ PAGO_RECHAZADO (libera reserva)
 *       ├─(reservation.expired)──▶ EXPIRADO (libera reserva)
 *       └─(payment.pending)───▶ PENDIENTE_PAGO (TTL extendido)
 */

export const ORDER_STATUSES = [
  "PENDIENTE_PAGO",
  "PAGADO",
  "PAGO_RECHAZADO",
  "EXPIRADO",
  "SINCRONIZADO_ERP",
  "FACTURADO",
  "COMPLETADO",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_EVENTS = [
  "payment.approved",
  "payment.rejected",
  "payment.pending",
  "reservation.expired",
  "erp.synced",
  "invoice.stamped",
  "invoice.skipped",
] as const;

export type OrderEvent = (typeof ORDER_EVENTS)[number];

const TRANSITIONS: Record<string, Record<string, OrderStatus>> = {
  PENDIENTE_PAGO: {
    "payment.approved": "PAGADO",
    "payment.rejected": "PAGO_RECHAZADO",
    "payment.pending": "PENDIENTE_PAGO",
    "reservation.expired": "EXPIRADO",
  },
  PAGADO: {
    "erp.synced": "SINCRONIZADO_ERP",
  },
  SINCRONIZADO_ERP: {
    "invoice.stamped": "FACTURADO",
    "invoice.skipped": "COMPLETADO",
  },
};

export interface TransitionResult {
  ok: true;
  from: OrderStatus;
  to: OrderStatus;
  event: OrderEvent;
}

export interface TransitionError {
  ok: false;
  from: string;
  event: OrderEvent;
  message: string;
  requiresRefund: boolean;
}

export function transition(
  currentStatus: string,
  event: OrderEvent
): TransitionResult | TransitionError {
  const statusTransitions = TRANSITIONS[currentStatus];

  if (!statusTransitions) {
    const requiresRefund = event === "payment.approved" && (currentStatus === "EXPIRADO" || currentStatus === "PAGO_RECHAZADO");
    return {
      ok: false,
      from: currentStatus,
      event,
      message: `Transicion invalida: ${currentStatus} + ${event}`,
      requiresRefund,
    };
  }

  const nextStatus = statusTransitions[event];
  if (!nextStatus) {
    const requiresRefund = event === "payment.approved" && currentStatus !== "PENDIENTE_PAGO";
    return {
      ok: false,
      from: currentStatus,
      event,
      message: `Evento '${event}' no valido para estado '${currentStatus}'`,
      requiresRefund,
    };
  }

  return {
    ok: true,
    from: currentStatus as OrderStatus,
    to: nextStatus,
    event,
  };
}

export function canTransition(currentStatus: string, event: OrderEvent): boolean {
  const result = transition(currentStatus, event);
  return result.ok;
}

export function getAvailableEvents(currentStatus: string): OrderEvent[] {
  const statusTransitions = TRANSITIONS[currentStatus];
  if (!statusTransitions) return [];
  return Object.keys(statusTransitions) as OrderEvent[];
}

export function isTerminalStatus(status: string): boolean {
  return ["FACTURADO", "COMPLETADO", "PAGO_RECHAZADO", "EXPIRADO"].includes(status);
}
