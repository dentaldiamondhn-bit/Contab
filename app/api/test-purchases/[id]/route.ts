import { NextResponse } from 'next/server';

console.log('=== TEST PURCHASES [ID] ROUTE LOADED ===');

export async function GET(request: Request, { params }: { params: { id: string } }) {
  console.log('TEST GET - ID:', params.id);
  return NextResponse.json({ message: 'Test route working', id: params.id });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  console.log('TEST PUT - ID:', params.id);
  return NextResponse.json({ message: 'Test PUT working', id: params.id });
}
