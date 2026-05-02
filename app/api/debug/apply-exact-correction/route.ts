import { NextResponse } from 'next/server';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    console.log('🔧 Aplicando corrección EXACTA de columnas...');
    
    const { columns } = await request.json();
    
    if (!columns || !Array.isArray(columns)) {
      return NextResponse.json({ 
        error: 'Se requiere un array de columnas válidas' 
      }, { status: 400 });
    }
    
    console.log('📋 Columnas que existen en la tabla:', columns);
    
    // Leer el archivo de onboarding
    const onboardingPath = join(process.cwd(), 'lib', 'actions', 'onboarding.ts');
    let onboardingContent = readFileSync(onboardingPath, 'utf-8');
    
    // Crear el objeto de inserción SOLO con las columnas que existen
    const insertObject: Record<string, string> = {};
    
    // Mapeo de campos de datos a columnas de la tabla
    const fieldMapping: Record<string, string> = {};
    
    // Determinar el mapeo basado en las columnas que existen
    columns.forEach(column => {
      switch (column) {
        case 'business_name':
          fieldMapping[column] = 'data.companyData.name';
          break;
        case 'businessname':
          fieldMapping[column] = 'data.companyData.name';
          break;
        case 'business_rtn':
          fieldMapping[column] = 'data.companyData.rtn || \'\'';
          break;
        case 'businessrtn':
          fieldMapping[column] = 'data.companyData.rtn || \'\'';
          break;
        case 'business_email':
          fieldMapping[column] = 'data.companyData.email';
          break;
        case 'businessemail':
          fieldMapping[column] = 'data.companyData.email';
          break;
        case 'business_address':
          fieldMapping[column] = 'data.companyData.address || \'\'';
          break;
        case 'businessaddress':
          fieldMapping[column] = 'data.companyData.address || \'\'';
          break;
        case 'tenant_code':
          fieldMapping[column] = 'generateTenantCode(data.companyData.name)';
          break;
        case 'tenantcode':
          fieldMapping[column] = 'generateTenantCode(data.companyData.name)';
          break;
        case 'subscription_plan':
          fieldMapping[column] = '\'BASIC\'';
          break;
        case 'subscriptionplan':
          fieldMapping[column] = '\'BASIC\'';
          break;
        case 'max_users':
          fieldMapping[column] = '5';
          break;
        case 'maxusers':
          fieldMapping[column] = '5';
          break;
        case 'max_storage':
          fieldMapping[column] = '1000';
          break;
        case 'maxstorage':
          fieldMapping[column] = '1000';
          break;
        case 'max_transactions':
          fieldMapping[column] = '1000';
          break;
        case 'maxtransactions':
          fieldMapping[column] = '1000';
          break;
        case 'monthly_cost':
          fieldMapping[column] = '0';
          break;
        case 'monthlycost':
          fieldMapping[column] = '0';
          break;
        case 'is_active':
          fieldMapping[column] = 'true';
          break;
        case 'isactive':
          fieldMapping[column] = 'true';
          break;
        case 'created_at':
          fieldMapping[column] = 'new Date().toISOString()';
          break;
        case 'createdat':
          fieldMapping[column] = 'new Date().toISOString()';
          break;
        case 'updated_at':
          fieldMapping[column] = 'new Date().toISOString()';
          break;
        case 'updatedat':
          fieldMapping[column] = 'new Date().toISOString()';
          break;
      }
    });
    
    // Construir el objeto de inserción
    insertObject.id = 'generateTenantCode(data.companyData.name) + \'-\' + Date.now()';
    Object.assign(insertObject, fieldMapping);
    
    console.log('🗺️ Mapeo de campos:', fieldMapping);
    console.log('📝 Objeto de inserción final:', insertObject);
    
    // Generar el string de inserción
    const insertLines = [
      'id: generateTenantCode(data.companyData.name) + \'-\' + Date.now()',
      ...Object.entries(fieldMapping).map(([key, value]) => `          ${key}: ${value}`)
    ];
    
    const newInsert = `.insert([{\n${insertLines.join(',\n')}\n        }])`;
    
    // Reemplazar las inserciones en el archivo
    const insertRegex = /\.insert\(\[\{[\s\S]*?\}\]\)/g;
    
    // Contar cuántas inserciones se reemplazaron
    const matches = onboardingContent.match(insertRegex);
    const replacementCount = matches ? matches.length : 0;
    
    // Reemplazar todas las inserciones
    onboardingContent = onboardingContent.replace(insertRegex, newInsert);
    
    // Guardar el archivo modificado
    writeFileSync(onboardingPath, onboardingContent);
    
    console.log('✅ Archivo de onboarding actualizado con columnas exactas');
    console.log(`📊 Se reemplazaron ${replacementCount} inserciones`);
    
    return NextResponse.json({
      success: true,
      message: '✅ Corrección exacta aplicada exitosamente',
      columnsUsed: columns,
      fieldMapping,
      insertObject,
      replacementsCount: replacementCount
    });
    
  } catch (error) {
    console.error('❌ Error aplicando corrección exacta:', error);
    return NextResponse.json({ 
      error: 'Error aplicando corrección exacta', 
      details: error 
    }, { status: 500 });
  }
}
