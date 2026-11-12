import test from 'node:test';
import assert from 'node:assert/strict';

import {
  actualForCategory,
  buildAlerts,
  computeLineComparison,
  computeTotals,
  isValidPeriod,
  lineBudgetForPeriod,
  periodRange,
} from '../../lib/services/budget-calc.ts';

test('isValidPeriod acepta YYYY-MM válido y rechaza el resto', () => {
  assert.equal(isValidPeriod('2026-09'), true);
  assert.equal(isValidPeriod('2026-13'), false);
  assert.equal(isValidPeriod('2026-00'), false);
  assert.equal(isValidPeriod('2026-1'), false);
  assert.equal(isValidPeriod('abc'), false);
  assert.equal(isValidPeriod('2026/09'), false);
});

test('periodRange cubre el mes completo (febrero bisiesto y 30 días)', () => {
  assert.deepEqual(periodRange('2024-02'), { start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual(periodRange('2026-09'), { start: '2026-09-01', end: '2026-09-30' });
});

test('lineBudgetForPeriod prorratea anual y respeta línea mensual', () => {
  assert.equal(
    lineBudgetForPeriod({ account_code: '5101', category: 'gasto', amount: 12000 }, '2026-09'),
    1000,
  );
  assert.equal(
    lineBudgetForPeriod(
      { account_code: '5101', category: 'gasto', period: '2026-09', amount: 2500 },
      '2026-09',
    ),
    2500,
  );
  assert.equal(
    lineBudgetForPeriod(
      { account_code: '5101', category: 'gasto', period: '2026-08', amount: 2500 },
      '2026-09',
    ),
    0,
  );
});

test('actualForCategory aplica la convención de signos del mayor', () => {
  assert.equal(actualForCategory(800, 100, 'gasto'), 700);
  assert.equal(actualForCategory(100, 900, 'ingreso'), 800);
});

test('gasto bajo presupuesto → ok con varianza positiva', () => {
  const c = computeLineComparison(
    { account_code: '5101', account_name: 'Sueldos', category: 'gasto', amount: 12000 },
    '2026-09',
    800,
    0,
  );
  assert.equal(c.budgeted, 1000);
  assert.equal(c.actual, 800);
  assert.equal(c.variance, 200);
  assert.equal(c.executionPct, 80);
  assert.equal(c.status, 'ok');
});

test('gasto excedido (>=100%) → critico con varianza negativa', () => {
  const c = computeLineComparison(
    { account_code: '5101', category: 'gasto', amount: 12000 },
    '2026-09',
    1100,
    0,
  );
  assert.equal(c.executionPct, 110);
  assert.equal(c.variance, -100);
  assert.equal(c.status, 'critico');
});

test('gasto entre 90% y 100% → advertencia', () => {
  const c = computeLineComparison(
    { account_code: '5101', category: 'gasto', amount: 12000 },
    '2026-09',
    950,
    0,
  );
  assert.equal(c.status, 'advertencia');
});

test('ingreso sobre la meta → ok; muy por debajo (<50%) → critico', () => {
  const ok = computeLineComparison(
    { account_code: '4101', category: 'ingreso', amount: 12000 },
    '2026-09',
    0,
    1200,
  );
  assert.equal(ok.executionPct, 120);
  assert.equal(ok.variance, 200);
  assert.equal(ok.status, 'ok');

  const crit = computeLineComparison(
    { account_code: '4101', category: 'ingreso', amount: 12000 },
    '2026-09',
    0,
    400,
  );
  assert.equal(crit.status, 'critico');
});

test('sin presupuesto ni movimiento → sin-datos; gasto sin presupuesto con real → critico', () => {
  const empty = computeLineComparison(
    { account_code: '5101', category: 'gasto', amount: 0 },
    '2026-09',
    0,
    0,
  );
  assert.equal(empty.status, 'sin-datos');
  assert.equal(empty.executionPct, null);

  const noBudget = computeLineComparison(
    { account_code: '5101', category: 'gasto', amount: 0 },
    '2026-09',
    300,
    0,
  );
  assert.equal(noBudget.status, 'critico');
});

test('computeTotals agrega por categoría con varianza dirigida', () => {
  const lines = [
    computeLineComparison(
      { account_code: '5101', category: 'gasto', amount: 12000 },
      '2026-09',
      800,
      0,
    ),
    computeLineComparison(
      { account_code: '4101', category: 'ingreso', amount: 24000 },
      '2026-09',
      0,
      1500,
    ),
  ];
  const totals = computeTotals(lines);
  assert.deepEqual(
    { budgeted: totals.gasto.budgeted, actual: totals.gasto.actual, variance: totals.gasto.variance },
    { budgeted: 1000, actual: 800, variance: 200 },
  );
  assert.deepEqual(
    { budgeted: totals.ingreso.budgeted, actual: totals.ingreso.actual, variance: totals.ingreso.variance },
    { budgeted: 2000, actual: 1500, variance: -500 },
  );
});

test('buildAlerts omite ok/sin-datos y ordena críticos primero', () => {
  const lines = [
    computeLineComparison(
      { account_code: '5101', account_name: 'Sueldos', category: 'gasto', amount: 12000 },
      '2026-09',
      950,
      0,
    ),
    computeLineComparison(
      { account_code: '5201', account_name: 'Alquiler', category: 'gasto', amount: 12000 },
      '2026-09',
      1300,
      0,
    ),
    computeLineComparison(
      { account_code: '5301', account_name: 'Luz', category: 'gasto', amount: 12000 },
      '2026-09',
      100,
      0,
    ),
  ];
  const alerts = buildAlerts(lines);
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].level, 'critico');
  assert.equal(alerts[0].accountCode, '5201');
  assert.equal(alerts[1].level, 'advertencia');
  assert.match(alerts[0].message, /excedido/);
});
