import { NextResponse } from 'next/server';

// MOCK USER PROFILE - Temporal hasta configurar Supabase
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'admin@contab.hn',
  first_name: 'Administrador',
  last_name: 'Contab',
  phone: '9999-9999',
  role: 'admin',
  company: 'Contab Honduras',
  department: 'TI',
  timezone: 'America/Tegucigalpa',
  language: 'es',
  email_notifications: true,
  push_notifications: true,
  two_factor_enabled: false,
  avatar_url: null,
  subscription_plan: 'premium',
  api_access: true,
  is_active: true,
  email_verified: true,
  last_sign_in_at: new Date().toISOString(),
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString(),
};

export async function GET() {
  try {
    console.log('GET /api/user/profile - MOCK');
    
    return NextResponse.json({ user: mockUser });
  } catch (error) {
    console.error('Error en GET /api/user/profile:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    console.log('PUT /api/user/profile - MOCK');
    
    const body = await request.json();
    console.log('Datos recibidos:', body);

    // Actualizar mock user con los datos recibidos
    const updatedUser = { ...mockUser, ...body, updated_at: new Date().toISOString() };

    console.log('Perfil actualizado (MOCK):', updatedUser);

    return NextResponse.json({
      user: updatedUser,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error en PUT /api/user/profile:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}
