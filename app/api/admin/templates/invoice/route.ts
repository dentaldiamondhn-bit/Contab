import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const userEmail = sessionClaims?.email;

    // Verificar autorización
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userEmail === 'sucachi.123@gmail.com';
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { tenantId, name, description } = body;

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
        size: Buffer.byteLength(templateContent),
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
    const userRole = (sessionClaims?.metadata as any)?.role;
    const userEmail = sessionClaims?.email;

    // Verificar autorización
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userEmail === 'sucachi.123@gmail.com';
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

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
      templates: templates.map(t => ({
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
