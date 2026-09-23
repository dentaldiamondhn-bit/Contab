import { transformToBalanceGeneral, groupBalanceItems } from '@/lib/reports/balance-general';
import type { BalanceItem } from '@/lib/reports/balance-general';
import { transformToEstadoResultados, groupResultadoItems } from '@/lib/reports/income-statement';
import type { ResultadoItem } from '@/lib/reports/income-statement';
import { transformToFlujoEfectivo, groupFlujoItems } from '@/lib/reports/cash-flow';
import type { FlujoItem } from '@/lib/reports/cash-flow';

export interface AllStatements {
  balance: BalanceItem[];
  income: ResultadoItem[];
  cash: FlujoItem[];
}

export async function fetchTrialBalanceForStatements(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const response = await fetch(
    `/api/accounting/trial-balance?tenantId=${companyId}&startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`,
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) {
    throw new Error(`Error al consultar la balanza de comprobación: ${response.status}`);
  }
  const data = await response.json();
  return data || [];
}

export function transformAllStatements(data: any[]): AllStatements {
  return {
    balance: transformToBalanceGeneral(data),
    income: transformToEstadoResultados(data),
    cash: transformToFlujoEfectivo(data),
  };
}

function formatDateForReport(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function exportAllToExcel(
  companyId: string,
  startDate: string,
  endDate: string,
  companyName: string,
  currency: string = 'HNL'
): Promise<void> {
  const XLSX = await import('xlsx');
  const data = await fetchTrialBalanceForStatements(companyId, startDate, endDate);
  const { balance, income, cash } = transformAllStatements(data);
  const groupedBalance = groupBalanceItems(balance);
  const groupedIncome = groupResultadoItems(income);
  const groupedCash = groupFlujoItems(cash);

  const fmt = (n: number) => formatMoney(n, currency);
  const period = `Del ${formatDateForReport(startDate)} al ${formatDateForReport(endDate)}`;
  const monetary = `Expresado en ${currency === 'USD' ? 'Dólares' : 'Lempiras'}`;

  const rowsBalance: (string | number)[][] = [];
  rowsBalance.push([companyName]);
  rowsBalance.push(['BALANCE GENERAL']);
  rowsBalance.push([period]);
  rowsBalance.push([monetary]);
  rowsBalance.push([]);
  rowsBalance.push(['CUENTA', 'CÓDIGO', 'MONTO']);
  const pushBalanceSection = (title: string, items: BalanceItem[], total: number) => {
    rowsBalance.push([title]);
    items.forEach((i) => rowsBalance.push([i.name, i.code, fmt(i.amount)]));
    rowsBalance.push([`Total ${title}`, '', fmt(total)]);
    rowsBalance.push([]);
  };
  pushBalanceSection('Activos Corrientes', groupedBalance.activosCorrientes, groupedBalance.totalActivosCorrientes);
  pushBalanceSection('Activos No Corrientes', groupedBalance.activosNoCorrientes, groupedBalance.totalActivosNoCorrientes);
  rowsBalance.push(['TOTAL ACTIVOS', '', fmt(groupedBalance.totalActivos)]);
  rowsBalance.push([]);
  pushBalanceSection('Pasivos Corrientes', groupedBalance.pasivosCorrientes, groupedBalance.totalPasivosCorrientes);
  pushBalanceSection('Pasivos No Corrientes', groupedBalance.pasivosNoCorrientes, groupedBalance.totalPasivosNoCorrientes);
  rowsBalance.push(['TOTAL PASIVOS', '', fmt(groupedBalance.totalPasivos)]);
  rowsBalance.push([]);
  pushBalanceSection('Patrimonio', groupedBalance.patrimonio, groupedBalance.totalPatrimonio);
  rowsBalance.push(['TOTAL PASIVO + PATRIMONIO', '', fmt(groupedBalance.totalPatrimonioPasivos)]);

  const rowsIncome: (string | number)[][] = [];
  rowsIncome.push([companyName]);
  rowsIncome.push(['ESTADO DE RESULTADOS']);
  rowsIncome.push([period]);
  rowsIncome.push([monetary]);
  rowsIncome.push([]);
  rowsIncome.push(['CONCEPTO', 'CÓDIGO', 'MONTO']);
  const pushResultadoSection = (title: string, items: ResultadoItem[], total: number) => {
    rowsIncome.push([title]);
    items.forEach((i) => rowsIncome.push([i.name, i.code, fmt(Math.abs(i.amount))]));
    rowsIncome.push([`Total ${title}`, '', fmt(total)]);
    rowsIncome.push([]);
  };
  pushResultadoSection('Ingresos Operacionales', groupedIncome.ingresos, groupedIncome.totalIngresos);
  pushResultadoSection('Costos de Ventas', groupedIncome.costos, groupedIncome.totalCostos);
  rowsIncome.push(['UTILIDAD BRUTA', '', fmt(groupedIncome.utilidadBruta)]);
  rowsIncome.push([]);
  pushResultadoSection('Gastos Operativos', groupedIncome.gastos, groupedIncome.totalGastos);
  rowsIncome.push(['UTILIDAD DE OPERACIÓN', '', fmt(groupedIncome.utilidadOperacion)]);
  rowsIncome.push([]);
  rowsIncome.push(['UTILIDAD ANTES DE IMPUESTOS', '', fmt(groupedIncome.utilidadAntesImpuestos)]);
  rowsIncome.push(['IMPUESTO SOBRE LA RENTA (ISR 25%)', '', fmt(groupedIncome.isr)]);
  rowsIncome.push(['UTILIDAD NETA', '', fmt(groupedIncome.utilidadNeta)]);

  const rowsCash: (string | number)[][] = [];
  rowsCash.push([companyName]);
  rowsCash.push(['ESTADO DE FLUJO DE EFECTIVO']);
  rowsCash.push([period]);
  rowsCash.push([monetary]);
  rowsCash.push([]);
  rowsCash.push(['CONCEPTO', 'CÓDIGO', 'MONTO']);
  rowsCash.push(['1. ACTIVIDADES DE OPERACIÓN']);
  groupedCash.operacion.forEach((i) => rowsCash.push([i.name, i.code, fmt(i.amount)]));
  rowsCash.push(['Efectivo Neto de Operación', '', fmt(groupedCash.netoOperacion)]);
  rowsCash.push([]);
  rowsCash.push(['2. ACTIVIDADES DE INVERSIÓN']);
  groupedCash.inversion.forEach((i) => rowsCash.push([i.name, i.code, fmt(i.amount)]));
  rowsCash.push(['Efectivo Neto de Inversión', '', fmt(groupedCash.netoInversion)]);
  rowsCash.push([]);
  rowsCash.push(['3. ACTIVIDADES DE FINANCIACIÓN']);
  groupedCash.financiacion.forEach((i) => rowsCash.push([i.name, i.code, fmt(i.amount)]));
  rowsCash.push(['Efectivo Neto de Financiación', '', fmt(groupedCash.netoFinanciacion)]);
  rowsCash.push([]);
  rowsCash.push(['AUMENTO / DISMINUCIÓN NETA DE EFECTIVO', '', fmt(groupedCash.netoTotal)]);
  rowsCash.push(['Saldo Inicial', '', fmt(groupedCash.saldoInicial)]);
  rowsCash.push(['Saldo Final en Bancos', '', fmt(groupedCash.saldoFinal)]);

  const cols = [{ wch: 42 }, { wch: 12 }, { wch: 18 }];
  const workbook = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(rowsBalance);
  ws1['!cols'] = cols;
  XLSX.utils.book_append_sheet(workbook, ws1, 'Balance General');
  const ws2 = XLSX.utils.aoa_to_sheet(rowsIncome);
  ws2['!cols'] = cols;
  XLSX.utils.book_append_sheet(workbook, ws2, 'Estado de Resultados');
  const ws3 = XLSX.utils.aoa_to_sheet(rowsCash);
  ws3['!cols'] = cols;
  XLSX.utils.book_append_sheet(workbook, ws3, 'Flujo de Efectivo');
  XLSX.writeFile(
    workbook,
    `Estados_Financieros_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export async function exportAllToPDF(
  companyId: string,
  startDate: string,
  endDate: string,
  companyName: string,
  preloadedData?: any[]
): Promise<void> {
  const raw = preloadedData ?? (await fetchTrialBalanceForStatements(companyId, startDate, endDate));
  transformAllStatements(raw);

  const el = document.getElementById('printable-export-all');
  if (!el) {
    throw new Error('Elemento imprimible no encontrado');
  }

  const { default: jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;
  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  const fileName = `Estados_Financieros_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fileName);
}