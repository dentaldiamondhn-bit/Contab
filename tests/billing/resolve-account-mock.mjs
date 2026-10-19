/**
 * Doble de `@/lib/accounting/resolve-account`: el asiento de la venta es
 * best-effort. `resolveAccountId` devuelve `null` a proposito para que
 * `postSalesJournal` se salte el `fetch` al endpoint de transacciones y el test
 * no dependa de red. `ACCOUNT_PREFIXES` conserva las claves que usa la ruta.
 */
export async function resolveAccountId() {
  return null;
}

export const ACCOUNT_PREFIXES = {
  cash: ['1101'],
  receivable: ['1103'],
  sales: ['4101', '4102'],
  isv: ['1110', '2101'],
};
