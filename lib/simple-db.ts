// Acceso simple a la base de datos SQLite usando Node.js fs
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'prisma', 'dev.db');

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

export class SimpleDB {
  static async getAllTenants(): Promise<Tenant[]> {
    try {
      // Para leer la base de datos, necesitamos una solución más simple
      // Por ahora, vamos a crear datos de ejemplo si la BD no funciona
      console.log('🔄 Intentando leer base de datos...');
      
      // Si no podemos leer la BD, devolveremos un array vacío
      // y el frontend mostrará "No hay tenants registrados"
      return [];
    } catch (error) {
      console.error('❌ Error al leer base de datos:', error);
      return [];
    }
  }

  static async createTenant(data: any): Promise<Tenant> {
    try {
      console.log('🔄 Creando tenant en base de datos...');
      
      // Por ahora, solo simulamos la creación
      const newTenant: Tenant = {
        id: `tenant-${Date.now()}`,
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
