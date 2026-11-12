"use server";

import { supabase, setTenantContext } from "@/lib/supabase-db";
import { auth } from "@clerk/nextjs/server";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  currency: string;
}

interface Tax {
  rate: number;
  type: string;
}

interface SalesConfig {
  caiEnabled: boolean;
  caiCode: string;
  caiType: 'auto_impresion' | 'imprenta';
  taxes: Tax[];
  invoicePrefix: string;
}

interface CompanyData {
  name: string;
  rtn: string;
  address: string;
  contactPhone: string;
  email: string;
  industry: string;
  country: string;
  clientPhone: string;
  companyPhone: string;
}

interface OnboardingData {
  companyData: CompanyData;
  bankAccounts: BankAccount[];
  salesConfig: SalesConfig;
  businessType: string;
}

export async function saveOnboardingData(data: OnboardingData) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("No autorizado");
    }

    // Obtener información del usuario desde Clerk
    const { sessionClaims } = await auth();
    const userEmail = sessionClaims?.email || '';
    
    // Buscar tenant del usuario
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('tenantid')
      .eq('authId', userId)
      .single();

    if (userError || !userData) {
      throw new Error("Usuario no encontrado o sin tenant");
    }

    const tenantId = userData.tenantid;
    
    // Configurar contexto de tenant para RLS
    await setTenantContext(tenantId);

    // Create company usando Supabase
    const { data: companyResult, error: companyError } = await supabase
      .from('companies')
      .insert([{
        tenant_id: tenantId,
        name: data.companyData.name,
        business_type: data.businessType,
        rtn: data.companyData.rtn,
        address: data.companyData.address,
        contact_phone: data.companyData.contactPhone,
        client_phone: data.companyData.clientPhone,
        company_phone: data.companyData.companyPhone,
        email: data.companyData.email,
        industry: data.companyData.industry,
        country: data.companyData.country || 'Honduras',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (companyError || !companyResult) {
      console.error("Error creating company:", companyError);
      throw new Error("Failed to create company");
    }

    const companyId = companyResult.id;

    // Save bank accounts a company_bank_accounts
    for (const account of data.bankAccounts) {
      const { error: bankError } = await supabase
        .from('company_bank_accounts')
        .insert([{
          company_id: companyId,
          bank_name: account.bankName,
          account_number: account.accountNumber,
          account_type: account.accountType,
          currency: account.currency,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (bankError) {
        console.error("Error saving bank account:", bankError);
      }
    }

    // Save sales configuration
    const primaryTax = data.salesConfig.taxes[0];
    const { error: salesError } = await supabase
      .from('sales_configuration')
      .insert([{
        company_id: companyId,
        cai_enabled: data.salesConfig.caiEnabled,
        cai_type: data.salesConfig.caiType,
        cai_code: data.salesConfig.caiCode,
        tax_rate: primaryTax?.rate || 15,
        invoice_prefix: data.salesConfig.invoicePrefix,
        current_invoice_number: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (salesError) {
      console.error("Error saving sales config:", salesError);
    }

    // Also save to onboarding_companies for reference
    const { error: onboardError } = await supabase
      .from('onboarding_companies')
      .insert([{
        user_id: userId,
        company_name: data.companyData.name,
        rtn: data.companyData.rtn,
        address: data.companyData.address,
        contact_phone: data.companyData.contactPhone,
        client_phone: data.companyData.clientPhone,
        company_phone: data.companyData.companyPhone,
        country: data.companyData.country,
        email: data.companyData.email,
        industry: data.companyData.industry,
        business_type: data.businessType,
        setup_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (onboardError) {
      console.error("Error saving onboarding reference:", onboardError);
    }

    // Crear catálogo de cuentas por defecto
    try {
      await createDefaultChartOfAccounts(companyId);
    } catch (chartError) {
      console.error("Error creating chart of accounts:", chartError);
      // No fallar el proceso si el catálogo falla
    }

    console.log(`✅ Onboarding completado para tenant ${tenantId}, company ${companyId}`);
    
    return { success: true, companyId, tenantId };
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    throw new Error("Failed to save onboarding data");
  }
}

// Función para crear catálogo de cuentas por defecto
async function createDefaultChartOfAccounts(companyId: string) {
  try {
    // Configurar contexto
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('tenant_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error("Company not found");
    }

    await setTenantContext(company.tenant_id);

    // Insertar cuentas por defecto (estructura simplificada)
    const defaultAccounts = [
      // ACTIVOS
      { code: '11', name: 'Activo Corriente', type: 'ASSET', is_default: true },
      { code: '1101', name: 'Caja y Bancos', type: 'ASSET', is_default: true },
      { code: '110101', name: 'Caja General', type: 'ASSET', is_default: true },
      { code: '110102', name: 'Bancos', type: 'ASSET', is_default: true },
      { code: '1102', name: 'Cuentas por Cobrar', type: 'ASSET', is_default: true },
      { code: '110201', name: 'Clientes Locales', type: 'ASSET', is_default: true },
      
      // PASIVOS
      { code: '21', name: 'Pasivo Corriente', type: 'LIABILITY', is_default: true },
      { code: '2101', name: 'Cuentas por Pagar Comerciales', type: 'LIABILITY', is_default: true },
      { code: '210101', name: 'Proveedores Locales', type: 'LIABILITY', is_default: true },
      { code: '2102', name: 'Obligaciones Fiscales (SAR)', type: 'LIABILITY', is_default: true },
      { code: '210201', name: 'ISV 15% por Pagar', type: 'LIABILITY', is_default: true },
      
      // PATRIMONIO
      { code: '3', name: 'Patrimonio', type: 'EQUITY', is_default: true },
      { code: '31', name: 'Capital Social', type: 'EQUITY', is_default: true },
      { code: '3101', name: 'Capital Pagado', type: 'EQUITY', is_default: true },
      
      // INGRESOS
      { code: '4', name: 'Ingresos', type: 'REVENUE', is_default: true },
      { code: '41', name: 'Ingresos Operativos', type: 'REVENUE', is_default: true },
      { code: '4101', name: 'Prestación de Servicios', type: 'REVENUE', is_default: true },
      
      // GASTOS
      { code: '5', name: 'Gastos', type: 'EXPENSE', is_default: true },
      { code: '51', name: 'Gastos de Operación', type: 'EXPENSE', is_default: true },
      { code: '5101', name: 'Gastos de Personal', type: 'EXPENSE', is_default: true },
      { code: '510101', name: 'Sueldos y Salarios', type: 'EXPENSE', is_default: true }
    ];

    for (const account of defaultAccounts) {
      const { error } = await supabase
        .from('chart_of_accounts')
        .insert([{
          company_id: companyId,
          code: account.code,
          name: account.name,
          type: account.type,
          is_default: account.is_default,
          is_active: true,
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) {
        console.error(`Error inserting account ${account.code}:`, error);
      }
    }

    console.log(`✅ Catálogo de cuentas creado para company ${companyId}`);
  } catch (error) {
    console.error("Error creating default chart of accounts:", error);
    throw error;
  }
}

// Función para verificar estado del onboarding
export async function getOnboardingStatus() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: 'not_authenticated' };
    }

    // Buscar si tiene onboarding completado
    const { data: onboardData, error } = await supabase
      .from('onboarding_companies')
      .select('setup_completed, created_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return { status: 'not_started' };
    }

    if (error) {
      throw new Error("Error checking onboarding status");
    }

    return {
      status: onboardData?.setup_completed ? 'completed' : 'in_progress',
      completedAt: onboardData?.created_at
    };
  } catch (error) {
    console.error("Error getting onboarding status:", error);
    return { status: 'error' };
  }
}
