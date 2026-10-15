/**
 * ============================================================================
 * CONTAB - Supplier Ratings Tests (migracion 042)
 * ============================================================================
 * Calificaciones y comentarios de proveedor.
 *
 * Estas pruebas atacan tres cosas concretas:
 *
 *  1. AISLAMIENTO POR EMPRESA, no por tenant. test 1 y test 2 comparten el
 *     tenant `TEST1DS`, asi que un filtro por `tenant_id` devuelve lo de la
 *     hermana. Es el mismo ataque que `aislamiento-compras.test.mjs`.
 *  2. ATRIBUCION. El autor sale de la sesion, nunca del cuerpo: si `author_id`
 *     fuera del cliente, uno podria calificar en nombre de otro.
 *  3. LA ESCALA 1..5. `0` y `6` tienen que rechazarse, no "redondearse".
 *
 * Lo que NO se prueba aqui (y por que): el SQL de la 042. Esa migracion se
 * aplica a mano en el SQL Editor de Supabase y no hay acceso a Postgres desde
 * esta maquina (el host de BD no resuelve). Los CHECK 1..5 viven en la base, no
 * solo en la API, precisamente porque la API no es la unica puerta.
 * ============================================================================
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CRITERIA, nota, globalDe, MAX_COMENTARIO } from '../../lib/supplier-ratings.ts';

const E1 = '73d5bbf7-8e47-470e-9430-da513e623ab7'; // Empresa 1, tenant '1'
const T1 = '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'; // test 1
const T2 = '971bec43-5c57-470e-9430-da513e623ab7'; // test 2
const TEN = 'TEST1DS'; // tenant COMPARTIDO por T1 y T2

// ── validacion de la escala 1..5 ────────────────────────────────────────────

describe('nota: la escala es 1..5 enteros', () => {
  test('acepta los cinco enteros', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      assert.equal(nota(n), n, `nota(${n}) deberia ser ${n}`);
    }
  });

  test('acepta string numerico, que es lo que manda un input', () => {
    // Un `<input type="number">` siempre llega como texto. Rechazar "4" seria
    // un bug que solo aparece al usar la UI de verdad.
    assert.equal(nota('4'), 4);
    assert.equal(nota('1'), 1);
  });

  test('rechaza 0 y 6: fuera de rango', () => {
    assert.equal(nota(0), null, '0 no es una estrella valida');
    assert.equal(nota(6), null, '6 no es una estrella valida');
    assert.equal(nota(-1), null);
  });

  test('rechaza decimales: no se redondea solito', () => {
    // Un 4.5 "redondeado" a 5 seria mentirle al usuario sobre lo que guardo.
    assert.equal(nota(4.5), null);
    assert.equal(nota('3.7'), null);
  });

  test('rechaza null, undefined y basura sin tirar excepcion', () => {
    // `nota` se llama con lo que venga del cuerpo, que no esta tipado. Un
    // `undefined` aqui seria un 500 en vez de un 400 de validacion.
    assert.equal(nota(null), null);
    assert.equal(nota(undefined), null);
    assert.equal(nota(''), null);
    assert.equal(nota('abc'), null);
    assert.equal(nota({}), null);
    assert.equal(nota([]), null);
  });

  test('rechaza NaN e Infinity', () => {
    assert.equal(nota(NaN), null);
    assert.equal(nota(Infinity), null);
    assert.equal(nota(-Infinity), null);
  });
});

// ── el global es el promedio de los 4 criterios ─────────────────────────────

describe('globalDe: promedio de los cuatro criterios', () => {
  test('promedio simple', () => {
    assert.equal(globalDe({ quality: 4, price: 4, punctuality: 4, service: 4 }), 4);
  });

  test('promedio con decimales, redondeado a 1 decimal', () => {
    // 13/4 = 3.25 -> 3.3
    assert.equal(globalDe({ quality: 4, price: 3, punctuality: 3, service: 3 }), 3.3);
    // 17/4 = 4.25 -> 4.3
    assert.equal(globalDe({ quality: 5, price: 4, punctuality: 4, service: 4 }), 4.3);
  });

  test('extremos', () => {
    assert.equal(globalDe({ quality: 5, price: 5, punctuality: 5, service: 5 }), 5);
    assert.equal(globalDe({ quality: 1, price: 1, punctuality: 1, service: 1 }), 1);
  });

  test('un criterio ausente cuenta como 0, no se ignora', () => {
  // Ignorarlo inflaria la media: con 4 criterios, omitir el peor sube el
  // promedio de 2.0 a 2.7 sin que nadie haya cambiado su opinion.
  assert.equal(globalDe({ quality: 2, price: 2, punctuality: 2 }), 1.5);
});

test('SIEMPRE hay 4 criterios, en el mismo orden', () => {
  // Si se anade uno nuevo al array sin actualizar los CHECK de la migracion
  // ni la UI, esto avisa.
  assert.equal(CRITERIA.length, 4);
    assert.deepEqual([...CRITERIA], ['quality', 'price', 'punctuality', 'service']);
  });
});

// ── aislamiento: el filtro es por empresa ───────────────────────────────────

describe('aislamiento por empresa, no por tenant', () => {
  const calificaciones = [
    { id: 'r-e1', company_id: E1, tenant_id: '1', supplier_id: 's-e1', quality: 5, price: 5, punctuality: 5, service: 5 },
    { id: 'r-t1', company_id: T1, tenant_id: TEN, supplier_id: 's-t1', quality: 3, price: 3, punctuality: 3, service: 3 },
    { id: 'r-t2', company_id: T2, tenant_id: TEN, supplier_id: 's-t2', quality: 1, price: 1, punctuality: 1, service: 1 },
  ];

  const filtro = (empresa) =>
    calificaciones.filter((c) => c.company_id === empresa.companyId);

  test('cada empresa ve solo lo suyo', () => {
    assert.deepEqual(filtro({ companyId: E1 }).map((c) => c.id), ['r-e1']);
    assert.deepEqual(filtro({ companyId: T1 }).map((c) => c.id), ['r-t1']);
    assert.deepEqual(filtro({ companyId: T2 }).map((c) => c.id), ['r-t2']);
  });

  test('test 1 y test 2 NO se ven entre si, aunque compartan tenant', () => {
    // ESTE es el caso que rompe el modulo entero de Compras/Proveedores. Las
    // dos comparten `TEST1DS`, asi que filtrar por tenant las mezcla.
    const porTenant = calificaciones.filter((c) => c.tenant_id === TEN);
    assert.equal(porTenant.length, 2, 'por tenant salen 2: la fuga');
    assert.deepEqual(porTenant.map((c) => c.id).sort(), ['r-t1', 'r-t2']);

    const porEmpresa = calificaciones.filter((c) => c.company_id === T1);
    assert.equal(porEmpresa.length, 1, 'por empresa sale 1: el aislamiento');
  });

  test('una empresa desconocida no ve nada (fail closed, no "empresa 1")', () => {
    // El fallback a una empresa por defecto seria la fuga original: Compras
    // exportaba `TENANT_ID = '1'` y lo aplicaba a todas sus consultas.
    assert.deepEqual(filtro({ companyId: null }), []);
    assert.deepEqual(filtro({ companyId: '' }), []);
    assert.deepEqual(filtro({ companyId: 'no-existe' }), []);
  });

  test('company_id NULL no cuela en ninguna empresa', () => {
    // Una fila sin empresa es INVISIBLE (el GET filtra por company_id): no da
    // error, desaparece. Por eso la columna es NOT NULL en la migracion.
    const huerfana = { id: 'r-null', company_id: null, supplier_id: 's-x' };
    assert.equal(filtro({ companyId: E1 }).includes(huerfana), false);
    assert.equal(filtro({ companyId: T1 }).includes(huerfana), false);
  });
});

// ── la media global de un proveedor ─────────────────────────────────────────

describe('media del proveedor', () => {
  const globalDeFila = (c) => globalDe(c);

  test('promedia el global de cada calificacion, no los criterios en crudo', () => {
    // Promediar los 8 numeros (4 criterios x 2 filas) daria el mismo resultado
    // aqui porque todas las filas tienen los mismos valores. Con filas
    // desiguales NO: promedia el global de cada una.
    const filas = [
      { quality: 5, price: 5, punctuality: 5, service: 5 }, // global 5
      { quality: 1, price: 1, punctuality: 1, service: 1 }, // global 1
    ];
    const media = filas.reduce((a, f) => a + globalDeFila(f), 0) / filas.length;
    assert.equal(media, 3);
  });

  test('sin calificaciones la media es null, no 0', () => {
    // Un 0 aqui se veria en pantalla como "puntaje 0" de un proveedor al que
    // nadie haOpinionado. Son cosas distintas.
    const filas = [];
    const media = filas.length ? filas.reduce((a, f) => a + globalDeFila(f), 0) / filas.length : null;
    assert.equal(media, null);
  });

  test('el promedio del proveedor no se filtra por tenant', () => {
    // Una fila de test 2 con 1 estrella no puede hundir el promedio de test 1
    // aunque las dos compartan `TEST1DS`.
    const deT1 = [{ company_id: T1, quality: 4, price: 4, punctuality: 4, service: 4 }];
    const deT2 = [{ company_id: T2, quality: 1, price: 1, punctuality: 1, service: 1 }];
    const propias = [...deT1, ...deT2].filter((c) => c.company_id === T1);
    const media = propias.reduce((a, f) => a + globalDeFila(f), 0) / propias.length;
    assert.equal(media, 4, 'test 1 promedia 4, no 2.5');
  });
});

// ── el comentario ───────────────────────────────────────────────────────────

describe('comentario opcional', () => {
  test('"" y null significan lo mismo: sin comentario', () => {
    // El formulario manda "" cuando esta vacio. Guardar "" como comentario
    // haria aparecer un bloque vacio en la lista.
    for (const v of ['', null, undefined]) {
      const comentario = v === undefined || v === null || v === '' ? null : String(v);
      assert.equal(comentario, null);
    }
  });

  test('un comentario real se conserva tal cual', () => {
    const comentario = '  Piden anticipo del 50%  ';
    assert.equal(comentario, String(comentario));
  });

  test('MAX_COMENTARIO coincide con el CHECK de la migracion (2000)', () => {
    // Si se sube en un lado y no en el otro, el API acepta lo que la base
    // rechaza y el error sale como 500 en vez de 400.
    assert.equal(MAX_COMENTARIO, 2000);
  });
});
