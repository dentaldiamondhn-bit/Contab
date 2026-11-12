import { supabase as supabaseService } from '@/lib/supabase-db';
import type { Withholding } from '@/lib/services/withholding-service';

export type WithholdingEntryType = 'IR' | 'ISR' | 'IGV' | 'RETENCION';

export type WithholdingEntryItem = {
  fecha: string;
  referencia: string;
  cuentaDebito: string;
  cuentaDebitoCode: string;
  cuentaCredito: string;
  cuentaCreditoCode: string;
  base: number;
  tasa: number;
  retencion: number;
  tipoRetencion: WithholdingEntryType;
  tenantId: string;
  companyId?: string;
  journalEntryId?: string;
};

export type WithholdingEntryGrouped = {
  retenciones: WithholdingEntryItem[];
  totalDebitos: number;
  totalCreditos: number;
  totalRetenciones: number;
  porTipo: Record<string, number>;
};

export type WithholdingEntryTotals = {
  totalDebitos: number;
  totalCreditos: number;
  totalRetenciones: number;
  balanced: boolean;
};

export type WithholdingAccount = {
  id: string;
  code: string;
  name: string;
  type?: string;
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function classifyWithholdingRetentionType(
  type: string,
  tasa: number
): WithholdingEntryType {
  const t = String(type || '').toUpperCase();
  const rate = num(tasa);
  if (rate >= 0.12) return 'IR';
  if (/ISV|IGV/.test(t)) return 'IGV';
  if (/1\s*%/.test(t) || /ISR|RENTA|PROFESSIONAL_SERVICES_1/.test(t)) return 'ISR';
  return 'RETENCION';
}

export function isWithholdingAccountNameOrCode(name: string, code: string): boolean {
  const n = String(name || '').toUpperCase();
  const c = String(code || '').toUpperCase();
  return (
    /RETENC|RENTA|ISR|IGV|ISV|IMP\.? SOBRE VENTAS/.test(n) ||
    /RETENC|RENTA|ISR|IGV|ISV/.test(c)
  );
}

export function deriveRateFromAccountName(name: string): number {
  const n = String(name || '').toUpperCase();
  const m = n.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 100) / 100;
  if (/ISR|RENTA|IMP\.? SOBRE LA RENTA|1\s*%/.test(n)) return 1;
  if (/\bIR\b|12[.,]?5/.test(n)) return 12.5;
  if (/ISV|IGV|IMP\.? SOBRE VENTAS/.test(n)) return 15;
  return 0;
}

export function withholdingJournalReference(retencion: Withholding): string {
  return `Retención ${retencion.invoiceNumber} - ${retencion.providerName}`;
}

export function withholdingJournalTag(withholdingId: string): string {
  return `[WH-${withholdingId}]`;
}

export function withholdingJournalDescription(
  retencion: Withholding,
  withholdingId?: string
): string {
  const ref = withholdingJournalReference(retencion);
  return withholdingId ? `${ref} ${withholdingJournalTag(withholdingId)}` : ref;
}

function toAccount(row: any): WithholdingAccount {
  return {
    id: String(row?.id || ''),
    code: String(row?.code || ''),
    name: String(row?.name || 'Sin nombre'),
    type: row?.type || row?.account_type || '',
  };
}

export async function fetchTenantAccounts(tenantId: string): Promise<WithholdingAccount[]> {
  if (!tenantId) return [];
  const attempt = async (col: string): Promise<WithholdingAccount[] | null> => {
    const { data, error } = await (supabaseService as any)
      .from('Account')
      .select('id,code,name,type')
      .eq(col, tenantId)
      .order('code', { ascending: true });
    if (error || !data) return null;
    return (data as any[]).map(toAccount);
  };
  const camel = await attempt('tenantId');
  if (camel) return camel;
  const snake = await attempt('tenant_id');
  return snake || [];
}

