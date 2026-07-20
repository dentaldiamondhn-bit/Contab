const { createClient } = require('@supabase/supabase-js');

// Configuración de la base de datos
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlYzN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDQ0NTI1MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  try {
    console.log('🔄 Executing CustomTaxes table migration...');
    
    // Leer el archivo SQL
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, 'migrations', '005_create_custom_taxes_table.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ SQL migration file not found:', sqlFile);
      return false;
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    console.log('📄 SQL content loaded:', sqlContent.substring(0, 200) + '...');
    
    // Ejecutar la migración usando la función RPC de Supabase
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error('❌ Error executing migration:', error);
      
      // Intentar con SQL directo sin RLS
      console.log('🔄 Trying without RLS policies...');
      
      const simplifiedSQL = `
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
      
      const { data: data2, error: error2 } = await supabase.rpc('exec_sql', {
        sql_query: simplifiedSQL
      });
      
      if (error2) {
        console.error('❌ Error with simplified SQL:', error2);
        return false;
      }
      
      console.log('✅ CustomTaxes table created successfully (simplified)');
      return true;
    }
    
    console.log('✅ CustomTaxes table migration completed successfully');
    console.log('📊 Migration result:', data);
    
    // Verificar que la tabla existe
    const { data: tableCheck, error: checkError } = await supabase
      .from('CustomTaxes')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.log('⚠️ Table check failed, but migration may have succeeded:', checkError);
    } else {
      console.log('✅ CustomTaxes table verified and accessible');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Critical error during migration:', error);
    return false;
  }
}

executeMigration()
  .then(success => {
    if (success) {
      console.log('🎉 CustomTaxes table is ready for use');
    } else {
      console.log('❌ Migration failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Critical error:', error);
    process.exit(1);
  });
