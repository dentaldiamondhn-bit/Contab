/**
 * Doble de `@/lib/tenant-resolver` para `tests/purchases`.
 *
 * Solo se usa `ErrorDeEmpresa`, pero la firma importa: el real es
 * `(estado, mensaje)` y `tests/accounting/tenant-resolver-mock.mjs` la tiene
 * invertida `(mensaje, estado)`. Reusar ese doble hacia que `exigirEmpresa`
 * lanzara con el estado de exchange, asi que se replica aqui con la firma real.
 */
export class ErrorDeEmpresa extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.name = 'ErrorDeEmpresa';
    this.estado = estado;
  }
}