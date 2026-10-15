export function getSupabaseServer() {
  // La ruta pasa el cliente a `getVariationsReport` (mockeado lo ignora), asi
  // que aqui basta un dummy; pero cualquier uso real de la DB debe ser fatal.
  return {
    from() {
      throw new Error('Sin DB en tests');
    },
  };
}
