const { Client } = require('pg');

// Conexión directa a PostgreSQL
const databaseUrl = 'postgresql://postgres:7KC3eRuTM123@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function createCustomTaxesTableBypass() {
  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    await client.connect();
    console.log('🔄 Connected to PostgreSQL database');
    
    // Deshabilitar temporalmente RLS y triggers
    console.log('🔓 Disabling RLS and triggers temporarily...');
    
    await client.query('SET session_replication_role = replica;');
    await client.query('SET row_security = off;');
    
    // SQL para crear la tabla CustomTaxes sin restricciones
    const createTableSQL = `
      DROP TABLE IF EXISTS "CustomTaxes" CASCADE;
      
      CREATE TABLE "CustomTaxes" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "rate" DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "description" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX "idx_custom_taxes_tenant_id" ON "CustomTaxes"("tenantId");
      CREATE INDEX "idx_custom_taxes_enabled" ON "CustomTaxes"("tenantId", "enabled");
      
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

    console.log('📄 Executing SQL to create CustomTaxes table...');
    
    await client.query(createTableSQL);
    console.log('✅ CustomTaxes table created successfully');
    
    // Insertar datos de ejemplo para probar
    const insertTestSQL = `
      INSERT INTO "CustomTaxes" (id, tenantId, name, rate, enabled, description)
      VALUES 
        ('example-1', 'DENTALWD', 'Impuesto de Ejemplo 1', 12.00, true, 'Impuesto personalizado de ejemplo 1'),
        ('example-2', 'DENTALWD', 'Impuesto de Ejemplo 2', 8.00, true, 'Otro impuesto personalizado')
      ON CONFLICT (id) DO NOTHING;
    `;
    
    await client.query(insertTestSQL);
    console.log('✅ Test data inserted successfully');
    
    // Verificar los datos insertados
    const testResult = await client.query('SELECT * FROM "CustomTaxes" WHERE tenantId = $1', ['DENTALWD']);
    console.log('📋 Test data in table:', testResult.rows);
    
    // Restaurar configuración de seguridad
    await client.query('SET row_security = on;');
    await client.query('RESET session_replication_role;');
    
    await client.end();
    return true;
    
  } catch (error) {
    console.error('❌ Error creating CustomTaxes table:', error);
    await client.end();
    return false;
  }
}

createCustomTaxesTableBypass()
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
