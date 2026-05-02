const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAPIEndpoints() {
  try {
    console.log('🔄 Testing API endpoints...');
    
    // Test 1: Get all tenants
    console.log('\n📊 Testing GET /api/admin/tenants');
    try {
      const response = await fetch('http://localhost:3001/api/admin/tenants');
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ GET /api/admin/tenants successful');
        console.log('📊 Tenants found:', data.tenants?.length || 0);
        if (data.tenants && data.tenants.length > 0) {
          console.log('🏢 First tenant:', data.tenants[0].businessname || data.tenants[0].businessName);
        }
      } else {
        console.log('❌ GET /api/admin/tenants failed:', data.error);
      }
    } catch (error) {
      console.log('❌ GET /api/admin/tenants error:', error.message);
    }
    
    // Test 2: Get tenant users (need a tenant ID)
    console.log('\n👥 Testing GET /api/tenant/users');
    try {
      // First get a tenant to use its ID
      const { data: tenants } = await supabase
        .from('Tenant')
        .select('id')
        .limit(1);
      
      if (tenants && tenants.length > 0) {
        const tenantId = tenants[0].id;
        console.log(`🏢 Using tenant ID: ${tenantId}`);
        
        const response = await fetch(`http://localhost:3001/api/tenant/users?tenantId=${tenantId}`);
        const data = await response.json();
        
        if (response.ok) {
          console.log('✅ GET /api/tenant/users successful');
          console.log('👥 Users found:', data.users?.length || 0);
        } else {
          console.log('❌ GET /api/tenant/users failed:', data.error);
        }
      } else {
        console.log('⚠️  No tenants found to test users endpoint');
      }
    } catch (error) {
      console.log('❌ GET /api/tenant/users error:', error.message);
    }
    
    // Test 3: Direct Supabase connection
    console.log('\n🔍 Testing direct Supabase connection');
    try {
      const { data: tenants, error } = await supabase
        .from('Tenant')
        .select('*')
        .limit(5);
      
      if (error) {
        console.log('❌ Supabase connection error:', error);
      } else {
        console.log('✅ Supabase connection successful');
        console.log('📊 Tenants in database:', tenants?.length || 0);
        tenants?.forEach((tenant, index) => {
          console.log(`  ${index + 1}. ${tenant.businessname} (${tenant.tenant_code})`);
        });
      }
    } catch (error) {
      console.log('❌ Supabase connection error:', error.message);
    }
    
    console.log('\n🎉 API testing completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAPIEndpoints();
