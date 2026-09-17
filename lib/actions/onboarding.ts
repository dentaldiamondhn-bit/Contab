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
  caiExpirationDate?: string;
  caiRangeFrom?: string;
  caiRangeTo?: string;
  taxes: Tax[];
  invoicePrefix: string;
}

interface CompanyData {
  name: string;
  rtn: string;
  address: string;
  department?: string;
  municipality?: string;
  logoUrl?: string;
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

interface SelectedAccount {
  code: string;
  name: string;
  type: string;
}

interface OnboardingData {
  companyData: CompanyData;
  companies?: CompanyData[];
  bankAccounts: BankAccount[];
  salesConfig: SalesConfig;
  salesConfigs?: SalesConfig[];
  businessType: string;
  selectedPlans: Plan[];
  selectedPaymentMethod?: string;
  selectedAccounts?: SelectedAccount[];
  selectedAccountsList?: SelectedAccount[][];
  hasAccountant?: boolean;
  mode?: 'accountant' | 'business';
}

interface OnboardingResult {
  success: boolean;
  companyId?: string;
  tenantId?: string;
  error?: string;
}

// Mapeo de tipos de cuenta UI → tipos de la tabla chart_of_accounts
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  activo: 'ASSET',
  pasivo: 'LIABILITY',
  patrimonio: 'EQUITY',
  ingreso: 'REVENUE',
  gasto: 'EXPENSE',
};

