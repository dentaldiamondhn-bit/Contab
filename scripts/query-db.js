const { Pool } = require('pg');
const { requireDatabaseUrl } = require('./load-env.cjs');

const pool = new Pool({
  connectionString: requireDatabaseUrl()
});

async function queryDB() {
  const client = await pool.connect();
  
  try {
    // 1. Listar todas las tablas
    console.log('=== Tablas en la base de datos ===');
    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    tables.forEach(t => console.log(' - ' + t.table_name));
    
    console.log('');
    
    // 2. Schema de la tabla employees
    console.log('=== Schema de tabla employees ===');
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'employees'
      ORDER BY ordinal_position
    `);
    columns.forEach(c => {
      const nullable = c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = c.column_default ? ' DEFAULT ' + c.column_default : '';
      console.log(` - ${c.column_name} (${c.data_type}${nullable}${def})`);
    });
    
    console.log('');
    
    // 3. Contar registros
    const { rows: count } = await client.query('SELECT COUNT(*) AS total FROM employees');
    console.log(`=== Total de registros en employees: ${count[0].total} ===`);
    
    console.log('');
    
    // 4. Obtener algunos registros de ejemplo
    console.log('=== Ejemplos de registros (primeros 5) ===');
    const { rows: samples } = await client.query(`
      SELECT id, first_name, last_name, company_id, tenant_id
      FROM employees
      LIMIT 5
    `);
    samples.forEach((r, i) => {
      console.log(` ${i + 1}. id: ${r.id}`);
      console.log(`   nombre: ${r.first_name} ${r.last_name}`);
      console.log(`   company_id: ${r.company_id}`);
      console.log(`   tenant_id: ${r.tenant_id}`);
      console.log('');
    });
    
  } catch (err) {
    console.error('Error executing query:', err.message);
  } finally {
    await pool.end();
  }
}

queryDB();