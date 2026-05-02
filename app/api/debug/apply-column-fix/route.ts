import { NextResponse } from 'next/server';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    console.log('🔧 Aplicando corrección de columnas...');
    
    const { columns } = await request.json();
    
    if (!columns || !Array.isArray(columns)) {
      return NextResponse.json({ 
        error: 'Se requiere un array de columnas válidas' 
      }, { status: 400 });
    }
    
    console.log('📋 Columnas a usar:', columns);
    
    // Leer el archivo de onboarding
    const onboardingPath = join(process.cwd(), 'lib', 'actions', 'onboarding.ts');
    let onboardingContent = readFileSync(onboardingPath, 'utf-8');
    
    // Crear el mapeo de columnas basado en las columnas encontradas
    const columnMapping = {};
    
    // Mapeo básico - ajustar según las columnas encontradas
    if (columns.includes('business_name')) {
      columnMapping['business_name'] = 'data.companyData.name';
    } else if (columns.includes('businessname')) {
      columnMapping['businessname'] = 'data.companyData.name';
    }
    
    if (columns.includes('business_rtn')) {
      columnMapping['business_rtn'] = 'data.companyData.rtn || \'\'';
    } else if (columns.includes('businessrtn')) {
      columnMapping['businessrtn'] = 'data.companyData.rtn || \'\'';
    }
    
    if (columns.includes('business_email')) {
      columnMapping['business_email'] = 'data.companyData.email';
    } else if (columns.includes('businessemail')) {
      columnMapping['businessemail'] = 'data.companyData.email';
    }
    
    if (columns.includes('business_address')) {
      columnMapping['business_address'] = 'data.companyData.address || \'\'';
    } else if (columns.includes('businessaddress')) {
      columnMapping['businessaddress'] = 'data.companyData.address || \'\'';
    }
    
    // Columnas de tenant code
    if (columns.includes('tenant_code')) {
      columnMapping['tenant_code'] = 'generateTenantCode(data.companyData.name)';
    } else if (columns.includes('tenantcode')) {
      columnMapping['tenantcode'] = 'generateTenantCode(data.companyData.name)';
    }
    
    // Columnas de subscription
    if (columns.includes('subscription_plan')) {
      columnMapping['subscription_plan'] = '\'BASIC\'';
    } else if (columns.includes('subscriptionplan')) {
      columnMapping['subscriptionplan'] = '\'BASIC\'';
    }
    
    // Columnas de límites
    if (columns.includes('max_users')) {
      columnMapping['max_users'] = '5';
    } else if (columns.includes('maxusers')) {
      columnMapping['maxusers'] = '5';
    }
    
    if (columns.includes('max_storage')) {
      columnMapping['max_storage'] = '1000';
    } else if (columns.includes('maxstorage')) {
      columnMapping['maxstorage'] = '1000';
    }
    
    if (columns.includes('max_transactions')) {
      columnMapping['max_transactions'] = '1000';
    } else if (columns.includes('maxtransactions')) {
      columnMapping['maxtransactions'] = '1000';
    }
    
    if (columns.includes('monthly_cost')) {
      columnMapping['monthly_cost'] = '0';
    } else if (columns.includes('monthlycost')) {
      columnMapping['monthlycost'] = '0';
    }
    
    // Columnas de estado
    if (columns.includes('is_active')) {
      columnMapping['is_active'] = 'true';
    } else if (columns.includes('isactive')) {
      columnMapping['isactive'] = 'true';
    }
    
    // Columnas de timestamps
    if (columns.includes('created_at')) {
      columnMapping['created_at'] = 'new Date().toISOString()';
    } else if (columns.includes('createdat')) {
      columnMapping['createdat'] = 'new Date().toISOString()';
    }
    
    if (columns.includes('updated_at')) {
      columnMapping['updated_at'] = 'new Date().toISOString()';
    } else if (columns.includes('updatedat')) {
      columnMapping['updatedat'] = 'new Date().toISOString()';
    }
    
    console.log('🗺️ Mapeo de columnas:', columnMapping);
    
    // Construir el objeto de inserción
    const insertObject = {
      id: 'generateTenantCode(data.companyData.name) + \'-\' + Date.now()',
      ...columnMapping
    };
    
    const insertString = JSON.stringify(insertObject, null, 6)
      .replace(/"/g, '')
      .replace(/generateTenantCode\(data\.companyData\.name\) \+ \'-\' \+ Date.now\(\)/g, 'generateTenantCode(data.companyData.name) + \'-\' + Date.now()')
      .replace(/new Date\(\)\.toISOString\(\)/g, 'new Date().toISOString()')
      .replace(/\'BASIC\'/g, '\'BASIC\'')
      .replace(/\'/g, '\'');
    
    console.log('📝 Objeto de inserción generado:', insertString);
    
    // Reemplazar las inserciones en el archivo
    const insertRegex = /\.insert\(\[\{[\s\S]*?\}\]\)/g;
    
    const newInsert = `.insert([{
      id: generateTenantCode(data.companyData.name) + '-' + Date.now(),
      ${Object.entries(columnMapping).map(([key, value]) => `          ${key}: ${value}`).join(',\n')}
    }])`;
    
    // Reemplazar todas las inserciones en el archivo
    onboardingContent = onboardingContent.replace(insertRegex, newInsert);
    
    // Guardar el archivo modificado
    writeFileSync(onboardingPath, onboardingContent);
    
    console.log('✅ Archivo de onboarding actualizado');
    
    return NextResponse.json({
      success: true,
      message: '✅ Corrección de columnas aplicada exitosamente',
      columnMapping,
      insertObject
    });
    
  } catch (error) {
    console.error('❌ Error aplicando corrección:', error);
    return NextResponse.json({ 
      error: 'Error aplicando corrección', 
      details: error 
    }, { status: 500 });
  }
}