// Mapeo de tipos de impuesto UI → CHECK constraint de la tabla Taxes (IVA/ISR/ISV/OTRO)
const TAX_TYPE_MAP: Record<string, string> = {
  ISV: 'ISV',
  IT: 'OTRO',
  IVA: 'IVA',
  ISR: 'ISR',
  Exento: 'OTRO',
  Otro: 'OTRO',
  otro: 'OTRO',
};

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
    
    // Rol según el modo: el contador administra varias empresas → rol ACCOUNTANT
    const isAccountantMode = data.mode === 'accountant' || data.businessType === 'Contador';
    const userRole = isAccountantMode ? 'ACCOUNTANT' : 'ADMIN';
    
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
      const onboardingPhone = data.companyData.companyPhone || data.companyData.clientPhone || data.companyData.contactPhone || '';
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
        logo_url: data.companyData.logoUrl || null,
        phone_number: onboardingPhone,
        modules: 'ACCOUNTING,BILLING,REPORTS'
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
        role: userRole,
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
            role: userRole,
            tenantId: newTenant.id,
            tenantCode: newTenant.id,
            permissions: isAccountantMode ? ['accountant', 'tenant_admin'] : ['admin', 'tenant_admin'],
            paymentMethod: data.selectedPaymentMethod || 'card',
            hasAccountant: data.hasAccountant || false,
            isolation: {
              tenantId: newTenant.id,
              mode: 'strict'
            }
          },
          privateMetadata: {
            onboardingCompleted: true,
            tenantId: newTenant.id,
            companyId: null, // Se actualizará después
            hasAccountant: data.hasAccountant || false
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
      // Guardar teléfono del onboarding en users.phone y User.phone para que aparezca en /account/profile
      if (onboardingPhone) {
        try {
          await supabase.from('users').update({ phone: onboardingPhone }).eq('email', userEmail.toLowerCase());
          await supabase.from('User').update({ phone: onboardingPhone }).eq('authid', userId);
          await supabase.from('User').update({ phone: onboardingPhone }).eq('email', userEmail.toLowerCase()).then(()=>{});
        } catch (e) { console.warn('No se pudo guardar teléfono en users', e); }
        try {
          const clerk = await clerkClient();
          await clerk.users.updateUser(userId, { publicMetadata: { phone: onboardingPhone } } as any);
        } catch {}
      }
      
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
      const onboardingPhone2 = data.companyData.companyPhone || data.companyData.clientPhone || data.companyData.contactPhone || '';
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
        logo_url: data.companyData.logoUrl || null,
        phone_number: onboardingPhone2,
        modules: 'ACCOUNTING,BILLING,REPORTS'
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
      // Guardar teléfono del onboarding en users.phone y User.phone
      if (onboardingPhone2) {
        try {
          await supabase.from('users').update({ phone: onboardingPhone2 }).eq('email', userEmail.toLowerCase());
          await supabase.from('User').update({ phone: onboardingPhone2 }).eq('authid', userId);
          await supabase.from('User').update({ phone: onboardingPhone2 }).eq('email', userEmail.toLowerCase()).then(()=>{});
        } catch (e) { console.warn('No se pudo guardar teléfono', e); }
        try {
          const clerk = await clerkClient();
          await clerk.users.updateUser(userId, { publicMetadata: { phone: onboardingPhone2 } } as any);
        } catch {}
      }

      // Actualizar metadata en Clerk para usuario existente
      try {
        console.log('🔄 Actualizando metadata en Clerk (usuario existente)...');
        const clerk = await clerkClient();
        await clerk.users.updateUser(userId, {
          publicMetadata: {
            role: userRole,
            tenantId: newTenant.id,
            tenantCode: newTenant.id,
            permissions: isAccountantMode ? ['accountant', 'tenant_admin'] : ['admin', 'tenant_admin'],
            paymentMethod: data.selectedPaymentMethod || 'card',
            hasAccountant: data.hasAccountant || false,
            isolation: {
              tenantId: newTenant.id,
              mode: 'strict'
            }
          },
          privateMetadata: {
            onboardingCompleted: true,
            tenantId: newTenant.id,
            companyId: null, // Se actualizará después
            hasAccountant: data.hasAccountant || false
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
    
    const companiesToCreate = (data.companies && data.companies.length > 0) ? data.companies : [data.companyData];

    // Mover los logos del onboarding (carpeta onboarding/{userId}) a la carpeta del tenant
    // para aislarlos por tenant. logo_url guarda el PATH en storage, no una URL.
    // Cada empresa puede tener su propio logo.
    const moveLogoToTenant = async (logoPath?: string | null): Promise<string | null> => {
      if (!logoPath) return null;
      try {
        const logoFileName = logoPath.split('/').pop();
        const tenantLogoPath = `${tenantId}/${logoFileName}`;
        const { error: moveError } = await supabase.storage
          .from('company-logos')
          .move(logoPath, tenantLogoPath);
        if (moveError) {
          console.error('❌ Error moviendo logo a carpeta del tenant:', moveError);
          return logoPath;
        }
        console.log('✅ Logo movido a carpeta del tenant:', tenantLogoPath);
        return tenantLogoPath;
      } catch (moveErr) {
        console.error('❌ Error moviendo logo en storage (onboarding):', moveErr);
        return logoPath;
      }
    };

    const tenantLogoPaths = await Promise.all(
      companiesToCreate.map((company) => moveLogoToTenant(company.logoUrl))
    );

    // El logo de la empresa principal también se guarda en el Tenant
    const primaryLogoPath = tenantLogoPaths[0] ?? null;
    if (primaryLogoPath) {
      await supabase.from('Tenant').update({ logo_url: primaryLogoPath }).eq('id', tenantId);
    }
    
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

    let companyId: string | null = null;

    for (const [companyIndex, company] of companiesToCreate.entries()) {
      // Create company usando Supabase
      console.log('🔄 Creando company con datos:', {
        tenant_id: tenantId,
        name: company.name,
        business_type: data.businessType,
        rtn: company.rtn,
        email: company.email,
        industry: company.industry
      });

      const { data: companyResult, error: companyError } = await supabase
        .from('companies')
        .insert([{
          id: randomUUID(),
          tenant_id: tenantId,
          name: company.name,
          business_type: data.businessType,
          rtn: company.rtn,
          email: company.email,
          address: company.address,
          department: company.department || null,
          municipality: company.municipality || null,
          logo_url: tenantLogoPaths[companyIndex] ?? null,
          industry: company.industry,
          company_phone: company.companyPhone || null,
          client_phone: company.clientPhone || null,
          contact_phone: company.contactPhone || null,
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

      if (!companyId) companyId = companyResult.id;
      console.log('✅ Company creada exitosamente:', {
        id: companyResult.id,
        name: companyResult.name,
        tenant_id: companyResult.tenant_id
      });

      // Guardar referencia en onboarding_companies por empresa
      const { error: onboardError } = await supabase
        .from('onboarding_companies')
        .insert([{
          user_id: userId,
          company_name: company.name,
          rtn: company.rtn,
          address: company.address,
          email: company.email,
          industry: company.industry,
          business_type: data.businessType,
          setup_completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (onboardError) {
        console.error("❌ Error saving onboarding reference:", onboardError);
      }

      // Crear catálogo de cuentas por empresa: usa el catálogo individual del contador cuando existe
      try {
        await createDefaultChartOfAccounts(companyResult.id, data.selectedAccountsList?.[companyIndex] ?? data.selectedAccounts);
      } catch (chartError) {
        console.error("Error creating chart of accounts:", chartError);
        // No fallar el proceso si el catálogo falla
      }

      // Guardar configuración de ventas por empresa (CAI, impuestos, prefijo)
      const companySales = data.salesConfigs?.[companyIndex] ?? data.salesConfig;
      const companyPrimaryTax = companySales.taxes[0];
      const { error: salesError } = await supabase
        .from('sales_configuration')
        .insert([{
          company_id: companyResult.id,
          cai_enabled: companySales.caiEnabled,
          cai_type: companySales.caiType || null,
          cai_code: companySales.caiCode || null,
          cai_range_start: companySales.caiRangeFrom || null,
          cai_range_end: companySales.caiRangeTo || null,
          cai_expiry_date: companySales.caiExpirationDate || null,
          tax_rate: companyPrimaryTax?.rate || 15,
          invoice_prefix: companySales.invoicePrefix,
          current_invoice_number: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (salesError) {
        console.error("Error saving sales config:", salesError);
      }
    }

    if (!companyId) {
      throw new Error("No se pudo crear ninguna empresa");
    }

    // Actualizar metadata de Clerk con companyId
    try {
      console.log('🔄 Actualizando Clerk metadata con companyId...');
      const clerk = await clerkClient();
      await clerk.users.updateUser(userId, {
        privateMetadata: {
          onboardingCompleted: true,
          tenantId: tenantId,
          companyId: companyId,
          hasAccountant: data.hasAccountant || false
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

    // Impuestos: la tabla Taxes es a nivel tenant, así que se agregan los impuestos
    // de todas las empresas sin duplicar (tipo + tasa).
    const allSalesConfigs = (data.salesConfigs && data.salesConfigs.length > 0)
      ? data.salesConfigs
      : [data.salesConfig];
    const uniqueTaxes: Tax[] = [];
    for (const cfg of allSalesConfigs) {
      for (const tax of (cfg?.taxes || [])) {
        if (!tax || typeof tax.rate !== 'number' || tax.rate <= 0) continue;
        if (!uniqueTaxes.some(t => t.type === tax.type && t.rate === tax.rate)) {
          uniqueTaxes.push(tax);
        }
      }
    }

    for (const tax of uniqueTaxes) {
      const dbTaxType = TAX_TYPE_MAP[tax.type] || 'OTRO';
      const { error: taxError } = await supabase
        .from('Taxes')
        .insert([{
          tenantid: tenantId,
          name: `${tax.type} ${tax.rate}%`,
          type: dbTaxType,
          rate: tax.rate,
          description: `Impuesto ${tax.type} configurado durante el onboarding`,
          isactive: true,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        }]);

      if (taxError) {
        console.error(`Error saving tax ${tax.type}:`, taxError);
      }
    }

    // Validate that at least one plan is selected
    if (!data.selectedPlans || data.selectedPlans.length === 0) {
      throw new Error("Debes seleccionar al menos un plan para continuar");
    }

    // Save selected plans to tenant_plans
    const plansToInsert = data.selectedPlans.map(plan => ({
      tenant_id: tenantId,
      plan_id: plan.id,
      plan_code: plan.code,
      plan_name: plan.name,
      unit_price: plan.unitPrice,
      subtotal: plan.subtotal,
      tax_rate: plan.taxRate,
      tax_amount: plan.taxAmount,
      total: plan.total,
      max_users: plan.maxUsers,
      features: plan.features,
      is_active: true,
      start_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: planError } = await supabase
      .from('tenant_plans')
      .insert(plansToInsert);

    if (planError) {
      console.error("Error saving plans:", planError);
      throw new Error("Failed to save selected plans");
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

// Función para crear catálogo de cuentas (usa la selección del usuario si viene, si no usa el catálogo HN/SAR)
async function createDefaultChartOfAccounts(companyId: string, selectedAccounts?: SelectedAccount[]) {
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

    // Si el usuario seleccionó cuentas en el wizard (paso 3) se respetan esas selecciones
    let accountsToInsert: Array<{ code: string; name: string; type: string; is_default: boolean }>;

    if (selectedAccounts && selectedAccounts.length > 0) {
      accountsToInsert = selectedAccounts.map(account => ({
        code: account.code,
        name: account.name,
        type: ACCOUNT_TYPE_MAP[account.type] || 'ASSET',
        is_default: true
      }));
    } else {
      // Catálogo por defecto (estructura HN/SAR) — códigos consistentes con los de la UI del wizard
      const defaultAccounts = [
        // ACTIVOS
        { code: '110101', name: 'Caja General', type: 'ASSET', is_default: true },
        { code: '110102', name: 'Bancos', type: 'ASSET', is_default: true },
        { code: '110103', name: 'Inversiones Temporales', type: 'ASSET', is_default: true },
        { code: '110201', name: 'Clientes', type: 'ASSET', is_default: true },
        { code: '110202', name: 'Documentos por Cobrar', type: 'ASSET', is_default: true },
        { code: '110301', name: 'Inventario de Mercadería', type: 'ASSET', is_default: true },
        { code: '120101', name: 'Mobiliario y Equipo', type: 'ASSET', is_default: true },
        { code: '120102', name: 'Equipo de Computación', type: 'ASSET', is_default: true },
        { code: '120103', name: 'Vehículos', type: 'ASSET', is_default: true },

        // PASIVOS
        { code: '210101', name: 'Proveedores', type: 'LIABILITY', is_default: true },
        { code: '210102', name: 'Documentos por Pagar', type: 'LIABILITY', is_default: true },
        { code: '210103', name: 'Préstamos Bancarios', type: 'LIABILITY', is_default: true },
        { code: '210201', name: 'Impuestos por Pagar', type: 'LIABILITY', is_default: true },
        { code: '210202', name: 'Sueldos por Pagar', type: 'LIABILITY', is_default: true },

        // PATRIMONIO
        { code: '310101', name: 'Capital Social', type: 'EQUITY', is_default: true },
        { code: '310102', name: 'Utilidades Retenidas', type: 'EQUITY', is_default: true },

        // INGRESOS
        { code: '410101', name: 'Ventas de Mercadería', type: 'REVENUE', is_default: true },
        { code: '410102', name: 'Servicios Prestados', type: 'REVENUE', is_default: true },
        { code: '410103', name: 'Intereses Ganados', type: 'REVENUE', is_default: true },

        // GASTOS
        { code: '510101', name: 'Costo de Ventas', type: 'EXPENSE', is_default: true },
        { code: '510201', name: 'Sueldos y Salarios', type: 'EXPENSE', is_default: true },
        { code: '510202', name: 'Alquileres', type: 'EXPENSE', is_default: true },
        { code: '510203', name: 'Servicios Públicos', type: 'EXPENSE', is_default: true },
        { code: '510204', name: 'Depreciación', type: 'EXPENSE', is_default: true },
        { code: '510301', name: 'Gastos de Ventas', type: 'EXPENSE', is_default: true },
        { code: '510302', name: 'Gastos Administrativos', type: 'EXPENSE', is_default: true }
      ];
      accountsToInsert = defaultAccounts;
    }

    for (const account of accountsToInsert) {
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

    console.log(`✅ Catálogo de cuentas creado para company ${companyId} (${accountsToInsert.length} cuentas)`);
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
