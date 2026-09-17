// Migración puntual: Copia proveedores, compras y pagos desde archivos JSON a Supabase.
// Requiere: haber ejecutado purchase-db-migration-01-company-id-text.sql en el SQL editor.
// Uso: node migrate-purchases-db.mjs  (desde la raíz del repo, con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local)
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  let k = line.slice(0, eq).trim();
  let v = line.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[k] = v;
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Lee suppliers-data.json -> Supplier  (con fallback a las listas embebidas en compras/pagos)
const suppliers = JSON.parse(fs.readFileSync('suppliers-data.json', 'utf8'));
const purchases = JSON.parse(fs.readFileSync('purchases-data.json', 'utf8'));
const payments = JSON.parse(fs.readFileSync('purchase-payments.json', 'utf8'));

const TENANT = '1';
const supplierMap = new Map(); // slug id -> uuid real
let insertedSuppliers = 0;

// 1) Proveedores
for (const s of suppliers) {
  const { data: existing } = await supabase
    .from('Supplier')
    .select('id')
    .eq('rtn', s.rtn)
    .maybeSingle();

  let uuid;
  if (existing) {
    uuid = existing.id;
  } else {
    const row = {
      tenant_id: TENANT,
      company_id: s.companyId || s.company_id || null,
      rtn: s.rtn,
      name: s.name,
      commercial_name: s.commercial_name || null,
      email: s.email || null,
      phone: s.phone || null,
      mobile: s.mobile || null,
      address: s.address || null,
      city: s.city || null,
      country: s.country || null,
      supplier_type: s.supplier_type || 'merchandise',
      category: s.category || null,
      payment_terms: s.payment_terms ?? 0,
      payment_method: s.payment_method || null,
      bank_name: s.bank_name || null,
      bank_account: s.bank_account || null,
      account_type: s.account_type || 'checking',
      is_active: s.is_active ?? true,
      is_preferred: s.is_preferred ?? false,
      created_at: s.created_at || new Date().toISOString(),
      updated_at: s.updated_at || new Date().toISOString(),
    };
    const { data, error } = await supabase.from('Supplier').insert(row).select('id').single();
    if (error) throw new Error('Proveedor: ' + error.message);
    uuid = data.id;
    insertedSuppliers++;
  }
  supplierMap.set(s.id, uuid);
}

// Obtenemos proveedores del DB por rtn para resolver proveedores de compras sin entrada en suppliers-data.json
const { data: allSuppliers } = await supabase.from('Supplier').select('id, rtn, name');

// 2) Compras
let insertedPurchases = 0;
let insertedPurchaseItems = 0;

