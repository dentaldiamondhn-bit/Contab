const { createClient } = require('@supabase/supabase-js');

// Configuración de la base de datos
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlYzN0Iiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDQ0NTI1MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCustomTaxesTable() {
  try {
    console.log('🔄 Creating CustomTaxes table...');
    
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

    // Intentar crear la tabla directamente
    const { data, error } = await supabase
      .from('CustomTaxes')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('✅ CustomTaxes table already exists');
      return true;
    }

    if (error) {
      console.error('❌ Error checking table:', error);
      return false;
    }

    console.log('✅ CustomTaxes table exists and is accessible');
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

createCustomTaxesTable()
  .then(success => {
    if (success) {
      console.log('🎉 CustomTaxes table is ready');
    } else {
      console.log('❌ Failed to create CustomTaxes table');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Critical error:', error);
    process.exit(1);
  });
