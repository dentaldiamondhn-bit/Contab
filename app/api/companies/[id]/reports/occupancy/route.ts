import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseService } from '@/lib/supabase-db';

const DIAS_NOMBRES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

const MESES_NOMBRES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface Descompuesta {
  y: number;
  m: number;
  d: string;
  h: number;
  dow: number;
  fechaStr: string;
  keyMes: string;
}

function descomponerFecha(iso: string): Descompuesta {
  const dtf = new Intl.DateTimeFormat('es-HN', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    weekday: 'long',
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(iso));
  const get = (tipo: string) =>
    Number(parts.find((p) => p.type === tipo)?.value ?? '0');
  const getStr = (tipo: string) =>
    parts.find((p) => p.type === tipo)?.value ?? '';
  const y = get('year');
  const m = get('month');
  const dia = getStr('day').padStart(2, '0');
  let h = get('hour');
  if (h === 24) h = 0;
  const diaSemana = getStr('weekday').toLowerCase();
  return {
    y,
    m,
    d: dia,
    h,
    dow: Math.max(0, DIAS_NOMBRES.indexOf(diaSemana)),
    fechaStr: `${y}-${String(m).padStart(2, '0')}-${dia}`,
    keyMes: `${y}-${String(m).padStart(2, '0')}`,
  };
}

function mesesDesde(fechaPrimerFactura: Date, ahora: Date): number {
  const diffMs = ahora.getTime() - fechaPrimerFactura.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44) * 10) / 10;
}

