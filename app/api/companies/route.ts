import { NextResponse } from 'next/server';
import { supabase, setTenantContext } from '@/lib/supabase-db';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Obtener el tenant del usuario desde la tabla User
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('tenantid')
      .eq('authid', userId)
      .single();
    
    if (userError || !userData?.tenantid) {
      return NextResponse.json({ companies: [] }, { status: 200 });
    }
    
    // Set tenant context
    await setTenantContext(userData.tenantid);
    
    // Obtener empresas del tenant actual
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('tenant_id', userData.tenantid)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json({ error: 'Error al obtener empresas' }, { status: 500 });
    }
    
    // Transformar campos de la BD al formato que espera el frontend
    const transformedCompanies = (companies || []).map(company => ({
      id: company.id,
      business_name: company.name || company.business_name || 'Sin nombre',
      business_rtn: company.rtn || company.business_rtn || '',
      industry: company.industry || company.business_type || 'Sin industria',
      regimen_tributario: company.regimen_tributario || 'Régimen General',
      actividad_economica: company.actividad_economica || company.business_type || '',
      direccion_fiscal: company.address || company.direccion_fiscal || company.business_address || '',
      telefono_fiscal: company.phone || company.telefono_fiscal || company.contact_phone || '',
      email_fiscal: company.email || company.email_fiscal || '',
      is_active: company.is_active !== false, // default true unless explicitly false
      created_at: company.created_at,
      config_fiscal: company.config_fiscal || null,
      _count: {
        polizas: 0, // TODO: Calculate real counts
        accounts: 0
      }
    }));
    
    return NextResponse.json({ companies: transformedCompanies });
    
  } catch (error) {
    console.error('Error in companies API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
