const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use Supabase REST API with SERVICE_ROLE_KEY
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

async function createTablesViaAPI() {
  try {
    console.log('🚀 Creating tables via Supabase REST API...\n');

    // 1. Verify API connection
    console.log('📋 Verifying API connection...');
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ API connection error:', error.message);
        return;
      }
      
      console.log('✅ API connection established');
    } catch (err) {
      console.error('❌ Critical connection error:', err.message);
      return;
    }

    // 2. Try to create tables using direct SQL via API
    console.log('\n🏗️ Creating tables via direct SQL...');

    // Tenants table
    try {
      const { data, error } = await supabase
        .rpc('create_table_if_not_exists', {
          table_name: 'tenants',
          table_definition: `
            CREATE TABLE IF NOT EXISTS tenants (
              id VARCHAR(255) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });
      
      if (error) {
        console.log('⚠️ Could not create tenants table via RPC:', error.message);
      } else {
        console.log('✅ Tenants table created via RPC');
      }
    } catch (err) {
      console.log('⚠️ Error creating tenants table:', err.message);
    }

    // 3. Insert test data if possible
    console.log('\n📝 Attempting to insert test data...');

    // Insert tenant
    try {
      const { data, error } = await supabase
        .from('tenants')
        .upsert({
          id: 'DENTALWD',
          name: 'Dental Diamond',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        console.log('⚠️ Error inserting tenant:', error.message);
      } else {
        console.log('✅ Tenant inserted:', data);
      }
    } catch (err) {
      console.log('⚠️ Error inserting tenant:', err.message);
    }

    // 4. Verify existing tables
    console.log('\n🔍 Final table verification...');
    const tablesToCheck = ['tenants', 'invoices', 'invoice_items', 'products', 'accounts', 'polizas'];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.message.includes('Could not find the table')) {
            console.log(`❌ ${tableName}: Table does not exist`);
          } else {
            console.log(`⚠️ ${tableName}: ${error.message}`);
          }
        } else {
          console.log(`✅ ${tableName}: Table exists and works`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }

    // 5. Report status if tables don't exist
    console.log('\n🔄 Analyzing table status...');
    
    // 6. Provide recommendations
    console.log('\n💡 Recommendations:');
    console.log('1. Missing tables need to be created manually in Supabase Dashboard');
    console.log('2. Check RLS settings if access is denied');

    console.log('\n🎯 Analysis completed!');
    console.log('📌 Current status:');
    console.log('  - ✅ API connection functional');
    console.log('  - ❌ Missing tables identified');
    
  } catch (err) {
    console.error('❌ Error general:', err.message);
  }
}

createTablesViaAPI();
