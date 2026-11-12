const { Client } = require('pg');

// Conexión directa a PostgreSQL
const databaseUrl = 'postgresql://postgres:7KC3eRuTM123@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function createCustomTaxesTable() {
  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    await client.connect();
    console.log('🔄 Connected to PostgreSQL database');
    
    // SQL para crear la tabla CustomTaxes sin RLS
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
    
    // Verificar que la tabla existe
    const result = await client.query('SELECT COUNT(*) FROM "CustomTaxes"');
    console.log(`📊 CustomTaxes table has ${result.rows[0].count} rows`);
    
    // Insertar datos de ejemplo para probar
    const insertTestSQL = `
      INSERT INTO "CustomTaxes" (id, tenantId, name, rate, enabled, description)
      VALUES 
        ('test-1', 'DENTALWD', 'Impuesto de Ejemplo 1', 12.00, true, 'Impuesto personalizado de ejemplo 1'),
        ('test-2', 'DENTALWD', 'Impuesto de Ejemplo 2', 8.00, true, 'Otro impuesto personalizado')
      ON CONFLICT (id) DO NOTHING;
    `;
    
    await client.query(insertTestSQL);
    console.log('✅ Test data inserted successfully');
    
    // Verificar los datos insertados
    const testResult = await client.query('SELECT * FROM "CustomTaxes" WHERE tenantId = $1', ['DENTALWD']);
    console.log('📋 Test data in table:', testResult.rows);
    
    await client.end();
    return true;
    
  } catch (error) {
    console.error('❌ Error creating CustomTaxes table:', error);
    await client.end();
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
