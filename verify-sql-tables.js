const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

async function verifyTables() {
  try {
    console.log('🔍 Verificando tablas SQL en Supabase...\n');

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
      'polizas'
    ];

    for (const tableName of tables) {
      console.log(`📋 Verificando tabla: ${tableName}`);
      
      try {
        // Verificar si la tabla existe y obtener datos de muestra
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);
        
        if (tableError) {
          console.error(`❌ Error en tabla ${tableName}:`, tableError);
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

    // Verificar tablas específicas para facturas
    console.log('🧾 Verificando tablas de facturación específicas...');
    
    try {
      // Verificar facturas recientes
      const { data: recentInvoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (invoiceError) {
        console.error('❌ Error obteniendo facturas recientes:', invoiceError);
      } else {
        console.log(`✅ Facturas recientes: ${recentInvoices?.length || 0} encontradas`);
        if (recentInvoices && recentInvoices.length > 0) {
          console.log('📄 Última factura:', recentInvoices[0]);
        }
      }
    } catch (err) {
      console.error('❌ Error verificando facturas:', err.message);
    }

    // Verificar impuestos personalizados
    try {
      const { data: customTaxes, error: taxesError } = await supabase
        .from('CustomTaxes')
        .select('*')
        .limit(5);
      
      if (taxesError) {
        console.error('❌ Error obteniendo impuestos personalizados:', taxesError);
      } else {
        console.log(`✅ Impuestos personalizados: ${customTaxes?.length || 0} encontrados`);
        if (customTaxes && customTaxes.length > 0) {
          console.log('📄 Muestra de impuestos:', customTaxes);
        }
      }
    } catch (err) {
      console.error('❌ Error verificando impuestos:', err.message);
    }

    console.log('\n🎯 Verificación completada');
    
  } catch (err) {
    console.error('❌ Error general en verificación:', err.message);
  }
}

verifyTables();
