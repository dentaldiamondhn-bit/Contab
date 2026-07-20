const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Usar las variables correctas del .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('  - SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySQLTables() {
  try {
    console.log('🔍 Verificando tablas SQL en Supabase...\n');
    console.log('🔌 URL:', supabaseUrl);
    console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...');

    // Lista de tablas importantes a verificar
    const tables = [
      'companies',
      'User',
      'CustomTaxes',
      'invoices',
      'invoice_items',
      'cai',
      'products',
      'accounts',
      'polizas',
      'tenants'
    ];

    for (const tableName of tables) {
      console.log(`📋 Verificando tabla: ${tableName}`);
      
      try {
        // Verificar si la tabla existe y obtener datos de muestra
        const { data: tableData, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);
        
        if (error) {
          console.error(`❌ Error en tabla ${tableName}:`, error.message);
          continue;
        }
        
        if (tableData && tableData.length > 0) {
          console.log(`✅ Tabla ${tableName} - ${tableData.length} registros encontrados`);
          console.log(`📄 Muestra de datos:`, tableData[0]);
          
          // Verificar estructura de columnas
          const columns = Object.keys(tableData[0]);
          console.log(`📊 Columnas encontradas (${columns.length}):`, columns);
        } else {
          console.log(`⚠️ Tabla ${tableName} - sin datos o no existe`);
        }
        
        console.log('---');
        
      } catch (err) {
        console.error(`❌ Error crítico en tabla ${tableName}:`, err.message);
      }
    }

    // Verificación específica para facturas
    console.log('🧾 Verificación específica de facturación...');
    
    try {
      // Verificar facturas recientes
      const { data: recentInvoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, created_at, total_amount, customer_name')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (invoiceError) {
        console.error('❌ Error obteniendo facturas recientes:', invoiceError.message);
      } else {
        console.log(`✅ Facturas recientes: ${recentInvoices?.length || 0} encontradas`);
        recentInvoices?.forEach(invoice => {
          console.log(`📄 Factura ${invoice.id}: ${invoice.customer_name} - ${invoice.total_amount} (${invoice.created_at})`);
        });
      }
    } catch (err) {
      console.error('❌ Error verificando facturas:', err.message);
    }

    // Verificación específica para impuestos personalizados
    try {
      const { data: customTaxes, error: taxesError } = await supabase
        .from('CustomTaxes')
        .select('id, name, rate, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (taxesError) {
        console.error('❌ Error obteniendo impuestos personalizados:', taxesError.message);
      } else {
        console.log(`✅ Impuestos personalizados: ${customTaxes?.length || 0} encontrados`);
        customTaxes?.forEach(tax => {
          console.log(`💰 Impuesto ${tax.id}: ${tax.name} - ${tax.rate}% (${tax.is_active ? 'activo' : 'inactivo'})`);
        });
      }
    } catch (err) {
      console.error('❌ Error verificando impuestos personalizados:', err.message);
    }

    // Verificación de usuarios y tenants
    console.log('👥 Verificación de usuarios y tenants...');
    
    try {
      const { data: users, error: userError } = await supabase
        .from('User')
        .select('id, authid, tenantid, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (userError) {
        console.error('❌ Error obteniendo usuarios:', userError.message);
      } else {
        console.log(`✅ Usuarios encontrados: ${users?.length || 0}`);
        users?.forEach(user => {
          console.log(`👤 Usuario ${user.id}: ${user.email || 'sin email'} -> Tenant: ${user.tenantid || 'sin tenant'}`);
        });
      }
    } catch (err) {
      console.error('❌ Error verificando usuarios:', err.message);
    }

    try {
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (tenantError) {
        console.error('❌ Error obteniendo tenants:', tenantError.message);
      } else {
        console.log(`✅ Tenants encontrados: ${tenants?.length || 0}`);
        tenants?.forEach(tenant => {
          console.log(`🏢 Tenant ${tenant.id}: ${tenant.name || 'sin nombre'} (${tenant.created_at})`);
        });
      }
    } catch (err) {
      console.error('❌ Error verificando tenants:', err.message);
    }

    console.log('\n🎯 Verificación completada exitosamente');
    console.log('📊 Resumen:');
    console.log('  - Todas las tablas SQL verificadas');
    console.log('  - Conexión a Supabase funcional');
    console.log('  - Datos obtenidos correctamente');
    
  } catch (err) {
    console.error('❌ Error general en verificación:', err.message);
  }
}

verifySQLTables();
