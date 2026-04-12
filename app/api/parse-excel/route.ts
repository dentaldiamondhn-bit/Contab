import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { setupAuditContext } from '@/lib/audit-context';

export async function POST(request: NextRequest) {
  try {
    // Set up audit context
    const userId = request.headers.get('x-user-id') || 'system';
    setupAuditContext(request, userId);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Raw data from Excel
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    // Get all accounts from database for code lookup
    const accounts = await db.account.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      }
    });

    const codeToIdMap = new Map();
    accounts.forEach((account: { id: string; code: string; name: string }) => {
      codeToIdMap.set(account.code, account.id);
    });

    // Process each row and validate account codes
    const processedData: any[] = [];
    const missingCodes = new Set<string>();

    rawData.forEach((row: any) => {
      const accountCode = row.AccountCode?.toString();
      
      // Check if account code exists
      if (!codeToIdMap.has(accountCode)) {
        missingCodes.add(accountCode);
        return; // Skip this row
      }

      processedData.push({
        date: new Date(row.Date),
        description: row.Description || '',
        accountId: codeToIdMap.get(accountCode), // Map code to database ID
        amount: Math.round(row.Amount * 100), // Convert L. 150.50 to 15050 cents
      });
    });

    // If there are missing codes, return error
    if (missingCodes.size > 0) {
      return NextResponse.json({
        success: false,
        error: `Los siguientes códigos de cuenta no existen en la base de datos: ${Array.from(missingCodes).join(', ')}`,
        missingCodes: Array.from(missingCodes)
      });
    }

    return NextResponse.json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al procesar el archivo Excel. Asegúrese de que el formato sea correcto.'
    });
  }
}
