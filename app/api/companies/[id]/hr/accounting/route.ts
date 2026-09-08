import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const params = request.nextUrl.pathname.split('/');
    const companyId = params[3]; // companies/[id]/hr/accounting

    const body = await request.json();
    const {
      period,
      month,
      year,
      frequency,
      totalPeriodBase,
      totalIgssEmployer,
      totalIgssEmployee,
      totalIhss,
      totalRap,
      totalCustomDeductions,
      totalAttendanceDeductions,
      totalAttendanceIncomes,
      totalDeductions,
      totalNetPay,
      employees,
    } = body;

    if (!period || !totalPeriodBase || !employees?.length) {
      return NextResponse.json({ error: 'Datos de planilla incompletos' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const today = new Date().toISOString().split('T')[0];
    const periodDate = `${year}-${String(month).padStart(2, '0')}-15`;

    const transactions: { voucherType: string; description: string; entries: any[] }[] = [];

    // ──────────────────────────────────────────────
    // ASIENTO 1: Gasto de salarios brutos
    // Debe: 5101 Sueldos y Salarios (gasto)
    // Haber: 2102 Sueldos por Pagar (pasivo neto)
    //        2103 IGSS por Pagar (deducción empleado)
    //        2104 IHSS por Pagar (deducción empleado)
    //        2105 RAP por Pagar (deducción empleado)
    //        2106 Deducciones Varios (deducciones personalizadas)
    //        2107 Ajuste Asistencia (descuentos por inasistencia/retardo)
    // ──────────────────────────────────────────────
    const salaryEntries: any[] = [];

    // Debe: gasto salarial
    salaryEntries.push({
      accountId: '5101',
      amount: Math.round(totalPeriodBase * 100),
      taxable: false,
    });

    // Haber: sueldo neto por pagar
    salaryEntries.push({
      accountId: '2102',
      amount: -Math.round((totalNetPay - totalAttendanceIncomes + totalAttendanceDeductions) * 100),
      taxable: false,
    });

    // Haber: IGSS por pagar (deducción empleado)
    if (totalIgssEmployee > 0) {
      salaryEntries.push({
        accountId: '2103',
        amount: -Math.round(totalIgssEmployee * 100),
        taxable: false,
      });
    }

    // Haber: IHSS por pagar (deducción empleado)
    if (totalIhss > 0) {
      salaryEntries.push({
        accountId: '2104',
        amount: -Math.round(totalIhss * 100),
        taxable: false,
      });
    }

    // Haber: RAP por pagar (deducción empleado)
    if (totalRap > 0) {
      salaryEntries.push({
        accountId: '2105',
        amount: -Math.round(totalRap * 100),
        taxable: false,
      });
    }

    // Haber: deducciones personalizadas
    if (totalCustomDeductions > 0) {
      salaryEntries.push({
        accountId: '2106',
        amount: -Math.round(totalCustomDeductions * 100),
        taxable: false,
      });
    }

    // Haber: ajustes de asistencia (descuentos)
    if (totalAttendanceDeductions > 0) {
      salaryEntries.push({
        accountId: '2107',
        amount: -Math.round(totalAttendanceDeductions * 100),
        taxable: false,
      });
    }

    // Debe: ingresos de asistencia (bonificaciones, horas extra)
    if (totalAttendanceIncomes > 0) {
      salaryEntries.push({
        accountId: '5101',
        amount: Math.round(totalAttendanceIncomes * 100),
        taxable: false,
      });
    }

    // Verificar que cuadra (suma = 0)
    const salarySum = salaryEntries.reduce((s, e) => s + e.amount, 0);
    if (salarySum !== 0) {
      // Ajustar la cuenta 2102 para que cuadre
      salaryEntries[1].amount -= salarySum;
    }

    transactions.push({
      voucherType: 'DIARIO',
      description: `Planilla ${period} - Gasto Salarios`,
      entries: salaryEntries,
    });

    // ──────────────────────────────────────────────
    // ASIENTO 2: Cargas sociales patronales
    // Debe: 5102 Cargas Sociales (gasto patronal)
    // Haber: 2103 IGSS por Pagar (patronal)
    // ──────────────────────────────────────────────
    if (totalIgssEmployer > 0) {
      transactions.push({
        voucherType: 'DIARIO',
        description: `Planilla ${period} - Cargas Sociales Patronales`,
        entries: [
          {
            accountId: '5102',
            amount: Math.round(totalIgssEmployer * 100),
            taxable: false,
          },
          {
            accountId: '2103',
            amount: -Math.round(totalIgssEmployer * 100),
            taxable: false,
          },
        ],
      });
    }

    // ──────────────────────────────────────────────
    // ASIENTO 3: Pago de nómina (egreso)
    // Debe: 2102 Sueldos por Pagar
    // Haber: 1101 Bancos/Caja
    // ──────────────────────────────────────────────
    const payAmount = totalNetPay - totalAttendanceIncomes + totalAttendanceDeductions;
    if (payAmount > 0) {
      transactions.push({
        voucherType: 'EGRESO',
        description: `Pago nómina ${period}`,
        entries: [
          {
            accountId: '2102',
            amount: Math.round(payAmount * 100),
            taxable: false,
          },
          {
            accountId: '1101',
            amount: -Math.round(payAmount * 100),
            taxable: false,
          },
        ],
      });
    }

    // ──────────────────────────────────────────────
    // POST: Enviar cada transacción a contabilidad
    // ──────────────────────────────────────────────
    const results: any[] = [];
    let errors: string[] = [];

    for (const tx of transactions) {
      try {
        const response = await fetch(`${baseUrl}/api/accounting/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': companyId,
          },
          body: JSON.stringify({
            tenantId: companyId,
            description: tx.description,
            date: periodDate,
            currency: 'HNL',
            voucherType: tx.voucherType,
            entries: tx.entries,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.push(data);
        } else {
          const errText = await response.text();
          errors.push(`Error ${tx.description}: ${errText}`);
        }
      } catch (err: any) {
        errors.push(`Error ${tx.description}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      console.error('Payroll accounting errors:', errors);
    }

    return NextResponse.json({
      success: true,
      transactionsCreated: results.length,
      errors: errors.length > 0 ? errors : undefined,
      period,
    });

  } catch (error: any) {
    console.error('Error in HR/accounting POST:', error);
    return NextResponse.json(
      { error: 'Error al crear asientos contables de nómina' },
      { status: 500 }
    );
  }
}
