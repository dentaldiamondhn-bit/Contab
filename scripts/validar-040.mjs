// Validador ESTATAL de las migraciones de Compras/Proveedores. No sustituye a
// ejecutarlas en la BD (no hay acceso: el host de BD no resuelve), pero cubre
// los fallos que se han dado dos veces en la 040.
//
// Uso: node scripts/validar-040.mjs [ruta.sql]
// Sin argumento valida la 040.
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
//   5. La variable que recibe el INTO esta declarada.
//
// Las migraciones que NO usan SQL dinamico (la 041 es estatico entero) no
// disparan la regla 2: exigir un `EXECUTE` cuando no hay `%I` que justificarlo
//eria un falso rojo, igual que el falso verde que este script evita.

import { readFileSync } from 'node:fs';

const ruta = process.argv[2]
  ? new URL(`../${process.argv[2].replace(/^\.\//, '')}`, import.meta.url)
  : new URL('../prisma/migrations/040_compras_proveedores_tenant_coherente.sql', import.meta.url);
const etiqueta = process.argv[2] || '040_compras_proveedores_tenant_coherente.sql';
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
  // Posiciones (en `entrada`) de cada `'` que es CODIGO: las de dentro de un
  // literal y las del SQL anidado en un `$$`. No entra ni un `'` de prosa.
  // Hasta aqui la paridad se contaba sobre el texto ya limpio, o sea que solo
  // veia las comillas que quedaban DENTRO de las cadenas dollar-quoted: si se
  // limpia tambien eso (que es lo que hay que hacer, porque el contenido de un
  // `$$` es SQL), el recuento da 0 siempre y la regla 0b pasa a no probar nada.
  const comillas = [];
  let i = 0;
  const dollarTag = () => {
    const m = /^\$[A-Za-z_]*\$/.exec(entrada.slice(i));
    return m ? m[0] : null;
  };
  while (i < entrada.length) {
    const ch = entrada[i];
    // literal de una linea: se vacia, se respeta el doble '' como escape
    if (ch === "'") {
      comillas.push(i);
      salida[i] = ' ';
      i++;
      while (i < entrada.length) {
        if (entrada[i] === "'") {
          comillas.push(i);
          if (entrada[i + 1] === "'") { comillas.push(i + 1); salida[i] = ' '; salida[i + 1] = ' '; i += 2; continue; }
          salida[i] = ' ';
          i++;
          break;
        }
        salida[i] = entrada[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }
    // cadena dollar-quoted: sus delimitadores se conservan, pero su CONTENIDO
    // es SQL de verdad (el cuerpo de un DO, o el texto que va a ejecutar
    // format()), asi que se limpia igual. Antes se saltaba entero, y eso hacia
    // que el validador analizara su propia documentacion escrita DENTRO del
    // bloque: la 044 comento el SQL roto (`SELECT a, b INTO c`) dentro de un
    // `DO $$` y la regla 8 lo senalo como bug. Tercera vez que este script se
    // engancha con su propia prosa, y la leccion ya estaba escrita en AGENTS.md.
    // Se recursa: un DO anidado dentro de otro (o un `$f$` dentro de `$$`)
    // limpia igual.
    if (ch === '$') {
      const tag = dollarTag();
      if (tag) {
        const fin = entrada.indexOf(tag, i + tag.length);
        if (fin === -1) { problemas.push(`L${entrada.slice(0, i).split('\n').length}: cadena ${tag} sin cerrar`); break; }
        const base = i + tag.length;
        const r = sinComentarios(entrada.slice(base, fin));
        for (let k = 0; k < r.texto.length; k++) salida[base + k] = r.texto[k];
        for (const p of r.comillas) comillas.push(base + p);
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
  return { texto: salida.join(''), comillas };
}

const { texto: codigo, comillas: comillasCodigo } = sinComentarios(sql);

// --- 0b. Paridad de comillas simples ---------------------------------------
// Esta regla existe por un fallo real: la 041 se escribio con un apostrofo de
// mas en `coalesce(v_faltan || ', '')` y Postgres respondio
//   ERROR: 42601: unterminated quoted string at or near "'; END "
// **El validador de entonces dio verde**: no tenia ninguna regla de comillas, y
// ademas las cuenta las hacia el tokenizer que trata `''` como escape, asi que
// un apostrofo de mas pasa desapercibido. Leccion: contar la forma no es
// validar; hace falta una regla por cada forma de fallo que se haya pagado.
//
// Por que basta con la paridad y no con un parseo: cada `'` abre o cierra un
// literal, y `''` (escape) aporta 2, o sea que es par. Si el total es impar,
// hay un literal sin cerrar. COMENTARIOS FUERA: un apostrofo en prosa
// (`-- no uses '' aqui`) no es codigo y no debe contar.
//
// La paridad GLOBAL es el requisito duro. La paridad POR LINEA solo localiza:
// si un literal cruza varias lineas, una lineaEnding en impar es legitima y no
// se reporta como problema mientras el total global sea par.
{
  const total = comillasCodigo.length;
  const lineas = sql.split('\n');
  // limite de inicio de cada linea en `sql`, para pasar de posicion a linea
  const inicioLinea = [0];
  for (let k = 0; k < sql.length; k++) if (sql[k] === '\n') inicioLinea.push(k + 1);
  const lineaDe = (p) => {
    let lo = 0, hi = inicioLinea.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (inicioLinea[mid] <= p) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };

  // Se acumula POR LINEA, igual que la version original: cada literal bien
  // formado aporta 2 a su linea, asi que el total global es par siempre y la
  // cuenta nunca se pone impar. Acumulando comilla a comilla, en cambio, el
  // total pasa a impar en la PRIMERA comilla de todo el archivo y la regla
  // senalaba la linea 60 en cualquier fallo. La linea solo sirve para localizar.
  const porLinea = new Array(lineas.length).fill(0);
  for (const p of comillasCodigo) porLinea[lineaDe(p) - 1]++;

  let total2 = 0;
  let lineaQueRompe = -1;
  for (let i = 0; i < porLinea.length; i++) {
    if (porLinea[i] === 0) continue;
    const antes = total2;
    total2 += porLinea[i];
    if (antes % 2 === 0 && total2 % 2 !== 0 && lineaQueRompe === -1) lineaQueRompe = i + 1;
  }

  if (total % 2 !== 0) {
    problemas.push(
      `comillas simples impares (${total}): hay un literal sin cerrar. ` +
      (lineaQueRompe !== -1
        ? `El acumulado por linea se vuelve impar en la L${lineaQueRompe}:\n` +
          `        ${lineas[lineaQueRompe - 1].trim()}\n` +
          `      OJO: eso solo LOCALIZA y puede ser un literal que cruza lineas ` +
          `(legitimo). El requisito duro es la paridad global. Un apostrofo de ` +
          `mas hace que Postgres lea todo lo que sigue como texto y corte en el ` +
          `primer '; del bloque.`
        : '')
    );
  } else if (lineaQueRompe !== -1) {
    avisos.push(`paridad global OK; la L${lineaQueRompe} tiene impar porque un literal cruza lineas`);
  }
}

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
// Todo `%I` tiene que estar DENTRO de un `format(...)`. Un `%I` suelto en el
// cuerpo no se sustituye: Postgres lo lee como SQL y falla con
// `syntax error at or near %`, aunque el `format()` este unas lineas mas arriba
// (AGENTS.md, seccion 5). Ese es el fallo que vale la pena cazar aqui.
//
// No se exige que haya un `EXECUTE`: `%I` dentro de `to_regclass(format(...))`
// es legitimo sin SQL dinamico, y la 041 lo usa en su preflight.
const sinFormato = [];
let m3;
const Rango3 = /%I/g;
while ((m3 = Rango3.exec(codigo)) !== null) {
  const previo = codigo.slice(0, m3.index);
  const ultimoFormat = previo.lastIndexOf('format(');
  const ultimoExecute = previo.lastIndexOf('EXECUTE');
  if (ultimoFormat === -1 || ultimoFormat < ultimoExecute) {
    sinFormato.push(`L${codigo.slice(0, m3.index).split('\n').length}`);
  }
}
for (const l of sinFormato) {
  problemas.push(`${l}: hay un %I fuera de un format(): Postgres lo lee como SQL y da "syntax error at or near %"`);
}

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

// --- 6. Columnas `name` comparadas con columnas `oid` -------------------------
// Este fallo se ha PAGADO DOS VECES (la 043 y la 044, con el mismo JOIN):
//
//     JOIN pg_namespace nsp ON nsp.nspname = rel.relnamespace
//                          ^^ name              ^^ oid
//
// Postgres no tiene operador `name = oid`, asi que la sentencia compila y
// revienta AL EJECUTARSE con `42883 operator does not exist: name = oid`. Es un
// error de runtime: ninguna regla de forma, comillas ni bloques lo ve, y por eso
// el validador dio verde las dos veces y el SQL Editor revento las dos.
//
// El JOIN correcto es `nsp.oid = rel.relnamespace` (oid = oid).
//
// Se comprueba por los NOMBRES de columna de los catalogos de Postgres, que son
// estables y documentados:
//   tipo `name`  -> nspname, relname, attname, typname, conname, indexrelname
//   tipo `oid`   -> oid (a secas, en cualquier catalogo), relnamespace, conrelid,
//                   confrelid, attrelid, indrelid, reltype, typnamespace,
//                   contypid, indexrelid, dattnamespace, relowner
// `oid` a secas va al FINAL del grupo: `conrelid` y `indrelid` empiezan por otra
// cosa y tienen que|matchear ellos. Sin el, `nsp.oid = rel.relname` (que tambien
// es 42883) se colaba.
const colsName = 'nspname|relname|attname|typname|conname|collname|schemaname|tabname';
const colsOid = 'relnamespace|conrelid|confrelid|attrelid|indrelid|reltype|typnamespace|contypid|indexrelid|dattnamespace|relowner|oid';
// Solo el JOIN por alias es el patron que se ha repetido. Se exige el `n.`/`x.`
// para no marcar un literal de texto como columna.
const reNameVsOid = new RegExp(`\\b(\\w+)\\.(${colsName})\\s*(=|<>|!=)\\s*(\\w+)\\.(${colsOid})\\b`, 'g');
for (const m of codigo.matchAll(reNameVsOid)) {
  const n = codigo.slice(0, m.index).split('\n').length;
  const [, aliasIzq, colIzq, op, aliasDer, colDer] = m;
  problemas.push(
    `L${n}: ${aliasIzq}.${colIzq} es de tipo name y ${aliasDer}.${colDer} de tipo oid ` +
    `-> 42883 operator does not exist: name = oid (error de RUNTIME: ninguna regla de forma lo ve). ` +
    `Lo correcto es ${aliasDer}.oid ${op} ${aliasDer}.${colDer}`
  );
}
// Y el inverso por si se escribe al reves.
const reOidVsName = new RegExp(`\\b(\\w+)\\.(${colsOid})\\s*(=|<>|!=)\\s*(\\w+)\\.(${colsName})\\b`, 'g');
for (const m of codigo.matchAll(reOidVsName)) {
  const n = codigo.slice(0, m.index).split('\n').length;
  const [, aliasIzq, colIzq, op, aliasDer, colDer] = m;
  problemas.push(
    `L${n}: ${aliasIzq}.${colIzq} es de tipo oid y ${aliasDer}.${colDer} de tipo name ` +
    `-> 42883 operator does not exist: oid = name. Lo correcto es ${aliasDer}.oid ${op} ${aliasDer}.${colDer}`
  );
}

// --- 7. Columnas de catalogo con tipo conocido metidas en una variable de otro
//       tipo ---------------------------------------------------------------
// Tercer error de runtime que se pago y que ninguna regla de forma ve. La 044
// declaro `v_cascada boolean` y luego hizo:
//
//     SELECT con.confdeltype INTO v_cascada;
//
// pero `pg_constraint.confdeltype` es `"char"` ('a','c','r','n','d'), no
// boolean. Postgres intenta el casteo implicito 'c' -> boolean y revienta con
// `22P02 invalid input syntax for type boolean: "c"`.
//
// Lo que la vuelve puesta: el MISMO hecho estaba escrito bien en el post-check
// (declara `v_confdeltype "char"`) y mal en el preflight. Dos bloques, dos
// decisiones tecnicas para el mismo dato.
const tipoRealColumna = {
  confdeltype: '"char"',
  confupdtype: '"char"',
  confmatchtype: '"char"',
  contype: '"char"',
  attnotnull: 'boolean',
  indisunique: 'boolean',
  convalidated: 'boolean',
  attgenerated: 'text',
};
const declVars = {};
for (const [, nombre, tipo] of codigo.matchAll(/\b(\w+)\s+(text|boolean|"char"|uuid|bigint|int|integer|numeric|smallint)\b/g)) {
  if (!(nombre in declVars)) declVars[nombre] = tipo;
}
for (const m of codigo.matchAll(/SELECT\s+(?:\w+\.)?(\w+)\s+INTO\s+(\w+)/g)) {
  const col = m[1].toLowerCase();
  const var_ = m[2];
  const real = tipoRealColumna[col];
  if (!real || !declVars[var_]) continue;
  const declarado = declVars[var_];
  if (declarado !== real) {
    const n = codigo.slice(0, m.index).split('\n').length;
    problemas.push(
      `L${n}: SELECT ${col} INTO ${var_}, pero ${var_} es ${declarado} y la columna ` +
      `es ${real} -> 22P02 / error de asignacion en runtime. Declarar ${var_} ${real}.`
    );
  }
}

// --- 8. SELECT ... INTO: columnas seleccionadas = variables de destino -------
// Cuarta clase de error de runtime. La 044 tenia:
//
//     SELECT ic.relname, pg_get_indexdef(i.indexrelid) INTO v_queda_unico
//            ^^^^^^^^^^^ columna          ^^^^^^^^^^^^^^ columna   ^^^^^^^^ 1
//
// Dos columnas y UNA variable: PL/pgSQL no tiene a donde tirar el segundo
// valor, y falla al ejecutarse. Ninguna regla de forma lo ve.
//
// Se cuentan comas a nivel superior (los argumentos de `pg_get_indexdef(a, b)`
// van entre parentesis y NO son columnas). `[^;]*?` acorta en el primer `;` para
// que un SELECT sin INTO no se coma al siguiente.
const comasTop = (s) => {
  let prof = 0, comas = 0;
  for (const c of s) {
    if (c === '(') prof++;
    else if (c === ')') prof--;
    else if (c === ',' && prof === 0) comas++;
  }
  return comas + 1;
};
const reSelectInto = /\bSELECT\s+([^;]*?)\s+INTO\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\b/g;
for (const m of codigo.matchAll(reSelectInto)) {
  // Un `$` en la seleccion significa que se cruzo el cierre de una cadena
  // dollar-quoted: p.ej. `EXECUTE format($f$ SELECT count(*) ... $f$, v) INTO x`
  // empieza en el SELECT de dentro y acaba en el INTO de fuera, y la coma entre
  // `$f$` y `v` no es columna. Saltarlo da 4 falsos rojos en la 040; el SQL
  // dinamico queda sin cubrir aqui, que es preferible a senalar lo correcto.
  if (m[1].includes('$')) continue;
  const cols = comasTop(m[1]);
  const vars = comasTop(m[2]);
  if (cols !== vars) {
    const n = codigo.slice(0, m.index).split('\n').length;
    problemas.push(
      `L${n}: SELECT ... INTO tiene ${cols} columna(s) y ${vars} variable(s) ` +
      `-> error de runtime (PL/pgSQL no tiene destino para el sobrante). ` +
      `La seleccion es: ${m[1].replace(/\s+/g, ' ').trim()}`
    );
  }
}

// --- 9. Comentarios estilo JS (`//`) en un fichero SQL -----------------------
// `//` no es comentario en Postgres: da `42601 syntax error at or near "//"`.
// Se pago en la 044, donde un comentario del propio asistente se escribio con
// la sintaxis de JavaScript dentro de un bloque `DO`. Es ademas el fallo mas
// barato de todos: ni siquiera llega a ejecutarse, el parser lo rechaza.
//
// Se comprueba sobre `codigo`, donde los literales `'...'` ya estan vaciados y
// los `--` ya se han comido hasta el fin de linea, asi que cualquier `//` que
// quede es codigo de verdad y no una URL dentro de una cadena.
const lineasJS = [];
for (const [i, l] of codigo.split('\n').entries()) {
  if (l.includes('//')) lineasJS.push(`L${i + 1}: ${sql.split('\n')[i].trim()}`);
}
for (const l of lineasJS) problemas.push(`${l} -> 42601 syntax error at or near "//". En SQL el comentario es "--".`);

// --- informe ----------------------------------------------------------------
console.log(`validar-040.mjs -> ${etiqueta}`);
console.log(`  bloques DO ............. ${nDo}`);
console.log(`  cadenas dinamicas $f$ ... ${aperturas}`);
console.log(`  %I dentro de format() . ${(codigo.match(/%I/g) || []).length}`);
console.log(`  UPDATE ................. ${(codigo.match(/^\s*UPDATE /gm) || []).length}`);
console.log(`  INSERT ................. ${(codigo.match(/^\s*INSERT INTO /gm) || []).length}`);
console.log(`  DROP POLICY IF EXISTS . ${(codigo.match(/DROP POLICY IF EXISTS/g) || []).length}`);
for (const a of avisos) console.log(`  ${a}`);

if (problemas.length) {
  console.log(`\n${problemas.length} PROBLEMA(S):`);
  for (const p of problemas) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('\nOK: estructura consistente. Aun NO ejecutada contra PostgreSQL.');