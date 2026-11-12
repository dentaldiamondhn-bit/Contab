const { Pool } = require('pg');
require('dotenv').config();

// Conexión directa a PostgreSQL usando DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUsersAndTenants() {
  try {
    console.log('👥 Verificando usuarios y tenants en la base de datos...\n');

    // Verificar usuarios en la tabla User
    console.log('📋 Verificando tabla User...');
    try {
      const userResult = await pool.query(`
        SELECT id, authid, tenantid, email, created_at 
        FROM "User" 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      
      console.log(`✅ Usuarios encontrados: ${userResult.rows.length}`);
      userResult.rows.forEach(user => {
        console.log(`👤 Usuario ${user.id}: ${user.email || 'sin email'} (authid: ${user.authid || 'sin authid'}) -> Tenant: ${user.tenantid || 'sin tenant'}`);
      });
    } catch (err) {
      console.error('❌ Error verificando usuarios:', err.message);
    }

    // Verificar si hay tabla de tenants
    console.log('\n📋 Verificando si existe tabla de tenants...');
    try {
      const tenantTableResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tenants'
        );
      `);
      
      const tenantsTableExists = tenantTableResult.rows[0].exists;
      console.log(tenantsTableExists ? '✅ Tabla tenants existe' : '❌ Tabla tenants NO existe');
      
      if (tenantsTableExists) {
        const tenantsResult = await pool.query(`
          SELECT id, name, created_at 
          FROM tenants 
          ORDER BY created_at DESC 
          LIMIT 5
        `);
        
        console.log(`✅ Tenants encontrados: ${tenantsResult.rows.length}`);
        tenantsResult.rows.forEach(tenant => {
          console.log(`🏢 Tenant ${tenant.id}: ${tenant.name || 'sin nombre'} (${tenant.created_at})`);
        });
      }
    } catch (err) {
      console.error('❌ Error verificando tabla tenants:', err.message);
    }

    // Verificar empresas existentes
    console.log('\n📋 Verificando empresas existentes...');
    try {
      const companiesResult = await pool.query(`
        SELECT id, name, rtn, tenant_id, created_at 
        FROM companies 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log(`✅ Empresas encontradas: ${companiesResult.rows.length}`);
      companiesResult.rows.forEach(company => {
        console.log(`🏢 Empresa ${company.id}: ${company.name || 'sin nombre'} (RTN: ${company.rtn || 'sin RTN'}) -> Tenant: ${company.tenant_id || 'sin tenant'} (${company.created_at})`);
      });
    } catch (err) {
      console.error('❌ Error verificando empresas:', err.message);
    }

    // Verificar si hay triggers o funciones problemáticas
    console.log('\n🔍 Verificando triggers y funciones...');
    try {
      // Verificar triggers en la tabla User
      const triggerResult = await pool.query(`
        SELECT trigger_name, event_manipulation_table, action_timing, action_condition, action_orientation, action_statement
        FROM information_schema.triggers 
        WHERE event_manipulation_table = 'User' 
        OR event_manipulation_table = 'companies'
        ORDER BY trigger_name
      `);
      
      console.log(`✅ Triggers encontrados: ${triggerResult.rows.length}`);
      triggerResult.rows.forEach(trigger => {
        console.log(`⚡ Trigger ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.action_orientation} ON ${trigger.event_manipulation_table}`);
      });
    } catch (err) {
      console.error('❌ Error verificando triggers:', err.message);
    }

    console.log('\n🎯 Verificación completada');
    
  } catch (err) {
    console.error('❌ Error general en verificación:', err.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a PostgreSQL cerrada');
  }
}

checkUsersAndTenants();
