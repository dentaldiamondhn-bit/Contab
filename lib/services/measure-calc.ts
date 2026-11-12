export interface DesgloseImpuesto {
  base: number;
  impuesto: number;
  total: number;
}

/**
 * Desglosa un monto entre base e impuesto.
 *
 * - Si `precioIncluyeImpuesto` es true, el impuesto se extrae del total.
 * - Si es false, el impuesto se suma sobre la base.
 */
export function desglosarImpuesto(
  monto: number,
  tasa: number,
  precioIncluyeImpuesto = false,
  decimales = 2
): DesgloseImpuesto {
  const total = Number(monto) || 0;
  const rate = (Number(tasa) || 0) / 100;

  let base: number;
  let impuesto: number;
  let totalConImpuesto: number;

  if (precioIncluyeImpuesto) {
    base = rate === -1 ? total : total / (1 + rate);
    impuesto = total - base;
    totalConImpuesto = total;
  } else {
    base = total;
    impuesto = total * rate;
    totalConImpuesto = total + impuesto;
  }

  const round = (n: number) => Number(n.toFixed(decimales));

  return {
    base: round(base),
    impuesto: round(impuesto),
    total: round(totalConImpuesto),
  };
}
