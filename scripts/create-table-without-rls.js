const { createClient } = require('@supabase/supabase-js');

// Usar la clave de servicio para tener acceso completo
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlYzN0Iiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDQ0NTI1MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCustomTaxesTable() {
  try {
    console.log('🔄 Creating CustomTaxes table with service role key...');
    
    // Primero, intentar crear la tabla directamente sin RLS
    const { data, error } = await supabase
      .from('CustomTaxes')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('✅ CustomTaxes table already exists');
      return true;
    }

    if (error) {
      console.log('📊 Table does not exist, attempting to create...');
      
      // Intentar crear un registro para forzar la creación de la tabla
      const testRecord = {
        id: 'test-setup-' + Date.now(),
        tenantId: 'DENTALWD', // Tenant de prueba
        name: 'Test Tax Setup',
        rate: 15.00,
        enabled: true,
        description: 'Temporary record for table creation'
      };

      const { data: insertData, error: insertError } = await supabase
        .from('CustomTaxes')
        .insert(testRecord)
        .select();

      if (insertError) {
        console.error('❌ Error creating table via insert:', insertError);
        
        // Si falla, intentar con SQL directo
        console.log('🔄 Trying direct SQL approach...');
        
        // Crear la tabla usando SQL sin RLS
        const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', {
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
          console.error('❌ Error with direct SQL:', sqlError);
          return false;
        }

        console.log('✅ CustomTaxes table created with direct SQL');
        return true;
      }

      console.log('✅ CustomTaxes table created successfully');
      
      // Eliminar el registro de prueba
      await supabase
        .from('CustomTaxes')
        .delete()
        .eq('id', testRecord.id);
      
      return true;
    }

    console.log('✅ CustomTaxes table already exists and is accessible');
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

createCustomTaxesTable()
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