export function pickExpenseAccount(
  accounts: WithholdingAccount[]
): WithholdingAccount | null {
  const expenses = (accounts || []).filter(
    (a) => String(a.type || '').toUpperCase() === 'EXPENSE' || /^6|^5/.test(a.code)
  );
  const byCode = expenses.find((a) => /^6/.test(a.code));
  if (byCode) return byCode;
  if (expenses.length > 0) return expenses[0];
  return (accounts || []).find((a) => /^6/.test(a.code)) || null;
}

export function pickWithholdingLiabilityAccount(
  accounts: WithholdingAccount[],
  tipoRetencion: WithholdingEntryType,
  tasa: number
): WithholdingAccount | null {
  const candidates = (accounts || []).filter(
    (a) =>
      String(a.type || '').toUpperCase() === 'LIABILITY' &&
      isWithholdingAccountNameOrCode(a.name, a.code)
  );
  if (candidates.length === 0) return null;
  const ratePct = Math.round(num(tasa) * 1000) / 10;
  const rateText = ratePct > 0 ? String(ratePct) : '';
  const byRate = candidates.find((a) => {
    if (!rateText) return false;
    const n = a.name.toUpperCase();
    return n.includes(`${rateText}%`) || n.replace('.', ',').includes(rateText);
  });
  if (byRate) return byRate;
  const keyword: Record<WithholdingEntryType, RegExp> = {
    IR: /\bIR\b|12[.,]?5|IRPF|RENTA\b/,
    ISR: /ISR|RENTA|1\s*%/,
    IGV: /IGV|ISV/,
    RETENCION: /RETENC/,
  };
  const byTipo = candidates.find((a) => keyword[tipoRetencion]?.test(a.name.toUpperCase()));
  if (byTipo) return byTipo;
  return candidates[0];
}

export async function resolveWithholdingAccounts(
  tenantId: string,
  tipoRetencion: WithholdingEntryType,
  tasa: number
): Promise<{ expense: WithholdingAccount | null; liability: WithholdingAccount | null }> {
  const accounts = await fetchTenantAccounts(tenantId);
  return {
    expense: pickExpenseAccount(accounts),
    liability: pickWithholdingLiabilityAccount(accounts, tipoRetencion, tasa),
  };
}

export async function buildWithholdingJournalEntry(
  retencion: Withholding,
  opts: { tenantId: string; companyId?: string }
): Promise<WithholdingEntryItem> {
  const base = num(retencion.amount);
  const tasa = num(retencion.withholdingRate);
  const retAmount = num(retencion.withholdingAmount) || Math.round(base * tasa);
  const tipoRetencion = classifyWithholdingRetentionType(retencion.type, tasa);

  const { expense, liability } = await resolveWithholdingAccounts(
    opts.tenantId,
    tipoRetencion,
    tasa
  );

  const fecha = retencion.invoiceDate
    ? new Date(retencion.invoiceDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    fecha,
    referencia: withholdingJournalReference(retencion),
    cuentaDebito: expense?.name || 'Gasto/Costo Proveedor',
    cuentaDebitoCode: expense?.code || '',
    cuentaCredito: liability?.name || 'Retenciones por Pagar',
    cuentaCreditoCode: liability?.code || '',
    base,
    tasa,
    retencion: retAmount,
    tipoRetencion,
    tenantId: opts.tenantId,
    companyId: opts.companyId,
  };
}

function accountTypeOf(item: any): string {
  const account = item?.account || {};
  return account.type || item?.type || '';
}

function accountCodeOf(item: any): string {
  const account = item?.account || {};
  return account.code || item?.code || '';
}

function accountNameOf(item: any): string {
  const account = item?.account || {};
  return account.name || item?.name || 'Sin nombre';
}

function accountBalanceOf(item: any): number {
  return parseFloat(item?.balance ?? 0) || 0;
}

function accountDebitOf(item: any): number {
  return parseFloat(item?.debit ?? 0) || 0;
}

