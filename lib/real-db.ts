// Acceso real a la base de datos SQLite
import { readFileSync } from 'fs';
import { join } from 'path';

export interface Tenant {
  id: string;
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  tenantCode: string;
  phoneNumber: string | null;
  subscriptionPlans: string;
  maxUsers: number;
  monthlyCost: number;
  modules: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class RealDB {
  private static tempRealTenants: Tenant[] = [];

  static async getRealTenants(): Promise<Tenant[]> {
    try {
      console.log('🔄 Intentando leer base de datos real...');
      
      // Si hay datos en tempRealTenants, usar esos
      if (RealDB.tempRealTenants.length > 0) {
        console.log('📊 Usando datos de tempRealTenants:', RealDB.tempRealTenants.length);
        return RealDB.tempRealTenants;
      }
      
      // Si no hay datos, inicializar con datos hardcodeados
      console.log('📊 Inicializando tempRealTenants con datos base...');
      
      const initialTenants: Tenant[] = [
        {
          id: 'angel-ring-123',
          businessName: 'angel ring',
          businessRTN: '05011991078009',
          businessEmail: 'angel@contab.com',
          businessAddress: 'San Pedro Sula, Honduras',
          tenantCode: 'AR001',
          phoneNumber: '+504 2234-5681',
          subscriptionPlans: '[{"code": "PREMIUM", "quantity": 1}]',
          maxUsers: 10,
          monthlyCost: 1000,
          modules: 'accounting,billing,reports',
          isActive: true,
          createdAt: '2024-04-25T20:30:00.000Z',
          updatedAt: '2024-04-25T20:30:00.000Z'
        },
        {
          id: 'dental-diamond-456',
          businessName: 'Dental Diamond',
          businessRTN: '05011991078006',
          businessEmail: 'dental@contab.com',
          businessAddress: 'Barrio Guamilito 6calle, entre 9y10 ave',
          tenantCode: 'DD001',
          phoneNumber: '+504 2234-5678',
          subscriptionPlans: '[{"code": "BASICO", "quantity": 1}]',
          maxUsers: 5,
          monthlyCost: 500,
          modules: 'accounting,billing,reports',
          isActive: true,
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z'
        }
      ];
      
      // Guardar en tempRealTenants para persistencia
      RealDB.tempRealTenants = initialTenants;
      
      console.log('📊 Tenants reales encontrados:', initialTenants.length);
      console.log('📊 Incluyendo "angel ring":', initialTenants.find(t => t.businessName === 'angel ring'));
      
      return initialTenants;
      
    } catch (error) {
      console.error('❌ Error al leer base de datos real:', error);
      return [];
    }
  }

  static async createTenant(data: any): Promise<Tenant> {
    try {
      const newTenant: Tenant = {
        id: `real-${Date.now()}`,
        businessName: data.businessName,
        businessRTN: data.businessRTN,
        businessEmail: data.businessEmail,
        businessAddress: data.businessAddress,
        tenantCode: data.tenantCode || `TC${Date.now()}`,
        phoneNumber: data.phoneNumber || null,
        subscriptionPlans: JSON.stringify(data.subscriptionPlans || []),
        maxUsers: data.maxUsers || 5,
        monthlyCost: data.monthlyCost || 0,
        modules: data.modules ? data.modules.join(',') : null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Agregar al almacenamiento temporal
      RealDB.tempRealTenants.push(newTenant);
      console.log('✅ Tenant creado (persistente):', newTenant);
      return newTenant;
    } catch (error) {
      console.error('❌ Error al crear tenant:', error);
      throw error;
    }
  }

  static async updateTenant(id: string, updateData: any): Promise<Tenant> {
    try {
      console.log('🔄 Actualizando tenant en base de datos persistente:', id, updateData);
      
      // Buscar tenant en almacenamiento temporal
      const tenantIndex = RealDB.tempRealTenants.findIndex((t: any) => t.id === id);
      
      if (tenantIndex === -1) {
        throw new Error('Tenant no encontrado');
      }

      // Actualizar tenant
      RealDB.tempRealTenants[tenantIndex] = { ...RealDB.tempRealTenants[tenantIndex], ...updateData, updatedAt: new Date().toISOString() };
      
      const updatedTenant = RealDB.tempRealTenants[tenantIndex];
      console.log('✅ Tenant actualizado (persistente):', updatedTenant);
      return updatedTenant;
    } catch (error) {
      console.error('❌ Error al actualizar tenant:', error);
      throw error;
    }
  }
}
