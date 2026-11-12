import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { BankExcelMapper } from '@/lib/services/bank-excel-mapper';
import { ExcelImportResult } from '@/lib/services/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty' },
        { status: 400 }
      );
    }

    // Extract headers (first row)
    const headers = jsonData[0] as string[];
    
    // Detect bank format
    const bankDetection = BankExcelMapper.detectBankFormat(headers);
    
    if (!bankDetection.format) {
      return NextResponse.json(
        { 
          error: 'Unable to detect bank format. Please check if the Excel file contains proper bank statement headers.',
          detectedHeaders: headers,
          supportedBanks: ['BAC', 'FICOHSA', 'ATLANTIDA', 'BANRURAL', 'OCCIDENTE', 'G&T', 'AZUL']
        },
        { status: 400 }
      );
    }

    // Map the data
    const mappedTransactions = BankExcelMapper.mapExcelData(jsonData, bankDetection.format);
    
    // Validate transactions
    const validation = BankExcelMapper.validateTransactions(mappedTransactions);
    
    // Generate summary
    const summary = BankExcelMapper.generateSummary(validation.valid);

    const result: ExcelImportResult = {
      success: true,
      bankDetection,
      transactions: validation.valid,
      summary,
      validation,
      errors: validation.errors.length > 0 ? validation.errors : undefined
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json(
      { error: 'Failed to process Excel file: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
