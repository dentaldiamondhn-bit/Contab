import { clerkClient } from '@clerk/nextjs/server';

/**
 * Actualiza el tenantId en los metadatos públicos de Clerk.
 * Esto hará que el valor esté disponible en sessionClaims automáticamente.
 */
export async function updateClerkTenantId(userId: string, tenantId: string) {
  try {
    const client = await clerkClient();
    
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        tenantId: tenantId,
        // Puedes agregar más info como el rol si es necesario
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error al actualizar metadatos en Clerk:', error);
    return { success: false, error };
  }
}
