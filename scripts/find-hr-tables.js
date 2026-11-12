const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:7KC3eRuTM123@db.kudsqsbxbmviesiaesct.supabase.co:5432/postgres'
});

async function findHRTables() {
  try {
    const { rows } = await pool.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('=== Todas las tablas ===');
    rows.forEach(t => {
      const lower = t.table_name.toLowerCase();
      // Buscar tablas relacionadas con RRHH/empleados
      const hrKeywords = ['employee', 'hr', 'staff', 'worker', 'payroll', 'salary', 'contract'];
      const matchesHR = hrKeywords.filter(k => lower.includes(k));
      if (matchesHR.length > 0) {
        console.log(' - ' + t.table_name + ' (coincide con: ' + matchesHR.join(', ') + ')');
      }
    });
    
    // Also check specifically for employees table
    const employeeTable = rows.find(t => t.table_name.toLowerCase() === 'employees');
    if (employeeTable) {
      console.log('\\nTabla employees encontrada!');
    } else {
      console.log('\\nTabla employees NO encontrada');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

findHRTables();