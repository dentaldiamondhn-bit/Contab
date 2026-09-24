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
    const { data: tenantData, error: tenantError } = await supabase
      .from('Tenant')
      .select('businessname, businessrtn, businessaddress, businessemail, phonenumber')
      .eq('id', tenantId)
      .single();

    if (!tenantError && tenantData) {
      return {
        businessName: tenantData.businessname || '',
        rtn: tenantData.businessrtn || '',
        businessAddress: tenantData.businessaddress || '',
        businessEmail: tenantData.businessemail || '',
        phoneNumber: tenantData.phonenumber || ''
      };
    }
  } catch (error) {
    console.log('📝 Error obteniendo configuración fiscal del tenant');
  }

  return {
    businessName: '',
    rtn: '',
    businessAddress: '',
    businessEmail: '',
    phoneNumber: ''
  };
}

// Función para obtener CAI activo actualizado (desde la base de datos real)
export async function getCurrentActiveCai(tenantId: string): Promise<CaiConfig | null> {
  try {
    const { db } = await import('@/lib/db');

    const caiData = await (db as any).cAI.findFirst({
      where: {
        tenantId: tenantId,
        isActive: true,
        expiryDate: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!caiData) return null;

    return {
      id: caiData.id,
      cai: caiData.cai,
      economicActivity: '',
      rangeStart: Number(caiData.rangeStart),
      rangeEnd: Number(caiData.rangeEnd),
      currentNumber: Number(caiData.currentNumber),
      taxRate: 15,
      establishmentCode: '',
      pointOfSaleCode: '',
      expiryDate: caiData.expiryDate ? new Date(caiData.expiryDate).toISOString() : '',
      isActive: caiData.isActive === true
    };
  } catch (error) {
    console.log('📝 Error obteniendo CAI activo desde base de datos');
    return null;
  }
}

// Función para generar número de factura con CAI actualizado
export function generateInvoiceNumberFromCurrentCai(activeCai: CaiConfig | null): string {
  if (activeCai) {
    const currentNum = activeCai.currentNumber || 1;
    return `000-001-01-${String(currentNum).padStart(8, '0')}`;
  }
  return '';
}

// Función para incrementar número de CAI (cuando se genera factura)
export async function incrementCaiNumber(activeCai: CaiConfig | null): Promise<void> {
  try {
    if (!activeCai || !activeCai.id) return;

    const { db } = await import('@/lib/db');

    await (db as any).cAI.update({
      where: { id: activeCai.id },
      data: {
        currentNumber: BigInt(activeCai.currentNumber + 1)
      }
    });
  } catch (error) {
    console.error('❌ Error incrementando número de CAI:', error);
  }
}