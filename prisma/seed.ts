import { PrismaClient } from '@prisma/client';
import { seedBanksAndAccounts } from '../lib/seeds/bank-accounts';

const prisma = new PrismaClient();

async function main() {
  const accounts = [
    // --- ASSETS (1000-1999) ---
    { name: 'Cash in Bank', code: '1010', type: 'ASSET' },
    { name: 'Accounts Receivable', code: '1200', type: 'ASSET' },
    { name: 'Dental Equipment', code: '1500', type: 'ASSET' },
    { name: 'Clinical Supplies Inventory', code: '1600', type: 'ASSET' },

    // --- LIABILITIES (2000-2999) ---
    { name: 'Accounts Payable', code: '2010', type: 'LIABILITY' },
    { name: 'Medical Equipment Loans', code: '2500', type: 'LIABILITY' },

    // --- EQUITY (3000-3999) ---
    { name: 'Owner Investment', code: '3010', type: 'EQUITY' },
    { name: 'Retained Earnings', code: '3900', type: 'EQUITY' },

    // --- REVENUE (4000-4999) ---
    { name: 'Patient Service Revenue', code: '4010', type: 'REVENUE' },
    { name: 'Laboratory Fees Revenue', code: '4020', type: 'REVENUE' },

    // --- EXPENSES (5000-5999) ---
    { name: 'Dental Supplies Expense', code: '5010', type: 'EXPENSE' },
    { name: 'Rent Expense', code: '5020', type: 'EXPENSE' },
    { name: 'Staff Salaries', code: '5030', type: 'EXPENSE' },
    { name: 'Software/SaaS Subscriptions', code: '5040', type: 'EXPENSE' },
  ];

  console.log('Seed started: Creating Chart of Accounts...');

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }

  console.log('Seed finished: Dental Diamond COA is ready.');

  console.log('🌱 Starting database seeding...');

  // Seed banks and bank accounts
  console.log('🏦 Seeding banks and accounts...');
  const bankResult = await seedBanksAndAccounts();
  
  if (bankResult.success) {
    console.log(`✅ Banks seeded successfully: ${bankResult.message}`);
  } else {
    console.error('❌ Bank seeding failed:', bankResult.error);
  }

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });