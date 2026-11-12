const { Client } = require('pg');

// Try kudsqsbxbmviesiaesct.supabase.co with port 5432
const configs = [
  { host: 'kudsqsbxbmviesiaesct.supabase.co', port: 5432, user: 'postgres', desc: 'kudsqsbx...:5432' },
  { host: 'kudsqsbxbmviesiaesct.supabase.co', port: 5432, user: 'postgres.kudsqsbxbmviesiaesct.anon_user', desc: 'kudsqsbx...:5432 anon' },
  { host: 'kudsqsbxbmviesiaesct.supabase.co', port: 5432, user: 'postgres.kudsqsbxbmviesiaesct.service_role', desc: 'kudsqsbx...:5432 svc' },
];

const pw = '7KC3eRuTM123';

async function test(label, cfg) {
  const c = new Client({ host: cfg.host, port: cfg.port, user: cfg.user, password: pw, database: 'postgres', connectionTimeoutMillis: 5000 });
  try {
    await c.connect();
    const r = await c.query('SELECT current_user, version()');
    console.log(`OK [${label}] user=${r.rows[0].current_user}`);
    await c.query(`CREATE TABLE IF NOT EXISTS "Plan_tmp_test" (id TEXT PRIMARY KEY)`);
    await c.query('DROP TABLE IF EXISTS "Plan_tmp_test"');
    await c.end();
    console.log(`  → Writable: YES`);
    return true;
  } catch (err) {
    console.log(`FAIL [${label}] ${err.message.slice(0,100)}`);
    return false;
  } finally { try { await c.end(); } catch(e) {} }
}

(async () => {
  for (const cfg of configs) await test(cfg.desc, cfg);
})();
