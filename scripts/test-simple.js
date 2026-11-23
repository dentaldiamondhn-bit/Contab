const { Pool } = require('pg');
const { requireDatabaseUrl } = require('./load-env.cjs');

const pool = new Pool({
  connectionString: requireDatabaseUrl()
});

async function test() {
  const tenantId = 'TEST1DS';
  
  console.log('=== Test: Generador SEPA con Tabla User ===');
  console.log('Tenant:', tenantId);
  console.log('');
  
  const { rows: users } = await pool.query(
    'SELECT id, email, name, tenantId FROM "User" WHERE tenantId = $1 ORDER BY name',
    [tenantId]
  );
  
  console.log('Usuarios encontrados:', users.length);
  console.log('');
  
  users.forEach((u, i) => {
    console.log(i + 1 + '. ID: ' + u.id);
    console.log('   Nombre: ' + (u.name || 'Sin nombre'));
    console.log('   Email: ' + u.email);
    console.log('   Tenant: ' + u.tenantId);
    console.log('');
  });
  
  if (users.length > 0) {
    const payments = [];
    for (const user of users) {
      payments.push({
        creditorName: user.name || user.email.split('@')[0],
        creditorIBAN: 'ES91234567890123456789',
        creditorBIC: 'BBVAESMMXXX',
        amount: 2500,
        purpose: 'Nómina ' + new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })
      });
    }
    
    console.log('Empleados para nómina:', payments.length);
    console.log('Importe total:', payments.reduce((s, p) => s + p.amount, 0) + ' €');
    console.log('Test completado');
  } else {
    console.log('No hay usuarios para este tenant');
  }
}

test();