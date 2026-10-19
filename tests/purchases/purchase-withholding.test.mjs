import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createPurchase } from '@/lib/purchase-db';
import {
  normalizarTipoRetencion,
  tasaDeRetencion,
  etiquetaRetencion,
  aplicaRetencion,
  calcularRetencion,
  RETENCIONES,
} from '../../lib/supplier-withholding.ts';
import { crearSupabaseFalso } from './supabase-falso.mjs';

/**
 * Retencion ISR del proveedor + exoneracion de ISV en Compras.
 *
 * Dos capas: (1) el evaluador PURO `lib/supplier-withholding.ts` y (2) la
 * integracion real en `createPurchase` (lib/purchase-db.ts REAL), donde la
 * retencion se calcula sobre el SUBTOTAL sin ISV, reduce lo pagado al proveedor
 * y la exoneracion se marca por linea con cabecera derivada.
 */

const T1 = '8143dd4e-a4ef-4619-87a2-0504d0c8c46a';
const TEN = 'TEST1DS';
const em1 = { tenantId: TEN, companyId: T1 };

let fake;

beforeEach(() => {
  fake = crearSupabaseFalso({
    bd: {
      Purchase: [],
      PurchaseItem: [],
      Supplier: [{ id: 's-t1', company_id: T1, tenant_id: TEN, name: 'Proveedor T1', rtn: '0801-2' }],
      product: [],
    },
    seq: 0,
  });
});

const base = (over = {}) => ({
  supplier_id: 's-t1',
  invoice_number: 'F-1',
  invoice_date: '2026-10-15',
  tax_rate: 15,
  purchase_type: 'expense',
  is_credit: false,
  items: [
    {
      product_name: 'Servicio',
      quantity: 1,
      unit_price: 1000,
      subtotal: 1000,
      tax_amount: 150,
      total: 1150,
      exonerated: false,
    },
  ],
  ...over,
});

describe('lib/supplier-withholding (puro)', () => {
  test('normalizarTipoRetencion acepta valores, alias y basura', () => {
    assert.equal(normalizarTipoRetencion('ISR_1'), 'ISR_1');
    assert.equal(normalizarTipoRetencion('isr_12_5'), 'ISR_12_5');
    assert.equal(normalizarTipoRetencion('1%'), 'ISR_1');
    assert.equal(normalizarTipoRetencion('0.01'), 'ISR_1');
    assert.equal(normalizarTipoRetencion('12.5%'), 'ISR_12_5');
    assert.equal(normalizarTipoRetencion('12,5%'), 'ISR_12_5');
    assert.equal(normalizarTipoRetencion('NONE'), 'NONE');
    assert.equal(normalizarTipoRetencion('sin retencion'), 'NONE');
    assert.equal(normalizarTipoRetencion(''), 'NONE');
    assert.equal(normalizarTipoRetencion(null), 'NONE');
    assert.equal(normalizarTipoRetencion('cualquier cosa'), 'NONE');
  });

  test('tasaDeRetencion: 0 / 0.01 / 0.125', () => {
    assert.equal(tasaDeRetencion('NONE'), 0);
    assert.equal(tasaDeRetencion('ISR_1'), 0.01);
    assert.equal(tasaDeRetencion('ISR_12_5'), 0.125);
    assert.equal(tasaDeRetencion('basura'), 0);
  });

  test('etiquetaRetencion y aplicaRetencion', () => {
    assert.equal(etiquetaRetencion('ISR_1'), 'ISR 1% (servicios profesionales)');
    assert.equal(etiquetaRetencion('ISR_12_5'), 'ISR 12.5% (otros servicios)');
    assert.equal(etiquetaRetencion('NONE'), 'Sin retención');
    assert.equal(aplicaRetencion('ISR_1'), true);
    assert.equal(aplicaRetencion('NONE'), false);
  });

  test('calcularRetencion redondea a lempiras enteras y respeta NONE', () => {
    assert.equal(calcularRetencion(1000, 'ISR_1'), 10);
    assert.equal(calcularRetencion(200, 'ISR_12_5'), 25);
    assert.equal(calcularRetencion(333, 'ISR_1'), 3); // 3.33 -> 3
    assert.equal(calcularRetencion(1000, 'NONE'), 0);
    assert.equal(calcularRetencion(NaN, 'ISR_1'), 0);
  });

  test('RETENCIONES declara su tasa en todas las opciones', () => {
    assert.equal(RETENCIONES.length, 3);
    for (const r of RETENCIONES) assert.equal(typeof r.tasa, 'number');
  });
});

