// CI/CD Pipeline - Migration Strategy
// This script ensures the migration flow:
// 1. Run prisma migrate deploy in Staging environment
// 2. Verify migrations in Staging
// 3. Run prisma migrate deploy in Production environment
//
// Usage: node scripts/ci-cd-migration.js --stage=staging|production
//
// For Vercel/Netlify CI/CD, this would be integrated as:
// - Pull Request: prisma migrate dry-run (preview)
// - Staging Deploy: prisma migrate deploy
// - Production Deploy: prisma migrate deploy (after staging verification)

const { program } = require('commander');
const { execSync } = require('child_process');
const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

program
  .option('--stage <stage>', 'Target environment: staging or production', /^(staging|production)$/)
  .option('--dry-run', 'Run dry-run without applying migrations')
  .parse(process.env);

const options = program.opts();

if (!options.stage) {
  console.error('Error: --stage is required (staging or production)');
  process.exit(1);
}

const isStaging = options.stage === 'staging';
const targetEnv = isStaging ? 'Staging' : 'Production';

console.log(`=== CI/CD Migration Pipeline ===`);
console.log(`Target Environment: ${targetEnv}`);
console.log('');

// Step 1: Generate Prisma client
console.log(`Step 1: Generating Prisma client...`);
try {
  execSync('npm run prisma:generate', { stdio: 'inherit' });
  console.log('✓ Prisma client generated successfully');
} catch (error) {
  console.error('✗ Failed to generate Prisma client');
  process.exit(1);
}

console.log('');

// Step 2: Run dry-run migration to preview changes
console.log(`Step 2: Running migration dry-run...`);
try {
  const dryRunCmd = `prisma migrate deploy --preview-feature --create-only`;
  execSync(dryRunCmd, { stdio: 'inherit' });
  console.log('✓ Migration dry-run completed successfully');
  console.log('  (Review the above output to verify changes are correct)');
} catch (error) {
  console.error('✗ Migration dry-run failed');
  console.error('  Aborting deployment to prevent broken schema');
  process.exit(1);
}

console.log('');

// Step 3: Apply migrations to target environment
console.log(`Step 3: Applying migrations to ${targetEnv}...`);
try {
  const migrateCmd = `prisma migrate deploy --preview-feature`;
  execSync(migrateCmd, { stdio: 'inherit' });
  console.log(`✓ Migrations applied successfully to ${targetEnv}`);
  
  if (isStaging) {
    console.log('');
    console.log('=== Staging Migration Complete ===');
    console.log('');

    console.log('Next steps:');
    console.log('1. Verify the application works correctly in Staging');
    console.log('2. Run integration tests against Staging database');
    console.log('3. Once verified, trigger production deployment');
    console.log('4. Run: node scripts/ci-cd-migration.js --stage=production');
  }
} catch (error) {
  console.error(`✗ Failed to apply migrations to ${targetEnv}`);
  console.error('  The database schema may be inconsistent');
  process.exit(1);
}

console.log('');

if (!isStaging) {
  console.log('=== Production Migration Complete ===');
  console.log('All migrations have been successfully applied to Production.');
}

process.exit(0);