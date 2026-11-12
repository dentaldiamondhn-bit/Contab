import { db } from "@/lib/db";

export async function getMasterOverview() {
  const businesses = await (db as any).tenant.findMany({
    include: {
      _count: { select: { polizas: true } },
      config_fiscal: true,
      accounts: {
        where: { code: '1101' }, // Cuentas de Bancos
        include: { entries: true }
      },
      tax_configs: {
        where: { tax_type: 'ISV' },
        orderBy: { period_end: 'desc' },
        take: 1
      }
    }
  });

  return businesses.map((b: any) => {
    // Cálculo de saldo bancario total por empresa
    const cash = b.accounts.reduce((acc: number, accnt: any) => 
      acc + accnt.entries.reduce((s: number, e: any) => s + Number(e.amount), 0), 0
    );

    // Verificar si el balance está cuadrado (suma de débitos = suma de créditos)
    const isBalanced = true; // TODO: Implementar lógica real de balance
    
    // Verificar si ya presentó declaración ISV del mes actual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const isvFiled = b.tax_configs.length > 0 && 
      new Date(b.tax_configs[0].period_end).getMonth() === currentMonth &&
      new Date(b.tax_configs[0].period_end).getFullYear() === currentYear &&
      b.tax_configs[0].status === 'filed';

    return {
      id: b.id,
      name: b.business_name,
      industry: b.industry,
      cashOnHand: cash,
      caiExpiration: b.config_fiscal[0]?.fecha_limite_emision,
      transactionCount: b._count.polizas,
      isvFiled: isvFiled,
      isBalanced: isBalanced,
      // Alerta si el CAI vence en menos de 15 días
      needsAttention: b.config_fiscal[0]?.fecha_limite_emision < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    };
  });
}