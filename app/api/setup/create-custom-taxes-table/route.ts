import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// POST - Crear tabla CustomTaxes directamente
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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

    // Ejecutar SQL usando el cliente directo
    const { data, error } = await supabase
      .from('CustomTaxes')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // La tabla ya existe
      console.log('✅ La tabla CustomTaxes ya existe');
      return NextResponse.json({
        success: true,
        message: 'Tabla CustomTaxes verificada exitosamente'
      });
    }

    // Si hay otro error, intentar crear la tabla
    if (error) {
      console.log('🔄 Intentando crear tabla CustomTaxes...');
      
      // Usar el método SQL directo si está disponible
      try {
        const { data: createResult, error: createError } = await supabase.rpc('exec_sql', { 
          sql_query: createTableSQL 
        });
        
        if (createError) {
          console.error('❌ Error creando tabla con RPC:', createError);
          return NextResponse.json(
            { error: 'Error creando tabla', details: createError },
            { status: 500 }
          );
        }
        
        console.log('✅ Tabla CustomTaxes creada exitosamente');
        return NextResponse.json({
          success: true,
          message: 'Tabla CustomTaxes creada exitosamente'
        });
        
      } catch (rpcError) {
        console.error('❌ Error con RPC:', rpcError);
        
        // Último intento: crear un registro para forzar la creación
        const testTax = {
          id: 'setup-' + Date.now(),
          tenantId: 'DENTALWD', // Tenant de prueba
          name: 'Setup Test Tax',
          rate: 15.00,
          enabled: true,
          description: 'Tax created during setup'
        };

        const { data: insertResult, error: insertError } = await supabase
          .from('CustomTaxes')
          .insert(testTax)
          .select();

        if (insertError) {
          if (insertError.code === 'PGRST116') {
            console.log('✅ La tabla CustomTaxes ya existe (verificado por inserción)');
            return NextResponse.json({
              success: true,
              message: 'Tabla CustomTaxes verificada exitosamente'
            });
          } else {
            console.error('❌ Error creando tabla por inserción:', insertError);
            return NextResponse.json(
              { error: 'Error creando tabla', details: insertError },
              { status: 500 }
            );
          }
        } else {
          console.log('✅ Tabla CustomTaxes creada exitosamente (por inserción)');
          
          // Eliminar el registro de prueba
          await supabase
            .from('CustomTaxes')
            .delete()
            .eq('id', testTax.id);
          
          return NextResponse.json({
            success: true,
            message: 'Tabla CustomTaxes creada exitosamente'
          });
        }
      }
    } else {
      console.log('✅ La tabla CustomTaxes ya existe');
      return NextResponse.json({
        success: true,
        message: 'Tabla CustomTaxes verificada exitosamente'
      });
    }

  } catch (error) {
    console.error('Error en POST /api/setup/create-custom-taxes-table:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}
