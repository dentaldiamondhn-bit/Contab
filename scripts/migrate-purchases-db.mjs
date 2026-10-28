import { readFileSync } from 'fs';
import { getSupabaseServer } from '../lib/supabase/server-lazy';

function loadJson(path: string) {
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function main() {
  const supabase = getSupabaseServer();
  const suppliers = loadJson('suppliers-data.json');
  const purchases = loadJson('purchases-data.json');
  const payments = loadJson('purchase-payments.json');

  console.log('Suppliers:', suppliers.length);
  console.log('Purchases:', purchases.length);
  console.log('Payments:', payments.length);

  // Nota: ya migrados en la BD (ver COMPRAS_PROVEEDORES_REPORT.md). 
  // Este script es un esqueleto idempotente para referencia.
}

main().catch(console.error);
