import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  const DATA_FILE = join(process.cwd(), 'suppliers-data.json');
  
  try {
    const data = readFileSync(DATA_FILE, 'utf8');
    const suppliers = JSON.parse(data);
    
    return NextResponse.json({
      message: 'Test route working',
      fileExists: true,
      suppliersCount: suppliers.length,
      suppliers: suppliers.map((s: any) => ({ id: s.id, name: s.name }))
    });
  } catch (error) {
    return NextResponse.json({
      message: 'Test route error',
      error: (error as Error).message,
      fileExists: false
    });
  }
}
