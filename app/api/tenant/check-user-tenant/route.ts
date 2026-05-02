import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar si el usuario tiene un tenant asociado
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('tenantid, role, createdat')
      .eq('authid', userId)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        // Usuario no encontrado en tabla User - necesita onboarding
        return NextResponse.json({
          hasTenant: false,
          needsOnboarding: true,
          message: 'Usuario necesita crear tenant y completar onboarding'
        });
      }
      throw userError;
    }

    // Si tiene tenant, verificar si tiene onboarding completado
    const { data: onboardingData, error: onboardingError } = await supabase
      .from('onboarding_companies')
      .select('setup_completed, created_at')
      .eq('user_id', userId)
      .single();

    let needsOnboarding = false;
    let hasCompletedOnboarding = false;

    if (onboardingError) {
      if (onboardingError.code === 'PGRST116') {
        // No tiene registro de onboarding - necesita onboarding
        needsOnboarding = true;
      }
    } else {
      hasCompletedOnboarding = onboardingData.setup_completed;
      needsOnboarding = !onboardingData.setup_completed;
    }

    // Verificar si tiene companies asociadas
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .eq('tenant_id', userData.tenantid)
      .limit(1);

    const hasCompanies = !companiesError && companiesData.length > 0;

    // Lógica de decisión final
    let redirectTo = '/dashboard';
    let status = 'configured';

    if (!userData.tenantid) {
      redirectTo = '/onboarding';
      status = 'needs_tenant';
    } else if (needsOnboarding || !hasCompletedOnboarding) {
      redirectTo = '/onboarding';
      status = 'needs_onboarding';
    } else if (!hasCompanies) {
      redirectTo = '/onboarding';
      status = 'needs_company_setup';
    }

    return NextResponse.json({
      hasTenant: !!userData.tenantid,
      needsOnboarding,
      hasCompletedOnboarding,
      hasCompanies,
      redirectTo,
      status,
      user: {
        tenantid: userData.tenantid,
        role: userData.role,
        createdat: userData.createdat
      }
    });

  } catch (error: any) {
    console.error('Error checking user tenant status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
