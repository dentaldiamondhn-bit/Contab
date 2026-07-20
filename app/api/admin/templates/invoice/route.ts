import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();

    // Get role from multiple sources for better compatibility
    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        userRole = 
          user.publicMetadata?.role ||
          user.unsafeMetadata?.role ||
          (user.privateMetadata as any)?.role ||
          (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT' || isSuperAdminEmail;

    // Get user's tenant ID from metadata for authorization
    let userTenantId: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        userTenantId = 
          user.publicMetadata?.tenantId ||
          user.unsafeMetadata?.tenantId ||
          (user.privateMetadata as any)?.tenantId ||
          (sessionClaims?.metadata as any)?.tenantId;
      } catch (error) {
        console.error('Error getting user tenant from Clerk:', error);
      }
    }

    const body = await req.json();
    const { tenantId, name, description } = body;

    // Authorization: SUPER_ADMIN/SUPPORT can access any tenant, regular users need matching tenant
    if (!userId || (!isSuperAdmin && !isSuperAdminEmail && userTenantId !== tenantId)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Validar datos requeridos
    if (!tenantId || !name) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: tenantId, name' },
        { status: 400 }
      );
    }

    // Verificar que el tenant existe
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    // Leer el template HTML
    const templatePath = path.join(process.cwd(), 'templates', 'invoice-template.html');
    const templateContent = await readFile(templatePath, 'utf-8');

    // Crear directorio de uploads si no existe
    const uploadsDir = path.join(process.cwd(), 'uploads', 'templates');
    await mkdir(uploadsDir, { recursive: true });

    // Generar nombre de archivo único
    const fileName = `invoice-template-${Date.now()}.html`;
    const filePath = path.join(uploadsDir, fileName);

    // Escribir el archivo del template
    await writeFile(filePath, templateContent);

    // Crear registro del archivo en la base de datos
    const file = await db.file.create({
      data: {
        fileName: fileName,
        originalName: 'invoice-template.html',
        mimeType: 'text/html',
        fileSize: Buffer.byteLength(templateContent),
        filePath: `/uploads/templates/${fileName}`,
        uploadedBy: userId,
        tenantId: tenantId
      }
    });

    // Crear el template
    const template = await db.fileTemplate.create({
      data: {
        name: name,
        description: description || 'Template de factura',
        templateType: 'INVOICE',
        fileId: file.id,
        schema: JSON.stringify({
          companyName: 'string',
          companyAddress: 'string',
          companyPhone: 'string',
          companyRTN: 'string',
          invoiceNumber: 'string',
          invoiceDate: 'string',
          cai: 'string',
          customerName: 'string',
          customerRTN: 'string',
          customerAddress: 'string',
          items: 'array',
          subtotal: 'number',
          tax: 'number',
          total: 'number',
          caiRange: 'string',
          caiExpiryDate: 'string',
          caiStatus: 'string',
          notes: 'string',
          generationDate: 'string'
        }),
        isActive: true,
        isDefault: true,
        createdBy: userId,
        tenantId: tenantId
      }
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        templateType: template.templateType,
        isActive: template.isActive,
        isDefault: template.isDefault,
        createdAt: template.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error creando template de factura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const tenantId = req.nextUrl.searchParams.get('tenantId');

    // Get role from multiple sources for better compatibility
    let email = '';
    let userRole: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        userRole = 
          user.publicMetadata?.role ||
          user.unsafeMetadata?.role ||
          (user.privateMetadata as any)?.role ||
          (sessionClaims?.metadata as any)?.role;
      } catch (error) {
        console.error('Error getting user from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT' || isSuperAdminEmail;

    // Get user's tenant ID from metadata for authorization
    let userTenantId: string | undefined;
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        userTenantId = 
          user.publicMetadata?.tenantId ||
          user.unsafeMetadata?.tenantId ||
          (user.privateMetadata as any)?.tenantId ||
          (sessionClaims?.metadata as any)?.tenantId;
      } catch (error) {
        console.error('Error getting user tenant from Clerk:', error);
      }
    }

    // Authorization: SUPER_ADMIN/SUPPORT can access any tenant, regular users need matching tenant
    if (!userId || (!isSuperAdmin && !isSuperAdminEmail && userTenantId !== tenantId)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Se requiere tenantId' },
        { status: 400 }
      );
    }

    // Buscar templates de factura del tenant
    const templates = await db.fileTemplate.findMany({
      where: {
        tenantId: tenantId,
        templateType: 'INVOICE',
        isActive: true
      },
      include: {
        file: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      templates: templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        templateType: t.templateType,
        isActive: t.isActive,
        isDefault: t.isDefault,
        createdAt: t.createdAt,
        fileName: t.file.fileName
      }))
    });

  } catch (error: any) {
    console.error('Error obteniendo templates:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
