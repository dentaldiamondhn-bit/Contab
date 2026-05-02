"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("No autorizado");
    }

    const userId = session.user.id;

    // Create company using raw SQL to match existing schema
    const companyResult = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO companies (id, tenant_id, name, business_type, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}, ${data.companyData.name}, ${data.businessType}, NOW(), NOW())
      RETURNING id
    `;

    const companyId = companyResult[0]?.id;
    if (!companyId) {
      throw new Error("Failed to create company");
    }

    // Save bank accounts to company_bank_accounts table
    for (const account of data.bankAccounts) {
      await db.$executeRaw`
        INSERT INTO company_bank_accounts (id, company_id, bank_name, account_number, account_type, currency, created_at, updated_at)
        VALUES (gen_random_uuid(), ${companyId}, ${account.bankName}, ${account.accountNumber}, ${account.accountType}, ${account.currency}, NOW(), NOW())
      `;
    }

    // Save sales configuration
    const primaryTax = data.salesConfig.taxes[0];
    await db.$executeRaw`
      INSERT INTO sales_configuration (id, company_id, cai_enabled, cai_type, cai_code, tax_rate, invoice_prefix, created_at, updated_at)
      VALUES (gen_random_uuid(), ${companyId}, ${data.salesConfig.caiEnabled}, ${data.salesConfig.caiType}, ${data.salesConfig.caiCode}, ${primaryTax?.rate || 15}, ${data.salesConfig.invoicePrefix}, NOW(), NOW())
    `;

    // Also save to onboarding_companies for reference
    await db.$executeRaw`
      INSERT INTO onboarding_companies (id, user_id, company_name, rtn, address, contact_phone, client_phone, company_phone, country, email, industry, business_type, setup_completed, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}, ${data.companyData.name}, ${data.companyData.rtn}, ${data.companyData.address}, ${data.companyData.contactPhone}, ${data.companyData.clientPhone}, ${data.companyData.companyPhone}, ${data.companyData.country}, ${data.companyData.email}, ${data.companyData.industry}, ${data.businessType}, true, NOW(), NOW())
    `;

    return { success: true, companyId };
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    throw new Error("Failed to save onboarding data");
  }
}
