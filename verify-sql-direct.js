const { Pool } = require('pg');
require('dotenv').config();

// Conexión directa a PostgreSQL usando DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyTablesDirect() {
  try {
    console.log('🔍 Verificando tablas SQL directamente desde PostgreSQL...\n');

    // Lista de tablas importantes a verificar
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
      console.log(`📋 Verificando tabla: ${tableName}`);
      
      try {
        // Verificar si la tabla existe
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
          );
        `);
        
        const tableExists = result.rows[0].exists;
        
        if (tableExists) {
          console.log(`✅ Tabla ${tableName} existe`);
          
          // Obtener estructura de la tabla
          const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = '${tableName}'
            ORDER BY ordinal_position;
          `);
          
          console.log(`📊 Columnas (${structureResult.rows.length}):`);
          structureResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'YES' ? ' (nullable)' : ''}`);
          });
          
          // Obtener conteo de registros
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`📈 Registros: ${countResult.rows[0].count}`);
          
          // Obtener muestra de datos (si hay registros)
          if (countResult.rows[0].count > 0) {
            const sampleResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 1`);
            console.log(`📄 Muestra de datos:`, sampleResult.rows[0]);
          }
        } else {
          console.log(`❌ Tabla ${tableName} NO existe`);
        }
        
        console.log('---');
        
      } catch (err) {
        console.error(`❌ Error crítico en tabla ${tableName}:`, err.message);
      }
    }

    // Verificación específica para facturas
    console.log('🧾 Verificación específica de facturación...');
    
    try {
      // Verificar facturas recientes
      const recentInvoices = await pool.query(`
        SELECT id, created_at, total_amount, customer_name 
        FROM invoices 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log(`✅ Facturas recientes: ${recentInvoices.rows.length} encontradas`);
      recentInvoices.rows.forEach(invoice => {
        console.log(`📄 Factura ${invoice.id}: ${invoice.customer_name} - ${invoice.total_amount} (${invoice.created_at})`);
      });
    } catch (err) {
      console.error('❌ Error verificando facturas:', err.message);
    }

    // Verificación específica para impuestos personalizados
    try {
      const customTaxes = await pool.query(`
        SELECT id, name, rate, is_active 
        FROM CustomTaxes 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log(`✅ Impuestos personalizados: ${customTaxes.rows.length} encontrados`);
      customTaxes.rows.forEach(tax => {
        console.log(`💰 Impuesto ${tax.id}: ${tax.name} - ${tax.rate}% (${tax.is_active ? 'activo' : 'inactivo'})`);
      });
    } catch (err) {
      console.error('❌ Error verificando impuestos personalizados:', err.message);
    }

    console.log('\n🎯 Verificación completada exitosamente');
    
  } catch (err) {
    console.error('❌ Error general en verificación:', err.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a PostgreSQL cerrada');
  }
}

verifyTablesDirect();
