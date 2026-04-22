import { headers } from 'next/headers'
import { supabase, getCurrentTenantFromHeaders, getCurrentUserFromHeaders } from './standard-client'

// Helper para obtener headers de la solicitud actual
export async function getRequestHeaders(): Promise<Headers> {
  return await headers()
}

// Helper para crear un cliente con tenant filtering automático para Server Components
export async function createServerSupabaseClient() {
  const requestHeaders = await getRequestHeaders()
  const tenantId = getCurrentTenantFromHeaders(requestHeaders)
  const userId = getCurrentUserFromHeaders(requestHeaders)

  // Si no hay tenant, retornar el cliente estándar
  if (!tenantId) {
    return supabase
  }

  // Crear un wrapper que añade tenantId automáticamente
  const client = {
    ...supabase,
    from: (table: string) => {
      const query = supabase.from(table)
      
      // Tablas multi-tenant que necesitan filtering
      const multiTenantTables = [
        'User', 'Account', 'Contacto', 'Transaction', 'JournalEntry',
        'ConfigFiscal', 'CAI', 'Withholding', 'Reconciliation',
        'BookClosing', 'AuditLog', 'TaxConfig', 'ExchangeRate',
        'CurrencyHistory', 'CAIAlert', 'GlobalSettings'
      ]

      if (multiTenantTables.includes(table)) {
        return (query as any).eq('tenantId', tenantId)
      }

      return query
    }
  }

  return client
}

// Helper para obtener el tenant actual
export async function getCurrentTenant(): Promise<string | null> {
  const requestHeaders = await getRequestHeaders()
  return getCurrentTenantFromHeaders(requestHeaders)
}

// Helper para obtener el usuario actual
export async function getCurrentUser(): Promise<string | null> {
  const requestHeaders = await getRequestHeaders()
  return getCurrentUserFromHeaders(requestHeaders)
}

// Helper simplificado para Server Components
export const serverSupabase = await createServerSupabaseClient()
