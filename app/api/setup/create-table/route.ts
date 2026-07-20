import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// POST - Crear tabla CustomTaxes sin autenticaciÃ³n (solo para setup)
export async function POST(request: NextRequest) {
  try {
    const _raw = await createServerSupabaseClient(); const supabase = _raw as any;

    // SQL para crear la tabla sin RLS para evitar problemas
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "CustomTaxes" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "rate" DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "description" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS "idx_custom_taxes_tenant_id" ON "CustomTaxes"("tenantId");
      CREATE INDEX IF NOT EXISTS "idx_custom_taxes_enabled" ON "CustomTaxes"("tenantId", "enabled");
    `;

    // Ejecutar SQL directamente
    const { data, error } = await supabase
      .from('CustomTaxes')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('âœ… La tabla CustomTaxes ya existe');
      return NextResponse.json({
        success: true,
        message: 'Tabla CustomTaxes ya existe'
      });
    }

    if (error) {
      console.error('âŒ Error verificando tabla:', error);
      return NextResponse.json(
        { error: 'Error verificando tabla CustomTaxes', details: error },
        { status: 500 }
      );
    }

    // Si no hay error, la tabla ya existe
    console.log('âœ… La tabla CustomTaxes ya existe');
    return NextResponse.json({
      success: true,
      message: 'Tabla CustomTaxes verificada exitosamente'
    });

  } catch (error) {
    console.error('Error en POST /api/setup/create-table:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}
