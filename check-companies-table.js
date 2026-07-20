const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

async function checkTable() {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error checking table:', error);
      return;
    }
    
    console.log('Sample company data:', data);
    console.log('Available columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data');
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

checkTable();
