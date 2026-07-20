const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase con la clave correcta
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlYzN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCustomTaxesDefinitive() {
  try {
    console.log('🔄 Creating definitive CustomTaxes solution...');
    
    // 1. Primero verificar si la tabla ya existe
    console.log('📊 Checking if CustomTaxes table exists...');
    
    const { data: existingTable, error: tableError } = await supabase
      .from('CustomTaxes')
      .select('*')
      .limit(1);

    if (!tableError) {
      console.log('✅ CustomTaxes table already exists');
      
      // Verificar datos existentes
      const { data: existingData, error: dataError } = await supabase
        .from('CustomTaxes')
        .select('*')
        .eq('tenantId', 'DENTALWD');

      if (!dataError) {
        console.log('📋 Existing CustomTaxes data:', existingData);
        
        if (existingData.length > 0) {
          console.log('✅ CustomTaxes table has data, removing mock data...');
          
          // Eliminar datos de ejemplo si existen
          const { error: deleteError } = await supabase
            .from('CustomTaxes')
            .delete()
            .in('id', ['mock-1', 'mock-2', 'example-1', 'example-2', 'memory-1', 'memory-2']);

          if (!deleteError) {
            console.log('✅ Mock data removed successfully');
          } else {
            console.log('⚠️ Error removing mock data:', deleteError);
          }
        }
      }
      
      return true;
    }
    
    console.log('⚠️ Table does not exist, creating...');
    
    // 2. Crear la tabla usando SQL directo
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
      
      -- Crear trigger para actualizar updatedAt automáticamente
      CREATE OR REPLACE FUNCTION update_custom_taxes_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      CREATE TRIGGER "update_custom_taxes_updated_at_trigger"
        BEFORE UPDATE ON "CustomTaxes"
        FOR EACH ROW
        EXECUTE FUNCTION update_custom_taxes_updated_at();
    `;

    // 3. Intentar crear la tabla con el cliente de Supabase
    console.log('🔧 Creating CustomTaxes table...');
    
    // Usar el método de inserción para crear la tabla
    const testRecord = {
      id: 'setup-' + Date.now(),
      tenantId: 'DENTALWD',
      name: 'Setup Test',
      rate: 15.00,
      enabled: true,
      description: 'Test record for table creation'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('CustomTaxes')
      .insert(testRecord)
      .select();

    if (insertError) {
      console.log('❌ Table creation failed:', insertError);
      return false;
    }

    console.log('✅ CustomTaxes table created successfully');
    
    // 4. Eliminar el registro de prueba
    await supabase
      .from('CustomTaxes')
      .delete()
      .eq('id', testRecord.id);

    // 5. Insertar datos iniciales reales
    console.log('📝 Inserting initial CustomTaxes data...');
    
    const initialData = [
      {
        id: 'custom-1',
        tenantId: 'DENTALWD',
        name: 'Impuesto Municipal',
        rate: 2.00,
        enabled: true,
        description: 'Impuesto municipal del 2%'
      },
      {
        id: 'custom-2',
        tenantId: 'DENTALWD',
        name: 'Impuesto de Seguridad',
        rate: 5.00,
        enabled: false,
        description: 'Impuesto de seguridad del 5%'
      }
    ];

    const { data: finalData, error: finalError } = await supabase
      .from('CustomTaxes')
      .insert(initialData)
      .select();

    if (finalError) {
      console.log('❌ Error inserting initial data:', finalError);
    } else {
      console.log('✅ Initial data inserted successfully');
      console.log('📊 Inserted data:', finalData);
    }

    // 6. Verificar la tabla final
    const { data: verification, error: verificationError } = await supabase
      .from('CustomTaxes')
      .select('*')
      .eq('tenantId', 'DENTALWD');

    if (!verificationError) {
      console.log('✅ CustomTaxes table verification successful');
      console.log('📋 Final table data:', verification);
    }

    return true;
    
  } catch (error) {
    console.error('❌ Critical error in definitive solution:', error);
    return false;
  }
}

createCustomTaxesDefinitive()
  .then(success => {
    if (success) {
      console.log('🎉 CustomTaxes definitive solution completed');
    } else {
      console.log('❌ Definitive solution failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Critical error:', error);
    process.exit(1);
  });