// Reporte de Ocupación y Estacionalidad
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  try {
    // Período actual (mes en curso), mismo patrón que kpis
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const desde = startOfMonth.toISOString().split('T')[0];
    const hasta = endOfMonth.toISOString().split('T')[0];
    const periodoKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Facturas reales del tenant (se omiten anuladas)
    let invoices: any[] = [];
    let { data: invData, error: invError } = await supabaseService
      .from('Invoice')
      .select(
        'id, total, status, invoiceType, customerName, customer_name, issueDate, createdAt, tenantId, tenant_id'
      )
      .eq('tenantId', companyId);

    if (invError || !invData || invData.length === 0) {
      const alt = await supabaseService
        .from('Invoice')
        .select(
          'id, total, status, invoiceType, customerName, customer_name, issueDate, createdAt, tenantId, tenant_id'
        )
        .eq('tenant_id', companyId);
      if (!alt.error && alt.data) {
        invData = alt.data;
      }
    }

    invoices = invData || [];

    const validas = invoices.filter((i: any) => {
      const status = String(i.status || '').toUpperCase();
      return status !== 'CANCELLED';
    });

    // Primera factura de cada cliente para distinguir nuevo vs recurrente
    const primeraFacturaPorCliente = new Map<string, Date>();
    validas.forEach((i: any) => {
      if (!i.issueDate) return;
      const nombre = String(i.customerName || i.customer_name || '').trim();
      if (!nombre) return;
      const fecha = new Date(i.issueDate);
      const previa = primeraFacturaPorCliente.get(nombre);
      if (!previa || fecha.getTime() < previa.getTime()) {
        primeraFacturaPorCliente.set(nombre, fecha);
      }
    });

    // Distribuciones del período actual (facturas emitidas reales)
    const porHora: Map<number, number> = new Map();
    const porDia: number[] = [0, 0, 0, 0, 0, 0, 0];
    const porMes: Map<string, number> = new Map();
    const clientesPeriodo = new Set<string>();
    const ingresosPorCliente = new Map<string, number>();
    let atencionesPeriodo = 0;

    // Ventana de 6 meses para estacionalidad
    const mesesVentana: string[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      mesesVentana.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      );
    }
    mesesVentana.forEach((k) => porMes.set(k, 0));

    validas.forEach((i: any) => {
      if (!i.issueDate) return;
      const descomp = descomponerFecha(i.issueDate);
      porMes.set(descomp.keyMes, (porMes.get(descomp.keyMes) || 0) + 1);
      if (descomp.fechaStr >= desde && descomp.fechaStr <= hasta) {
        atencionesPeriodo += 1;
        porHora.set(descomp.h, (porHora.get(descomp.h) || 0) + 1);
        porDia[descomp.dow] += 1;
        const nombre = String(i.customerName || i.customer_name || '').trim();
        if (nombre) {
          clientesPeriodo.add(nombre);
          ingresosPorCliente.set(
            nombre,
            (ingresosPorCliente.get(nombre) || 0) + Number(i.total || 0)
          );
        }
      }
    });

    let clientesNuevos = 0;
    let clientesRecurrentes = 0;
    clientesPeriodo.forEach((nombre) => {
      const primer = primeraFacturaPorCliente.get(nombre);
      if (primer && primer.getTime() < startOfMonth.getTime()) {
        clientesRecurrentes += 1;
      } else {
        clientesNuevos += 1;
      }
    });

    const clientesAtendidos = clientesPeriodo.size;

    // Sin modelo de capacidad/citas en el esquema → tasas de ocupación sin fuente real
    const conDatos = atencionesPeriodo > 0;
    const retentionRate =
      clientesAtendidos > 0
        ? Math.round((clientesRecurrentes / clientesAtendidos) * 100)
        : null;

    // Mapa de calor por hora real (facturas emitidas)
    const heatmapByHour = conDatos
      ? Array.from(porHora.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([hora, facturas]) => ({
            hour: `${hora}:00`,
            facturas,
          }))
      : [];

    // Análisis por día de la semana (facturas emitidas)
    const occupancyByDay = conDatos
      ? DIAS_NOMBRES.map((day, idx) => ({ day, facturas: porDia[idx] })).filter(
          (d) => d.facturas > 0
        )
      : [];

    // Estacionalidad real (últimos 6 meses, facturas emitidas)
    const seasonality = {
      months: mesesVentana.map((keyMes) => {
        const [y, m] = keyMes.split('-').map(Number);
        return {
          month: MESES_NOMBRES[m - 1],
          facturas: porMes.get(keyMes) || 0,
        };
      }),
      trends: [] as string[],
    };

    // Retención de clientes real (distintos de facturación, no del modelo de arrendatarios inexistente)
    const retentionByTenant = Array.from(clientesPeriodo)
      .map((nombre) => {
        const primer = primeraFacturaPorCliente.get(nombre);
        const primerFecha = primer ?? new Date();
        return {
          name: nombre,
          months: mesesDesde(primerFecha, now),
          status: primer && primer.getTime() < startOfMonth.getTime() ? 'recurrente' : 'nuevo',
          revenue: Math.round((ingresosPorCliente.get(nombre) || 0) * 100) / 100,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 25);

    const promedioMeses =
      clientesAtendidos > 0
        ? Math.round(
            (Array.from(clientesPeriodo).reduce((sum, nombre) => {
              return sum + mesesDesde(primeraFacturaPorCliente.get(nombre) ?? new Date(), now);
            }, 0) /
              clientesAtendidos) *
              10
          ) / 10
        : null;

    // Reporte de ocupación: actividad real de facturación; tasas de capacidad → null
    return NextResponse.json({
      status: conDatos ? 'con_datos' : 'sin_datos',
      period: {
        mes: periodoKey,
        desde,
        hasta,
      },
      summary: {
        averageOccupancyRate: null,
        peakOccupancyRate: null,
        lowOccupancyRate: null,
        totalHoursAvailable: null,
        totalHoursRented: null,
        retentionRate,
        newTenants: clientesNuevos,
        churnedTenants: null,
        totalAtenciones: atencionesPeriodo,
        clientesAtendidos,
        clientesNuevos,
        clientesRecurrentes,
      },
      heatmapByHour,
      occupancyByDay,
      tenantRetention: {
        totalTenants: clientesAtendidos,
        returningTenants: clientesRecurrentes,
        returningPercentage: retentionRate,
        newTenants: clientesNuevos,
        churnedLastMonth: null,
        averageTenure: promedioMeses,
        retentionByTenant,
      },
      seasonality,
      recommendations: [],
    });
  } catch (error) {
    console.error('Error generating occupancy report:', error);
    return NextResponse.json(
      { error: 'Failed to generate occupancy report' },
      { status: 500 }
    );
  }
}