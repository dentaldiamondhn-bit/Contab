// API para sincronizar configuración en tiempo real
// Este archivo se importa en el API de facturas para obtener datos actualizados

export interface FiscalConfig {
  businessName: string;
  rtn: string;
  businessAddress: string;
  businessEmail: string;
  phoneNumber: string;
}

export interface CaiConfig {
  id: string;
  cai: string;
  economicActivity: string;
  rangeStart: number;
  rangeEnd: number;
  currentNumber: number;
  taxRate: number;
  establishmentCode: string;
  pointOfSaleCode: string;
  expiryDate: string;
  isActive: boolean;
}

export interface InvoiceConfiguration {
  fiscalInfo: FiscalConfig;
  caiConfigs: CaiConfig[];
  logoUrl?: string;
  establishedAt: string;
  version: string;
}

// Función para obtener configuración actualizada desde base de datos
export async function getCurrentFiscalConfig(supabase: any, tenantId: string): Promise<FiscalConfig> {
  try {
    // Intentar obtener desde base de datos del tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('Tenant')
      .select('businessName, businessRTN, businessAddress, businessEmail, phoneNumber')
      .eq('id', tenantId)
      .single();
      
    if (!tenantError && tenantData) {
      return {
        businessName: tenantData.businessName || 'CONTAB HN',
        rtn: tenantData.businessRTN || '05011991078006',
        businessAddress: tenantData.businessAddress || 'Tegucigalpa, Honduras',
        businessEmail: tenantData.businessEmail || 'contabhn@email.com',
        phoneNumber: tenantData.phoneNumber || '+504 0000-0000'
      };
    }
  } catch (error) {
    console.log('📝 Error obteniendo configuración fiscal, usando defaults');
  }

  // Valores por defecto
  return {
    businessName: 'CONTAB HN',
    rtn: '05011991078006',
    businessAddress: 'Tegucigalpa, Honduras',
    businessEmail: 'contabhn@email.com',
    phoneNumber: '+504 0000-0000'
  };
}

// Función para obtener CAI activo actualizado
export async function getCurrentActiveCai(supabase: any, tenantId: string): Promise<CaiConfig | null> {
  try {
    // Intentar obtener CAI activo desde base de datos
    const { data: caiData, error: caiError } = await supabase
      .from('cai')
      .select('*')
      .eq('tenantId', tenantId)
      .eq('status', true)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();
      
    if (!caiError && caiData) {
      return {
        id: caiData.id,
        cai: caiData.cai,
        economicActivity: caiData.economicActivity || 'Servicios Profesionales',
        rangeStart: caiData.startNumber,
        rangeEnd: caiData.endNumber,
        currentNumber: caiData.currentNumber,
        taxRate: caiData.taxRate || 15,
        establishmentCode: caiData.establishmentCode || '001',
        pointOfSaleCode: caiData.pointOfSaleCode || '001',
        expiryDate: caiData.expirationDate,
        isActive: caiData.status
      };
    }
  } catch (error) {
    console.log('📝 Error obteniendo CAI activo desde base de datos');
  }

  return null;
}

// Función para generar número de factura con CAI actualizado
export function generateInvoiceNumberFromCurrentCai(activeCai: CaiConfig | null): string {
  if (activeCai) {
    const currentNum = activeCai.currentNumber || 1;
    return `000-001-01-${String(currentNum).padStart(8, '0')}`;
  }
  return `INV-${Date.now()}`;
}

// Función para incrementar número de CAI (cuando se genera factura)
export async function incrementCaiNumber(supabase: any, tenantId: string, activeCai: CaiConfig | null): Promise<void> {
  try {
    if (!activeCai) return;

    // Incrementar en base de datos
    const { error: updateError } = await supabase
      .from('cai')
      .update({ 
        currentNumber: (activeCai.currentNumber || 1) + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', activeCai.id)
      .eq('tenantId', tenantId);

    if (updateError) {
      console.error('❌ Error incrementando CAI en base de datos:', updateError);
    } else {
      console.log('✅ Número de CAI incrementado en base de datos:', activeCai.currentNumber + 1);
    }
  } catch (error) {
    console.error('❌ Error incrementando número de CAI:', error);
  }
}
