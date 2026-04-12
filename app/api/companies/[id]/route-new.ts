import { NextRequest, NextResponse } from "next/server";

// Datos de ejemplo para desarrollo
const mockCompanies = [
  {
    id: "1",
    business_name: "Dental Diamond Center",
    business_rtn: "08011999012345",
    industry: "Servicios Profesionales",
    regimen_tributario: "Régimen General",
    actividad_economica: "Consultoría Dental",
    direccion_fiscal: "Colonia Palmira, Tegucigalpa, Honduras",
    telefono_fiscal: "+504 2234-5678",
    email_fiscal: "contacto@dentaldiamond.com",
    is_active: true,
    created_at: "2024-01-15T10:30:00Z",
    _count: {
      polizas: 156,
      accounts: 45,
      talonarios: 8
    }
  },
  {
    id: "2",
    business_name: "Clínica Médica San José",
    business_rtn: "08011999067890",
    industry: "Salud",
    regimen_tributario: "Régimen General",
    actividad_economica: "Servicios Médicos",
    direccion_fiscal: "Boulevard Suyapa, Tegucigalpa, Honduras",
    telefono_fiscal: "+504 2255-6789",
    email_fiscal: "contacto@clinicamedica.com",
    is_active: true,
    created_at: "2024-01-20T14:15:00Z",
    _count: {
      polizas: 89,
      accounts: 32,
      talonarios: 5
    }
  },
  {
    id: "3",
    business_name: "Laboratorio Dental Pro",
    business_rtn: "08011999054321",
    industry: "Salud",
    regimen_tributario: "Régimen General",
    actividad_economica: "Laboratorio Dental",
    direccion_fiscal: "Avenida Morazán, San Pedro Sula, Honduras",
    telefono_fiscal: "+504 2345-1234",
    email_fiscal: "info@labdentalpro.com",
    is_active: false,
    created_at: "2024-01-10T09:30:00Z",
    _count: {
      polizas: 0,
      accounts: 0,
      talonarios: 0
    }
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;
    
    // Buscar la empresa por ID
    const company = mockCompanies.find(c => c.id === companyId);
    
    if (!company) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error getting company:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;
    const body = await request.json();
    
    // Buscar la empresa
    const companyIndex = mockCompanies.findIndex(c => c.id === companyId);
    if (companyIndex === -1) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 }
      );
    }
    
    // Actualizar la empresa (simulado)
    mockCompanies[companyIndex] = { ...mockCompanies[companyIndex], ...body };
    
    return NextResponse.json(mockCompanies[companyIndex]);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;
    
    // Eliminar la empresa (simulado)
    const index = mockCompanies.findIndex(c => c.id === companyId);
    if (index > -1) {
      mockCompanies.splice(index, 1);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
