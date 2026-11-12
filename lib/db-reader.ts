// Lector simple de base de datos SQLite
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
  subscriptionPlan: string;
  maxUsers: number;
  monthlyCost: number;
  modules: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class DatabaseReader {
  static async readTenants(): Promise<Tenant[]> {
    try {
      console.log('🔄 Intentando leer base de datos SQLite...');
      
      // Por ahora, vamos a devolver datos de ejemplo
      // hasta que podamos acceder a la base de datos real
      const exampleTenants: Tenant[] = [
        {
          id: 'real-1',
          businessName: 'Dental Diamond',
          businessRTN: '05011991078006',
          businessEmail: 'dental@contab.com',
          businessAddress: 'Barrio Guamilito 6calle, entre 9y10 ave',
          tenantCode: 'DD001',
          phoneNumber: '+504 2234-5678',
          subscriptionPlan: '[{"code": "BASICO", "quantity": 1}]',
          maxUsers: 5,
          monthlyCost: 500,
          modules: 'accounting,billing,reports',
          isActive: true,
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z'
        },
        {
          id: 'real-2',
          businessName: 'Medical Center',
          businessRTN: '05011991078007',
          businessEmail: 'medical@contab.com',
          businessAddress: 'Tegucigalpa, Honduras',
          tenantCode: 'MC002',
          phoneNumber: '+504 2234-5679',
          subscriptionPlan: '[{"code": "PREMIUM", "quantity": 2}]',
          maxUsers: 20,
          monthlyCost: 2000,
          modules: 'accounting,billing,reports,inventory',
          isActive: true,
          createdAt: '2024-02-20T15:45:00.000Z',
          updatedAt: '2024-02-20T15:45:00.000Z'
        }
      ];

      console.log('📊 Tenants leídos (ejemplo):', exampleTenants.length);
      return exampleTenants;
      
    } catch (error) {
      console.error('❌ Error al leer base de datos:', error);
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
        subscriptionPlan: JSON.stringify(data.subscriptionPlans || []),
        maxUsers: data.maxUsers || 5,
        monthlyCost: data.monthlyCost || 0,
        modules: data.modules ? data.modules.join(',') : null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('✅ Tenant creado (simulado):', newTenant);
      return newTenant;
    } catch (error) {
      console.error('❌ Error al crear tenant:', error);
      throw error;
    }
  }
}
