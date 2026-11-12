import { test } from 'node:test';
import assert from 'node:assert/strict';

import { exigirEmpresa } from '@/lib/purchase-db';
import { ErrorDeEmpresa } from './tenant-resolver-mock.mjs';

test('carga el modulo real y exigirEmpresa exige empresa', () => {
  assert.equal(typeof exigirEmpresa, 'function');

  assert.throws(() => exigirEmpresa({ tenantId: '1', companyId: null }), (e) => {
    assert.ok(e instanceof ErrorDeEmpresa);
    assert.equal(e.estado, 400);
    return true;
  });

  assert.throws(() => exigirEmpresa({ tenantId: null, companyId: 'c1' }), (e) => {
    assert.equal(e.estado, 400);
    return true;
  });

  assert.deepEqual(exigirEmpresa({ tenantId: '1', companyId: 'c1' }), {
    tenantId: '1',
    companyId: 'c1',
  });
});