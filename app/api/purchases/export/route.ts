import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';

const DATA_FILE = join(process.cwd(), 'purchases-data.json');

interface Purchase {
  id: string;
  [key: string]: any;
  invoice_number?: string;
  invoice_date?: string;
  supplier_name?: string;
  total?: number;
  status?: string;
  cai?: string;
  items?: any[];
  created_at?: string;
  subtotal?: number;
  tax_amount?: number;
}

const loadPurchases = (): Purchase[] => {
  try {
    if (existsSync(DATA_FILE)) {
      const data = readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error loading purchases data:', error);
    return [];
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const format = searchParams.get('format') || 'excel';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Load all purchases
    const purchases = loadPurchases();
    
    // Filter by date range if provided
    let filteredPurchases = purchases;
    if (startDate && endDate) {
      filteredPurchases = purchases.filter((purchase: Purchase) => {
        const purchaseDate = new Date(purchase.invoice_date || purchase.created_at || '');
        return purchaseDate >= new Date(startDate) && purchaseDate <= new Date(endDate);
      });
    }

    const dateRange = startDate && endDate 
      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : 'Todas las fechas';

    return generateExcelReport(filteredPurchases, companyId || 'Todas', dateRange);
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateExcelReport(purchases: Purchase[], companyName: string, dateRange: string) {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data for Excel
  const excelData = purchases.map(p => ({
    'Factura': p.invoice_number || 'N/A',
    'Fecha': p.invoice_date ? new Date(p.invoice_date).toLocaleDateString() : 'N/A',
    'Proveedor': p.supplier_name || 'N/A',
    'CAI': p.cai || 'N/A',
    'Estado': p.status || 'N/A',
    'Subtotal': p.subtotal || 0,
    'Impuesto': p.tax_amount || 0,
    'Total': p.total || 0,
    'Items': p.items ? p.items.length : 0,
  }));
  
  // Add summary row
  const total = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  excelData.push({
    'Factura': 'TOTAL',
    'Fecha': '',
    'Proveedor': '',
    'CAI': '',
    'Estado': '',
    'Subtotal': purchases.reduce((sum, p) => sum + (p.subtotal || 0), 0),
    'Impuesto': purchases.reduce((sum, p) => sum + (p.tax_amount || 0), 0),
    'Total': total,
    'Items': 0,
  });
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  const colWidths = [
    { wch: 15 }, // Factura
    { wch: 12 }, // Fecha
    { wch: 25 }, // Proveedor
    { wch: 20 }, // CAI
    { wch: 10 }, // Estado
    { wch: 12 }, // Subtotal
    { wch: 12 }, // Impuesto
    { wch: 12 }, // Total
    { wch: 8 },  // Items
  ];
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Compras');
  
  // Generate buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  
  // Return file
  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_compras_${Date.now()}.xlsx"`,
    },
  });
}
