/**
 * Doble de `@/lib/tenant-resolver`: la ruta lo usa para resolver la empresa
 * activa. Se mockea para poder simular los casos que importan: empresa valida,
 * `companyId` null (no se pudo determinar) y 403 por empresa ajena.
 *
 * `NextResponse` viene del stub de `next/server`, igual que en la ruta real.
 */
import { NextResponse } from './next-server-stub.mjs';
import { mockState } from './diat-generator-mock.mjs';

export class ErrorDeEmpresa extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

export async function contextoDeEmpresa() {
  if (mockState.error) {
    throw new ErrorDeEmpresa(mockState.error.estado, mockState.error.mensaje);
  }
  return mockState.empresa;
}

export function respuestaDeErrorDeEmpresa(error) {
  if (error instanceof ErrorDeEmpresa) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.estado });
  }
  return null;
}