const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Usar el API REST de Supabase directamente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySupabaseAPI() {
  try {
    console.log('🔍 Verificando tablas SQL via API REST de Supabase...\n');

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
          console.error(`❌ Error en tabla ${tableName}:`, error);
          continue;
        }
        
        if (tableData && tableData.length > 0) {
          console.log(`✅ Tabla ${tableName} - ${tableData.length} registros encontrados`);
          console.log(`📄 Muestra de datos:`, tableData[0]);
          
          // Verificar estructura de columnas
          const columns = Object.keys(tableData[0]);
          console.log(`📊 Columnas encontradas:`, columns);
        } else {
          console.log(`⚠️ Tabla ${tableName} - sin datos o no existe`);
        }
        
        console.log('---');
        
      } catch (err) {
        console.error(`❌ Error crítico en tabla ${tableName}:`, err.message);
      }
    }

    // Verificar tablas específicas para facturación
    console.log('🧾 Verificación específica de facturación...');
    
    try {
      // Verificar facturas recientes
      const { data: recentInvoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, created_at, total_amount, customer_name')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (invoiceError) {
        console.error('❌ Error obteniendo facturas recientes:', invoiceError);
      } else {
        console.log(`✅ Facturas recientes: ${recentInvoices?.length || 0} encontradas`);
        recentInvoices?.forEach(invoice => {
          console.log(`📄 Factura ${invoice.id}: ${invoice.customer_name} - ${invoice.total_amount} (${invoice.created_at})`);
        });
      }
    } catch (err) {
      console.error('❌ Error verificando facturas:', err.message);
    }

    // Verificar impuestos personalizados
    try {
      const { data: customTaxes, error: taxesError } = await supabase
        .from('CustomTaxes')
        .select('id, name, rate, is_active')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (taxesError) {
        console.error('❌ Error obteniendo impuestos personalizados:', taxesError);
      } else {
        console.log(`✅ Impuestos personalizados: ${customTaxes?.length || 0} encontrados`);
        customTaxes?.forEach(tax => {
          console.log(`💰 Impuesto ${tax.id}: ${tax.name} - ${tax.rate}% (${tax.is_active ? 'activo' : 'inactivo'})`);
        });
      }
    } catch (err) {
      console.error('❌ Error verificando impuestos personalizados:', err.message);
    }

    console.log('\n🎯 Verificación completada exitosamente');
    console.log('📌 URL de Supabase:', supabaseUrl);
    console.log('🔑 Key usada:', supabaseKey.includes('service') ? 'SERVICE_ROLE_KEY' : 'ANON_KEY');
    
  } catch (err) {
    console.error('❌ Error general en verificación:', err.message);
  }
}

verifySupabaseAPI();
