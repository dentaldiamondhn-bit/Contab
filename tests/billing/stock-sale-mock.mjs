/**
 * Doble de `@/lib/services/stock-sale`: la emision de factura comprueba stock y lo
 * descuenta. Eso NO es lo que se prueba aqui (la frontera empresa), asi que se
 * devuelve "todo disponible" y sin errores para que la ruta siga hasta el final
 * (insert de la factura y sus lineas).
 */
export async function checkSaleStock() {
  return [];
}

export async function applySaleStock() {
  return { shortages: [], errors: [] };
}
