import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();

    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        userRole = user.publicMetadata?.role || user.unsafeMetadata?.role || (user.privateMetadata as any)?.role || (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT' || isSuperAdminEmail;

    let userTenantId: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        userTenantId = user.publicMetadata?.tenantId || user.unsafeMetadata?.tenantId || (user.privateMetadata as any)?.tenantId || (sessionClaims?.metadata as any)?.tenantId;
      } catch (error) {
        console.error('Error getting user tenant from Clerk:', error);
      }
    }

    const body = await req.json();
    const { tenantId, name, description } = body;

    if (!userId || (!isSuperAdmin && !isSuperAdminEmail && userTenantId !== tenantId)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!tenantId || !name) {
      return NextResponse.json({ error: 'Faltan datos requeridos: tenantId, name' }, { status: 400 });
    }

    const { data: tenant } = await supabase.from('Tenant').select('id').eq('id', tenantId).single();
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const fileId = crypto.randomUUID();
    const templateId = crypto.randomUUID();

    const { error: fileError } = await supabase.from('File').insert({
      id: fileId,
      tenant_id: tenantId,
      original_name: 'invoice-template.html',
      file_name: 'invoice-template.html',
      file_path: '/templates/invoice-template.html',
      file_size: 0,
      mime_type: 'text/html',
      file_type: 'template',
      category: 'template',
      description: 'Template de factura por defecto',
      uploaded_by: userId,
      status: 'active',
      created_at: new Date().toISOString(),
    });

    if (fileError) {
      console.error('Error creating file record:', fileError);
    }

    const { error: insertError } = await supabase.from('FileTemplate').insert({
      id: templateId,
      name: name,
      description: description || 'Template de factura',
      template_type: 'INVOICE',
      file_id: fileId,
      schema: JSON.stringify({
        companyName: 'string', companyAddress: 'string', companyPhone: 'string',
        companyRTN: 'string', invoiceNumber: 'string', invoiceDate: 'string',
        cai: 'string', customerName: 'string', customerRTN: 'string',
        customerAddress: 'string', items: 'array', subtotal: 'number',
        tax: 'number', total: 'number', caiRange: 'string',
        caiExpiryDate: 'string', caiStatus: 'string', notes: 'string',
        generationDate: 'string'
      }),
      is_active: true,
      is_default: true,
      created_by: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Error creating template:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template: { id: templateId, name, description: description || 'Template de factura', templateType: 'INVOICE', isActive: true, isDefault: true }
    });

  } catch (error: any) {
    console.error('Error creando template de factura:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const tenantId = req.nextUrl.searchParams.get('tenantId');

    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        userRole = user.publicMetadata?.role || user.unsafeMetadata?.role || (user.privateMetadata as any)?.role || (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT' || isSuperAdminEmail;

    let userTenantId: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        userTenantId = user.publicMetadata?.tenantId || user.unsafeMetadata?.tenantId || (user.privateMetadata as any)?.tenantId || (sessionClaims?.metadata as any)?.tenantId;
      } catch (error) {
        console.error('Error getting user tenant from Clerk:', error);
      }
    }

    if (!userId || (!isSuperAdmin && !isSuperAdminEmail && userTenantId !== tenantId)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Se requiere tenantId' }, { status: 400 });
    }

    const { data: templates, error } = await supabase
      .from('FileTemplate')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_type', 'INVOICE')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('FileTemplate table may not exist or have RLS issues:', error.message);
      return NextResponse.json({ success: true, templates: [] });
    }

    return NextResponse.json({
      success: true,
      templates: (templates || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        templateType: t.template_type,
        isActive: t.is_active,
        isDefault: t.is_default,
        createdAt: t.created_at,
      }))
    });

  } catch (error: any) {
    console.error('Error obteniendo templates:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
