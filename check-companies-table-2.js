const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

async function checkTable() {
  try {
    // Verificar si la tabla companies existe
    const { data: tableInfo, error: tableError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking companies table:', tableError);
      return;
    }
    
    console.log('Companies table exists, sample data:', tableInfo);
    
    // Obtener información de la tabla
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'companies' });
    
    if (columnsError) {
      console.error('Error getting columns:', columnsError);
    } else {
      console.log('Companies table columns:', columns);
    }
    
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

checkTable();
