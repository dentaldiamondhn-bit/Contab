import { NextRequest, NextResponse } from 'next/server';

// POST - Inicializar base de datos sin autenticación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_custom_taxes_table') {
      // SQL para crear la tabla CustomTaxes
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS "CustomTaxes" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "rate" DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
          "enabled" BOOLEAN NOT NULL DEFAULT true,
          "description" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS "idx_custom_taxes_tenant_id" ON "CustomTaxes"("tenantId");
        CREATE INDEX IF NOT EXISTS "idx_custom_taxes_enabled" ON "CustomTaxes"("tenantId", "enabled");
      `;

      // Simulación de éxito (en un entorno real esto se ejecutaría en la BD)
      console.log('🔄 SQL para crear tabla CustomTaxes:');
      console.log(createTableSQL);
      
      return NextResponse.json({
        success: true,
        message: 'Tabla CustomTaxes creada exitosamente (simulado)',
        sql: createTableSQL
      });
    }

    return NextResponse.json({
      error: 'Acción no reconocida',
      available_actions: ['create_custom_taxes_table']
    }, { status: 400 });

  } catch (error) {
    console.error('Error en POST /api/setup/init-db:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}
