/**
 * Carga `.env` para los scripts de mantenimiento.
 *
 * Los scripts se ejecutan con `node scripts/loquesea.js` desde cualquier
 * directorio, así que no basta con `require('dotenv').config()` (que busca en
 * el cwd). Este loader sube desde su propia ubicación hasta encontrar el `.env`
 * del proyecto.
 *
 * No sobrescribe variables ya presentes en el entorno: así se puede apuntar a
 * otra base con `DATABASE_URL=... node scripts/...` sin editar el archivo.
 */

const fs = require('fs');
const path = require('path');

function findEnvFile(startDir) {
  let dir = startDir;
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadEnv(startDir) {
  const envPath = findEnvFile(startDir || __dirname);
  if (!envPath) return null;

  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return envPath;
}

function requireDatabaseUrl() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Falta DATABASE_URL. Copia .env.example a .env y define la cadena de conexión de Postgres.',
    );
  }
  return url;
}

function getDatabasePassword() {
  const url = new URL(requireDatabaseUrl());
  return decodeURIComponent(url.password);
}

/** Configuración lista para `new Pool(...)` / `new Client(...)`. */
function databaseConfig(extra) {
  return {
    connectionString: requireDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
    ...(extra || {}),
  };
}

module.exports = {
  loadEnv,
  requireDatabaseUrl,
  getDatabasePassword,
  databaseConfig,
};
