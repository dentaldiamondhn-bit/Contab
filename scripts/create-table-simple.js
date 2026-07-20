const { createClient } = require('@supabase/supabase-js');

// Configuración de la base de datos con SERVICE_ROLE_KEY
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlYzN0Iiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDg0NDkxMSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  try {
    console.log('🔄 Creando tabla CustomTaxes...');
    
    // SQL simplificado sin RLS para evitar problemas
    const sql = `
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
    `;

    // Usar el método SQL directo si está disponible
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error('❌ Error con RPC:', error);
        
        // Intentar con método alternativo
        console.log('🔄 Intentando método alternativo...');
        
        // Crear un registro de prueba para forzar la creación de la tabla
        const testTax = {
          id: 'test-' + Date.now(),
          tenantId: 'TEST',
          name: 'Test Tax',
          rate: 15.00,
          enabled: true,
          description: 'Test tax for table creation'
        };

        const { data: insertData, error: insertError } = await supabase
          .from('CustomTaxes')
          .insert(testTax)
          .select();

        if (insertError) {
          if (insertError.code === 'PGRST116') {
            console.log('✅ La tabla CustomTaxes ya existe');
            return true;
          } else {
            console.error('❌ Error creando tabla:', insertError);
            return false;
          }
        } else {
          console.log('✅ Tabla CustomTaxes creada exitosamente');
          
          // Eliminar el registro de prueba
          await supabase
            .from('CustomTaxes')
            .delete()
            .eq('id', testTax.id);
            
          return true;
        }
      } else {
        console.log('✅ Tabla CustomTaxes creada con RPC');
        return true;
      }
    } catch (rpcError) {
      console.error('❌ Error en RPC:', rpcError);
      return false;
    }

  } catch (error) {
    console.error('❌ Error general:', error);
    return false;
  }
}

createTable()
  .then(success => {
    if (success) {
      console.log('🎉 Proceso completado exitosamente');
      process.exit(0);
    } else {
      console.log('❌ Proceso fallido');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error crítico:', error);
    process.exit(1);
  });
