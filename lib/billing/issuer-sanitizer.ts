/**
 * Sanitizado de datos fiscales del emisor para mostrarlos en facturas y reportes.
 *
 * Historiamente el onboarding alteraba el email y el RTN al crear el tenant para
 * cumplir el UNIQUE de `Tenant.businessemail`:
 *   - email: `dentaldiamondhn+TEST1DS@gmail.com`
 *   - rtn:   `05011991078001-1788048129466`
 * Esos valores se imprimen en las facturas, asi que aqui se recupera el valor real.
 */

/** Quita el sufijo `+algo` del correo: `user+CODE@dominio.com` -> `user@dominio.com`. */
export function sanitizeBusinessEmail(value: string | null | undefined): string {
  const email = (value || '').trim();
  if (!email) return '';
  return email.replace(/\+[^@]+(?=@)/, '');
}

/**
 * Normaliza el RTN (), aceptando los tres formatos que hay en producción:
 *   - 14 dígitos:            `05011991078001`
 *   - con guiones:            `0101-0220-312304`
 *   - con sufijo de timestamp: `05011991078001-1788048129466`
 * No modifica nada que no parezca un RTN (p.ej. `TEMP-TST20HM-RTN`) para no
 * destruir información de placeholders.
 */
export function sanitizeBusinessRTN(value: string | null | undefined): string {
  const rtn = (value || '').trim();
  if (!rtn) return '';

  // Formato con guiones: 4-4-6, con o sin sufijo numérico.
  const dashed = rtn.match(/^(\d{4}-\d{4}-\d{6})(?:-\d+)?$/);
  if (dashed) return dashed[1];

  // 14 dígitos (o 13 en algunos registros antiguos), con o sin sufijo numérico.
  const plain = rtn.match(/^(\d{13,14})(?:-\d+)?$/);
  if (plain) return plain[1];

  return rtn;
}
