const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => {
    console.log('Connected to DB');
    return c.query('SELECT 1 AS ok, NOW() AS t');
  })
  .then(r => { console.log('Result:', JSON.stringify(r.rows)); c.end(); })
  .catch(e => { console.error('Error:', e.message); process.exit(2); });
