const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:7KC3eRuTM123@db.kudsqsbxbmviesiaesct.supabase.co:5432/postgres'
});

async function test() {
  try {
    // Probar conexión simple
    const { rows } = await pool.query('SELECT NOW() as current_time');
    console.log('Conexión exitosa');
    console.log('Fecha actual:', rows[0].current_time);
    
    // Probar query a User
    const { rows: users } = await pool.query('SELECT id, email, name FROM "User" LIMIT 3');
    console.log('Usuarios:', users.length);
    users.forEach(u => console.log(' - ' + u.email + ' - ' + u.name));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

test();