const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => c.query('SELECT 1 AS ok').then(r => { console.log('Connected:', JSON.stringify(r.rows)); c.end(); }).catch(e => { console.error('Query error:', e.message); c.end(); })).catch(e => { console.error('Connect error:', e.message); });
