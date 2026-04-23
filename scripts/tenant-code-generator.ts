// Generador de Códigos Únicos para Tenants
// Asegura que cada tenant tenga un código identificador único

import { db } from '@/lib/db';

export interface TenantCodeConfig {
  prefix?: string;
  separator?: string;
  padding?: number;
  checkExisting?: boolean;
}

export class TenantCodeGenerator {
  private static readonly DEFAULT_CONFIG: TenantCodeConfig = {
    prefix: '',
    separator: '',
    padding: 3,
    checkExisting: true
  };

  /**
   * Genera un código único para tenant basado en el nombre del negocio
   * @param businessName - Nombre del negocio
   * @param config - Configuración opcional
   * @returns Código único de tenant
   */
  static async generateUniqueCode(
    businessName: string, 
    config: Partial<TenantCodeConfig> = {}
  ): Promise<string> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // Extraer y limpiar el prefijo del nombre del negocio
    const prefix = this.extractPrefix(businessName, finalConfig);
    
    // Buscar el siguiente número disponible
    let counter = 1;
    let code = this.formatCode(prefix, counter, finalConfig);

    while (await this.isCodeInUse(code)) {
      counter++;
      code = this.formatCode(prefix, counter, finalConfig);
      
      // Prevención de bucle infinito
      if (counter > 9999) {
        throw new Error(`No se pudo generar código único para ${businessName}. Demasiados intentos.`);
      }
    }

    return code;
  }

  /**
   * Extrae el prefijo del nombre del negocio
   */
  private static extractPrefix(businessName: string, config: TenantCodeConfig): string {
    if (config.prefix) {
      return config.prefix.toUpperCase();
    }

    // Eliminar caracteres no alfabéticos y obtener primeras letras
    const cleaned = businessName
      .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '')
      .toUpperCase();

    // Intentar diferentes estrategias para el prefijo
    const strategies = [
      // 3 primeras letras
      () => cleaned.substring(0, 3),
      // Primera letra + 2 consonantes
      () => {
        const chars = cleaned.split('');
        const vowels = 'AEIOUÁÉÍÓÚ';
        const consonants = chars.filter(c => !vowels.includes(c));
        return (chars[0] || '') + (consonants[1] || '') + (consonants[2] || '');
      },
      // 3 primeras letras significativas
      () => {
        const words = businessName.split(' ').filter(w => w.length > 2);
        return words
          .map(w => w[0])
          .join('')
          .substring(0, 3)
          .toUpperCase();
      }
    ];

    for (const strategy of strategies) {
      const prefix = strategy();
      if (prefix.length >= 2) {
        return prefix.substring(0, 3);
      }
    }

    // Último recurso: usar GEN + número
    return 'GEN';
  }

  /**
   * Formatea el código con prefijo y número
   */
  private static formatCode(prefix: string, counter: number, config: TenantCodeConfig): string {
    const paddedNumber = counter.toString().padStart(config.padding!, '0');
    return `${prefix}${config.separator}${paddedNumber}`;
  }

  /**
   * Verifica si un código ya está en uso
   */
  private static async isCodeInUse(code: string): Promise<boolean> {
    try {
      const existing = await db.tenant.findUnique({
        where: { tenantCode: code },
        select: { id: true }
      });
      return !!existing;
    } catch (error) {
      console.error('Error verificando código de tenant:', error);
      return false;
    }
  }

  /**
   * Valida un código de tenant
   */
  static validateTenantCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!code) {
      errors.push('El código no puede estar vacío');
    }

    if (code.length < 3) {
      errors.push('El código debe tener al menos 3 caracteres');
    }

    if (code.length > 10) {
      errors.push('El código no puede exceder 10 caracteres');
    }

    if (!/^[A-Z0-9]+$/.test(code)) {
      errors.push('El código solo puede contener letras mayúsculas y números');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera códigos para múltiples tenants
   */
  static async generateMultipleCodes(
    businessNames: string[],
    config: Partial<TenantCodeConfig> = {}
  ): Promise<{ businessName: string; code: string }[]> {
    const results: { businessName: string; code: string }[] = [];

    for (const businessName of businessNames) {
      try {
        const code = await this.generateUniqueCode(businessName, config);
        results.push({ businessName, code });
      } catch (error) {
        console.error(`Error generando código para ${businessName}:`, error);
        results.push({ businessName, code: 'ERROR' });
      }
    }

    return results;
  }

  /**
   * Obtiene información de un tenant por su código
   */
  static async getTenantByCode(code: string) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { tenantCode: code },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true
            }
          }
        }
      });
      return tenant;
    } catch (error) {
      console.error('Error obteniendo tenant por código:', error);
      return null;
    }
  }

  /**
   * Lista todos los códigos de tenant existentes
   */
  static async listExistingCodes(): Promise<{ code: string; businessName: string; isActive: boolean }[]> {
    try {
      const tenants = await db.tenant.findMany({
        select: {
          tenantCode: true,
          businessName: true,
          isActive: true
        },
        orderBy: {
          tenantCode: 'asc'
        }
      });
      return tenants;
    } catch (error) {
      console.error('Error listando códigos de tenant:', error);
      return [];
    }
  }
}

// Ejemplos de uso:
/*
// Generar código automáticamente
const code1 = await TenantCodeGenerator.generateUniqueCode('Dental Diamond S.A.');
// Resultado: "DEN001"

// Generar con prefijo personalizado
const code2 = await TenantCodeGenerator.generateUniqueCode('Contadora Honduras', {
  prefix: 'CON'
});
// Resultado: "CON001"

// Validar código existente
const validation = TenantCodeGenerator.validateTenantCode('ABC123');
// Resultado: { valid: true, errors: [] }

// Generar múltiples códigos
const codes = await TenantCodeGenerator.generateMultipleCodes([
  'Empresa Uno',
  'Empresa Dos', 
  'Empresa Tres'
]);
*/

export default TenantCodeGenerator;