export function transformToWithholdingJournalData(data: any[]): WithholdingEntryItem[] {
  const raw = data || [];
  const expenseRows = raw.filter(
    (item: any) =>
      accountTypeOf(item).toUpperCase() === 'EXPENSE' && accountDebitOf(item) > 0
  );

  const items: WithholdingEntryItem[] = [];

  raw.forEach((item: any) => {
    if (accountTypeOf(item).toUpperCase() !== 'LIABILITY') return;
    if (Math.abs(accountBalanceOf(item)) === 0) return;
    if (!isWithholdingAccountNameOrCode(accountNameOf(item), accountCodeOf(item))) return;

    const code = accountCodeOf(item);
    const name = accountNameOf(item);
    const retencion = Math.round(Math.abs(accountBalanceOf(item)) * 100) / 100;
    const tasaPct = deriveRateFromAccountName(name);
    const tasa = tasaPct > 0 ? tasaPct / 100 : 0;
    const base = tasa > 0 ? round2(retencion / tasa) : retencion;

    const normalized = String(name || '').toUpperCase();
    const tipoRetencion: WithholdingEntryType = /^IGV|ISV/.test(normalized)
      ? 'IGV'
      : /\bIR\b|12[.,]?5|IRPF/.test(normalized)
        ? 'IR'
        : /ISR|RENTA|1\s*%/.test(normalized)
          ? 'ISR'
          : 'RETENCION';

    const match = expenseRows.find(
      (e: any) => Math.abs(accountDebitOf(e) - retencion) <= 0.01
    );
    const expense = match || expenseRows[0] || null;

    items.push({
      fecha: item?.date || '',
      referencia: String(item?.supplier || item?.provider || item?.customer || name),
      cuentaDebito: expense?.account?.name || expense?.name || 'Gasto/Costo Proveedor',
      cuentaDebitoCode: expense?.account?.code || expense?.code || '',
      cuentaCredito: name,
      cuentaCreditoCode: code,
      base,
      tasa,
      retencion,
      tipoRetencion,
      tenantId: String(item?.tenantId || item?.tenant_id || ''),
      journalEntryId: String(item?.id || ''),
    });
  });

  return items.sort((a, b) => a.cuentaCreditoCode.localeCompare(b.cuentaCreditoCode));
}

export function groupWithholdingEntryItems(
  items: WithholdingEntryItem[]
): WithholdingEntryGrouped {
  const list = items || [];
  const porTipo: Record<string, number> = { IR: 0, ISR: 0, IGV: 0, RETENCION: 0 };
  list.forEach((i) => {
    porTipo[i.tipoRetencion] = (porTipo[i.tipoRetencion] || 0) + 1;
  });
  const totalRetenciones = round2(
    list.reduce((sum, i) => sum + num(i.retencion), 0)
  );
  return {
    retenciones: list,
    totalDebitos: totalRetenciones,
    totalCreditos: totalRetenciones,
    totalRetenciones,
    porTipo,
  };
}

export function computeWithholdingEntryTotals(
  grouped: WithholdingEntryGrouped
): WithholdingEntryTotals {
  const totalDebitos = round2(num(grouped.totalDebitos));
  const totalCreditos = round2(num(grouped.totalCreditos));
  return {
    totalDebitos,
    totalCreditos,
    totalRetenciones: round2(num(grouped.totalRetenciones)),
    balanced: Math.abs(totalDebitos - totalCreditos) <= 0.01,
  };
}

export function formatWithholdingEntryForExcel(items: WithholdingEntryItem[]): any[][] {
  const rows: any[][] = [
    ['FECHA', 'REFERENCIA', 'CUENTA DÉBITO', 'CÓDIGO', 'CUENTA CRÉDITO', 'CÓDIGO', 'BASE', 'TASA', 'RETENCIÓN'],
  ];
  items.forEach((i) => {
    rows.push([
      i.fecha || '',
      i.referencia || '',
      i.cuentaDebito,
      i.cuentaDebitoCode,
      i.cuentaCredito,
      i.cuentaCreditoCode,
      round2(num(i.base) / 100),
      round2(num(i.tasa) * 100),
      round2(num(i.retencion) / 100),
    ]);
  });
  const totalBase = round2(items.reduce((sum, i) => sum + num(i.base), 0) / 100);
  const totalRetenciones = round2(items.reduce((sum, i) => sum + num(i.retencion), 0) / 100);
  rows.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    totalBase,
    '',
    totalRetenciones,
  ]);
  return rows;
}