// Crear nuevo tenant
      const { data: newTenant, error: tenantError } = await supabase
        .from('Tenant')
        .insert([{
          business_name: data.companyData.name,
          business_rtn: data.companyData.rtn || '',
          business_email: data.companyData.email,
          business_address: data.companyData.address || '',
          tenant_code: generateTenantCode(data.companyData.name),
          subscription_plan: 'BASIC',
          max_users: 5,
          max_storage: 1000,
          max_transactions: 1000,
          monthly_cost: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
