import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

function estimateRowBytes(row: Record<string, any>): number {
  let bytes = 0;
  for (const val of Object.values(row)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'string') bytes += val.length * 2;
    else if (typeof val === 'number') bytes += 8;
    else if (typeof val === 'boolean') bytes += 1;
    else if (Array.isArray(val)) bytes += 24 + val.length * 8;
    else bytes += 40;
  }
  bytes += 40; // row overhead
  return bytes;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

const TABLES_TO_SCAN = [
  { name: 'Account', select: 'id,tenantid' },
  { name: 'Transaction', select: 'id,tenantid,description,reference,voucher_type,voucher_number,currency' },
  { name: 'JournalEntry', select: 'id,tenantid,description' },
  { name: 'Product', select: 'id,tenantid,name,sku,description,category' },
  { name: 'InventoryMovement', select: 'id,tenantid,type,quantity,reason,reference' },
  { name: 'Invoice', select: 'id,tenantid,description' },
  { name: 'InvoiceItem', select: 'id,tenantid,description' },
  { name: 'File', select: 'id,tenantid,original_name,file_name' },
];

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: tenants, error: tErr } = await supabaseAdmin
      .from('Tenant')
      .select('id, businessname, tenant_code, isactive, maxstorage')
      .order('businessname');

    if (tErr) throw tErr;

    const tenantStorage: Record<string, { bytes: number; records: number; tables: Record<string, number> }> = {};
    (tenants || []).forEach((t: any) => {
      tenantStorage[t.id] = { bytes: 0, records: 0, tables: {} };
    });

    for (const table of TABLES_TO_SCAN) {
      const { data: rows } = await supabaseAdmin.from(table.name).select(table.select);
      for (const row of rows || []) {
        const tid = (row as any).tenantid;
        if (!tid || !tenantStorage[tid]) continue;
        const bytes = estimateRowBytes(row as Record<string, any>);
        tenantStorage[tid].bytes += bytes;
        tenantStorage[tid].records++;
        tenantStorage[tid].tables[table.name] = (tenantStorage[tid].tables[table.name] || 0) + 1;
      }
    }

    const result = (tenants || []).map((t: any) => {
      const s = tenantStorage[t.id] || { bytes: 0, records: 0, tables: {} };
      return {
        tenantId: t.id,
        businessName: t.businessname,
        tenantCode: t.tenant_code,
        isActive: t.isactive,
        maxStorage: t.maxstorage || 100,
        storageUsed: formatBytes(s.bytes),
        storageBytes: s.bytes,
        totalRecords: s.records,
        tables: s.tables,
      };
    });

    return NextResponse.json({ success: true, tenants: result });
  } catch (error: any) {
    console.error('Error in storage report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
