/** SAT catalog constants for CFDI 4.0 */

export const REGIMEN_FISCAL: Record<string, string> = {
  "601": "General de Ley Personas Morales",
  "603": "Personas Morales con Fines no Lucrativos",
  "605": "Sueldos y Salarios",
  "606": "Arrendamiento",
  "608": "Demas Ingresos",
  "610": "Residentes en el Extranjero",
  "612": "Personas Fisicas con Actividades Empresariales y Profesionales",
  "616": "Sin obligaciones fiscales",
  "620": "Sociedades Cooperativas",
  "621": "Incorporacion Fiscal",
  "625": "Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas",
  "626": "Regimen Simplificado de Confianza",
};

export const USO_CFDI: Record<string, string> = {
  G01: "Adquisicion de mercancias",
  G03: "Gastos en general",
  I01: "Construcciones",
  S01: "Sin efectos fiscales",
  CP01: "Pagos",
};

export const FORMA_PAGO: Record<string, string> = {
  TARJETA: "04",
  DEBITO: "28",
  TRANSFERENCIA: "03",
  EFECTIVO: "01",
  SPEI: "03",
  OXXO: "01",
};

export const METODO_PAGO = {
  PUE: "PUE", // Pago en una sola exhibicion
  PPD: "PPD", // Pago en parcialidades o diferido
} as const;

/** Default emisor data for demo */
export const EMISOR_DEMO = {
  rfc: "EKU9003173C9",
  nombre: "RODAMAX LLANTAS SA DE CV",
  regimenFiscal: "601",
  lugarExpedicion: "06600",
} as const;

/** Default receptor for publico en general */
export const RECEPTOR_PUBLICO_GENERAL = {
  rfc: "XAXX010101000",
  nombre: "PUBLICO EN GENERAL",
  regimen: "616",
  cp: "06600",
  usoCfdi: "S01",
} as const;

/** Clave de producto SAT for tires */
export const SAT_CLAVE_LLANTAS = "40111900";
/** Clave de unidad: pieza */
export const SAT_UNIDAD_PIEZA = "H87";
/** Clave de unidad: servicio */
export const SAT_UNIDAD_SERVICIO = "E48";
