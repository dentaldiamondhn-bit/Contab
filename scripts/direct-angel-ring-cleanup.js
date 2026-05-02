const { createClient } = require('@supabase/supabase-js');

// Direct database cleanup script
async function directAngelRingCleanup() {
    console.log('🗑️ Starting direct Angel Ring cleanup...');
    
    // Supabase configuration
    const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODI5NjU1NSwiZXhwIjoyMDUzODcyMTU1fQ.kQwzA3h2lT9_xNtJKnZQJ8qOqJ9mO5JgXhYqN7ZfR3A';
    
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
        
        console.log('✅ Direct cleanup completed!');
        
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    }
}

// Run the cleanup
directAngelRingCleanup();
