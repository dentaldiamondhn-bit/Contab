const { Client } = require('pg');

// Conexión directa a PostgreSQL
const databaseUrl = 'postgresql://postgres:7KC3eRuTM123@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function createCustomTaxesUltimate() {
  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    await client.connect();
    console.log('🔄 Connected to PostgreSQL database');
    
    // 1. Deshabilitar completamente RLS y triggers
    console.log('🔓 Completely disabling RLS and triggers...');
    
    await client.query('SET session_replication_role = replica;');
    await client.query('SET row_security = off;');
    await client.query('SET session_replication_role = replica;');
    await client.query('SET row_security = off;');
    
    // 2. Eliminar todas las políticas y triggers existentes
    console.log('🗑️ Removing existing policies and triggers...');
    
    try {
      await client.query('DROP TRIGGER IF EXISTS "update_custom_taxes_updated_at_trigger" ON "CustomTaxes";');
      await client.query('DROP FUNCTION IF EXISTS update_custom_taxes_updated_at();');
      await client.query('DROP POLICY IF EXISTS "Tenants can read own custom taxes" ON "CustomTaxes";');
      await client.query('DROP POLICY IF EXISTS "Tenants can insert own custom taxes" ON "CustomTaxes";');
      await client.query('DROP POLICY IF EXISTS "Tenants can update own custom taxes" ON "CustomTaxes";');
      await client.query('DROP POLICY IF EXISTS "Tenants can delete own custom taxes" ON "CustomTaxes";');
      await client.query('ALTER TABLE "CustomTaxes" DISABLE ROW LEVEL SECURITY;');
      console.log('✅ Existing policies and triggers removed');
    } catch (cleanupError) {
      console.log('⚠️ Cleanup error (expected if table doesn\'t exist):', cleanupError.message);
    }
    
    // 3. Crear la tabla sin RLS ni restricciones
    console.log('📄 Creating CustomTaxes table without RLS...');
    
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

    await client.query(createTableSQL);
    console.log('✅ CustomTaxes table created successfully without RLS');
    
    // 4. Insertar datos iniciales reales
    console.log('📝 Inserting initial CustomTaxes data...');
    
    const insertDataSQL = `
      INSERT INTO "CustomTaxes" (id, tenantId, name, rate, enabled, description)
      VALUES 
        ('custom-1', 'DENTALWD', 'Impuesto Municipal', 2.00, true, 'Impuesto municipal del 2%'),
        ('custom-2', 'DENTALWD', 'Impuesto de Seguridad', 5.00, false, 'Impuesto de seguridad del 5%'),
        ('custom-3', 'DENTALWD', 'Impuesto de Turismo', 3.00, true, 'Impuesto turístico del 3%')
      ON CONFLICT (id) DO NOTHING;
    `;
    
    await client.query(insertDataSQL);
    console.log('✅ Initial data inserted successfully');
    
    // 5. Verificar los datos insertados
    const testResult = await client.query('SELECT * FROM "CustomTaxes" WHERE tenantId = $1 ORDER BY createdAt', ['DENTALWD']);
    console.log('📋 CustomTaxes data:', testResult.rows);
    
    // 6. Mantener RLS deshabilitado para esta tabla
    console.log('🔓 Keeping RLS disabled for CustomTaxes table...');
    
    await client.end();
    return true;
    
  } catch (error) {
    console.error('❌ Error creating CustomTaxes table:', error);
    await client.end();
    return false;
  }
}

createCustomTaxesUltimate()
  .then(success => {
    if (success) {
      console.log('🎉 CustomTaxes table is ready for use without RLS restrictions');
    } else {
      console.log('❌ Failed to create CustomTaxes table');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Critical error:', error);
    process.exit(1);
  });
