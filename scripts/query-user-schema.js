const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:7KC3eRuTM123@db.kudsqsbxbmviesiaesct.supabase.co:5432/postgres'
});

async function querySchemas() {
  try {
    // 1. Schema de tabla User
    console.log('=== Schema de tabla User ===');
    const { rows: userCols } = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `);
    userCols.forEach(c => {
      const nullable = c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = c.column_default ? ' DEFAULT ' + c.column_default : '';
      console.log(` - ${c.column_name} (${c.data_type}${nullable}${def})`);
    });
    
    console.log('');
    
    // 2. Schema de tabla employee_hr_documents
    console.log('=== Schema de tabla employee_hr_documents ===');
    const { rows: docCols } = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'employee_hr_documents'
      ORDER BY ordinal_position
    `);
    if (docCols.length > 0) {
      docCols.forEach(c => {
        const nullable = c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const def = c.column_default ? ' DEFAULT ' + c.column_default : '';
        console.log(` - ${c.column_name} (${c.data_type}${nullable}${def})`);
      });
    } else {
      console.log('Tabla employee_hr_documents no existe');
    }
    
    console.log('');
    
    // 3. Verificar si existe tabla employees
    const { rows: tables } = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name ILIKE 'employee%'
    `);
    console.log('Tablas employee-related:');
    tables.forEach(t => console.log(' - ' + t.table_name));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

querySchemas();