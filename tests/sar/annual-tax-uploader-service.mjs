/**
 * Doble de `@/lib/services/annual-tax-uploader` para `tests/sar`.
 */
export function isAnnualSARConfigComplete(config) {
  return !!config && typeof config.endpoint === 'string' && !!config.passwordEncrypted;
}

export function validateAnnualTaxCompleteness() {
  return { errors: [], warnings: [] };
}

export async function submitAnnualTaxToSARR() {
  return { ok: true, status: 'SUCCESS' };
}
