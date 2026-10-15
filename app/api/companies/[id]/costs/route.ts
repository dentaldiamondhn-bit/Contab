import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseService } from '@/lib/supabase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.companyId) {
      return NextResponse.json({ error: 'Company no encontrada' }, { status: 400 });
    }

    // Costos reales de ESTA empresa. `cost_payments` tiene `company_id`
    // (comprobado; ver kpis/route.ts:131), y con solo `tenant_id` las dos
    // empresas del mismo tenant (`TEST1DS`) verian los costos de ambas.
    // Antes ademas habia un `if (tenantId)` que sin tenant dejaba la consulta
    // SIN FILTRAR, con los costos de todas las empresas.
    const { data, error } = await supabaseService
      .from('cost_payments')
      .select('cost_type, cost_key, amount')
      .eq('company_id', empresa.companyId);

    if (error) {
      console.error('Error fetching costs:', error);
      return NextResponse.json({ fixed: {}, variable: {} });
    }

    const fixed: Record<string, number> = {};
    const variable: Record<string, number> = {};

    (data || []).forEach((row: any) => {
      const amount = Number(row.amount || 0);
      if (row.cost_type === 'fixed') {
        fixed[row.cost_key] = (fixed[row.cost_key] || 0) + amount;
      } else if (row.cost_type === 'variable') {
        variable[row.cost_key] = (variable[row.cost_key] || 0) + amount;
      }
    });

    return NextResponse.json({ fixed, variable });
  } catch (error) {
    console.error('Error fetching costs:', error);
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    return NextResponse.json(
      { error: 'Failed to fetch costs' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  try {
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.companyId || !empresa.tenantId) {
      return NextResponse.json({ error: 'Company no encontrada' }, { status: 400 });
    }

    const body = await request.json();
    const { fixed, variable, periodMonth, periodYear } = body;

    if (!fixed || !variable || !periodMonth || !periodYear) {
      return NextResponse.json(
        { error: 'Missing required fields: fixed, variable, periodMonth, periodYear' },
        { status: 400 }
      );
    }

    const dueDate = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    const rows: {
      cost_type: string;
      cost_key: string;
      amount: number;
      tenant_id: string;
      company_id: string;
      due_date: string | null;
    }[] = [];

    Object.entries(fixed).forEach(([key, value]) => {
      rows.push({
        tenant_id: empresa.tenantId!,
        company_id: empresa.companyId!,
        cost_type: 'fixed',
        cost_key: key,
        amount: Number(value) || 0,
        due_date: dueDate,
      });
    });
    Object.entries(variable).forEach(([key, value]) => {
      rows.push({
        tenant_id: empresa.tenantId!,
        company_id: empresa.companyId!,
        cost_type: 'variable',
        cost_key: key,
        amount: Number(value) || 0,
        due_date: dueDate,
      });
    });

    if (rows.length > 0) {
      // Escritura por empresa, nunca upsert a ciegas. El `UNIQUE` actual es
      // `(tenant_id, cost_type, cost_key)` (supabase/COST_PAYMENTS.sql:16), o sea
      // POR TENANT: un `upsert` con `onConflict` sobre esas columnas haria que la
      // segunda empresa del tenant pisara los costos de la primera (cambiaria su
      // `company_id` y su `amount` en la misma sentencia). Mismo error de diseño
      // que el `UNIQUE (rtn, tenant_id)` de Supplier.
      //
      // Por eso: leer lo que ya es de ESTA empresa, actualizar por id, e insertar
      // solo lo nuevo. Si el insert choca con el unique viejo (una empresa hermana
      // del mismo tenant ya tiene esa clave), se devuelve 409 con el aviso en vez
      // de pisar la fila ajena. La migracion 051 pasa el unique a
      // `(company_id, cost_type, cost_key)` y ahi hermanas pueden convivir.
      const { data: existentes, error: leerError } = await supabaseService
        .from('cost_payments')
        .select('id, cost_type, cost_key')
        .eq('company_id', empresa.companyId)
        .in('cost_key', [...new Set(rows.map((r) => r.cost_key))]);
      if (leerError) {
        console.error('Error leyendo costos:', leerError);
        return NextResponse.json(
          { error: 'Error guardando costos en la base de datos' },
          { status: 500 }
        );
      }

      const propias = new Map<string, string>();
      (existentes || []).forEach((e) => propias.set(`${e.cost_type}::${e.cost_key}`, String(e.id)));

      let aInsertar: typeof rows = [];
      for (const row of rows) {
        const idPropio = propias.get(`${row.cost_type}::${row.cost_key}`);
        if (idPropio) {
          const { error: updError } = await supabaseService
            .from('cost_payments')
            .update({
              tenant_id: row.tenant_id,
              company_id: row.company_id,
              amount: row.amount,
              due_date: row.due_date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', idPropio)
            .eq('company_id', empresa.companyId);
          if (updError) {
            console.error('Error saving costs:', updError);
            return NextResponse.json(
              { error: 'Error guardando costos en la base de datos' },
              { status: 500 }
            );
          }
        } else {
          aInsertar.push(row);
        }
      }

      if (aInsertar.length > 0) {
        const { error: insertError } = await supabaseService
          .from('cost_payments')
          .insert(aInsertar);
        if (insertError) {
          console.error('Error saving costs:', insertError);
          if (String(insertError.code || insertError.message || '').includes('23505')) {
            return NextResponse.json(
              {
                error:
                  'Otra empresa del mismo tenant ya tiene costos con esas claves. ' +
                  'Aplica la migracion 051_cost_payments_unicidad_por_empresa.sql en el SQL Editor.',
              },
              { status: 409 }
            );
          }
          return NextResponse.json(
            { error: 'Error guardando costos en la base de datos' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Costos actualizados en la base de datos'
    });
  } catch (error) {
    console.error('Error updating costs:', error);
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    return NextResponse.json(
      { error: 'Failed to update costs' },
      { status: 500 }
    );
  }
}
