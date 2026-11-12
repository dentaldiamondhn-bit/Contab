// Stub de clientes Supabase para tests de la ruta (POST no toca DB real;
// el servicio está mockeado y el cliente solo se pasa de largo).

export function createSupabaseClient() {
  throw new Error('Sin Supabase en tests');
}

export const supabase = {};
