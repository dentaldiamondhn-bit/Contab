import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCloseAllowed,
  evaluatePeriodFlags,
  isFuturePeriod,
  isValidYearMonth,
  periodKey,
  prevPeriod,
} from '../../lib/services/period-closing.ts';

const TODAY = new Date('2026-09-17T12:00:00Z');

test('prevPeriod cruza año y periodKey formatea', () => {
  assert.deepEqual(prevPeriod(2026, 1), { year: 2025, month: 12 });
  assert.deepEqual(prevPeriod(2026, 9), { year: 2026, month: 8 });
  assert.equal(periodKey(2026, 9), '2026-09');
  assert.equal(isValidYearMonth(2026, 9), true);
  assert.equal(isValidYearMonth(2026, 13), false);
  assert.equal(isValidYearMonth(1999, 1), false);
});

test('isFuturePeriod respeta el mes actual', () => {
  assert.equal(isFuturePeriod(2026, 9, TODAY), false);
  assert.equal(isFuturePeriod(2026, 10, TODAY), true);
  assert.equal(isFuturePeriod(2027, 1, TODAY), true);
  assert.equal(isFuturePeriod(2026, 8, TODAY), false);
});

test('assertCloseAllowed: futuro, ya cerrado y secuencia', () => {
  assert.throws(
    () => assertCloseAllowed({ status: 'open', prevStatus: 'closed', prevTxCount: 0, year: 2026, month: 10, today: TODAY }),
    /futuro/,
  );
  assert.throws(
    () => assertCloseAllowed({ status: 'closed', prevStatus: 'closed', prevTxCount: 0, year: 2026, month: 8, today: TODAY }),
    /ya closed/,
  );
  assert.throws(
    () =>
      assertCloseAllowed({ status: 'open', prevStatus: 'open', prevTxCount: 5, year: 2026, month: 9, today: TODAY }),
    /Cierre primero 2026-08/,
  );
  assert.doesNotThrow(() =>
    assertCloseAllowed({ status: 'open', prevStatus: 'closed', prevTxCount: 5, year: 2026, month: 9, today: TODAY }),
  );
  assert.doesNotThrow(() =>
    assertCloseAllowed({ status: 'open', prevStatus: null, prevTxCount: 0, year: 2026, month: 9, today: TODAY }),
  );
});

test('evaluatePeriodFlags combina estado, previo y futuro', () => {
  assert.deepEqual(
    evaluatePeriodFlags({ status: 'open', prevStatus: 'closed', prevTxCount: 5, year: 2026, month: 9, today: TODAY }),
    { prev_month_closed: true, can_close: true },
  );
  assert.deepEqual(
    evaluatePeriodFlags({ status: 'open', prevStatus: 'open', prevTxCount: 5, year: 2026, month: 9, today: TODAY }),
    { prev_month_closed: false, can_close: false },
  );
  assert.deepEqual(
    evaluatePeriodFlags({ status: 'open', prevStatus: null, prevTxCount: 0, year: 2026, month: 9, today: TODAY }),
    { prev_month_closed: true, can_close: true },
  );
  assert.deepEqual(
    evaluatePeriodFlags({ status: 'open', prevStatus: 'closed', prevTxCount: 0, year: 2026, month: 10, today: TODAY }),
    { prev_month_closed: true, can_close: false },
  );
  assert.deepEqual(
    evaluatePeriodFlags({ status: 'closed', prevStatus: 'closed', prevTxCount: 5, year: 2026, month: 8, today: TODAY }),
    { prev_month_closed: true, can_close: false },
  );
});

test('assertCloseAllowed: edge cases y configuraciones extremas', () => {
  const TODAY = new Date('2026-09-17T12:00:00Z');

  // Sin configuración previa permite cierre
  assert.doesNotThrow(() =>
    assertCloseAllowed({ status: 'open', prevStatus: null, prevTxCount: 0, year: 2026, month: 1, today: TODAY }),
  );

  // Mismo mes cerrado dos veces bloquea
  assert.throws(
    () => assertCloseAllowed({ status: 'closed', prevStatus: 'closed', prevTxCount: 10, year: 2026, month: 1, today: TODAY }),
    /bloqueado/,
  );

  // Mes con transacciones previas puede cerrarse
  assert.doesNotThrow(() =>
    assertCloseAllowed({ status: 'open', prevStatus: 'closed', prevTxCount: 3, year: 2026, month: 2, today: TODAY }),
  );

  // Año diferente permite cierre
  assert.doesNotThrow(() =>
    assertCloseAllowed({ status: 'open', prevStatus: 'closed', prevTxCount: 0, year: 2025, month: 12, today: TODAY }),
  );
});
