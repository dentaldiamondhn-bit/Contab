const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

console.log('🔍 Probando API de Tenants...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTenantsAPI() {
  try {
    console.log('\n📊 1. Verificando tabla tenants...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*');
    
    if (tenantsError) {
      console.error('❌ Error en tenants:', tenantsError);
      return;
    }
    
    console.log('✅ Tenants encontrados:', tenants?.length || 0);
    if (tenants && tenants.length > 0) {
      console.log('📋 Datos de tenants:', JSON.stringify(tenants, null, 2));
    }

    console.log('\n🏢 2. Verificando tabla companies...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');
    
    if (companiesError) {
      console.error('❌ Error en companies:', companiesError);
      return;
    }
    
    console.log('✅ Companies encontrados:', companies?.length || 0);
    if (companies && companies.length > 0) {
      console.log('📋 Datos de companies:', JSON.stringify(companies, null, 2));
    }

    console.log('\n🔗 3. Combinando datos...');
    if (tenants && companies) {
      const enrichedTenants = tenants.map(tenant => {
        const company = companies.find(c => c.tenant_id === tenant.id);
        return {
          id: tenant.id,
          businessName: company?.name || tenant.name,
          businessRTN: company?.rtn || '',
          businessEmail: company?.email || '',
          businessAddress: company?.address || '',
          phoneNumber: company?.phone || company?.contact_phone || '',
          tenantCode: tenant.id,
          industry: company?.industry || '',
          maxUsers: company?.total_units || 5,
        };
      });

      console.log('✅ Tenants enriquecidos:', enrichedTenants.length);
      console.log('📋 Datos combinados:', JSON.stringify(enrichedTenants, null, 2));
    }

    console.log('\n🌐 4. Probando endpoint /api/tenants-api...');
    try {
      const response = await fetch('http://localhost:3000/api/tenants-api');
      console.log('✅ Status API:', response.status);
      console.log('📋 Headers:', response.headers.get('content-type'));
      
      const responseText = await response.text();
      console.log('📋 Respuesta raw:', responseText.substring(0, 500));
      
      if (response.headers.get('content-type')?.includes('application/json')) {
        const apiData = JSON.parse(responseText);
        console.log('📋 Respuesta JSON:', JSON.stringify(apiData, null, 2));
      } else {
        console.log('❌ La respuesta no es JSON, es HTML');
      }
    } catch (fetchError) {
      console.error('❌ Error en fetch:', fetchError.message);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testTenantsAPI();
