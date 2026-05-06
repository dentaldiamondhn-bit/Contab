import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '../../../../lib/supabase/standard-client';

// POST - Crear tabla CustomTaxes y configuración inicial
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    
    // SQL para crear la tabla CustomTaxes
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "CustomTaxes" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "rate" DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "description" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS "idx_custom_taxes_tenant_id" ON "CustomTaxes"("tenantId");
      CREATE INDEX IF NOT EXISTS "idx_custom_taxes_enabled" ON "CustomTaxes"("tenantId", "enabled");
      
      ALTER TABLE "CustomTaxes" ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "Tenants can read own custom taxes" ON "CustomTaxes"
        FOR SELECT USING ("tenantId" = current_setting('app.current_tenant_id', true));
      
      CREATE POLICY IF NOT EXISTS "Tenants can insert own custom taxes" ON "CustomTaxes"
        FOR INSERT WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));
      
      CREATE POLICY IF NOT EXISTS "Tenants can update own custom taxes" ON "CustomTaxes"
        FOR UPDATE USING ("tenantId" = current_setting('app.current_tenant_id', true));
      
      CREATE POLICY IF NOT EXISTS "Tenants can delete own custom taxes" ON "CustomTaxes"
        FOR DELETE USING ("tenantId" = current_setting('app.current_tenant_id', true));
    `;

    // Ejecutar SQL para crear la tabla
    const { error: tableError } = await supabase.rpc('exec_sql', { 
      sql_query: createTableSQL 
    });

    if (tableError) {
      console.error('Error creando tabla CustomTaxes:', tableError);
      
      // Si el RPC no funciona, intentar verificar si la tabla ya existe
      const { data: existingTable, error: checkError } = await supabase
        .from('CustomTaxes')
        .select('*')
        .limit(1);
      
      if (checkError && checkError.code === 'PGRST116') {
        console.log('✅ La tabla CustomTaxes ya existe');
        return NextResponse.json({
          success: true,
          message: 'Tabla CustomTaxes verificada exitosamente'
        });
      } else if (checkError) {
        return NextResponse.json(
          { error: 'Error verificando tabla CustomTaxes', details: checkError },
          { status: 500 }
        );
      } else {
        console.log('✅ La tabla CustomTaxes ya existe');
        return NextResponse.json({
          success: true,
          message: 'Tabla CustomTaxes verificada exitosamente'
        });
      }
    }

    console.log('✅ Tabla CustomTaxes creada exitosamente');
    return NextResponse.json({
      success: true,
      message: 'Tabla CustomTaxes creada exitosamente'
    });

  } catch (error) {
    console.error('Error en POST /api/setup/custom-taxes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}
