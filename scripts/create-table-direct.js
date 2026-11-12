const { createClient } = require('@supabase/supabase-js');

// Usar la URL directa de la base de datos sin autenticación
const databaseUrl = 'postgresql://postgres:7KC3eRuTM123@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const { Client } = require('pg');

async function createCustomTaxesTable() {
  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    await client.connect();
    console.log('🔄 Connected to PostgreSQL database');
    
    // SQL para crear la tabla CustomTaxes
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

    await client.query(createTableSQL);
    console.log('✅ CustomTaxes table created successfully');
    
    // Verificar que la tabla existe
    const result = await client.query('SELECT COUNT(*) FROM "CustomTaxes"');
    console.log(`📊 CustomTaxes table has ${result.rows[0].count} rows`);
    
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
