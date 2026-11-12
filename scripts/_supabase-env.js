// Cargador de credenciales para los scripts de `scripts/`.
//
// MOTIVO (2 Oct 2026): 33 ficheros de este directorio tenían la `service_role`
// escrita a mano en el código y commiteada. Esta clave SALTA el RLS por completo,
// así que con ella cualquiera con acceso al repo lee y escribe la base entera.
//
// Uso:
//   const { url, serviceKey } = require('./_supabase-env');
//
// Es un módulo CommonJS a propósito: los 33 scripts ya son CJS, y un `require`
// dentro de un `.mjs` no funciona.
//
// REQUISITOS: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el entorno o en
// `.env.local`. Si faltan, este script **aborta con un mensaje claro** en vez de
// dejar que `createClient` reviente con un error de supabase-js que no dice nada
// de la clave.
//
// Ver también `scripts/_leer-env.js`, que es el cargador genérico.

const fs = require('fs');
const path = require('path');

/**
 * Lee `.env.local` sin dependencias y sin sobreescribir variables ya presentes
 * en `process.env`. El entorno gana: si exportas la variable a mano, manda esa.
 */
function leerEnvLocal(ruta) {
  const destino = ruta || path.join(__dirname, '..', '.env.local');
  let contenido;
  try {
    contenido = fs.readFileSync(destino, 'utf8');
  } catch (e) {
    return {}; // No es un error: puede que el entorno venga de fuera.
  }

  const salida = {};
  for (const linea of contenido.split(/\r?\n/)) {
    const t = linea.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const clave = t.slice(0, eq).trim();
    let valor = t.slice(eq + 1).trim();
    // Quita comillas envolventes si las hay.
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    salida[clave] = valor;
  }
  return salida;
}

function requerido(clave, valor) {
  if (valor) return valor;
  throw new Error(
    `[scripts] Falta ${clave}.\n` +
      `Defínela en el entorno o en .env.local (no se commitea).\n` +
      `Copia .env.example y rellénala, o exporta la variable:\n` +
      `    ${clave}=... node scripts/<este-script>.js`
  );
}

/**
 * La URL del proyecto se llama `NEXT_PUBLIC_SUPABASE_URL` (asi esta en
 * `.env.local` y en `.env.example` del proyecto); `SUPABASE_URL` es el nombre que
 * usa la documentacion de Supabase. Se aceptan los dos, con ese orden de
 * preferencia, porque aqui el que existe es el `NEXT_PUBLIC_`.
 *
 * @returns {{url: string, serviceKey: string}}
 */
function supabaseEnv() {
  const delArchivo = leerEnvLocal();
  const leer = (clave) => process.env[clave] || delArchivo[clave];

  return {
    url: requerido(
      'NEXT_PUBLIC_SUPABASE_URL',
      leer('NEXT_PUBLIC_SUPABASE_URL') || leer('SUPABASE_URL')
    ),
    serviceKey: requerido('SUPABASE_SERVICE_ROLE_KEY', leer('SUPABASE_SERVICE_ROLE_KEY')),
  };
}

/**
 * Atajo: la clave, sin montar el cliente. Para los scripts que solo la pasan a
 * otra cosa.
 * @returns {string}
 */
function claveServiceRole() {
  return supabaseEnv().serviceKey;
}

/**
 * Atajo: cliente de supabase-js ya construido.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function supabaseCliente() {
  const { createClient } = require('@supabase/supabase-js');
  const { url, serviceKey } = supabaseEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = { leerEnvLocal, supabaseEnv, claveServiceRole, supabaseCliente };