/**
 * Doble de `@/lib/services/det-uploader` para `tests/sar`.
 *
 * Se prueba la RUTA (aislamiento por empresa), no la criptografia real: aqui
 * `encryptSARConfig` solo marca que hay contrasena, e `isSARConfigComplete`
 * replica la condicion real (endpoint + usuario + passwordEncrypted).
 */
export function encryptSARConfig({ usuario, password }) {
  return { usuario, passwordEncrypted: `enc:${usuario}:${password}` };
}

export function decryptSARConfig() {
  return { usuario: 'u', password: 'p' };
}

export function isSARConfigComplete(config) {
  return (
    !!config &&
    typeof config === 'object' &&
    typeof config.endpoint === 'string' &&
    config.endpoint.trim() !== '' &&
    typeof config.usuario === 'string' &&
    config.usuario.trim() !== '' &&
    !!config.passwordEncrypted
  );
}

export async function submitDETToSARR() {
  return { ok: true, status: 'SUCCESS', trackingCode: 'DET-TRACK' };
}
