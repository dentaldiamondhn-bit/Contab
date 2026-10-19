/**
 * Doble de `@/lib/services/diat-uploader` para `tests/sar`.
 */
export function buildDiatUploadPayload(report) {
  return {
    period: report?.period,
    totalVentas: 0,
    totalCompras: 0,
    isvAPagar: 0,
    records: [],
  };
}

export function validateDiatCompleteness() {
  return { errors: [], warnings: [] };
}

export async function submitDiatToSARR() {
  return { ok: true, status: 'SUCCESS', trackingCode: 'DIAT-TRACK' };
}
