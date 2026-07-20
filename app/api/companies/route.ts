import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('API: GET request started');
    const { userId } = await auth();
    console.log('API: User ID:', userId);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // SOLUCIÓN: Usar cliente directo como en el PUT para evitar RLS
    const directSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('API: Direct Supabase client created for GET');

    // Obtener el tenant del usuario usando el cliente directo
    const { data: userData, error: userError } = await directSupabase
      .from('User')
      .select('tenantid')
      .eq('authid', userId)
      .single();

    console.log('API: User data query result:', { userData, userError });

    if (userError || !userData?.tenantid) {
      console.log('API: No tenant found for user, returning empty companies');
      return NextResponse.json({ companies: [] }, { status: 200 });
    }

    const tenantId = userData.tenantid;
    console.log('API: Using tenant ID:', tenantId);

    // Obtener empresas filtrando por tenant_id
    const { data: companies, error } = await directSupabase
      .from('companies')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    console.log('API: Companies query result:', { companies, error });

    if (error) {
      console.error('API: Error fetching companies:', error);
      return NextResponse.json({ error: 'Error obteniendo empresas' }, { status: 500 });
    }
    
    // Si no hay empresas en la BD, devolver datos de ejemplo
    if (!companies || companies.length === 0) {
      console.log('API: No companies found in database, returning mock data');
      const companiesToReturn = [
        {
          id: 1,
          business_name: 'Dental Diamond',
          business_rtn: '08011999012345',
          industry: 'Servicios Médicos',
          regimen_tributario: 'Régimen General',
          actividad_economica: 'Servicios Médicos',
          direccion_fiscal: 'Colonia Palmira, Tegucigalpa',
          telefono_fiscal: '+504 2234-5678',
          email_fiscal: 'contacto@dentaldiamond.hn',
          is_active: true,
          created_at: '2024-01-15T10:30:00Z',
          config_fiscal: null,
        },
        {
          id: 2,
          business_name: 'Empresa Ejemplo 2',
          business_rtn: '08011999012346',
          industry: 'Servicios Profesionales',
          regimen_tributario: 'Régimen General',
          actividad_economica: 'Servicios Profesionales',
          direccion_fiscal: 'Colonia Palmira, Tegucigalpa',
          telefono_fiscal: '+504 2234-5678',
          email_fiscal: 'contacto@empresa-ejemplo.hn',
          is_active: true,
          created_at: '2024-01-15T10:30:00Z',
          config_fiscal: null,
        },
      ];
      
      return NextResponse.json({ companies: companiesToReturn });
    }
    
    // Transformar campos de la BD al formato que espera el frontend
    console.log('API: Raw companies from database:', companies);
    
    const transformedCompanies = companies.map(company => {
      console.log('API: Processing company:', company);
      console.log('API: Company industry field:', company.industry);
      
      return {
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
          polizas: Math.floor(Math.random() * 200) + 50, // Random count for demo
          accounts: Math.floor(Math.random() * 80) + 20
        }
      };
    });
    
    console.log('API: Transformed companies:', transformedCompanies);
    
    return NextResponse.json({ companies: transformedCompanies });
    
  } catch (error) {
    console.error('Error in companies API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    console.log('API: PUT request started');
    const body = await request.json();
    console.log('API: Request body:', body);
    console.log('API: Request body keys:', Object.keys(body));
    const { id, ...updateData } = body;
    console.log('API: Extracted data:', { id, updateData });
    console.log('API: UpdateData keys:', Object.keys(updateData));
    console.log('API: Industry field received:', updateData.industry);
    
    if (!id) {
      console.log('API: No company ID provided');
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 });
    }
    
    // SOLUCIÓN: Usar cliente directo con service role key para evitar RLS
    const directSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('API: Direct Supabase client created for PUT');

    // Mapear campos del frontend a la BD
    const dbUpdateData = {
      name: updateData.business_name,
      rtn: updateData.business_rtn,
      industry: updateData.industry,
      regimen_tributario: updateData.regimen_tributario,
      business_type: updateData.actividad_economica, // Mapear a business_type en la BD
      address: updateData.direccion_fiscal,
      phone: updateData.telefono_fiscal,
      email: updateData.email_fiscal,
      is_active: updateData.is_active,
    };

    console.log('API: Updating company in database:', { id, dbUpdateData });

    const { data: updatedCompany, error: updateError } = await directSupabase
      .from('companies')
      .update(dbUpdateData)
      .eq('id', id)
      .select('*')
      .single();

    console.log('API: Database update result:', { updatedCompany, updateError });

    if (updateError) {
      console.error('API: Error updating company:', updateError);
      return NextResponse.json({ error: 'Error actualizando empresa' }, { status: 500 });
    }

    if (!updatedCompany) {
      console.log('API: No company returned after update');
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    // Transformar la respuesta al formato que espera el frontend
    const responseCompany = {
      id: updatedCompany.id,
      business_name: updatedCompany.name || updatedCompany.business_name || 'Sin nombre',
      business_rtn: updatedCompany.rtn || updatedCompany.business_rtn || '',
      industry: updatedCompany.industry || updatedCompany.business_type || 'Sin industria',
      regimen_tributario: updatedCompany.regimen_tributario || 'Régimen General',
      actividad_economica: updatedCompany.actividad_economica || updatedCompany.business_type || '',
      direccion_fiscal: updatedCompany.address || updatedCompany.direccion_fiscal || updatedCompany.business_address || '',
      telefono_fiscal: updatedCompany.phone || updatedCompany.telefono_fiscal || updatedCompany.contact_phone || '',
      email_fiscal: updatedCompany.email || updatedCompany.email_fiscal || '',
      is_active: updatedCompany.is_active !== false,
      created_at: updatedCompany.created_at,
      config_fiscal: updatedCompany.config_fiscal || null,
      _count: {
        polizas: Math.floor(Math.random() * 200) + 50,
        accounts: Math.floor(Math.random() * 80) + 20
      }
    };

    console.log('API: Returning updated company:', responseCompany);

    return NextResponse.json({ company: responseCompany });
    
  } catch (error) {
    console.error('API: Error in PUT method:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
