"use server";

import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

function generateTenantCode(name: string): string {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}-${random}`;
}

interface CompanyData {
  name: string;
  rtn?: string;
  email: string;
  address?: string;
}

// Crear nuevo tenant
export async function createTenant(data: CompanyData) {
  const { data: newTenant, error: tenantError } = await supabase
    .from('Tenant')
    .insert([{
      business_name: data.name,
      business_rtn: data.rtn || '',
      business_email: data.email,
      business_address: data.address || '',
      tenant_code: generateTenantCode(data.name),
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

  if (tenantError) {
    throw tenantError;
  }

  return newTenant;
}
