import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateStock,
  aggregateStockAt,
  canTransition,
  checkAvailability,
  isValidAction,
  isValidStatus,
  nextTransferNumber,
  periodFlows,
  stockKey,
  targetOf,
  validateTransferInput,
} from '../../lib/services/transfer-calc.ts';

test('flujo logístico: transiciones válidas e inválidas', () => {
  assert.equal(canTransition('pending', 'in_transit'), true);
  assert.equal(canTransition('pending', 'cancelled'), true);
  assert.equal(canTransition('pending', 'received'), false);
  assert.equal(canTransition('in_transit', 'received'), true);
  assert.equal(canTransition('in_transit', 'cancelled'), true);
  assert.equal(canTransition('in_transit', 'pending'), false);
  assert.equal(canTransition('received', 'cancelled'), false);
  assert.equal(canTransition('cancelled', 'pending'), false);

  assert.equal(targetOf('dispatch'), 'in_transit');
  assert.equal(targetOf('receive'), 'received');
  assert.equal(targetOf('cancel'), 'cancelled');

  assert.equal(isValidStatus('in_transit'), true);
  assert.equal(isValidStatus('enviado'), false);
  assert.equal(isValidAction('dispatch'), true);
  assert.equal(isValidAction('ship'), false);
});

test('nextTransferNumber sigue el patrón TRF-00000', () => {
  assert.equal(nextTransferNumber(null), 'TRF-00001');
  assert.equal(nextTransferNumber(undefined), 'TRF-00001');
  assert.equal(nextTransferNumber('TRF-00012'), 'TRF-00013');
  assert.equal(nextTransferNumber('AJ-00012'), 'TRF-00001');
});

test('aggregateStock suma IN, resta OUT y omite sin almacén', () => {
  const stock = aggregateStock([
    { product_id: 'p1', warehouse_id: 'w1', movement_type: 'IN', quantity: 10 },
    { product_id: 'p1', warehouse_id: 'w1', movement_type: 'OUT', quantity: 3 },
    { product_id: 'p1', warehouse_id: 'w2', movement_type: 'IN', quantity: 5 },
    { product_id: 'p1', warehouse_id: null, movement_type: 'IN', quantity: 100 },
    { product_id: 'p2', warehouse_id: 'w1', movement_type: 'ADJUSTMENT', quantity: 2 },
  ]);
  assert.equal(stock.get(stockKey('w1', 'p1')), 7);
  assert.equal(stock.get(stockKey('w2', 'p1')), 5);
  assert.equal(stock.get(stockKey('w1', 'p2')), 2);
  assert.equal(stock.has('null|p1'), false);
});

test('checkAvailability detecta faltantes en origen', () => {
  const stock = new Map([[stockKey('w1', 'p1'), 7]]);
  const ok = checkAvailability(stock, 'w1', [{ product_id: 'p1', quantity: 7 }]);
  assert.deepEqual(ok, []);
  const short = checkAvailability(stock, 'w1', [
    { product_id: 'p1', quantity: 10 },
    { product_id: 'p9', quantity: 1 },
  ]);
  assert.equal(short.length, 2);
  assert.deepEqual(short[0], { product_id: 'p1', requested: 10, available: 7 });
  assert.deepEqual(short[1], { product_id: 'p9', requested: 1, available: 0 });
});

test('aggregateStockAt corta por fecha y periodFlows mide IN/OUT del rango', () => {
  const movs = [
    { product_id: 'p1', warehouse_id: 'w1', movement_type: 'IN', quantity: 10, created_at: '2026-09-05T10:00:00' },
    { product_id: 'p1', warehouse_id: 'w1', movement_type: 'OUT', quantity: 3, created_at: '2026-09-20T10:00:00' },
    { product_id: 'p1', warehouse_id: 'w1', movement_type: 'IN', quantity: 5, created_at: '2026-10-02T10:00:00' },
    { product_id: 'p1', warehouse_id: null, movement_type: 'IN', quantity: 100, created_at: '2026-09-01T10:00:00' },
  ];
  const sep = aggregateStockAt(movs, '2026-09-30T23:59:59');
  assert.equal(sep.get(stockKey('w1', 'p1')), 7);
  const oct = aggregateStockAt(movs, '2026-10-31T23:59:59');
  assert.equal(oct.get(stockKey('w1', 'p1')), 12);

  const flows = periodFlows(movs, '2026-09-01T00:00:00', '2026-09-30T23:59:59');
  assert.deepEqual(flows.get(stockKey('w1', 'p1')), { in: 10, out: 3 });
  const empty = periodFlows(movs, '2026-08-01T00:00:00', '2026-08-31T23:59:59');
  assert.equal(empty.size, 0);
});

test('validateTransferInput rechaza origen=destino, sin ítems y cantidad inválida', () => {
  assert.match(
    validateTransferInput({ source_warehouse_id: 'w1', destination_warehouse_id: 'w1', items: [] }) || '',
    /diferentes/,
  );
  assert.match(
    validateTransferInput({ source_warehouse_id: 'w1', destination_warehouse_id: 'w2', items: [] }) || '',
    /al menos un producto/,
  );
  assert.match(
    validateTransferInput({
      source_warehouse_id: 'w1',
      destination_warehouse_id: 'w2',
      items: [{ product_id: 'p1', quantity: 0 }],
    }) || '',
    /entero > 0/,
  );
  assert.match(validateTransferInput({}) || '', /source_warehouse_id/);
  assert.equal(
    validateTransferInput({
      source_warehouse_id: 'w1',
      destination_warehouse_id: 'w2',
      items: [{ product_id: 'p1', quantity: 3 }],
    }),
    null,
  );
});
