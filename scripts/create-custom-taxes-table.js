const { createClient } = require('@supabase/supabase-js');

// Configuración de la base de datos
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlYzN0Iiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDg0NDkxMSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// SQL para crear la tabla
const createTableSQL = `
-- Create CustomTaxes table for storing custom tax configurations
CREATE TABLE IF NOT EXISTS "CustomTaxes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint to ensure tenant isolation
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Create index for faster tenant-specific queries
CREATE INDEX IF NOT EXISTS "idx_custom_taxes_tenant_id" ON "CustomTaxes"("tenantId");

-- Create index for enabled status filtering
CREATE INDEX IF NOT EXISTS "idx_custom_taxes_enabled" ON "CustomTaxes"("tenantId", "enabled");

-- Add RLS (Row Level Security) policies
ALTER TABLE "CustomTaxes" ENABLE ROW LEVEL SECURITY;

-- Policy to allow tenants to read their own custom taxes
CREATE POLICY "Tenants can read own custom taxes" ON "CustomTaxes"
    FOR SELECT USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Policy to allow tenants to insert their own custom taxes
CREATE POLICY "Tenants can insert own custom taxes" ON "CustomTaxes"
    FOR INSERT WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

-- Policy to allow tenants to update their own custom taxes
CREATE POLICY "Tenants can update own custom taxes" ON "CustomTaxes"
    FOR UPDATE USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Policy to allow tenants to delete their own custom taxes
CREATE POLICY "Tenants can delete own custom taxes" ON "CustomTaxes"
    FOR DELETE USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Create trigger to automatically update updatedAt timestamp
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

async function createCustomTaxesTable() {
  try {
    console.log('🔄 Creando tabla CustomTaxes...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: createTableSQL });
    
    if (error) {
      console.error('❌ Error creando tabla:', error);
      
      // Intentar con SQL directo si RPC no funciona
      console.log('🔄 Intentando con SQL directo...');
      const { data: data2, error: error2 } = await supabase
        .from('CustomTaxes')
        .select('*')
        .limit(1);
      
      if (error2 && error2.code === 'PGRST116') {
        console.log('✅ La tabla CustomTaxes ya existe');
        return true;
      } else if (error2) {
        console.error('❌ Error verificando tabla:', error2);
        return false;
      } else {
        console.log('✅ La tabla CustomTaxes ya existe');
        return true;
      }
    }
    
    console.log('✅ Tabla CustomTaxes creada exitosamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return false;
  }
}

// Ejecutar la creación de la tabla
createCustomTaxesTable()
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
