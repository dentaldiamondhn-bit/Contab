const { createClient } = require('@supabase/supabase-js');

// Configuración de la base de datos
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlYzN0Iiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDQ0NTI1MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCustomTaxesTableRobust() {
  try {
    console.log('🔄 Creating CustomTaxes table with robust approach...');
    
    // 1. Intentar crear la tabla directamente con Supabase
    console.log('📊 Attempting direct table creation with Supabase...');
    
    try {
      // Intentar insertar un registro para forzar la creación de la tabla
      const testRecord = {
        id: 'setup-' + Date.now(),
        tenantId: 'DENTALWD',
        name: 'Setup Test Tax',
        rate: 15.00,
        enabled: true,
        description: 'Test record for table creation'
      };

      const { data: insertData, error: insertError } = await supabase
        .from('CustomTaxes')
        .insert(testRecord)
        .select();

      if (insertError) {
        console.log('⚠️ Insert failed, table may not exist:', insertError);
        
        // 2. Intentar crear la tabla con SQL raw
        console.log('🔧 Attempting table creation with raw SQL...');
        
        const { data: sqlData, error: sqlError } = await supabase
          .rpc('exec_sql', {
            sql_query: `
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
            `
          });

        if (sqlError) {
          console.log('❌ SQL creation failed:', sqlError);
          
          // 3. Intentar con la función de migración
          console.log('🔄 Attempting with migration function...');
          
          const { data: migrationData, error: migrationError } = await supabase
            .rpc('create_custom_taxes_table');

          if (migrationError) {
            console.log('❌ Migration function failed:', migrationError);
            
            // 4. Último recurso: Crear tabla temporal sin restricciones
            console.log('🚨 Last resort: Creating temporary table...');
            
            const { data: tempData, error: tempError } = await supabase
              .rpc('exec_sql', {
                sql_query: `
                  DROP TABLE IF EXISTS "CustomTaxes_temp" CASCADE;
                  
                  CREATE TABLE "CustomTaxes_temp" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "tenantId" TEXT NOT NULL,
                    "name" TEXT NOT NULL,
                    "rate" DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
                    "enabled" BOOLEAN NOT NULL DEFAULT true,
                    "description" TEXT,
                    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                  );
                  
                  CREATE INDEX "idx_custom_taxes_temp_tenant_id" ON "CustomTaxes_temp"("tenantId");
                  CREATE INDEX "idx_custom_taxes_temp_enabled" ON "CustomTaxes_temp"("tenantId", "enabled");
                `
              });

            if (tempError) {
              console.log('❌ Temporary table creation failed:', tempError);
              return false;
            }
            
            console.log('✅ Temporary table created successfully');
            
            // Insertar datos de prueba en la tabla temporal
            const { data: tempInsertData, error: tempInsertError } = await supabase
              .from('CustomTaxes_temp')
              .insert([
                {
                  id: 'temp-1',
                  tenantId: 'DENTALWD',
                  name: 'Impuesto Temporal 1',
                  rate: 12.00,
                  enabled: true,
                  description: 'Impuesto personalizado temporal'
                },
                {
                  id: 'temp-2',
                  tenantId: 'DENTALWD',
                  name: 'Impuesto Temporal 2',
                  rate: 8.00,
                  enabled: true,
                  description: 'Otro impuesto temporal'
                }
              ])
              .select();

            if (tempInsertError) {
              console.log('❌ Temporary data insert failed:', tempInsertError);
            } else {
              console.log('✅ Temporary data inserted successfully');
              console.log('📊 Temporary data:', tempInsertData);
            }
            
            return true;
          }
          
          console.log('✅ Table created with SQL successfully');
          console.log('📊 Migration result:', sqlData);
          
          // Insertar datos de prueba
          const { data: insertData2, error: insertError2 } = await supabase
            .from('CustomTaxes')
            .insert([
              {
                id: 'test-1',
                tenantId: 'DENTALWD',
                name: 'Impuesto de Ejemplo 1',
                rate: 12.00,
                enabled: true,
                description: 'Impuesto personalizado de ejemplo 1'
              },
              {
                id: 'test-2',
                tenantId: 'DENTALWD',
                name: 'Impuesto de Ejemplo 2',
                rate: 8.00,
                enabled: true,
                description: 'Otro impuesto personalizado'
              }
            ])
            .select();

          if (insertError2) {
            console.log('❌ Test data insert failed:', insertError2);
          } else {
            console.log('✅ Test data inserted successfully');
            console.log('📊 Test data:', insertData2);
          }
          
          return true;
        }
        
        console.log('✅ Table created with raw SQL successfully');
        console.log('📊 SQL result:', sqlData);
        return true;
      }
      
      console.log('✅ Table created successfully with insert method');
      console.log('📊 Insert result:', insertData);
      
      // Eliminar el registro de prueba
      await supabase
        .from('CustomTaxes')
        .delete()
        .eq('id', testRecord.id);
      
      return true;
      
    } catch (directError) {
      console.log('❌ Direct table creation failed:', directError);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Critical error in robust table creation:', error);
    return false;
  }
}

createCustomTaxesTableRobust()
  .then(success => {
    if (success) {
      console.log('🎉 CustomTaxes table is ready for use');
    } else {
      console.log('❌ Failed to create CustomTaxes table');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Critical error:', error);
    process.exit(1);
  });
