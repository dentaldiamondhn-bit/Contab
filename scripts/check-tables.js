const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  try {
    console.log('🔍 Checking table structures...');
    
    // Verificar estructura de la tabla User
    const { data: userColumns, error: userError } = await supabase
      .from('User')
      .select('*')
      .limit(1);
    
    if (userError && userError.code === 'PGRST116') {
      console.log('❌ User table does not exist');
    } else if (userError) {
      console.log('❌ User table error:', userError);
    } else if (userColumns && userColumns.length > 0) {
      console.log('✅ User table columns:', Object.keys(userColumns[0]));
    }
    
    // Verificar estructura de la tabla Tenant
    const { data: tenantColumns, error: tenantError } = await supabase
      .from('Tenant')
      .select('*')
      .limit(1);
    
    if (tenantError && tenantError.code === 'PGRST116') {
      console.log('❌ Tenant table does not exist');
    } else if (tenantError) {
      console.log('❌ Tenant table error:', tenantError);
    } else if (tenantColumns && tenantColumns.length > 0) {
      console.log('✅ Tenant table columns:', Object.keys(tenantColumns[0]));
    }
    
    // Verificar tabla Account
    const { data: accountColumns, error: accountError } = await supabase
      .from('Account')
      .select('*')
      .limit(1);
    
    if (accountError && accountError.code === 'PGRST116') {
      console.log('❌ Account table does not exist');
    } else if (accountError) {
      console.log('❌ Account table error:', accountError);
    } else if (accountColumns && accountColumns.length > 0) {
      console.log('✅ Account table columns:', Object.keys(accountColumns[0]));
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  }
}

checkTables();
