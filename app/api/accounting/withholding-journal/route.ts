import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { createJournalTransaction } from '@/lib/services/journal-service';
import { getWithholdingById, type Withholding } from '@/lib/services/withholding-service';
import {
  buildWithholdingJournalEntry,
  resolveWithholdingAccounts,
  withholdingJournalDescription,
  withholdingJournalTag,
  round2,
  type WithholdingEntryItem,
} from '@/lib/services/withholding-entries';

function getTenantId(request: NextRequest, bodyTenant?: string): string | null {
  const fromHeader = request.headers.get('x-tenant-id');
  if (fromHeader && fromHeader.trim()) return fromHeader.trim();
  const fromQuery = new URL(request.url).searchParams.get('tenantId');
  if (fromQuery && fromQuery.trim()) return fromQuery.trim();
  if (bodyTenant && bodyTenant.trim()) return bodyTenant.trim();
  return null;
}

async function findExistingEntry(
  tenantId: string,
  withholdingId: string,
  companyCol: string
): Promise<{ transaction: any; error: any } | null> {
  const tag = withholdingJournalTag(withholdingId);
  const query = (supabaseService as any)
    .from('Transaction')
    .select(
      `id, date, voucherNumber, description, JournalEntry ( id, accountId, amount, type, Account ( code, name ) )`
    )
    .eq(companyCol, tenantId)
    .ilike('description', `%${tag}%`)
    .order('date', { ascending: false })
    .limit(1);
  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;
  return { transaction: data[0], error: null };
}

async function loadExistingEntry(
  tenantId: string,
  withholdingId: string
): Promise<{ transaction: any } | null> {
  const camel = await findExistingEntry(tenantId, withholdingId, 'tenantId');
  if (camel) return camel;
  const snake = await findExistingEntry(tenantId, withholdingId, 'tenant_id');
  return snake;
}

function toJournalEntryPayload(transaction: any, balanceado: boolean) {
  const entries = Array.isArray(transaction?.JournalEntry) ? transaction.JournalEntry : [];
  const lines = (entries as any[]).map((e: any) => {
    const amount = Math.abs(parseFloat(e?.amount) || 0);
    const isDebit = e?.type === 'DEBIT' || (parseFloat(e?.amount) || 0) > 0;
    return {
      accountCode: e?.Account?.code || '',
      accountName: e?.Account?.name || '',
      amount,
      type: isDebit ? 'DEBIT' : 'CREDIT',
    };
  });
  return {
    transactionId: transaction?.id,
    voucherNumber: transaction?.voucherNumber,
    date: transaction?.date,
    description: transaction?.description,
    lines,
    balanceado,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withholdingId = searchParams.get('withholdingId');
    const tenantId = getTenantId(request, searchParams.get('tenantId') || undefined);
    if (!withholdingId) {
      return NextResponse.json(
        { ok: false, error: 'withholdingId es requerido' },
        { status: 400 }
      );
    }
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: 'Tenant no encontrado o no especificado' },
        { status: 401 }
      );
    }
    const existing = await loadExistingEntry(tenantId, withholdingId);
    if (!existing) {
      return NextResponse.json({ ok: true, hasEntry: false });
    }
    return NextResponse.json({
      ok: true,
      hasEntry: true,
      journalEntry: toJournalEntryPayload(existing.transaction, true),
    });
  } catch (error) {
    console.error('Error consultando asiento de retención:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const tenantId = getTenantId(request, body?.tenantId);
    const withholdingId = body?.withholdingId;
    if (!withholdingId) {
      return NextResponse.json(
        { ok: false, error: 'withholdingId es requerido' },
        { status: 400 }
      );
    }
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: 'Tenant no encontrado o no especificado' },
        { status: 401 }
      );
    }

    const retencion = await getWithholdingById(String(withholdingId));
    if (!retencion) {
      return NextResponse.json(
        { ok: false, error: 'Retención no encontrada' },
        { status: 404 }
      );
    }

    const existing = await loadExistingEntry(tenantId, String(withholdingId));
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          errorHint: 'DUPLICADO',
          error: 'La retención ya tiene un asiento contable generado',
        },
        { status: 409 }
      );
    }

    const item: WithholdingEntryItem = await buildWithholdingJournalEntry(retencion, {
      tenantId,
      companyId: body?.companyId || undefined,
    });

    const { expense, liability } = await resolveWithholdingAccounts(
      tenantId,
      item.tipoRetencion,
      item.tasa
    );
    if (!expense || !liability) {
      return NextResponse.json(
        {
          ok: false,
          errorHint: 'CUENTAS',
          error: `No se encontraron cuentas contables para el tenant (gasto=${expense?.name || 'n/a'}, retención=${liability?.name || 'n/a'}). Configure cuentas de gasto y retenciones por pagar en el catálogo de cuentas.`,
        },
        { status: 400 }
      );
    }

    const retAmount = round2(item.retencion / 100);
    const performedBy =
      request.headers.get('x-user-id') ||
      request.headers.get('x-user-email') ||
      'system';

    const { transaction, entries } = await createJournalTransaction(
      supabaseService,
      tenantId,
      {
        description: withholdingJournalDescription(retencion, String(withholdingId)),
        date: item.fecha,
        currency: 'HNL',
        voucherType: 'DIARIO',
        entries: [
          {
            accountId: expense.id,
            amount: retAmount,
            isDebit: true,
            description: `Retención ${item.tipoRetencion} gasto/costo - ${retencion.providerName}`,
          },
          {
            accountId: liability.id,
            amount: retAmount,
            isDebit: false,
            description: `Retención ${item.tipoRetencion} ${round2(item.tasa * 100)}% por pagar`,
          },
        ],
      },
      { performedBy }
    );

    const journalEntry = {
      transactionId: transaction?.id,
      voucherNumber: transaction?.voucherNumber,
      date: transaction?.date,
      description: transaction?.description,
      lines: [
        {
          accountCode: expense.code,
          accountName: expense.name,
          amount: retAmount,
          type: 'DEBIT',
        },
        {
          accountCode: liability.code,
          accountName: liability.name,
          amount: retAmount,
          type: 'CREDIT',
        },
      ],
      balanceado: true,
      entriesCount: entries?.length || 2,
    };

    return NextResponse.json({ ok: true, journalEntry, balanceado: true });
  } catch (error) {
    console.error('Error generando asiento de retención:', error);
    const message = (error as Error)?.message || 'Error desconocido';
    const hasAccountsHint = /cuenta|account|tenant/i.test(message);
    return NextResponse.json(
      {
        ok: false,
        errorHint: hasAccountsHint ? 'CUENTAS' : 'INTERNO',
        error: message,
      },
      { status: 400 }
    );
  }
}