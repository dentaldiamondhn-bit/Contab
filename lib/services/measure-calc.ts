// measure-calc.ts — aritmetica de medidas de producto e ISV.
//
// Modulo 100% puro: ni `@/lib/supabase/*`, ni red, ni Date, ni dependencias.
// Se prueba directo (`tests/inventory/measure-calc.test.mjs`) con ruta relativa.
//
// REGLA DE UNIDADES
// -----------------
// El stock vive en la UNIDAD BASE del producto (la de `product.unit` y de
// `inventory_movement`). Una medida ("Docena", "Caja") es solo un empaque con
// su factor, y la conversion es:
//
//     base = factor x cantidad          (3 docenas x 50 u/docena = 150 u)
//
// `inventory_movement.quantity` es `integer` en la BD, asi que la base debe
// ser ENTERA > 0: `unidadesBase` lanza si no (1.3 u o 0 u se rechazan; no se
// inventa un redondeo para dejar pasar stock que la BD no puede guardar).
// La tolerancia de 1e-9 en la comprobacion es solo contra ruido de coma
// flotante de la multiplicacion (0.5 x 12 = 6 exacto, pero 0.7 x 10 podria
// no serlo), no redondea cantidades de verdad fraccionarias.
//
// POR QUE EL REDONDEO VIVE AQUI Y NO EN LOS LLAMADORES
// -----------------------------------------------------
// El proyecto tiene DOS politicas de decimales en el mismo modulo de dinero:
// compras a 0 decimales y POS/precios a 2 (centavos), y el ISV se calcula en
// dos direcciones (sacarlo del precio final cuando `incluye`, o sumarlo al
// neto cuando no). Si cada llamador hiciera su propio `Math.round`, la base y
// el impuesto se redondearian por separado y `base + impuesto` dejaria de
// cuadrar con `total`: un centavo que luego no cuadra entre la pantalla, la
// factura y el libro. Aqui se redondea UNA vez y con el invariante puesto:
//
//     impuesto = redondear(total - base)     cuando el precio ya incluye ISV
//
// de modo que `redondear(base + impuesto) === total` siempre. Los llamadores
// (billing, compras, POS, import) consumen estos numeros ya cuadrados y no
// deben reimplementar el redondeo. Importes en LEMPIRAS, sin /100 (AGENTS.md
// seccion 2). Redondeo: `Math.round` (media hacia arriba en positivos), el
// tipico de dinero.
//
// Decisiones de borde (cubiertas por los tests):
// - `factorValido` es LAXO: lo que no sea un entero >= 1 (undefined, null,
//   "", 0, -3, "abc", 2.5) se lee como "sin factor" y devuelve 1; nunca lanza.
// - `exigirFactor` es ESTRICTO: lo mismo lanza Error (nunca devuelve un factor
//   invalido). Quien admite "sin factor" llama a `factorValido`; quien
//   necesita un factor real (linea de compra, stock) llama a
//   `exigirFactor(x ?? 1)`, decidiendo el default en el llamador.

export type DesgloseImpuesto = { base: number; impuesto: number; total: number };

/** Redondeo del proyecto: compras enteras (0), POS a centavos (2). */
export function redondear(valor: number, decimales: 0 | 2): number {
  const escala = decimales === 0 ? 1 : 100;
  return Math.round(valor * escala) / escala;
}

/** entero >= 1, o null si el valor no lo es (no lanza). */
function parsearFactor(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

/** Entero >= 1. Si `value` es vacío/undefined/null/"", devuelve 1. */
export function factorValido(value: unknown): number {
  // 0 tambien cae aqui: un factor 0 se lee como "sin factor", no rompe.
  return parsearFactor(value) ?? 1;
}

/** throw Error si no es entero >= 1 (nunca devuelve factor inválido). */
export function exigirFactor(value: unknown): number {
  const factor = parsearFactor(value);
  if (factor === null) {
    throw new Error(`factor invalido: ${String(value)} (debe ser un entero >= 1)`);
  }
  return factor;
}

/** Base de stock: throw si no da entero > 0 (inventory_movement.quantity es integer). */
export function unidadesBase(quantity: number, factor: number): number {
  const f = exigirFactor(factor);
  const producto = quantity * f;
  const base = Math.round(producto);
  if (!Number.isFinite(producto) || Math.abs(producto - base) > 1e-9 || base <= 0) {
    throw new Error(
      `cantidad base invalida: ${quantity} x ${f} = ${producto} (debe ser un entero > 0)`,
    );
  }
  return base;
}

/** Si `incluye`, saca el ISV del precio: base = precio/(1+tasa). Si no, lo suma. */
export function desglosarImpuesto(
  precioFinal: number,
  tasa: number,
  incluye: boolean,
  decimales: 0 | 2,
): DesgloseImpuesto {
  const total = redondear(precioFinal, decimales);

  if (incluye) {
    // El total manda: el impuesto se deriva (total - base) ya redondeado para
    // que base + impuesto === total sin residuo de un centavo.
    const base = redondear(precioFinal / (1 + tasa / 100), decimales);
    const impuesto = redondear(total - base, decimales);
    return { base, impuesto, total };
  }

  const base = total;
  const impuesto = redondear(base * (tasa / 100), decimales);
  return { base, impuesto, total: redondear(base + impuesto, decimales) };
}

/** Neto (sin ISV) de un costo/precio por medida, redondeado. */
export function precioNeto(
  precio: number,
  tasa: number,
  incluye: boolean,
  decimales: 0 | 2,
): number {
  return desglosarImpuesto(precio, tasa, incluye, decimales).base;
}
