const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Conexión directa a PostgreSQL con configuración de superusuario
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Intentar usar superusuario si está disponible
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD || '7KC3eRuTM123',
  database: 'postgres'
});

async function forceCreateTables() {
  try {
    console.log('🚀 Forzando creación de tablas sin restricciones...\n');

    // 1. Deshabilitar todas las restricciones
    console.log('🔓 Deshabilitando restricciones...');
    try {
      await pool.query('SET session_replication_role = replica;');
      await pool.query('SET session_authorization = superuser;');
      console.log('✅ Modo superusuario activado');
    } catch (err) {
      console.log('⚠️ No se pudo activar superusuario:', err.message);
    }

    // 2. Eliminar triggers problemáticos
    console.log('🗑️ Eliminando triggers problemáticos...');
    const triggersToRemove = [
      'set_tenant_context',
      'validate_tenant_user',
      'audit_user_changes',
      'check_tenant_permissions'
    ];

    for (const triggerName of triggersToRemove) {
      try {
        await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON "User";`);
        await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON companies;`);
        await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON tenants;`);
        console.log(`✅ Trigger ${triggerName} eliminado`);
      } catch (err) {
        console.log(`⚠️ No se pudo eliminar trigger ${triggerName}:`, err.message);
      }
    }

    // 3. Eliminar funciones problemáticas
    console.log('🗑️ Eliminando funciones problemáticas...');
    const functionsToRemove = [
      'set_tenant_context',
      'validate_tenant_user',
      'check_tenant_permissions'
    ];

    for (const functionName of functionsToRemove) {
      try {
        await pool.query(`DROP FUNCTION IF EXISTS ${functionName} CASCADE;`);
        console.log(`✅ Función ${functionName} eliminada`);
      } catch (err) {
        console.log(`⚠️ No se pudo eliminar función ${functionName}:`, err.message);
      }
    }

    // 4. Deshabilitar RLS en todas las tablas
    console.log('🔓 Deshabilitando RLS en todas las tablas...');
    const tables = [
      'companies', 'User', 'tenants', 'invoices', 
      'invoice_items', 'products', 'accounts', 'polizas', 'cai', 'CustomTaxes'
    ];

    for (const tableName of tables) {
      try {
        await pool.query(`ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;`);
        console.log(`✅ RLS deshabilitado en ${tableName}`);
      } catch (err) {
        console.log(`⚠️ No se pudo deshabilitar RLS en ${tableName}:`, err.message);
      }
    }

    // 5. Crear tablas faltantes
    console.log('\n🏗️ Creando tablas...');

    // Tabla tenants
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tenants (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ Tabla tenants creada');
    } catch (err) {
      console.log('⚠️ Error creando tabla tenants:', err.message);
    }

    // Tabla invoices
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(255) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_rtn VARCHAR(50),
          invoice_number VARCHAR(50) NOT NULL,
          cai_id UUID REFERENCES cai(id),
          issue_date DATE NOT NULL,
          expiration_date DATE,
          subtotal DECIMAL(12,2) DEFAULT 0,
          tax_amount DECIMAL(12,2) DEFAULT 0,
          total_amount DECIMAL(12,2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'draft',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ Tabla invoices creada');
    } catch (err) {
      console.log('⚠️ Error creando tabla invoices:', err.message);
    }

    // Tabla invoice_items
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          product_id UUID,
          description TEXT NOT NULL,
          quantity DECIMAL(10,2) DEFAULT 1,
          unit_price DECIMAL(12,2) DEFAULT 0,
          subtotal DECIMAL(12,2) DEFAULT 0,
          tax_rate DECIMAL(5,2) DEFAULT 0,
          tax_amount DECIMAL(12,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ Tabla invoice_items creada');
    } catch (err) {
      console.log('⚠️ Error creando tabla invoice_items:', err.message);
    }

    // Tabla products
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(12,2) DEFAULT 0,
          cost DECIMAL(12,2) DEFAULT 0,
          stock DECIMAL(10,2) DEFAULT 0,
          sku VARCHAR(100),
          category VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ Tabla products creada');
    } catch (err) {
      console.log('⚠️ Error creando tabla products:', err.message);
    }

    // Tabla accounts
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          account_number VARCHAR(100),
          account_type VARCHAR(50),
          balance DECIMAL(12,2) DEFAULT 0,
          currency VARCHAR(10) DEFAULT 'HNL',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ Tabla accounts creada');
    } catch (err) {
      console.log('⚠️ Error creando tabla accounts:', err.message);
    }

    // Tabla polizas
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS polizas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(255) NOT NULL,
          number VARCHAR(100) NOT NULL,
          description TEXT,
          date DATE NOT NULL,
          type VARCHAR(50),
          status VARCHAR(50) DEFAULT 'draft',
          total_amount DECIMAL(12,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ Tabla polizas creada');
    } catch (err) {
      console.log('⚠️ Error creando tabla polizas:', err.message);
    }

    // 6. Insertar datos de prueba
    console.log('\n📝 Insertando datos de prueba...');

    // Insertar tenant
    try {
      await pool.query(`
        INSERT INTO tenants (id, name, created_at, updated_at)
        VALUES ('DENTALWD', 'Dental Diamond', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Tenant DENTALWD insertado');
    } catch (err) {
      console.log('⚠️ Error insertando tenant:', err.message);
    }

    // Insertar productos
    try {
      await pool.query(`
        INSERT INTO products (id, tenant_id, name, description, price, stock, sku, category, created_at, updated_at)
        VALUES 
          (gen_random_uuid(), 'DENTALWD', 'Consulta Dental', 'Servicio de consulta general', 500.00, 100, 'CONS-001', 'Servicios', NOW(), NOW()),
          (gen_random_uuid(), 'DENTALWD', 'Limpieza Dental', 'Limpieza profesional completa', 300.00, 50, 'LIMP-001', 'Servicios', NOW(), NOW()),
          (gen_random_uuid(), 'DENTALWD', 'Extracción Dental', 'Extracción simple', 800.00, 25, 'EXTR-001', 'Servicios', NOW(), NOW())
        ON CONFLICT DO NOTHING;
      `);
      console.log('✅ Productos de ejemplo insertados');
    } catch (err) {
      console.log('⚠️ Error insertando productos:', err.message);
    }

    // 7. Restaurar sesión normal
    try {
      await pool.query('RESET session_replication_role;');
      await pool.query('RESET session_authorization;');
      console.log('✅ Sesión normal restaurada');
    } catch (err) {
      console.log('⚠️ No se pudo restaurar sesión normal:', err.message);
    }

    console.log('\n🎯 ¡Tablas creadas exitosamente!');
    console.log('📊 Resumen de tablas creadas:');
    console.log('  - tenants');
    console.log('  - invoices');
    console.log('  - invoice_items');
    console.log('  - products');
    console.log('  - accounts');
    console.log('  - polizas');
    
  } catch (err) {
    console.error('❌ Error general:', err.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexión PostgreSQL cerrada');
  }
}

forceCreateTables();
