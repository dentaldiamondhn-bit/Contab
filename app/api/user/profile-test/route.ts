import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  try {
    console.log('Iniciando GET /api/user/profile');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Verificar si la tabla users existe
    const { data: tables, error: tableError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (tableError) {
      console.error('Error al verificar tabla users:', tableError);
      return Response.json({
        error: 'Tabla users no existe o no es accesible',
        details: tableError,
        suggestion: 'Ejecuta el script CREATE_USER_PROFILE.sql primero'
      }, { status: 500 });
    }

    // Obtener usuario de ejemplo
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', '550e8400-e29b-41d4-a716-446655440001')
      .single();

    if (error) {
      console.error('Error al obtener usuario:', error);
      return Response.json({
        error: 'Error al obtener usuario',
        details: error
      }, { status: 500 });
    }

    if (!user) {
      return Response.json({
        error: 'Usuario de ejemplo no encontrado',
        suggestion: 'Ejecuta el script SQL para crear usuarios de ejemplo'
      }, { status: 404 });
    }

    console.log('Usuario encontrado:', user);

    return Response.json({
      user: user,
      message: 'Perfil cargado exitosamente'
    });

  } catch (error) {
    console.error('Error en GET /api/user/profile:', error);
    return Response.json({
      error: 'Error interno del servidor',
      details: error
    }, { status: 500 });
  }
}
