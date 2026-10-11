const formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

export function formatMXN(cents: number): string {
  return formatter.format(cents / 100);
}

export function formatMXNShort(cents: number): string {
  return `$${(cents / 100).toLocaleString("es-MX")}`;
}

/** Calcula IVA incluido: base = total / 1.16 */
export function calcIVA(totalCents: number): { baseCents: number; ivaCents: number } {
  const baseCents = Math.round(totalCents / 1.16);
  const ivaCents = totalCents - baseCents;
  return { baseCents, ivaCents };
}

/** Monthly installments (MSI) */
export function calcMSI(totalCents: number, months: number): number {
  return Math.ceil(totalCents / months);
}
