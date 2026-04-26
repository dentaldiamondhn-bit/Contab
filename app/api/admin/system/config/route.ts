import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// Memoria temporal para simular persistencia
let systemConfigs: any[] = [
  {
    id: '1',
    key: 'contabhn_cai',
    value: JSON.stringify({
      cai: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
      rangeStart: 1,
      rangeEnd: 1000,
      currentNumber: 1,
      expiryDate: '2024-12-31T23:59:59.000Z',
      rtn: '05011991078006',
      businessName: 'CONTAB HN',
      businessAddress: 'Tegucigalpa, Honduras',
      establishmentCode: '001',
      pointOfSaleCode: '001',
      economicActivity: '631100',
      taxRate: 15
    }),
    description: 'Configuración del CAI para ContabHN',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    key: 'contabhn_invoice_settings',
    value: JSON.stringify({
      currency: 'HNL',
      language: 'es',
      dateFormat: 'DD/MM/YYYY',
      taxRate: 15,
      exemptTaxRate: 0,
      includeQR: true,
      includeBarcode: false,
      footerText: 'Gracias por su preferencia. Esta factura es un documento fiscal válido.'
    }),
    description: 'Configuración general de facturación para ContabHN',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(
  req: NextRequest
) {
  try {
    console.log('🔄 GET /api/admin/system/config - Iniciando...');
    
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const userEmail = sessionClaims?.email;

    console.log('🔐 Auth check:', { userId, userRole, userEmail });

    // Verificar autorización
    if (!userId) {
      console.log('❌ No userId provided');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener email del usuario para verificación
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        console.log('📧 Email from Clerk:', email);
      } catch (error) {
        console.error('Error getting user email from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isAuthorized = userRole === 'SUPER_ADMIN' || isSuperAdminEmail;

    console.log('✅ Authorization check:', { isAuthorized, isSuperAdminEmail, email });

    if (!isAuthorized) {
      console.log('❌ Not authorized');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.log('📦 Returning configs from memory:', systemConfigs);

    return NextResponse.json({
      success: true,
      configs: systemConfigs
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo configuración del sistema:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest
) {
  try {
    console.log('🔄 POST /api/admin/system/config - Iniciando...');
    
    const { userId, sessionClaims } = await auth();
    const userRole = (sessionClaims?.metadata as any)?.role;
    const userEmail = sessionClaims?.email;

    console.log('🔐 Auth check:', { userId, userRole, userEmail });

    // Verificar autorización
    if (!userId) {
      console.log('❌ No userId provided');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener email del usuario para verificación
    let email = '';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress || '';
        console.log('📧 Email from Clerk:', email);
      } catch (error) {
        console.error('Error getting user email from Clerk:', error);
      }
    }

    const isSuperAdminEmail = email === 'sucachi.123@gmail.com';
    const isAuthorized = userRole === 'SUPER_ADMIN' || isSuperAdminEmail;

    console.log('✅ Authorization check:', { isAuthorized, isSuperAdminEmail, email });

    if (!isAuthorized) {
      console.log('❌ Not authorized');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    console.log('📝 Request body:', body);
    
    const { key, value, description } = body;

    if (!key || !value) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ error: 'Se requieren key y value' }, { status: 400 });
    }

    console.log('🔍 Validating config for key:', key);

    // Validaciones específicas para el CAI
    if (key === 'contabhn_cai') {
      const caiConfig = JSON.parse(value);
      console.log('🔍 CAI config parsed:', caiConfig);
      
      if (!caiConfig.cai?.trim()) {
        console.log('❌ CAI is required');
        return NextResponse.json({ error: 'El CAI es requerido' }, { status: 400 });
      }
      
      if (!caiConfig.rtn?.trim()) {
        console.log('❌ RTN is required');
        return NextResponse.json({ error: 'El RTN es requerido' }, { status: 400 });
      }
      
      if (caiConfig.rangeStart >= caiConfig.rangeEnd) {
        console.log('❌ Invalid range');
        return NextResponse.json({ error: 'El rango inicial debe ser menor que el rango final' }, { status: 400 });
      }
      
      if (caiConfig.currentNumber < caiConfig.rangeStart || caiConfig.currentNumber > caiConfig.rangeEnd) {
        console.log('❌ Current number out of range');
        return NextResponse.json({ error: 'El número actual debe estar dentro del rango' }, { status: 400 });
      }
      
      console.log('✅ CAI validation passed');
    }

    // Simulación de guardado en memoria
    console.log('💾 Saving to memory...');
    
    // Buscar si la configuración ya existe
    const existingIndex = systemConfigs.findIndex(config => config.key === key);
    
    if (existingIndex >= 0) {
      // Actualizar configuración existente
      systemConfigs[existingIndex] = {
        ...systemConfigs[existingIndex],
        value,
        description: description || systemConfigs[existingIndex].description,
        updatedAt: new Date().toISOString()
      };
      console.log('✅ Updated existing config:', systemConfigs[existingIndex]);
    } else {
      // Crear nueva configuración
      const newConfig = {
        id: Date.now().toString(),
        key,
        value,
        description: description || `Configuración para ${key}`,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      systemConfigs.push(newConfig);
      console.log('✅ Created new config:', newConfig);
    }
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Save operation completed');
    console.log('📦 Current memory state:', systemConfigs);

    // Devolver la configuración actualizada
    const updatedConfig = existingIndex >= 0 
      ? systemConfigs[existingIndex]
      : systemConfigs.find(config => config.key === key);

    console.log('📤 Sending response:', updatedConfig);

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: 'Configuración guardada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error guardando configuración del sistema:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
