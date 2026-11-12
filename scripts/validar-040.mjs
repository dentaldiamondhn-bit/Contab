// Validador ESTATAL de la 040. No sustituye a ejecutarla en la BD (no hay
// acceso: el host de BD no resuelve), pero cubre los fallos que se han dado dos
// veces en este archivo.
//
// Lo que NO hacia el chequeo anterior (y por eso dio verde con la migracion
// rota): contar bloques DO y usos de %I. Eso solo mira la forma, no si el SQL
// dentro de las cadenas dinamicas es ejecutable.
//
// Reglas que comprueba:
//   1. Ningun `INTO` dentro de una cadena dollar-quoted `$f$...$f$`.
//      -> `EXECUTE` no implementa `SELECT ... INTO`; el INTO va fuera.
//   2. Todo `SELECT count(*)` dentro de un EXECUTE tiene su `INTO` fuera, o la
//      sentencia usa GET DIAGNOSTICS.
//   3. Todo `EXECUTE format` con `%I` cierra su cadena.
//   4. BEGIN/COMMIT balanceados y bloques DO balanceados.

import { readFileSync } from 'node:fs';

const ruta = new URL('../prisma/migrations/040_compras_proveedores_tenant_coherente.sql', import.meta.url);
const sql = readFileSync(ruta, 'utf8');
const lineas = sql.split('\n');

const problemas = [];
const avisos = [];

