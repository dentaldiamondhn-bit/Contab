const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAuthIdDirect() {
  console.log('🔧 Aplicando fix directo para campo authId...\n');
  
  try {
    // Usar SQL directo con el cliente de Supabase
    console.log('1️⃣ Ejecutando SQL para agregar authId...');
    
    const { data, error } = await supabase
      .from('User')
      .select('id, email, authId, tenantid, role')
      .limit(1);
    
    if (error && error.message.includes('authId does not exist')) {
      console.log('❌ Campo authId no existe. Necesitas ejecutar el SQL manualmente:');
      console.log('\n📋 SQL para ejecutar en Supabase Dashboard:');
      console.log('-- Copia y pega esto en el SQL Editor de Supabase');
      console.log('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS authId TEXT;');
      console.log('CREATE INDEX IF NOT EXISTS idx_user_authId ON "User"(authId);');
      console.log('UPDATE "User" SET authId = \'temp-clerk-id-\' || id WHERE authId IS NULL;');
      
      console.log('\n🔗 Pasos para ejecutar:');
      console.log('1. Ve a https://supabase.com/dashboard');
      console.log('2. Selecciona tu proyecto');
      console.log('3. Ve a SQL Editor');
      console.log('4. Pega y ejecuta el SQL anterior');
      console.log('5. Recarga la aplicación');
      
    } else if (error) {
      console.log('❌ Error inesperado:', error.message);
    } else {
      console.log('✅ Campo authId ya existe');
      console.log('Usuarios:', data);
    }
    
  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

fixAuthIdDirect().catch(console.error);
