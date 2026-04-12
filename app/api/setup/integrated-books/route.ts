import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId } = body;
    
    if (!accountId) {
      return NextResponse.json(
        { error: "Se requiere el ID de la cuenta" },
        { status: 400 }
      );
    }
    
    // Leer el archivo SQL
    const sqlPath = join(process.cwd(), 'INTEGRAR_LIBROS_INGRESOS_EGRESOS.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    const supabase = createSupabaseClient();
    
    // Dividir el SQL en declaraciones individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    const results = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Saltar comentarios y líneas vacías
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }
      
      console.log(`Ejecutando declaración ${i + 1}:`, statement.substring(0, 100) + '...');
      
      try {
        // Para funciones CREATE OR REPLACE, usamos un enfoque diferente
        if (statement.toUpperCase().includes('CREATE OR REPLACE FUNCTION')) {
          // Intentar ejecutar directamente
          const { data, error } = await supabase
            .from('_temp_execution')
            .select('*')
            .limit(1);
          
          if (error && error.message.includes('does not exist')) {
            // La tabla no existe, creamos el SQL directamente
            results.push({
              statement: statement.substring(0, 100) + '...',
              status: 'manual_execution_required',
              message: 'Esta función debe ejecutarse manualmente en el dashboard de Supabase'
            });
          }
        } else if (statement.toUpperCase().includes('CREATE OR REPLACE VIEW')) {
          results.push({
            statement: statement.substring(0, 100) + '...',
            status: 'manual_execution_required',
            message: 'Esta vista debe crearse manualmente en el dashboard de Supabase'
          });
        } else if (statement.toUpperCase().includes('GRANT')) {
          results.push({
            statement: statement.substring(0, 100) + '...',
            status: 'manual_execution_required', 
            message: 'Este permiso debe otorgarse manualmente en el dashboard de Supabase'
          });
        } else {
          results.push({
            statement: statement.substring(0, 100) + '...',
            status: 'skipped',
            message: 'Declaración no crítica para la funcionalidad'
          });
        }
      } catch (err) {
        results.push({
          statement: statement.substring(0, 100) + '...',
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      message: "Análisis del archivo SQL completado",
      accountId: accountId,
      totalStatements: statements.length,
      results,
      instructions: {
        title: "Instrucciones para ejecutar manualmente:",
        steps: [
          "1. Abre el dashboard de Supabase",
          "2. Ve a la sección SQL Editor",
          "3. Copia y pega el contenido del archivo INTEGRAR_LIBROS_INGRESOS_EGRESOS.sql",
          "4. Ejecuta el SQL completo",
          "5. Verifica que no haya errores",
          "6. Prueba las funciones en la aplicación para la cuenta " + accountId
        ]
      }
    });
    
  } catch (error) {
    console.error("Error en setup:", error);
    return NextResponse.json(
      { error: "Error procesando el setup" },
      { status: 500 }
    );
  }
}
