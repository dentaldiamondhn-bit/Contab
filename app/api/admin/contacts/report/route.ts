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
    else bytes += 40;
  }
  bytes += 40;
  return bytes;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

const CONTACT_TABLES = [
  { name: 'Customer', select: 'id,tenantid,name,rtn,email,phone,phone2,address,contacttype,contactcode,isactive,createdat' },
  { name: 'CustomerRetentions', select: 'id,tenantid,customerid,account,percentage,description' },
  { name: 'CustomerTaxes', select: 'id,tenantid,customerid,taxid,retentionid,customrate,customdescription' },
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

    const tenantData: Record<string, {
      contactCount: number;
      activeContacts: number;
      retentionCount: number;
      taxCount: number;
      totalBytes: number;
      tables: Record<string, number>;
    }> = {};

    (tenants || []).forEach((t: any) => {
      tenantData[t.id] = {
        contactCount: 0,
        activeContacts: 0,
        retentionCount: 0,
        taxCount: 0,
        totalBytes: 0,
        tables: {},
      };
    });

    for (const table of CONTACT_TABLES) {
      const { data: rows } = await supabaseAdmin.from(table.name).select(table.select);
      for (const row of rows || []) {
        const tid = (row as any).tenantid;
        if (!tid || !tenantData[tid]) continue;
        const bytes = estimateRowBytes(row as Record<string, any>);
        tenantData[tid].totalBytes += bytes;
        tenantData[tid].tables[table.name] = (tenantData[tid].tables[table.name] || 0) + 1;

        if (table.name === 'Customer') {
          tenantData[tid].contactCount++;
          if ((row as any).isactive) tenantData[tid].activeContacts++;
        }
        if (table.name === 'CustomerRetentions') tenantData[tid].retentionCount++;
        if (table.name === 'CustomerTaxes') tenantData[tid].taxCount++;
      }
    }

    const result = (tenants || []).map((t: any) => {
      const d = tenantData[t.id] || { contactCount: 0, activeContacts: 0, retentionCount: 0, taxCount: 0, totalBytes: 0, tables: {} };
      return {
        tenantId: t.id,
        businessName: t.businessname,
        tenantCode: t.tenant_code,
        isActive: t.isactive,
        maxStorage: t.maxstorage || 100,
        contactCount: d.contactCount,
        activeContacts: d.activeContacts,
        inactiveContacts: d.contactCount - d.activeContacts,
        retentionCount: d.retentionCount,
        taxCount: d.taxCount,
        storageUsed: formatBytes(d.totalBytes),
        storageBytes: d.totalBytes,
        tables: d.tables,
      };
    });

    return NextResponse.json({ success: true, tenants: result });
  } catch (error: any) {
    console.error('Error in contacts report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
