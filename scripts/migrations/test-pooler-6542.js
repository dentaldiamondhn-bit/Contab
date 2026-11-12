const { Client } = require('pg');
const project = 'kudsqsbxbmviesiaesct';
const pw = '7KC3eRuTM123';

// 6542 with the correct pooler subdomain user
const user = `postgres.${project}.anon_user`;
const c = new Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6542,
  user,
  password: pw,
  database: 'postgres',
  connectionTimeoutMillis: 5000,
});

c.connect().then(async () => {
  console.log(`OK: connected on 6542 as ${user}`);
  const r = await c.query("SELECT current_user, current_database(), version()");
  console.log(r.rows[0]);
  await c.query(`CREATE TABLE IF NOT EXISTS "Plan_test" (id TEXT PRIMARY KEY)`);
  console.log('TEST table OK');
  await c.query('DROP TABLE IF EXISTS "Plan_test"');
  console.log('TEST table dropped');
  await c.end();
}).catch(e => console.error('FAIL:', e.message)).finally(() => {
  c.end().catch(() => {});
});
