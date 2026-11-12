import { NextRequest, NextResponse } from 'next/server';

// Mock de datos para desarrollo
const mockRevisionesLegales = [
  {
    id: '1',
    categoria: 'arrendamiento',
    titulo: 'Contrato de Arrendamiento - Consultorio Principal',
    descripcion: 'Local comercial en Colonia Los Robles',
    fechaVencimiento: '2026-12-31',
    estado: 'proximo',
    monto: 15000,
    detalles: {
      'Monto Alquiler': 'L 15,000.00',
      'Ajuste Anual': '5%',
      'Retención Aplicable': '10%',
      'Depósito Garantía': 'L 45,000.00',
      'Arrendador': 'Inmobiliaria Honduras S.A.'
    }
  },
  {
    id: '2',
    categoria: 'seguro',
    titulo: 'Póliza de Seguro - Responsabilidad Civil',
    descripcion: 'Cobertura general para la clínica dental',
    fechaVencimiento: '2026-06-15',
    estado: 'proximo',
    monto: 36000,
    detalles: {
      'Prima Anual': 'L 36,000.00',
      'Forma de Pago': '12 cuotas mensuales',
      'Cuota Mensual': 'L 3,000.00',
      'Compañía': 'Seguros Atlántida S.A.'
    },
    contacto: {
      nombre: 'Carlos Méndez',
      telefono: '504-2234-5678',
      email: 'carlos.mendez@segurosatlantida.hn'
    }
  },
  {
    id: '3',
    categoria: 'licencia',
    titulo: 'Permiso de Operación Municipal',
    descripcion: 'Licencia de funcionamiento emitida por Alcaldía',
    fechaVencimiento: '2026-12-31',
    estado: 'proximo',
    detalles: {
      'Impuesto Municipal': 'L 8,000.00',
      'Fecha Emisión': '2024-12-31',
      'Número de Licencia': 'MUN-2024-12345'
    }
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 API endpoint llamado:', `/api/companies/${params.id}/legal/revisiones`);
  
  try {
    // Por ahora retornamos datos mock para desarrollo
    // TODO: Conectar con la base de datos usando los procedimientos almacenados
    const revisionesFiltradas = mockRevisionesLegales;
    
    console.log('✅ Datos retornados:', revisionesFiltradas.length, 'revisiones');
    
    return NextResponse.json(revisionesFiltradas);
  } catch (error) {
    console.error('❌ Error al obtener revisiones legales:', error);
    return NextResponse.json(
      { error: 'Error al obtener revisiones legales', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
