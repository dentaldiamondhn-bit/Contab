/**
 * Doble de `@/lib/services/diat-generator` para `tests/sar`.
 *
 * La ruta solo usa `getDiatReport(companyId, period)`. Devolvemos un reporte
 * vacio pero bien formado, para no arrastrar el generador real (y sus lecturas
 * de vistas contables) al test de aislamiento de la ruta.
 */
export async function getDiatReport(companyId, period) {
  return {
    companyId,
    period,
    declarante: { rtn: '', razonSocial: '' },
    resumen: {},
    ventas: { records: [] },
    compras: { records: [] },
  };
}
