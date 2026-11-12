const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Conexión directa a PostgreSQL para crear tablas
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Conexión Supabase para verificar
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSchemaCache() {
  try {
    console.log('🔧 Solucionando error de cache de esquema...\n');

    // 1. Verificar qué tablas faltan
    console.log('📋 Verificando tablas existentes...');
    const tablesToFix = ['invoices', 'invoice_items', 'products', 'accounts', 'polizas', 'tenants'];
    
    for (const tableName of tablesToFix) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error && error.message.includes('Could not find the table')) {
          console.log(`❌ Tabla ${tableName} NO existe - necesita crearse`);
        } else if (error) {
          console.log(`⚠️ Tabla ${tableName} tiene error: ${error.message}`);
        } else {
          console.log(`✅ Tabla ${tableName} existe y funciona`);
        }
      } catch (err) {
        console.log(`❌ Error verificando tabla ${tableName}: ${err.message}`);
      }
    }

    // 2. Crear tablas faltantes
    console.log('\n🏗️ Creando tablas faltantes...');

    // Crear tabla tenants si no existe
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tenants (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ Tabla tenants creada o verificada');
    } catch (err) {
      console.log('⚠️ Error creando tabla tenants:', err.message);
    }

    // Crear tabla invoices si no existe
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
      console.log('✅ Tabla invoices creada o verificada');
    } catch (err) {
      console.log('⚠️ Error creando tabla invoices:', err.message);
    }

    // Crear tabla invoice_items si no existe
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
      console.log('✅ Tabla invoice_items creada o verificada');
    } catch (err) {
      console.log('⚠️ Error creando tabla invoice_items:', err.message);
    }

    // Crear tabla products si no existe
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
      console.log('✅ Tabla products creada o verificada');
    } catch (err) {
      console.log('⚠️ Error creando tabla products:', err.message);
    }

    // Crear tabla accounts si no existe
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
      console.log('✅ Tabla accounts creada o verificada');
    } catch (err) {
      console.log('⚠️ Error creando tabla accounts:', err.message);
    }

    // Crear tabla polizas si no existe
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
      console.log('✅ Tabla polizas creada o verificada');
    } catch (err) {
      console.log('⚠️ Error creando tabla polizas:', err.message);
    }

    // 3. Insertar datos de prueba si las tablas están vacías
    console.log('\n📝 Insertando datos de prueba...');

    // Insertar tenant de prueba si no existe
    try {
      await pool.query(`
        INSERT INTO tenants (id, name, created_at, updated_at)
        VALUES ('DENTALWD', 'Dental Diamond', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Tenant DENTALWD insertado o verificado');
    } catch (err) {
      console.log('⚠️ Error insertando tenant:', err.message);
    }

    // Insertar productos de ejemplo si no existen
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

    // 4. Limpiar cache de Supabase
    console.log('\n🧹 Limpiando cache de Supabase...');
    try {
      await pool.query('NOTIFY pgrst, \'reload schema\'');
      console.log('✅ Notificación de reload de schema enviada');
    } catch (err) {
      console.log('⚠️ No se pudo limpiar cache:', err.message);
    }

    // 5. Verificación final
    console.log('\n🔍 Verificación final...');
    
    for (const tableName of tablesToFix) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: Funciona correctamente`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }

    console.log('\n🎯 ¡Cache de esquema solucionado!');
    
  } catch (err) {
    console.error('❌ Error general:', err.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexión PostgreSQL cerrada');
  }
}

fixSchemaCache();
