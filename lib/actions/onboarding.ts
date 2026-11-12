"use server";

import { supabase } from "@/lib/supabase-db";
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
    
    // 1. Resolver el usuario de la app por su identidad de Clerk. La columna
    //    real es `authid` y el tenant es `tenantId` (camelCase). Antes se
    //    consultaba `tenantid`, que no existe: el onboarding fallaba siempre
    //    antes de crear nada.
    let existingUser: { id: string; tenantId: string | null } | null = null;
    {
      const byAuth = await supabase
        .from('User')
        .select('id, tenantId')
        .eq('authid', userId)
        .limit(1);
      if (byAuth.error) {
        throw new Error(`Error verificando usuario existente: ${byAuth.error.message}`);
      }
      existingUser = byAuth.data?.[0] ?? null;

      // Si no hay fila por authid, se adopta una fila previa con el mismo
      // correo (Clerk ya lo verificó). Evita duplicados.
      if (!existingUser && userEmail) {
        const byEmail = await supabase
          .from('User')
          .select('id, tenantId')
          .eq('email', userEmail)
          .limit(1);
        if (byEmail.error) {
          throw new Error(`Error verificando usuario por email: ${byEmail.error.message}`);
        }
        existingUser = byEmail.data?.[0] ?? null;
      }
    }

    // 2. Crear el tenant en `tenants` (snake_case). La tabla `Tenant` usada
    //    antes no tiene las columnas de facturación que este flujo escribía,
    //    así que el INSERT fallaba.
    const tenantCode = generateTenantCode(data.companyData.name);
    const uniqueRtn = data.companyData.rtn ? String(data.companyData.rtn).trim() : '';
    const uniqueEmail = data.companyData.email ? String(data.companyData.email).trim() : '';
    const onboardingPhone = data.companyData.companyPhone || data.companyData.clientPhone || data.companyData.contactPhone || '';
    const nowIso = new Date().toISOString();

    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{
        id: randomUUID(),
        business_name: data.companyData.name,
        business_rtn: uniqueRtn || null,
        business_email: uniqueEmail || null,
        tenant_code: tenantCode,
        country: 'HN',
        phone_number: onboardingPhone || null,
        timezone: 'America/Tegucigalpa',
        currency: 'HNL',
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      }])
      .select()
      .single();

    if (tenantError || !newTenant) {
      console.error('❌ Error creando tenant:', tenantError);
      throw new Error(`Error creando tenant: ${tenantError?.message || 'Unknown error'}`);
    }

    // 3. Crear o actualizar `User`. Columnas reales: id, email, name,
    //    tenantId, authid (+ timestamps). No existen passwordhash, firstname,
    //    lastname ni isactive.
    const appUserId = existingUser?.id ?? randomUUID();
    const userPayload = {
      email: userEmail,
      name: [userFirstName, userLastName].filter(Boolean).join(' ').trim() || userEmail,
      tenantId: tenantCode,
      authid: userId,
      updatedAt: nowIso,
    };
    const userRes = existingUser
      ? await supabase.from('User').update(userPayload).eq('id', appUserId).select().single()
      : await supabase.from('User').insert([{ id: appUserId, ...userPayload, createdAt: nowIso }]).select().single();

    if (userRes.error || !userRes.data) {
      console.error('❌ Error creando usuario:', userRes.error);
      throw new Error(`Error creando usuario: ${userRes.error?.message || 'Unknown error'}`);
    }

    // 4. Metadata de Clerk con el código de tenant (el que usa Company.tenantId).
    try {
      const clerk = await clerkClient();
      await clerk.users.updateUser(userId, {
        publicMetadata: {
          role: userRole,
          tenantId: tenantCode,
          tenantCode,
          permissions: isAccountantMode ? ['accountant', 'tenant_admin'] : ['admin', 'tenant_admin'],
          paymentMethod: data.selectedPaymentMethod || 'card',
          hasAccountant: data.hasAccountant || false,
          isolation: { tenantId: tenantCode, mode: 'strict' },
        },
        privateMetadata: {
          onboardingCompleted: true,
          tenantId: tenantCode,
          companyId: null,
          hasAccountant: data.hasAccountant || false,
        },
      });
    } catch (clerkError) {
      console.error('⚠️ Error actualizando metadata en Clerk:', clerkError);
    }

    // 5. Teléfono: solo en Clerk. Ni `users` ni `User` tienen columna phone.
    if (onboardingPhone) {
      try {
        const clerk = await clerkClient();
        await clerk.users.updateUser(userId, { publicMetadata: { phone: onboardingPhone } } as any);
      } catch {}
    }

    const tenantId = tenantCode;
    
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

    // El logo queda en `Company.logo_url`. `tenants` no tiene columna
    // `logo_url`, así que no hay nada que actualizar a nivel de tenant.

    // El cliente usa service_role, que ya bypassa RLS; no hace falta fijar
    // un contexto de tenant en la conexión.

    // Confirmar que el tenant recién creado existe antes de crear empresas.
    const { data: tenantCheck, error: tenantCheckError } = await supabase
      .from('tenants')
      .select('id')
      .eq('tenant_code', tenantId)
      .single();

    if (tenantCheckError || !tenantCheck) {
      console.error('❌ Tenant verification failed:', tenantCheckError);
      console.error('❌ Tenant code not found in database:', tenantId);
      throw new Error(`Tenant ${tenantId} not found in database`);
    }

    console.log('✅ Tenant verified in database:', tenantCheck.id);

    let companyId: string | null = null;

    for (const [companyIndex, company] of companiesToCreate.entries()) {
      // Create company usando Supabase
      console.log('🔄 Creando company con datos:', {
        tenantId: tenantId,
        name: company.name,
        business_type: data.businessType,
        rtn: company.rtn,
        email: company.email,
        industry: company.industry
      });

      // Tabla real: `Company` (camelCase). `companies` no existe en esta base.
      const { data: companyResult, error: companyError } = await supabase
        .from('Company')
        .insert([{
          id: randomUUID(),
          tenantId: tenantId,
          name: company.name,
          description: data.businessType || null,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }])
        .select()
        .single();

      if (companyError || !companyResult) {
        console.error("❌ Error creating company:", companyError);
        console.error("❌ Company error details:", JSON.stringify(companyError, null, 2));
        throw new Error(`Failed to create company: ${companyError?.message || 'Unknown error'}`);
      }

      if (!companyId) companyId = companyResult.id;
      console.log('✅ Company creada exitosamente:', {
        id: companyResult.id,
        name: companyResult.name,
        tenantId: companyResult.tenantId
      });

      // Sede por defecto: la UI y los INSERT que heredan `location_id`
      // necesitan al menos una fila en `company_location`.
      const { error: locationError } = await supabase
        .from('company_location')
        .insert([{
          id: randomUUID(),
          company_id: companyResult.id,
          name: 'PRINCIPAL',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      if (locationError) {
        console.error("❌ Error creating default location:", locationError);
      }

      // Membresía: es la fuente de verdad de /api/workspace. Sin esta fila el
      // usuario queda autenticado pero sin empresa.
      const { error: accessError } = await supabase
        .from('user_company_access')
        .insert([{
          id: randomUUID(),
          user_id: appUserId,
          company_id: companyResult.id,
          relationship: isAccountantMode ? 'accountant' : 'owner',
          is_default: companyIndex === 0,
          created_at: new Date().toISOString()
        }]);
      if (accessError) {
        console.error("❌ Error creating user_company_access:", accessError);
        throw new Error(`Failed to grant company access: ${accessError.message}`);
      }

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

    // `tenant_plans` no existe en este esquema. La selección de plan ya quedó
    // guardada en la metadata de Clerk; si la tabla aparece en el futuro, este
    // insert empezará a persistirla. No debe tumbar el onboarding.
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
      console.error("No se pudo guardar la selección de planes (tabla ausente):", planError.message);
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
      .from('Company')
      .select('tenantId')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error("Company not found");
    }

    // service_role ya bypassa RLS: no hay contexto que fijar.

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
