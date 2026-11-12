const { Pool } = require('pg');
require('dotenv').config();

// Conexión directa a PostgreSQL usando DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function disableRLSPolicies() {
  try {
    console.log('🔓 Deshabilitando políticas RLS en Supabase...\n');

    // Lista de tablas importantes
    const tables = [
      'companies',
      'User',
      'CustomTaxes',
      'invoices',
      'invoice_items',
      'cai',
      'products',
      'accounts',
      'polizas'
    ];

    for (const tableName of tables) {
      console.log(`📋 Deshabilitando RLS en tabla: ${tableName}`);
      
      try {
        // Deshabilitar RLS en la tabla
        await pool.query(`ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;`);
        console.log(`✅ RLS deshabilitado en tabla: ${tableName}`);
      } catch (err) {
        console.error(`❌ Error deshabilitando RLS en ${tableName}:`, err.message);
      }
    }

    // Verificar que RLS está deshabilitado
    console.log('\n🔍 Verificando estado de RLS...');
    
    try {
      const result = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN (${tables.map(t => `'${t}'`).join(', ')})
        ORDER BY tablename;
      `);
      
      console.log('📊 Estado actual de RLS:');
      result.rows.forEach(row => {
        const status = row.rowsecurity ? '🔒 Habilitado' : '🔓 Deshabilitado';
        console.log(`  - ${row.tablename}: ${status}`);
      });
      
    } catch (err) {
      console.error('❌ Error verificando estado de RLS:', err.message);
    }

    console.log('\n🎯 RLS deshabilitado exitosamente en todas las tablas');
    
  } catch (err) {
    console.error('❌ Error general deshabilitando RLS:', err.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a PostgreSQL cerrada');
  }
}

disableRLSPolicies();
