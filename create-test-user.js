const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Conexión directa a PostgreSQL usando DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestUserAndTenant() {
  try {
    console.log('👤 Creando usuario y tenant de prueba...\n');

    // 1. Crear tenant de prueba
    const tenantId = uuidv4();
    const tenantResult = await pool.query(`
      INSERT INTO tenants (id, name, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id, name, created_at;
    `, [tenantId, 'Tenant de Prueba']);
    
    const tenant = tenantResult.rows[0];
    console.log(`✅ Tenant creado: ${tenant.id} - ${tenant.name}`);

    // 2. Crear usuario de prueba
    const userId = uuidv4();
    const userResult = await pool.query(`
      INSERT INTO "User" (id, authid, tenantid, email, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, authid, tenantid, email, created_at;
    `, [userId, `test_user_${userId}`, tenant.id, 'test@contab.com']);
    
    const user = userResult.rows[0];
    console.log(`✅ Usuario creado: ${user.id} - ${user.email} -> Tenant: ${user.tenantid}`);

    // 3. Crear empresa de prueba
    const companyId = uuidv4();
    const companyResult = await pool.query(`
      INSERT INTO companies (id, name, rtn, tenant_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, name, rtn, tenant_id, created_at;
    `, [companyId, 'Empresa de Prueba', '08011999012345', tenant.id]);
    
    const company = companyResult.rows[0];
    console.log(`✅ Empresa creada: ${company.id} - ${company.name} -> Tenant: ${company.tenant_id}`);

    // 4. Verificar que todo se creó correctamente
    console.log('\n🔍 Verificando creación...');
    
    const verifyUser = await pool.query(`
      SELECT u.id, u.email, t.name as tenant_name 
      FROM "User" u 
      JOIN tenants t ON u.tenantid = t.id 
      WHERE u.authid = $1
    `, [user.authid]);
    
    console.log(`✅ Verificación usuario: ${verifyUser.rows[0].email} en tenant: ${verifyUser.rows[0].tenant_name}`);

    const verifyCompany = await pool.query(`
      SELECT id, name, rtn, tenant_id 
      FROM companies 
      WHERE id = $1
    `, [company.id]);
    
    console.log(`✅ Verificación empresa: ${verifyCompany.rows[0].name} en tenant: ${verifyCompany.rows[0].tenant_id}`);

    console.log('\n🎯 ¡Datos de prueba creados exitosamente!');
    console.log('📧 Email de prueba: test@contab.com');
    console.log('🏢 Tenant ID:', tenant.id);
    console.log('👤 User ID:', user.id);
    console.log('🏢 Company ID:', company.id);
    
  } catch (err) {
    console.error('❌ Error creando datos de prueba:', err.message);
    console.error('Detalles del error:', err);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a PostgreSQL cerrada');
  }
}

createTestUserAndTenant();
