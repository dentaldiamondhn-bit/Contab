import { NextResponse } from 'next/server';

console.log('=== TEST PURCHASES [ID] ROUTE LOADED ===');

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log('TEST GET - ID:', id);
  return NextResponse.json({ message: 'Test route working', id });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log('TEST PUT - ID:', id);
  return NextResponse.json({ message: 'Test PUT working', id });
}
