const { Client } = require('pg');
const pw = '7KC3eRuTM123';
const host = 'aws-0-us-east-1.pooler.supabase.com';
const project = 'kudsqsbxbmviesiaesct';

const configs = [
  { user: 'postgres',            port: 6543, desc: 'pooler postgres' },
  { user: 'postgres',            port: 6542, desc: 'pooler postgres (6542)' },
  { user: `postgres.${project}.anon_user`, port: 6542, desc: 'pooler anon_user' },
  { user: `postgres.${project}.service_role`, port: 6542, desc: 'pooler service_role' },
  { user: `postgres.${project}.anon_user`, port: 6543, desc: 'pooler anon_user (6543)' },
];

async function test(label, cfg) {
  const c = new Client({ host, port: cfg.port, user: cfg.user, password: pw, database: 'postgres' });
  try {
    await c.connect();
    const r = await c.query('SELECT version()');
    console.log(`OK [${label}] pg_version=${r.rows[0].version.split(' ').slice(0,2).join(' ')}`);
    // Check Plan table
    const p = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'Plan'`);
    console.log(`   Plan table: ${p.rows.length ? 'EXISTS' : 'not found'}`);
    await c.end();
  } catch (err) {
    console.log(`FAIL [${label}] ${err.message.slice(0, 80)}`);
  }
}

(async () => {
  for (const c of configs) await test(c.desc, c);
})();
