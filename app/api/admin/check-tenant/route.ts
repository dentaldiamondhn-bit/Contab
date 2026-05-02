import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function POST(request: Request) {
  try {
    console.log('🔍 Verificando tenant actual...');
    
    // 1. Obtener todos los tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('Tenant')
      .select('*');
    
    if (tenantsError) {
      console.error('❌ Error obteniendo tenants:', tenantsError);
      return NextResponse.json({ error: 'Error obteniendo tenants', details: tenantsError }, { status: 500 });
    }
    
    console.log('📊 Tenants encontrados:', tenants?.length || 0);
    
    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No hay tenants - listo para crear nuevo',
        tenants: []
      });
    }
    
    // 2. Mostrar detalles de cada tenant
    const tenantDetails = tenants.map(t => ({
      id: t.id,
      business_name: t.business_name,
      businessName: t.businessName,
      tenant_code: t.tenant_code,
      tenantCode: t.tenantCode,
      is_active: t.is_active,
      isActive: t.isActive,
      created_at: t.created_at,
      createdAt: t.createdAt
    }));
    
    console.log('📋 Detalles de tenants:', tenantDetails);
    
    // 3. Buscar usuarios asociados
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('id, email, tenantid, firstname, lastname');
    
    if (!usersError) {
      console.log('👥 Usuarios encontrados:', users?.length || 0);
      
      const userDetails = users?.map(u => ({
        id: u.id,
        email: u.email,
        tenantid: u.tenantid,
        tenantName: tenants.find(t => t.id === u.tenantid)?.business_name || 'Unknown'
      }));
      
      console.log('👥 Detalles de usuarios:', userDetails);
      
      return NextResponse.json({
        success: true,
        message: 'Análisis completado',
        tenants: tenantDetails,
        users: userDetails || [],
        totalTenants: tenants.length,
        totalUsers: users?.length || 0
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Análisis parcial (solo tenants)',
      tenants: tenantDetails,
      totalTenants: tenants.length
    });
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    return NextResponse.json({ 
      error: 'Error en el proceso', 
      details: error 
    }, { status: 500 });
  }
}
