// Tipos base para la estructura de la base de datos
export interface DBTenant {
  id: string;
  name: string;
  createdAt?: string;
}

// Eliminamos TenantJoinResult ya que el join automático está fallando en el motor de base de datos
// En su lugar, el mapeo se hace manualmente en la API.

// 3. Definimos la interfaz para el frontend (Domain Model)
export interface EnrichedTenant {
  id: string;
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  phoneNumber: string;
  tenantCode: string;
  industry: string;
  maxUsers: number;
  // Podrías agregar campos calculados aquí en el futuro
  isConfigurationComplete: boolean;
}