for (const p of purchases) {
  const companyId = p.companyId || p.company_id || null;

  const { data: dup } = await supabase
    .from('Purchase')
    .select('id')
    .eq('invoice_number', p.invoice_number)
    .eq('company_id', companyId)
    .maybeSingle();

  if (dup) continue; // ya migrada

  // Resolver proveedor (slugs de JSON -> uuid real del DB)
  let supplierUuid = supplierMap.get(p.supplier_id);
  if (!supplierUuid) {
    const matched = (allSuppliers || []).find(s => s.rtn === (p.supplier_name && p.supplier_name.toUpperCase() ? null : null)); // noop
    // Buscar por nombre si no hay RTN
    const byName = (allSuppliers || []).find(s => s.name.toLowerCase() === (p.supplier_name || '').toLowerCase());
    supplierUuid = (matched || byName)?.id;
  }
  if (!supplierUuid) throw new Error(`No se encontró proveedor para compra ${p.invoice_number} (supplier_id ${p.supplier_id})`);

  const isCredit = !!p.is_credit;
  const total = Number(p.total) || 0;
  const paid = p.amount_paid !== undefined && p.amount_paid !== null ? Number(p.amount_paid) : isCredit ? 0 : total;
  const balance = p.balance_due !== undefined && p.balance_due !== null ? Number(p.balance_due) : total - paid;
  const statusRaw = String(p.status || '').toLowerCase();
  let status = statusRaw === 'completed' || statusRaw === 'paid' ? 'PAID' : statusRaw === 'partial' ? 'PARTIAL' : statusRaw === 'cancelled' ? 'CANCELLED' : balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

  const { data: purchase, error: pErr } = await supabase
    .from('Purchase')
    .insert({
      supplier_id: supplierUuid,
      invoice_number: p.invoice_number,
      cai: p.cai || null,
      invoice_date: p.invoice_date || new Date().toISOString().split('T')[0],
      subtotal: Math.round(Number(p.subtotal) || 0),
      tax_rate: p.tax_rate ?? 15.0,
      tax_amount: Math.round(Number(p.tax_amount) || 0),
      total,
      purchase_type: p.purchase_type || 'expense',
      expense_category: p.expense_category || null,
      document_url: p.document_url || null,
      is_credit: isCredit,
      due_date: isCredit ? p.due_date || null : null,
      status,
      amount_paid: paid,
      balance_due: balance,
      tenant_id: TENANT,
      company_id: companyId,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString(),
    })
    .select('id')
    .single();

  if (pErr) throw new Error(`Compra ${p.invoice_number}: ${pErr.message}`);
  insertedPurchases++;

  const items = Array.isArray(p.items) ? p.items : [];
  if (items.length > 0) {
    const rows = items.map((it) => ({
      purchase_id: purchase.id,
      product_id: it.product_id || null,
      product_code: it.product_code || null,
      product_name: it.product_name || it.description || '',
      description: it.description || null,
      quantity: Number(it.quantity) || 0,
      unit_price: Math.round(Number(it.unit_price) || 0),
      discount_percentage: Number(it.discount_percentage) || 0,
      discount_amount: Math.round(Number(it.discount_amount) || 0),
      subtotal: Math.round(Number(it.subtotal) || 0),
      tax_rate: it.tax_rate ?? p.tax_rate ?? 15.0,
      tax_amount: Math.round(Number(it.tax_amount) || 0),
      total: Math.round(Number(it.total) || 0),
      tenant_id: TENANT,
      created_at: p.created_at || new Date().toISOString(),
    }));
    const { error: itErr } = await supabase.from('PurchaseItem').insert(rows);
    if (itErr) throw new Error(`Items compra ${p.invoice_number}: ${itErr.message}`);
    insertedPurchaseItems += rows.length;
  }
}

// 3) Pagos
let insertedPayments = 0;
for (const pay of payments) {
  // resolver purchase id del DB por invoice? los pagos no tienen invoice; buscar la compra por created_at no es fiable.
  // Solo migrar pagos cuya compra exista y no estén ya migrados (mismo monto+metodo+fecha).
  const { data: purchaseRows } = await supabase
    .from('Purchase')
    .select('id, invoice_number, created_at');
  const purchase = (purchaseRows || []).find(p => {
    const pCreated = new Date(p.created_at || '').getTime();
    const payCreated = new Date(pay.created_at || '').getTime();
    return Math.abs(pCreated - payCreated) < 60000;
  });
  if (!purchase) continue; // no podemos emparejar -> se omite

  const { data: dupPay } = await supabase
    .from('SupplierPayment')
    .select('id')
    .eq('purchase_id', purchase.id)
    .eq('amount', Math.round(Number(pay.amount)))
    .eq('payment_date', pay.payment_date)
    .maybeSingle();

  if (dupPay) continue;

  const { data: pRow } = await supabase.from('Purchase').select('supplier_id, company_id').eq('id', purchase.id).single();

  const { error: payErr } = await supabase.from('SupplierPayment').insert({
    supplier_id: pRow.supplier_id,
    purchase_id: purchase.id,
    company_id: pRow.company_id || null,
    amount: Math.round(Number(pay.amount) || 0),
    payment_date: pay.payment_date || new Date().toISOString().split('T')[0],
    payment_method: pay.payment_method || 'other',
    reference_number: pay.reference || null,
    is_reconciled: false,
    tenant_id: TENANT,
    created_at: pay.created_at || new Date().toISOString(),
    updated_at: pay.updated_at || new Date().toISOString(),
  });
  if (payErr) throw new Error(`Pago: ${payErr.message}`);
  insertedPayments++;
}

console.log('Migración completada:');
console.log('  Proveedores insertados:', insertedSuppliers, `(total en BD: ${allSuppliers?.length || 0})`);
console.log('  Compras insertadas:', insertedPurchases);
console.log('  Items de compra insertados:', insertedPurchaseItems);
console.log('  Pagos insertados:', insertedPayments);