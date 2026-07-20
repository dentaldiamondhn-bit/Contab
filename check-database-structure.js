const { Pool } = require('pg');
require('dotenv').config();

// Conexión directa a PostgreSQL usando DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Verificando estructura completa de la base de datos...\n');

    // 1. Verificar conexión básica
    console.log('📋 Verificando conexión básica...');
    try {
      const result = await pool.query('SELECT 1 as test');
      console.log('✅ Conexión básica exitosa');
    } catch (err) {
      console.error('❌ Error de conexión básica:', err.message);
      return;
    }

    // 2. Verificar si las tablas existen
    console.log('\n📋 Verificando tablas existentes...');
    try {
      const tablesResult = await pool.query(`
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      console.log(`✅ Tablas encontradas: ${tablesResult.rows.length}`);
      console.log('📊 Lista de tablas:');
      tablesResult.rows.forEach(table => {
        console.log(`  - ${table.table_name} (${table.table_type})`);
      });
    } catch (err) {
      console.error('❌ Error obteniendo tablas:', err.message);
    }

    // 3. Verificar estructura de tablas específicas
    const criticalTables = ['companies', 'User', 'tenants', 'CustomTaxes', 'invoices'];
    
    for (const tableName of criticalTables) {
      console.log(`\n📋 Analizando tabla: ${tableName}`);
      
      try {
        // Verificar si la tabla existe
        const existsResult = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
          );
        `);
        
        const tableExists = existsResult.rows[0].exists;
        console.log(tableExists ? '✅ Tabla existe' : '❌ Tabla NO existe');
        
        if (tableExists) {
          // Obtener columnas
          const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = '${tableName}'
            ORDER BY ordinal_position
          `);
          
          console.log(`📊 Columnas (${columnsResult.rows.length}):`);
          columnsResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'YES' ? ' (nullable)' : ' (NOT NULL)'}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
          });
          
          // Obtener conteo de registros
          try {
            const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            console.log(`📈 Registros: ${countResult.rows[0].count}`);
          } catch (countErr) {
            console.log(`⚠️ No se pudo obtener conteo: ${countErr.message}`);
          }
        }
      } catch (err) {
        console.error(`❌ Error analizando tabla ${tableName}:`, err.message);
      }
    }

    // 4. Verificar RLS policies
    console.log('\n📋 Verificando políticas RLS...');
    try {
      const rlsResult = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          rowsecurity,
          forcerls
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND rowsecurity = true
        ORDER BY tablename
      `);
      
      console.log(`✅ Tablas con RLS habilitado: ${rlsResult.rows.length}`);
      rlsResult.rows.forEach(table => {
        console.log(`  - ${table.tablename}: RLS ${table.forcerls ? 'FORZADO' : 'habilitado'}`);
      });
    } catch (err) {
      console.error('❌ Error verificando RLS:', err.message);
    }

    // 5. Verificar triggers
    console.log('\n📋 Verificando triggers...');
    try {
      const triggersResult = await pool.query(`
        SELECT 
          trigger_name,
          event_manipulation_table,
          action_timing,
          action_orientation,
          action_statement
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        ORDER BY trigger_name
      `);
      
      console.log(`✅ Triggers encontrados: ${triggersResult.rows.length}`);
      triggersResult.rows.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.action_orientation} ON ${trigger.event_manipulation_table}`);
      });
    } catch (err) {
      console.error('❌ Error verificando triggers:', err.message);
    }

    console.log('\n🎯 Verificación de estructura completada');
    
  } catch (err) {
    console.error('❌ Error general en verificación:', err.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a PostgreSQL cerrada');
  }
}

checkDatabaseStructure();