// --- 0. Quitar comentarios, respetando literales y dollar-quoting -------------
// Sin esto el validador se engana con SU PROPIA documentacion: la cabecera de la
// 040 menciona `$f$` en prosa, y eso descoloca el emparejamiento de cadenas y
// hace que el bloque del UPDATE parezca estar dentro de una. El primer version
// de este script dio 7 problemas falsos solo por eso.
//
// `--` solo abre comentario en codigo normal: dentro de un literal o de una
// cadena dollar-quoted es texto. Y los literales se sustituyen por espacios,
// para que un `--` de un literal no corte la linea.
function sinComentarios(entrada) {
  const salida = entrada.split('');
  let i = 0;
  const dollarTag = () => {
    const m = /^\$[A-Za-z_]*\$/.exec(entrada.slice(i));
    return m ? m[0] : null;
  };
  while (i < entrada.length) {
    const ch = entrada[i];
    // literal de una linea: se vacia, se respeta el doble '' como escape
    if (ch === "'") {
      salida[i] = ' ';
      i++;
      while (i < entrada.length) {
        if (entrada[i] === "'") {
          if (entrada[i + 1] === "'") { salida[i] = ' '; salida[i + 1] = ' '; i += 2; continue; }
          salida[i] = ' ';
          i++;
          break;
        }
        salida[i] = entrada[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }
    // cadena dollar-quoted: se respeta como unidad, su contenido es SQL
    if (ch === '$') {
      const tag = dollarTag();
      if (tag) {
        const fin = entrada.indexOf(tag, i + tag.length);
        if (fin === -1) { problemas.push(`L${entrada.slice(0, i).split('\n').length}: cadena ${tag} sin cerrar`); break; }
        i = fin + tag.length;
        continue;
      }
    }
    // comentario hasta el fin de linea
    if (ch === '-' && entrada[i + 1] === '-') {
      while (i < entrada.length && entrada[i] !== '\n') { salida[i] = ' '; i++; }
      continue;
    }
    i++;
  }
  return salida.join('');
}

const codigo = sinComentarios(sql);

// --- 1. Ningun INTO dentro de una cadena $f$...$f$ ---------------------------
const Rango = /\$f\$([\s\S]*?)\$f\$/g;
let m;
while ((m = Rango.exec(codigo)) !== null) {
  const lineaInicio = codigo.slice(0, m.index).split('\n').length;
  const lineaFin = lineaInicio + m[1].split('\n').length - 1;
  const dentro = m[1];
  for (const [i, l] of dentro.split('\n').entries()) {
    const n = lineaInicio + i;
    // `FOR x IN ARRAY ...` no lleva INTO; un INTO aqui seria el bug.
    if (/(^|[^A-Za-z_])INTO([^A-Za-z_]|$)/i.test(l)) {
      problemas.push(`L${n}: hay un INTO DENTRO de la cadena dinamica: "${l.trim()}"`);
    }
  }
  if (lineaFin > 0) avisos.push(`cadena dinamica L${lineaInicio}-${lineaFin}`);
}

// --- 2. Cada SELECT count(*) de un EXECUTE recibe su valor -------------------
const Rango2 = /EXECUTE\s+format\(([\s\S]*?)\)\s*(INTO\s+[A-Za-z_]\w*\s*;|;)/g;
let m2;
const ejecutadas = new Set();
while ((m2 = Rango2.exec(codigo)) !== null) {
  const cuerpo = m2[1];
  const cola = m2[2];
  const linea = codigo.slice(0, m2.index).split('\n').length;
  ejecutadas.add(linea);
  if (/\bSELECT\b/i.test(cuerpo) && !/^\s*INTO/i.test(cola)) {
    problemas.push(`L${linea}: EXECUTE de un SELECT sin INTO fuera ni GET DIAGNOSTICS`);
  }
  if (/\bUPDATE\b/i.test(cuerpo) && /^\s*INTO/i.test(cola)) {
    problemas.push(`L${linea}: EXECUTE de un UPDATE con INTO (un UPDATE no devuelve filas asi)`);
  }
}
if (ejecutadas.size === 0) problemas.push('no se detecto ninguna sentencia EXECUTE');

// --- 3. Cada EXECUTE format($f$ tiene su $f$) de cierre ----------------------
// Contar "$f$" en par no basta: el fallo real fue un descolocamiento, asi que se
// comprueba que cada apertura `EXECUTE format($f$` tenga su cierre `$f$)`.
const aperturas = (codigo.match(/EXECUTE\s+format\(\$f\$/g) || []).length;
const cierres = (codigo.match(/\$f\$\s*,/g) || []).length;
const totalDollarF = (codigo.match(/\$f\$/g) || []).length;
if (totalDollarF % 2 !== 0) {
  problemas.push(`numero impar de $f$ (${totalDollarF}): alguna cadena no cierra`);
}
if (aperturas !== cierres) {
  problemas.push(`EXECUTE format($f$ abren ${aperturas} pero "$f$," cierran ${cierres}: hay una cadena sin cerrar`);
}

// --- 4. BEGIN/COMMIT y DO balanceados ---------------------------------------
const abreTx = (codigo.match(/^BEGIN;/gm) || []).length;
const cierraTx = (codigo.match(/^COMMIT;/gm) || []).length;
if (abreTx !== 1 || cierraTx !== 1) problemas.push(`transaccion: BEGIN=${abreTx} COMMIT=${cierraTx} (se esperaba 1 y 1)`);

const nDo = (codigo.match(/DO \$\$/g) || []).length;
const nEndDo = (codigo.match(/^END \$\$;/gm) || []).length;
if (nDo !== nEndDo) problemas.push(`bloques DO: ${nDo} abren, ${nEndDo} cierran`);

// --- 5. La variable que recibe el INTO tiene que estar declarada ------------
for (const [i, l] of codigo.split('\n').entries()) {
  const mm = /\)\s*INTO\s+([A-Za-z_]\w*)\s*;/.exec(l);
  if (mm) {
    const decl = new RegExp(`\\b${mm[1]}\\s+(text|int|integer|bigint|boolean|uuid|numeric)\\b`).test(codigo);
    if (!decl) problemas.push(`L${i + 1}: INTO ${mm[1]} pero no hay DECLARE de esa variable`);
  }
}

// --- informe ----------------------------------------------------------------
console.log(`validar-040.mjs`);
console.log(`  bloques DO ............. ${nDo}`);
console.log(`  cadenas dinamicas $f$ ... ${aperturas}`);
console.log(`  %I dentro de format() . ${(codigo.match(/%I/g) || []).length}`);
console.log(`  UPDATE ................. ${(codigo.match(/^\s*UPDATE /gm) || []).length}`);
for (const a of avisos) console.log(`  ${a}`);

if (problemas.length) {
  console.log(`\n${problemas.length} PROBLEMA(S):`);
  for (const p of problemas) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('\nOK: estructura consistente. Aun NO ejecutada contra PostgreSQL.');