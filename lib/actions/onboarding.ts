"use server";

import { supabase, setTenantContext } from "@/lib/supabase-db";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

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

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  maxUsers: number;
  features: string[];
  isActive: boolean;
}

interface OnboardingData {
  companyData: CompanyData;
  bankAccounts: BankAccount[];
  salesConfig: SalesConfig;
  businessType: string;
  selectedPlan: Plan | null;
}

interface OnboardingResult {
  success: boolean;
  companyId?: string;
  tenantId?: string;
  error?: string;
}

// Helper function to generate tenant codes
function generateTenantCode(businessName: string): string {
  // Handle empty or null business name
  if (!businessName || businessName.trim() === '') {
    return `TENANT-${Date.now()}`;
  }
  
  // Clean and validate business name
  const cleanName = businessName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6); // 6 caracteres del nombre
  
  // Generate random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase(); // 2 caracteres aleatorios
  const code = `${cleanName}${randomSuffix}`; // Total: 8 caracteres (dentro del límite de 10)
  
  // Final validation - ensure we have a valid code
  if (!code || code.length === 0) {
    return `TENANT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }
  
  console.log('🔧 Generated tenant code:', code);
  console.log('🔧 Business name for code:', businessName);
  console.log('🔧 Clean name portion:', cleanName);
  console.log('🔧 Random suffix:', randomSuffix);
  return code;
}

export async function saveOnboardingData(data: OnboardingData): Promise<OnboardingResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }
    
    console.log('🔍 Iniciando onboarding para userId:', userId);

    // Obtener información del usuario desde Clerk
    const { sessionClaims } = await auth();
    const user = await currentUser();
    
    // Get user data from currentUser API
    const userEmail = user?.primaryEmailAddress?.emailAddress || 
                     sessionClaims?.email || 
                     '';
                     
    const userFirstName = user?.firstName || 
                         sessionClaims?.firstName || 
                         '';
                         
    const userLastName = user?.lastName || 
                        sessionClaims?.lastName || 
                        '';
    
    console.log('📊 Clerk user data:', { 
      userId, 
      userEmail, 
      userFirstName, 
      userLastName,
      hasSessionClaims: !!sessionClaims,
      hasUser: !!user,
      userObject: user
    });
    
    // Buscar tenant del usuario
    let userData, userError;
    
    try {
      const result = await supabase
        .from('User')
        .select('tenantid')
        .eq('authid', userId)
        .single();
      
      userData = result.data;
      userError = result.error;
    } catch (err) {
      userError = err;
    }

    // Si el usuario no existe, crearlo
    if (userError && typeof userError === 'object' && 'code' in userError && userError.code === 'PGRST116') {
      console.log('🔄 Usuario no encontrado, creando nuevo usuario y tenant...');
      console.log('📊 Datos para crear:', { userEmail, userFirstName, userLastName, companyName: data.companyData.name });
      
      // Crear nuevo tenant
      const tenantId = generateTenantCode(data.companyData.name);
      const uniqueRtn = data.companyData.rtn ? `${data.companyData.rtn}-${Date.now()}` : `TEMP-${tenantId}-${Date.now()}`;
      const uniqueEmail = data.companyData.email ? `${data.companyData.email.split('@')[0]}+${tenantId}@${data.companyData.email.split('@')[1]}` : `admin+${tenantId}@temp.com`;
      const tenantData = {
        id: tenantId,
        // REQUIRED camelCase columns
        businessname: data.companyData.name,
        businessrtn: uniqueRtn,
        businessemail: uniqueEmail,
        businessaddress: data.companyData.address || '',
        country: 'HN',
        timezone: 'America/Tegucigalpa',
        currency: 'HNL',
        subscriptionplan: 'BASIC',
        maxusers: 5,
        maxstorage: 1000,
        maxtransactions: 1000,
        monthlycost: 0,
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
        // REQUIRED snake_case columns
        business_name: data.companyData.name,
        business_address: data.companyData.address || '',
        subscription_plan: 'BASIC',
        max_users: 5,
        is_active: true,
        // OPTIONAL columns
        tenant_code: tenantId,
        business_rtn: uniqueRtn,
        business_email: uniqueEmail,
        max_storage: 1000,
        max_transactions: 1000,
        monthly_cost: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        logo_url: null,
        phone_number: '',
        modules: 'basic'
      };
      
      console.log('📊 Tenant data to insert:', JSON.stringify(tenantData, null, 2));
      
      // Use simple insert (creating new tenant)
      const { data: newTenant, error: tenantError } = await supabase
        .from('Tenant')
        .insert([tenantData])
        .select()
        .single();

      if (tenantError || !newTenant) {
        console.error('❌ Error creando tenant:', tenantError);
        console.error('❌ Tenant error details:', JSON.stringify(tenantError, null, 2));
        throw new Error(`Error creando tenant: ${tenantError?.message || 'Unknown error'}`);
      }

      // Crear usuario asociado al tenant
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('temp-password', 10);

      const userInsertData = {
        id: randomUUID(),
        tenantid: newTenant.id,
        email: userEmail,
        passwordhash: passwordHash,
        firstname: userFirstName || 'Usuario',
        lastname: userLastName || 'Nuevo',
        role: 'ADMIN',
        isactive: true,
        authid: userId
      };
      
      console.log('📝 Datos a insertar en User:', JSON.stringify(userInsertData, null, 2));

      // Actualizar metadata en Clerk
      try {
        console.log('🔄 Actualizando metadata en Clerk...');
        const clerk = await clerkClient();
        await clerk.users.updateUser(userId, {
          publicMetadata: {
            role: 'ADMIN',
            tenantId: newTenant.id,
            tenantCode: newTenant.id,
            permissions: ['admin', 'tenant_admin'],
            isolation: {
              tenantId: newTenant.id,
              mode: 'strict'
            }
          },
          privateMetadata: {
            onboardingCompleted: true,
            tenantId: newTenant.id,
            companyId: null // Se actualizará después
          }
        });
        console.log('✅ Metadata de Clerk actualizada exitosamente');
      } catch (clerkError) {
        console.error('⚠️ Error actualizando metadata en Clerk:', clerkError);
        // No fallamos el onboarding si Clerk falla, pero logueamos el error
      }

      const { data: newUser, error: createUserError } = await supabase
        .from('User')
        .insert([userInsertData])
        .select()
        .single();

      if (createUserError || !newUser) {
        console.error('❌ Error creando usuario:', createUserError);
        console.error('❌ Error details:', JSON.stringify(createUserError, null, 2));
        throw new Error(`Error creando usuario: ${createUserError?.message || 'Unknown error'}`);
      }

      userData = { tenantid: newTenant.id };
      console.log('✅ Usuario creado exitosamente');
      console.log('📊 User data returned:', JSON.stringify(newUser, null, 2));
      
    } else if (userError) {
      console.error('❌ Error verificando usuario existente:', userError);
      throw new Error("Error verificando usuario existente");
    } else {
      console.log('✅ Usuario existente encontrado:', userData);
      console.log('🔄 Creando nuevo tenant para usuario existente...');
      
      // Crear nuevo tenant para usuario existente
      const tenantId = generateTenantCode(data.companyData.name);
      const uniqueRtn = data.companyData.rtn ? `${data.companyData.rtn}-${Date.now()}` : `TEMP-${tenantId}-${Date.now()}`;
      const uniqueEmail = data.companyData.email ? `${data.companyData.email.split('@')[0]}+${tenantId}@${data.companyData.email.split('@')[1]}` : `admin+${tenantId}@temp.com`;
      const tenantData = {
        id: tenantId,
        // REQUIRED camelCase columns
        businessname: data.companyData.name,
        businessrtn: uniqueRtn,
        businessemail: uniqueEmail,
        businessaddress: data.companyData.address || '',
        country: 'HN',
        timezone: 'America/Tegucigalpa',
        currency: 'HNL',
        subscriptionplan: 'BASIC',
        maxusers: 5,
        maxstorage: 1000,
        maxtransactions: 1000,
        monthlycost: 0,
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
        // REQUIRED snake_case columns
        business_name: data.companyData.name,
        business_address: data.companyData.address || '',
        subscription_plan: 'BASIC',
        max_users: 5,
        is_active: true,
        // OPTIONAL columns
        tenant_code: tenantId,
        business_rtn: uniqueRtn,
        business_email: uniqueEmail,
        max_storage: 1000,
        max_transactions: 1000,
        monthly_cost: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        logo_url: null,
        phone_number: '',
        modules: 'basic'
      };
      
      console.log('📊 Tenant data to insert (existing user):', JSON.stringify(tenantData, null, 2));
      console.log('🔧 Generated Tenant ID:', tenantId);
      console.log('🔧 Company Name:', data.companyData.name);
      
      // Use simple insert (creating new tenant)
      const { data: newTenant, error: tenantError } = await supabase
        .from('Tenant')
        .insert([tenantData])
        .select()
        .single();

      if (tenantError || !newTenant) {
        console.error('❌ Error creando tenant para usuario existente:', tenantError);
        console.error('❌ Tenant error details:', JSON.stringify(tenantError, null, 2));
        throw new Error(`Error creando tenant para usuario existente: ${tenantError?.message || 'Unknown error'}`);
      }

      // Actualizar usuario con nuevo tenant
      const { error: updateUserError } = await supabase
        .from('User')
        .update({ tenantid: newTenant.id })
        .eq('authid', userId);

      if (updateUserError) {
        console.error('❌ Error actualizando usuario con nuevo tenant:', updateUserError);
        throw new Error("Error actualizando usuario con nuevo tenant");
      }

      userData = { tenantid: newTenant.id };
      console.log('✅ Nuevo tenant creado y usuario actualizado exitosamente');
      console.log('📊 Nuevo Tenant ID:', newTenant.id);

      // Actualizar metadata en Clerk para usuario existente
      try {
        console.log('🔄 Actualizando metadata en Clerk (usuario existente)...');
        const clerk = await clerkClient();
        await clerk.users.updateUser(userId, {
          publicMetadata: {
            role: 'ADMIN',
            tenantId: newTenant.id,
            tenantCode: newTenant.id,
            permissions: ['admin', 'tenant_admin'],
            isolation: {
              tenantId: newTenant.id,
              mode: 'strict'
            }
          },
          privateMetadata: {
            onboardingCompleted: true,
            tenantId: newTenant.id,
            companyId: null // Se actualizará después
          }
        });
        console.log('✅ Metadata de Clerk actualizada para usuario existente');
      } catch (clerkError) {
        console.error('⚠️ Error actualizando metadata en Clerk:', clerkError);
      }
    }

    const tenantId = userData?.tenantid;
    
    if (!tenantId) {
      console.error('❌ No se pudo obtener el tenant ID del usuario');
      throw new Error("No se pudo obtener el tenant ID del usuario");
    }
    
    console.log('📊 Trabajando con tenant ID:', tenantId);
    
    // Configurar contexto de tenant para RLS
    await setTenantContext(tenantId);

    // Verify tenant exists before creating company
    const { data: tenantCheck, error: tenantCheckError } = await supabase
      .from('Tenant')
      .select('id')
      .eq('id', tenantId)
      .single();
    
    if (tenantCheckError || !tenantCheck) {
      console.error('❌ Tenant verification failed:', tenantCheckError);
      console.error('❌ Tenant ID not found in database:', tenantId);
      throw new Error(`Tenant ID ${tenantId} not found in database`);
    }
    
    console.log('✅ Tenant verified in database:', tenantCheck.id);

    // Create company usando Supabase
    console.log('🔄 Creando company con datos:', {
      tenant_id: tenantId,
      name: data.companyData.name,
      business_type: data.businessType,
      rtn: data.companyData.rtn,
      email: data.companyData.email,
      industry: data.companyData.industry
    });

    const { data: companyResult, error: companyError } = await supabase
      .from('companies')
      .insert([{
        id: randomUUID(),
        tenant_id: tenantId,
        name: data.companyData.name,
        business_type: data.businessType,
        rtn: data.companyData.rtn,
        email: data.companyData.email,
        address: data.companyData.address,
        industry: data.companyData.industry,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (companyError || !companyResult) {
      console.error("❌ Error creating company:", companyError);
      console.error("❌ Company error details:", JSON.stringify(companyError, null, 2));
      console.error("❌ Missing column message:", companyError?.message);
      throw new Error(`Failed to create company: ${companyError?.message || 'Unknown error'}`);
    }

    const companyId = companyResult.id;
    console.log('✅ Company creada exitosamente:', {
      id: companyId,
      name: companyResult.name,
      tenant_id: companyResult.tenant_id
    });

    // Actualizar metadata de Clerk con companyId
    try {
      console.log('🔄 Actualizando Clerk metadata con companyId...');
      const clerk = await clerkClient();
      await clerk.users.updateUser(userId, {
        privateMetadata: {
          onboardingCompleted: true,
          tenantId: tenantId,
          companyId: companyId
        }
      });
      console.log('✅ Clerk metadata actualizada con companyId');
    } catch (clerkError) {
      console.error('⚠️ Error actualizando Clerk metadata:', clerkError);
    }

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

    // Save sales configuration (solo columnas que existen)
    const primaryTax = data.salesConfig.taxes[0];
    const { error: salesError } = await supabase
      .from('sales_configuration')
      .insert([{
        company_id: companyId,
        cai_enabled: data.salesConfig.caiEnabled,
        tax_rate: primaryTax?.rate || 15,
        invoice_prefix: data.salesConfig.invoicePrefix,
        current_invoice_number: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (salesError) {
      console.error("Error saving sales config:", salesError);
    }

    // Validate that a plan is selected
    if (!data.selectedPlan) {
      throw new Error("Debes seleccionar un plan para continuar");
    }

    // Save selected plan to tenant or company
    const { error: planError } = await supabase
      .from('tenant_plans')
      .insert([{
        tenant_id: tenantId,
        plan_id: data.selectedPlan.id,
        plan_code: data.selectedPlan.code,
        plan_name: data.selectedPlan.name,
        unit_price: data.selectedPlan.unitPrice,
        subtotal: data.selectedPlan.subtotal,
        tax_rate: data.selectedPlan.taxRate,
        tax_amount: data.selectedPlan.taxAmount,
        total: data.selectedPlan.total,
        max_users: data.selectedPlan.maxUsers,
        features: data.selectedPlan.features,
        is_active: true,
        start_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (planError) {
      console.error("Error saving plan:", planError);
      throw new Error("Failed to save selected plan");
    }

    // Also save to onboarding_companies for reference
    console.log('🔄 Guardando en onboarding_companies con datos:', {
      user_id: userId,
      company_name: data.companyData.name,
      rtn: data.companyData.rtn,
      email: data.companyData.email,
      business_type: data.businessType
    });

    const { error: onboardError } = await supabase
      .from('onboarding_companies')
      .insert([{
        user_id: userId,
        company_name: data.companyData.name,
        rtn: data.companyData.rtn,
        address: data.companyData.address,
        email: data.companyData.email,
        industry: data.companyData.industry,
        business_type: data.businessType,
        setup_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (onboardError) {
      console.error("❌ Error saving onboarding reference:", onboardError);
    } else {
      console.log('✅ Onboarding_companies guardado exitosamente');
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
    // No lanzar error para permitir que el usuario continúe al dashboard
    console.log("⚠️ Continuando al dashboard a pesar del error en onboarding");
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
