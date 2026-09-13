import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST() {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    await client.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS hours DECIMAL(5,2) DEFAULT 0');
    const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance' ORDER BY ordinal_position");
    await client.end();
    return NextResponse.json({ ok: true, columns: r.rows.map((x: any) => x.column_name) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
