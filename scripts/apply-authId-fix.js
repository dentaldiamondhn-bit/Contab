const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyAuthIdFix() {
  console.log('🔧 Aplicando fix para campo authId...\n');
  
  try {
    // Paso 1: Agregar campo authId
    console.log('1️⃣ Agregando campo authId...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS authId TEXT;'
    });
    
    if (addError) {
      console.log('❌ Error agregando authId:', addError.message);
    } else {
      console.log('✅ Campo authId agregado exitosamente');
    }
    
    // Paso 2: Crear índice
    console.log('\n2️⃣ Creando índice para authId...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_authId ON "User"(authId);'
    });
    
    if (indexError) {
      console.log('❌ Error creando índice:', indexError.message);
    } else {
      console.log('✅ Índice creado exitosamente');
    }
    
    // Paso 3: Actualizar usuarios existentes
    console.log('\n3️⃣ Actualizando usuarios existentes...');
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: 'UPDATE "User" SET authId = \'temp-clerk-id-\' || id WHERE authId IS NULL;'
    });
    
    if (updateError) {
      console.log('❌ Error actualizando usuarios:', updateError.message);
    } else {
      console.log('✅ Usuarios actualizados exitosamente');
    }
    
    // Paso 4: Verificar resultado
    console.log('\n4️⃣ Verificando resultado...');
    const { data: users, error: verifyError } = await supabase
      .from('User')
      .select('id, email, authId, tenantid, role')
      .limit(3);
    
    if (verifyError) {
      console.log('❌ Error verificando:', verifyError.message);
    } else {
      console.log('✅ Verificación exitosa:');
      users.forEach(user => {
        console.log(`   📧 ${user.email} - authId: ${user.authId || 'SIN AUTHID'} - Tenant: ${user.tenantid || 'SIN TENANT'}`);
      });
    }
    
    console.log('\n🎉 ¡Fix de authId aplicado exitosamente!');
    
  } catch (error) {
    console.log('❌ Error aplicando fix:', error.message);
  }
}

applyAuthIdFix().catch(console.error);
