import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🗑️ Starting COMPREHENSIVE Angel Ring cleanup...');
    
    const { supabase } = await import('@/lib/supabase-db');
    const cleanupResults = {
      database: {},
      verification: {},
      summary: { totalDeleted: 0, errors: [] }
    };
    
    // 1. DELETE TENANTS
    console.log('🗄️ Step 1: Deleting Angel Ring tenants...');
    try {
      const { data: tenants, error: searchError } = await supabase
        .from('Tenant')
        .select('*')
        .or('business_name.ilike.%Angel Ring%,businessname.ilike.%Angel Ring%,business_email.ilike.%scalix@contab.com%');
      
      if (searchError) {
        cleanupResults.summary.errors.push(`Tenant search error: ${searchError.message}`);
      } else if (tenants && tenants.length > 0) {
        const tenantIds = tenants.map(t => t.id);
        
        // Delete users first
        const { error: usersError } = await supabase
          .from('User')
          .delete()
          .in('tenantid', tenantIds);
        
        if (usersError) {
          cleanupResults.summary.errors.push(`Users deletion error: ${usersError.message}`);
        }
        
        // Delete companies
        const { error: companiesError } = await supabase
          .from('companies')
          .delete()
          .in('tenant_id', tenantIds);
        
        if (companiesError) {
          cleanupResults.summary.errors.push(`Companies deletion error: ${companiesError.message}`);
        }
        
        // Delete transactions
        const { error: transactionsError } = await supabase
          .from('Transaction')
          .delete()
          .in('tenantId', tenantIds);
        
        if (transactionsError) {
          cleanupResults.summary.errors.push(`Transactions deletion error: ${transactionsError.message}`);
        }
        
        // Delete accounts
        const { error: accountsError } = await supabase
          .from('Account')
          .delete()
          .in('tenantId', tenantIds);
        
        if (accountsError) {
          cleanupResults.summary.errors.push(`Accounts deletion error: ${accountsError.message}`);
        }
        
        // Delete invoices
        const { error: invoicesError } = await supabase
          .from('invoices')
          .delete()
          .in('tenant_id', tenantIds);
        
        if (invoicesError) {
          cleanupResults.summary.errors.push(`Invoices deletion error: ${invoicesError.message}`);
        }
        
        // Finally delete tenants
        const { error: deleteError } = await supabase
          .from('Tenant')
          .delete()
          .in('id', tenantIds);
        
        if (deleteError) {
          cleanupResults.summary.errors.push(`Tenants deletion error: ${deleteError.message}`);
        } else {
          cleanupResults.database.tenants = {
            found: tenants.length,
            deleted: tenantIds.length,
            deletedIds: tenantIds,
            deletedData: tenants
          };
          cleanupResults.summary.totalDeleted += tenantIds.length;
        }
      } else {
        cleanupResults.database.tenants = { found: 0, deleted: 0 };
      }
    } catch (error) {
      cleanupResults.summary.errors.push(`Tenant cleanup exception: ${error.message}`);
    }
    
    // 2. DELETE USERS WITH ANGEL RING EMAILS
    console.log('👥 Step 2: Deleting users with Angel Ring emails...');
    try {
      const { data: users, error: usersSearchError } = await supabase
        .from('User')
        .select('*')
        .ilike('email', '%scalix@contab.com%');
      
      if (usersSearchError) {
        cleanupResults.summary.errors.push(`Users search error: ${usersSearchError.message}`);
      } else if (users && users.length > 0) {
        const userIds = users.map(u => u.id);
        
        const { error: deleteUsersError } = await supabase
          .from('User')
          .delete()
          .in('id', userIds);
        
        if (deleteUsersError) {
          cleanupResults.summary.errors.push(`Direct users deletion error: ${deleteUsersError.message}`);
        } else {
          cleanupResults.database.users = {
            found: users.length,
            deleted: userIds.length,
            deletedData: users
          };
          cleanupResults.summary.totalDeleted += userIds.length;
        }
      } else {
        cleanupResults.database.users = { found: 0, deleted: 0 };
      }
    } catch (error) {
      cleanupResults.summary.errors.push(`Users cleanup exception: ${error.message}`);
    }
    
    // 3. VERIFICATION - Check for any remaining Angel Ring data
    console.log('🔍 Step 3: Verifying complete deletion...');
    try {
      const checks = {
        tenants: await supabase.from('Tenant').select('*').or('business_name.ilike.%Angel Ring%,businessname.ilike.%Angel Ring%'),
        users: await supabase.from('User').select('*').ilike('email', '%scalix@contab.com%'),
        companies: await supabase.from('companies').select('*').ilike('name,%Angel Ring%'),
        emails: await supabase.from('Tenant').select('*').ilike('business_email,%scalix@contab.com%')
      };
      
      cleanupResults.verification = {
        tenants: (checks.tenants.data || []).length,
        users: (checks.users.data || []).length,
        companies: (checks.companies.data || []).length,
        emails: (checks.emails.data || []).length,
        totalRemaining: (checks.tenants.data || []).length + (checks.users.data || []).length + (checks.companies.data || []).length + (checks.emails.data || []).length
      };
      
      if (cleanupResults.verification.totalRemaining > 0) {
        cleanupResults.summary.errors.push(`${cleanupResults.verification.totalRemaining} Angel Ring records still remain`);
      }
    } catch (error) {
      cleanupResults.summary.errors.push(`Verification error: ${error.message}`);
    }
    
    // 4. GENERATE CLIENT-SIDE CLEANUP INSTRUCTIONS
    cleanupResults.clientCleanup = {
      localStorage: ['selected_tenant', 'tenant_data', 'current_tenant'],
      sessionStorage: ['tenant_session', 'user_session'],
      cookies: ['tenant_id', 'current_tenant'],
      cacheClear: true,
      hardRefresh: true
    };
    
    const success = cleanupResults.summary.totalDeleted > 0 && cleanupResults.verification.totalRemaining === 0;
    
    return NextResponse.json({
      success,
      message: success ? 
        '✅ COMPREHENSIVE Angel Ring cleanup completed successfully' :
        '⚠️ Angel Ring cleanup completed with issues',
      results: cleanupResults,
      nextSteps: [
        '1. Clear browser cache (Ctrl+F5)',
        '2. Close all browser tabs',
        '3. Open new browser window',
        '4. Login with azuna22@outlook.com',
        '5. Complete onboarding with "casa vieja"',
        '6. Verify dashboard shows "casa vieja"'
      ]
    });
    
  } catch (error) {
    console.error('❌ Comprehensive cleanup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Comprehensive cleanup failed', 
      details: error?.message || error 
    }, { status: 500 });
  }
}
