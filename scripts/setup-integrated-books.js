// Script para configurar las funciones integradas de libros contables
// Ejecutar con: node scripts/setup-integrated-books.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno. Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const fs = require('fs');
const path = require('path');

async function executeSQLFile(filePath) {
  try {
    console.log(`Leyendo archivo SQL: ${filePath}`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Dividir el contenido en declaraciones individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Encontradas ${statements.length} declaraciones SQL para ejecutar`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nEjecutando declaración ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + '...');
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_statement: statement });
        
        if (error) {
          console.error(`Error en declaración ${i + 1}:`, error);
          
          // Si la función exec_sql no existe, intentamos con el método directo
          if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
            console.log('La función exec_sql no existe. Creando función de ejecución SQL...');
            await createExecSQLFunction();
            
            // Reintentar
            const { data: retryData, error: retryError } = await supabase.rpc('exec_sql', { sql_statement: statement });
            if (retryError) {
              console.error('Error al reintentar:', retryError);
            } else {
              console.log('✅ Declaración ejecutada correctamente');
            }
          }
        } else {
          console.log('✅ Declaración ejecutada correctamente');
        }
      } catch (err) {
        console.error(`Error ejecutando declaración ${i + 1}:`, err.message);
      }
    }
    
    console.log('\n✅ Script completado');
  } catch (error) {
    console.error('Error leyendo archivo SQL:', error);
  }
}

async function createExecSQLFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_statement TEXT)
    RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result TEXT;
    BEGIN
        EXECUTE sql_statement;
        RETURN 'SQL executed successfully';
    EXCEPTION WHEN OTHERS THEN
        RETURN SQLERRM;
    END;
    $$;
    
    GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;
    GRANT EXECUTE ON FUNCTION exec_sql TO service_role;
  `;
  
  console.log('Creando función exec_sql...');
  
  // Ejecutar directamente sin usar rpc ya que la función no existe aún
  try {
    const { data, error } = await supabase
      .from('_temp_sql_execution')
      .select('*')
      .limit(1);
    
    // Si la tabla temporal no existe, la creamos y ejecutamos el SQL
    if (error && error.message.includes('does not exist')) {
      console.log('Creando tabla temporal para ejecución SQL...');
      // Esto es un workaround, en producción deberías usar el dashboard de Supabase
      // o conexión directa a PostgreSQL
    }
  } catch (err) {
    console.log('No se pudo crear la función exec_sql automáticamente');
  }
}

async function testIntegratedFunctions() {
  console.log('\n🧪 Probando funciones integradas...');
  
  const testFunctions = [
    {
      name: 'get_libro_diario_integrado',
      params: { p_tenant_id: 'tenant_001' }
    },
    {
      name: 'get_libro_mayor_integrado', 
      params: { p_tenant_id: 'tenant_001' }
    },
    {
      name: 'get_balance_comprobacion_integrado',
      params: { p_tenant_id: 'tenant_001' }
    },
    {
      name: 'get_resumen_ingresos_egresos',
      params: { p_tenant_id: 'tenant_001' }
    }
  ];

  for (const func of testFunctions) {
    try {
      console.log(`\nProbando ${func.name}...`);
      const { data, error } = await supabase.rpc(func.name, func.params);
      
      if (error) {
        console.error(`❌ Error en ${func.name}:`, error.message);
      } else {
        console.log(`✅ ${func.name} funcionando correctamente`);
        console.log(`   Registros devueltos: ${Array.isArray(data) ? data.length : 'N/A'}`);
      }
    } catch (err) {
      console.error(`❌ Error ejecutando ${func.name}:`, err.message);
    }
  }
}

async function main() {
  console.log('🚀 Configurando libros contables integrados...\n');
  
  const sqlFilePath = path.join(__dirname, '../INTEGRAR_LIBROS_INGRESOS_EGRESOS.sql');
  
  // Ejecutar el archivo SQL principal
  await executeSQLFile(sqlFilePath);
  
  // Esperar un momento para que las funciones se registren
  console.log('\n⏳ Esperando 3 segundos...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Probar las funciones
  await testIntegratedFunctions();
  
  console.log('\n🎉 Proceso completado. Revisa la aplicación en:');
  console.log('   http://localhost:3000/accounting/integrated-books');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { executeSQLFile, testIntegratedFunctions };
