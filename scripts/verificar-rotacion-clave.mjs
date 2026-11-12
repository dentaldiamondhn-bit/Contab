// Verifica una ROTACION de la service_role sin que nadie tenga que pegar claves.
//
// Uso:  node scripts/verificar-rotacion-clave.mjs
//
// Que hace:
//   1. La clave NUEVA se lee de SUPABASE_SERVICE_ROLE_KEY (entorno o .env.local).
//   2. La clave VIEJA se saca del HISTORIAL DE GIT, del commit que la santeo.
//   3. Pregunta a Supabase con cada una y dice solo el codigo HTTP.
//
// NUNCA imprime ninguna de las dos claves, ni un fragmento. Solo longitudes.
//
// Salida 0 si la rotacion esta bien (nueva funciona, vieja muerta).
// Salida 1 si la vieja TODAVIA funciona: la rotacion no ha surtido efecto y la
// clave filtrada sigue dando acceso total a la base.

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { supabaseEnv } = require('./_supabase-env.js');

const { url, serviceKey: claveNueva } = supabaseEnv();

/** Commit que quito las claves escritas a mano. Su padre las todavia tiene. */
const COMMIT_SANEADO = 'ed57815';

// Un fichero que entonces llevaba la clave. Cualquiera vale: solo hace falta uno.
const FICHERO = 'scripts/check-tables.js';

function claveViejaDeGit() {
  const versiones = [`${COMMIT_SANEADO}^`, COMMIT_SANEADO];
  for (const v of versiones) {
    let txt;
    try {
      txt = execSync(`git show "${v}:${FICHERO}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      continue;
    }
    // El patron de una service_role: cabecera eyJ y "role":"service_role".
    const m = txt.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g);
    if (!m) continue;
    for (const cand of m) {
      try {
        const payload = JSON.parse(Buffer.from(cand.split('.')[1], 'base64').toString());
        if (payload.role === 'service_role') return cand;
      } catch {
        /* no es un JWT legible, siguiente */
      }
    }
  }
  return null;
}

/**
 * Una peticion minima que exige una key valida. `/rest/v1/` responde 200 con
 * cualquier credencial buena y 401 con una mala, sin tocar datos.
 */
async function estado(clave) {
  try {
    const r = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: clave, Authorization: `Bearer ${clave}` },
    });
    await r.body?.cancel();
    return r.status;
  } catch (e) {
    return `error de red: ${e.message}`;
  }
}

const claveVieja = claveViejaDeGit();

console.log('Verificacion de rotacion de la service_role');
console.log('------------------------------------------');
console.log(`URL        ${url}`);
console.log(`Clave nueva: ${claveNueva.length} caracteres`);

if (!claveVieja) {
  console.log('\nNo se ha podido recuperar la clave vieja del historial.');
  console.log('Si el commit de sanear todavia no existe en tu clon, el historial');
  console.log('puede estar reescrito: en ese caso la clave vieja hay que');
  console.log('confirmarla desde el panel de Supabase.');
  process.exit(2);
}

console.log(`Clave vieja: ${claveVieja.length} caracteres (desde el historial, no se imprime)`);
console.log('------------------------------');

const stNueva = await estado(claveNueva);
const stVieja = await estado(claveVieja);

console.log(`\nClave NUEVA -> HTTP ${stNueva}  ${stNueva === 200 ? 'funciona' : 'NO FUNCIONA'}`);
console.log(`Clave VIEJA -> HTTP ${stVieja}  ${stVieja === 401 ? 'muerta (bien)' : 'SIGUE VIVA'}`);

if (stNueva !== 200) {
  console.log('\nLa clave nueva no funciona. Comprueba que:');
  console.log('  - la has pegado entera en .env.local, sin comillas ni espacios');
  console.log('  - has actualizado tambien la variable en Vercel y re-desplegado');
  process.exit(1);
}

if (stVieja === 401) {
  console.log('\nRotacion correcta: la clave filtrada ya no da acceso.');
  console.log('Lo que sigue es opcional pero recomendado: la clave sigue escrita');
  console.log('en 6 commits. Si el repositorio puede ser publico, reescribe el');
  console.log('historial (git filter-repo o BFG). NO lo he hecho yo.');
  process.exit(0);
}

console.log('\nATENCION: la clave VIEJA todavia funciona.');
console.log('Eso significa que la rotacion no ha surtido efecto. Mientras sea asi,');
console.log('cualquiera con el repo tiene lectura y escritura de TODAS las empresas.');
console.log('Causas habituales:');
console.log('  - se creo una clave nueva pero no se revoco la vieja');
console.log('  - la clave se cambio solo en .env.local y no en el hosting');
process.exit(1);