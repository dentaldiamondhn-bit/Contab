const { Pool } = require('pg');
require('dotenv').config();

// Conexión directa a PostgreSQL usando DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function disableAllTriggers() {
  try {
    console.log('🔓 Deshabilitando TODOS los triggers y políticas...\n');

    // 1. Deshabilitar RLS en todas las tablas (sin verificar si existe)
    const tables = [
      'companies',
      'User', 
      'CustomTaxes',
      'invoices',
      'invoice_items',
      'cai',
      'products',
      'accounts',
      'polizas',
      'tenants'
    ];

    for (const tableName of tables) {
      try {
        await pool.query(`ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;`);
        console.log(`✅ RLS deshabilitado en: ${tableName}`);
      } catch (err) {
        console.log(`⚠️ No se pudo deshabilitar RLS en ${tableName}: ${err.message}`);
      }
    }

    // 2. Deshabilitar todos los triggers
    try {
      const triggerResult = await pool.query(`
        SELECT trigger_name, event_manipulation_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
      `);
      
      console.log(`📋 Encontrados ${triggerResult.rows.length} triggers`);
      
      for (const trigger of triggerResult.rows) {
        try {
          await pool.query(`DROP TRIGGER IF EXISTS ${trigger.trigger_name} ON ${trigger.event_manipulation_table};`);
          console.log(`✅ Trigger eliminado: ${trigger.trigger_name}`);
        } catch (err) {
          console.log(`⚠️ No se pudo eliminar trigger ${trigger.trigger_name}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error('❌ Error obteniendo triggers:', err.message);
    }

    // 3. Deshabilitar session variables
    try {
      await pool.query('RESET ALL;');
      console.log('✅ Session variables reseteadas');
    } catch (err) {
      console.log(`⚠️ No se pudieron resetear variables: ${err.message}`);
    }

    console.log('\n🎯 Todos los triggers y políticas han sido deshabilitados');
    
  } catch (err) {
    console.error('❌ Error general deshabilitando triggers:', err.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a PostgreSQL cerrada');
  }
}

disableAllTriggers();