describe('createPurchase: retencion ISR (subtotal sin ISV)', () => {
  test('ISR 1%: se guarda el tipo, la tasa y el monto; reduce lo pagado', async () => {
    const { data, error } = await createPurchase(
      fake,
      em1,
      base({ subtotal: 1000, tax_amount: 150, total: 1150, withholding_type: 'ISR_1' })
    );
    assert.equal(error, null);

    const fila = fake.estado.bd.Purchase[0];
    assert.equal(fila.withholding_type, 'ISR_1');
    assert.equal(fila.withholding_rate, 0.01);
    assert.equal(fila.withholding_amount, 10);
    assert.equal(fila.amount_paid, 1140);
    assert.equal(fila.balance_due, 0);
    assert.equal(data.withholding_type, 'ISR_1');
    assert.equal(data.withholding_amount, 10);
  });

  test('ISR 12.5% y base sin ISV: se calcula sobre el subtotal', async () => {
    await createPurchase(
      fake,
      em1,
      base({ subtotal: 200, tax_amount: 0, total: 200, withholding_type: 'ISR_12_5' })
    );
    const fila = fake.estado.bd.Purchase[0];
    assert.equal(fila.withholding_type, 'ISR_12_5');
    assert.equal(fila.withholding_amount, 25); // 12.5% de 200
  });

  test('alias en el cuerpo se normaliza (12.5% -> ISR_12_5)', async () => {
    await createPurchase(
      fake,
      em1,
      base({ subtotal: 80, tax_amount: 0, total: 80, withholding_type: '12.5%' })
    );
    const fila = fake.estado.bd.Purchase[0];
    assert.equal(fila.withholding_type, 'ISR_12_5');
    assert.equal(fila.withholding_amount, 10); // 12.5% de 80
  });

  test('sin retencion: no se guarda tipo, tasa ni monto', async () => {
    await createPurchase(fake, em1, base({ subtotal: 1000, tax_amount: 150, total: 1150 }));
    const fila = fake.estado.bd.Purchase[0];
    assert.equal(fila.withholding_type, null);
    assert.equal(fila.withholding_rate, 0);
    assert.equal(fila.withholding_amount, 0);
    assert.equal(fila.amount_paid, 1150);
  });

  test('credito: no se paga al crear y el saldo es total - retencion', async () => {
    await createPurchase(
      fake,
      em1,
      base({ subtotal: 1000, tax_amount: 150, total: 1150, is_credit: true, withholding_type: 'ISR_1' })
    );
    const fila = fake.estado.bd.Purchase[0];
    assert.equal(fila.status, 'PENDING');
    assert.equal(fila.amount_paid, 0);
    assert.equal(fila.balance_due, 1140);
  });

  test('la retencion no puede dejar un saldo negativo', async () => {
    await createPurchase(
      fake,
      em1,
      base({ subtotal: 5, tax_amount: 0, total: 5, is_credit: true, withholding_type: 'ISR_12_5' })
    );
    const fila = fake.estado.bd.Purchase[0];
    assert.equal(fila.withholding_amount, 1);
    assert.equal(fila.balance_due, 4);
  });
});

describe('createPurchase: exoneracion de ISV por linea', () => {
  test('linea exonerada: cabecera exonerada y la linea se marca', async () => {
    const { data } = await createPurchase(
      fake,
      em1,
      base({
        subtotal: 1000,
        tax_amount: 0,
        total: 1000,
        items: [
          { product_name: 'Servicio exento', quantity: 1, unit_price: 1000, subtotal: 1000, tax_amount: 0, total: 1000, exonerated: true },
        ],
      })
    );
    assert.equal(fake.estado.bd.Purchase[0].exonerated, true);
    assert.equal(fake.estado.bd.PurchaseItem[0].exonerated, true);
    assert.equal(data.exonerated, true);
  });

  test('compra mixta: la cabecera queda exonerada si alguna linea lo esta', async () => {
    await createPurchase(
      fake,
      em1,
      base({
        subtotal: 1500,
        tax_amount: 150,
        total: 1650,
        items: [
          { product_name: 'Gravado', quantity: 1, unit_price: 1000, subtotal: 1000, tax_amount: 150, total: 1150, exonerated: false },
          { product_name: 'Exento', quantity: 1, unit_price: 500, subtotal: 500, tax_amount: 0, total: 500, exonerated: true },
        ],
      })
    );
    const fila = fake.estado.bd.Purchase[0];
    assert.equal(fila.exonerated, true);
    assert.equal(fake.estado.bd.PurchaseItem.length, 2);
    assert.equal(fake.estado.bd.PurchaseItem[0].exonerated, false);
    assert.equal(fake.estado.bd.PurchaseItem[1].exonerated, true);
  });
});
