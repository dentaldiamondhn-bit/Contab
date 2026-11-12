const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:7KC3eRuTM123@db.kudsqsbxbmviesiaesct.supabase.co:5432/postgres'
});

async function findEmployeeTables() {
  try {
    const { rows } = await pool.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%employee%'
      ORDER BY table_name
    `);
    
    console.log('Tablas relacionadas con employees:');
    rows.forEach(t => console.log(' - ' + t.table_name + ' (schema: ' + t.table_schema + ')'));
    
    // Also check for Employee (capital E)
    const { rows: rows2 } = await pool.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'Employee'
      ORDER BY table_name
    `);
    
    if (rows2.length > 0) {
      console.log('\\nTabla Employee (mayúscula):');
      rows2.forEach(t => console.log(' - ' + t.table_name + ' (schema: ' + t.table_schema + ')'));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

findEmployeeTables();