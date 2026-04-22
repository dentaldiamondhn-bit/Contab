import { headers } from 'next/headers'
import { supabase, getCurrentTenantFromHeaders, getCurrentUserFromHeaders } from './standard-client'

// Helper para obtener headers de la solicitud actual
export function getRequestHeaders(): Headers {
  return headers() as any
}

// Helper para crear un cliente con tenant filtering automático para Server Components
export function createServerSupabaseClient() {
  const requestHeaders = getRequestHeaders()
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
export function getCurrentTenant(): string | null {
  const requestHeaders = getRequestHeaders()
  return getCurrentTenantFromHeaders(requestHeaders)
}

// Helper para obtener el usuario actual
export function getCurrentUser(): string | null {
  const requestHeaders = getRequestHeaders()
  return getCurrentUserFromHeaders(requestHeaders)
}

// Helper simplificado para Server Components
export const serverSupabase = createServerSupabaseClient()
