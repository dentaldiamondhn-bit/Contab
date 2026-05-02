const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeRLSScript() {
  try {
    console.log('🔄 Reading RLS script...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'setup-rls-policies.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📊 Executing RLS policies script...');
    
    // Dividir el script en sentencias individuales
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        console.log(`🔧 Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          if (error) {
            // Si rpc no funciona, intentar con SQL directo
            console.log(`⚠️  RPC failed, trying direct SQL...`);
            
            // Para Supabase, necesitamos usar el endpoint REST
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey
              },
              body: JSON.stringify({ sql_query: statement })
            });
            
            if (!response.ok) {
              console.log(`⚠️  Statement ${i + 1} may need manual execution:`, statement.substring(0, 100) + '...');
            } else {
              console.log(`✅ Statement ${i + 1} executed successfully`);
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`⚠️  Statement ${i + 1} needs manual execution:`, err.message);
        }
      }
    }
    
    console.log('\n🎉 RLS setup completed!');
    console.log('📝 Please check Supabase Dashboard to verify all policies were created correctly.');
    console.log('🔗 Go to: Authentication → Policies to review all created policies.');
    
  } catch (error) {
    console.error('❌ Error executing RLS script:', error.message);
  }
}

executeRLSScript();
