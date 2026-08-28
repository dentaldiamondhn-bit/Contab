import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

// Estimate bytes per record based on typical Supabase/PostgreSQL storage
function estimateProductBytes(p: any): number {
  let bytes = 0;
  bytes += 36; // id (UUID)
  bytes += (p.tenantid?.length || 10) * 2;
  bytes += (p.sku?.length || 10) * 2;
  bytes += (p.name?.length || 20) * 2;
  bytes += (p.description?.length || 0) * 2;
  bytes += (p.category?.length || 10) * 2;
  bytes += (p.unit?.length || 5) * 2;
  bytes += 8; // cost
  bytes += 8; // price
  bytes += 8; // discountPrice
  bytes += 1; // isDiscount
  bytes += 4; // stock
  bytes += 4; // minstock
  bytes += 4; // maxstock
  bytes += 24; // tags (array overhead)
  bytes += 1; // isActive
  bytes += 16; // expirationDate
  bytes += 16; // promotionStartDate
  bytes += 16; // promotionEndDate
  bytes += 16; // createdat
  bytes += 16; // updatedat
  bytes += 40; // row overhead (tuple header, TOAST, etc.)
  return bytes;
}

function estimateMovementBytes(m: any): number {
  let bytes = 0;
  bytes += 36; // id
  bytes += (m.tenantid?.length || 10) * 2;
  bytes += 36; // productid
  bytes += (m.type?.length || 3) * 2;
  bytes += 4; // quantity
  bytes += (m.reason?.length || 10) * 2;
  bytes += (m.reference?.length || 0) * 2;
  bytes += 16; // createdat
  bytes += (m.createdby?.length || 10) * 2;
  bytes += 40; // row overhead
  return bytes;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: products } = await supabase
      .from('Product')
      .select('id, tenantid, name, sku, description, category, unit, cost, price, discountPrice, isDiscount, stock, minstock, maxstock, tags, isActive, expirationDate, promotionStartDate, promotionEndDate, createdat, updatedat');

    const { data: tenants } = await supabase
      .from('Tenant')
      .select('id, businessname, tenant_code, isactive');

    const { data: movements } = await supabase
      .from('InventoryMovement')
      .select('id, tenantid, productid, type, quantity, reason, reference, createdat, createdby');

    const tenantMap: Record<string, { businessName: string; tenantCode: string; isActive: boolean }> = {};
    (tenants || []).forEach((t: any) => {
      tenantMap[t.id] = {
        businessName: t.businessname || 'Desconocido',
        tenantCode: t.tenant_code || '',
        isActive: t.isactive,
      };
    });

    // Initialize with all tenants
    const result: any[] = [];
    const tenantData = new Map<string, { productCount: number; productBytes: number; movementCount: number; movementBytes: number }>();

    (tenants || []).forEach((t: any) => {
      tenantData.set(t.id, { productCount: 0, productBytes: 0, movementCount: 0, movementBytes: 0 });
    });

    (products || []).forEach((p: any) => {
      const tid = p.tenantid || 'unknown';
      if (!tenantData.has(tid)) {
        tenantData.set(tid, { productCount: 0, productBytes: 0, movementCount: 0, movementBytes: 0 });
      }
      const d = tenantData.get(tid)!;
      d.productCount++;
      d.productBytes += estimateProductBytes(p);
    });

    (movements || []).forEach((m: any) => {
      const tid = m.tenantid || 'unknown';
      if (!tenantData.has(tid)) {
        tenantData.set(tid, { productCount: 0, productBytes: 0, movementCount: 0, movementBytes: 0 });
      }
      const d = tenantData.get(tid)!;
      d.movementCount++;
      d.movementBytes += estimateMovementBytes(m);
    });

    for (const [tid, d] of tenantData) {
      const info = tenantMap[tid] || { businessName: 'Desconocido', tenantCode: '', isActive: false };
      const totalBytes = d.productBytes + d.movementBytes;
      result.push({
        tenantId: tid,
        businessName: info.businessName,
        tenantCode: info.tenantCode,
        isActive: info.isActive,
        totalProducts: d.productCount,
        totalMovements: d.movementCount,
        totalRecords: d.productCount + d.movementCount,
        storageUsed: formatBytes(totalBytes),
        storageBytes: totalBytes,
      });
    }

    result.sort((a, b) => b.totalProducts - a.totalProducts);

    return NextResponse.json({ success: true, tenants: result });
  } catch (error) {
    console.error('Error in inventory report:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
