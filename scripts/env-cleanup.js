require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Environment-based cleanup script
async function envBasedCleanup() {
    console.log('🗑️ Starting environment-based Angel Ring cleanup...');
    
    // Get credentials from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in environment');
        console.log('📋 Required environment variables:');
        console.log('   NEXT_PUBLIC_SUPABASE_URL');
        console.log('   SUPABASE_SERVICE_ROLE_KEY');
        return;
    }
    
    console.log('✅ Environment variables found');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
        // 1. Find Angel Ring tenants
        console.log('🔍 Finding Angel Ring tenants...');
        const { data: tenants, error: tenantError } = await supabase
            .from('Tenant')
            .select('*')
            .or('business_name.ilike.%Angel Ring%,businessname.ilike.%Angel Ring%');
        
        if (tenantError) {
            console.error('❌ Error finding tenants:', tenantError);
            return;
        }
        
        console.log(`📊 Found ${tenants?.length || 0} Angel Ring tenants`);
        
        if (!tenants || tenants.length === 0) {
            console.log('✅ No Angel Ring tenants found');
            return;
        }
        
        // Display found tenants
        console.log('🎯 Found tenants:');
        tenants.forEach((tenant, index) => {
            console.log(`   ${index + 1}. ID: ${tenant.id}, Name: ${tenant.business_name || tenant.businessname}`);
        });
        
        // 2. Delete associated data
        const tenantIds = tenants.map(t => t.id);
        console.log('🗑️ Deleting associated data...');
        
        // Delete users
        const { error: usersError } = await supabase
            .from('User')
            .delete()
            .in('tenantid', tenantIds);
        
        if (usersError) {
            console.error('❌ Error deleting users:', usersError);
        } else {
            console.log('✅ Users deleted');
        }
        
        // Delete companies
        const { error: companiesError } = await supabase
            .from('companies')
            .delete()
            .in('tenant_id', tenantIds);
        
        if (companiesError) {
            console.error('❌ Error deleting companies:', companiesError);
        } else {
            console.log('✅ Companies deleted');
        }
        
        // Delete transactions
        const { error: transactionsError } = await supabase
            .from('Transaction')
            .delete()
            .in('tenantId', tenantIds);
        
        if (transactionsError) {
            console.error('❌ Error deleting transactions:', transactionsError);
        } else {
            console.log('✅ Transactions deleted');
        }
        
        // Delete accounts
        const { error: accountsError } = await supabase
            .from('Account')
            .delete()
            .in('tenantId', tenantIds);
        
        if (accountsError) {
            console.error('❌ Error deleting accounts:', accountsError);
        } else {
            console.log('✅ Accounts deleted');
        }
        
        // 3. Delete tenants
        console.log('🗑️ Deleting tenants...');
        const { error: deleteError } = await supabase
            .from('Tenant')
            .delete()
            .in('id', tenantIds);
        
        if (deleteError) {
            console.error('❌ Error deleting tenants:', deleteError);
            return;
        }
        
        console.log('✅ Tenants deleted successfully');
        console.log(`📊 Deleted ${tenantIds.length} tenants`);
        
        // 4. Verification
        console.log('🔍 Verifying deletion...');
        const { data: remaining, error: verifyError } = await supabase
            .from('Tenant')
            .select('*')
            .or('business_name.ilike.%Angel Ring%,businessname.ilike.%Angel Ring%');
        
        if (verifyError) {
            console.error('❌ Error verifying:', verifyError);
        } else {
            console.log(`📊 Remaining Angel Ring tenants: ${remaining?.length || 0}`);
        }
        
        // 5. Check for specific tenant ID
        const { data: specificTenant, error: specificError } = await supabase
            .from('Tenant')
            .select('*')
            .eq('id', 'cmofey73w000087izrdfvtlve');
        
        if (specificError) {
            console.error('❌ Error checking specific tenant:', specificError);
        } else {
            console.log(`📊 Tenant cmofey73w000087izrdfvtlve exists: ${specificTenant?.length > 0 ? 'YES' : 'NO'}`);
        }
        
        console.log('✅ Environment-based cleanup completed!');
        
        // 6. Browser cleanup instructions
        console.log('\n🧹 BROWSER CLEANUP INSTRUCTIONS:');
        console.log('1. Open browser console (F12)');
        console.log('2. Run this script:');
        console.log(`
// Clear Angel Ring data from browser storage
localStorage.removeItem('selected_tenant');
localStorage.removeItem('tenant_data');
localStorage.removeItem('current_tenant');
sessionStorage.removeItem('tenant_session');
sessionStorage.removeItem('user_session');
document.cookie = 'tenant_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
document.cookie = 'current_tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
console.log('✅ Angel Ring browser data cleared');
        `);
        console.log('3. Refresh page (Ctrl+F5)');
        console.log('4. Login with azuna22@outlook.com');
        console.log('5. Complete onboarding with "casa vieja"');
        
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    }
}

// Run the cleanup
envBasedCleanup();
