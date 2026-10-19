/**
 * Retencion ISR de compras: calculo PURO y compartido (cliente + servidor).
 *
 * El tipo de retencion se configura **en el proveedor** (`Supplier.withholding_type`)
 * y la compra lo **hereda**, con override manual en el formulario. La retencion se
 * calcula sobre el **subtotal sin ISV** (la base gravable del proveedor), se guarda
 * en la compra (`withholding_amount`) y **reduce lo pagado al proveedor**: en el
 * asiento al aprobar, el haber a CxP/Banco es `total - retencion` y la retencion
 * va a la cuenta "Retenciones por Pagar" (210202).
 *
 * No importa nada de servidor: es puro para usar la MISMA evaluacion en el cliente,
 * en `lib/purchase-db.ts` y en las pruebas, sin reimplementarla.
 */

export type TipoRetencion = 'NONE' | 'ISR_1' | 'ISR_12_5';

export interface OpcionRetencion {
  value: TipoRetencion;
  /** Etiqueta para el formulario. */
  label: string;
  /** Tasa de la retencion como fraccion (0, 0.01, 0.125). */
  tasa: number;
  /** Alias/encabezados aceptados en la importacion. */
  aliases: string[];
}

/** Tipos de retencion soportados, con su tasa (fraccion). Orden = el de la UI. */
export const RETENCIONES: OpcionRetencion[] = [
  { value: 'NONE', label: 'Sin retención', tasa: 0, aliases: ['ninguna', 'sin retencion', '0', 'no'] },
  {
    value: 'ISR_1',
    label: 'ISR 1% (servicios profesionales)',
    tasa: 0.01,
    aliases: ['1%', '1', '0.01', 'isr 1', 'isr_1'],
  },
  {
    value: 'ISR_12_5',
    label: 'ISR 12.5% (otros servicios)',
    tasa: 0.125,
    aliases: ['12.5%', '12.5', '0.125', 'isr 12.5', 'isr_12_5', '12,5%'],
  },
];

/** Normaliza un valor libre (columna de importacion, body, etc.) a un `TipoRetencion`. */
export function normalizarTipoRetencion(valor: unknown): TipoRetencion {
  const s = String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const r of RETENCIONES) {
    if (r.value.toLowerCase() === s) return r.value;
    if (r.aliases.includes(s)) return r.value;
  }
  return 'NONE';
}

/** Tasa de la retencion como fraccion (0, 0.01, 0.125). */
export function tasaDeRetencion(tipo: unknown): number {
  const normalizado = normalizarTipoRetencion(tipo);
  return RETENCIONES.find((r) => r.value === normalizado)?.tasa ?? 0;
}

/** Etiqueta legible del tipo de retencion. */
export function etiquetaRetencion(tipo: unknown): string {
  const normalizado = normalizarTipoRetencion(tipo);
  return RETENCIONES.find((r) => r.value === normalizado)?.label ?? 'Sin retención';
}

/** true si el tipo aplica retencion (> 0). */
export function aplicaRetencion(tipo: unknown): boolean {
  return tasaDeRetencion(tipo) > 0;
}

/**
 * Monto de la retencion sobre una base (subtotal sin ISV), redondeado a lempiras
 * enteras (los importes del proyecto ya estan en lempiras, AGENTS.md seccion 2).
 */
export function calcularRetencion(base: number, tipo: unknown): number {
  const b = Math.round(Number(base) || 0);
  const tasa = tasaDeRetencion(tipo);
  if (tasa <= 0) return 0;
  return Math.round(b * tasa);
}
