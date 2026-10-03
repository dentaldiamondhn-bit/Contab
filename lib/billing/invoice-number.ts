import { supabase as supabaseService } from "@/lib/supabase-db";

/**
 * Correlativo de factura: una sola fuente de verdad, por empresa.
 *
 * Antes cada pieza calculaba el numero por su cuenta y se desincronizaban:
 *   - el GET de /api/billing/cai usaba max(facturas del tenant) + 1
 *   - el POST de /api/billing/invoices escribia cai.current_number y nadie lo leia
 *   - sin fila en `cai` devolvia currentNumber: 1 fijo, asi que una empresa que
 *     ya tiene facturas (p.ej. 001-01-01-00000008) emitia 00000001 una y otra vez
 *   - la busqueda de "siguiente" era global, no por tenant
 *
 * Ahora el numero lo decide el servidor. La tabla `cai` tiene dos esquemas
 * superpuestos (ver CLAUDE.md): se leen los campos Spanish y se usan como
 * respaldo los legacy ingleses.
 */

export const ESTABLECIMIENTO = "001";
export const PUNTO_VENTA = "01";
export const TIPO_FACTURA = "01";

const MAX_REINTENTOS = 3;

export function formatInvoiceNumber(correlativo: number, base?: string): string {
  const prefix =
    base && base.split("-").length === 4 ? base : `${ESTABLECIMIENTO}-${PUNTO_VENTA}-${TIPO_FACTURA}`;
  return `${prefix}-${String(correlativo).padStart(8, "0")}`;
}

/** Ultimo correlativo emitido por la empresa, o 0 si no tiene facturas. */
async function lastIssued(tenantId: string): Promise<{ correlativo: number; base?: string }> {
  const { data } = await (supabaseService as any)
    .from("Invoice")
    .select("invoiceNumber")
    .eq("tenantId", tenantId)
    .not("invoiceNumber", "is", null)
    .order("invoiceNumber", { ascending: false })
    .limit(1);

  const raw = data?.[0]?.invoiceNumber as string | undefined;
  if (!raw) return { correlativo: 0 };
  const parts = String(raw).split("-");
  if (parts.length !== 4) return { correlativo: 0 };
  const correlativo = parseInt(parts[3], 10);
  return {
    correlativo: Number.isFinite(correlativo) ? correlativo : 0,
    base: parts.slice(0, 3).join("-"),
  };
}

type CaiRow = {
  id: string;
  rango_inicial: number | null;
  rango_final: number | null;
  start_number: number | null;
  end_number: number | null;
  current_number: number | null;
  current_correlative: number | null;
  fecha_limite_emision: string | null;
  expiration_date: string | null;
  cai: string | null;
  cai_number: string | null;
};

function rango(row: CaiRow): { desde: number; hasta: number } {
  // rango_inicial/rango_final son NOT NULL; los legacy pueden venir en 0.
  const desde = Number(row.rango_inicial ?? row.start_number ?? 1) || 1;
  const hasta = Number(row.rango_final ?? row.end_number ?? 0);
  return { desde, hasta: Number.isFinite(hasta) && hasta > 0 ? hasta : Infinity };
}

function current(row: CaiRow): number {
  const value = Number(row.current_number ?? row.current_correlative ?? 0);
  if (Number.isFinite(value) && value > 0) return value;
  return rango(row).desde;
}

function vence(row: CaiRow): Date | null {
  for (const value of [row.fecha_limite_emision, row.expiration_date]) {
    if (!value) continue;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** CAI vigente de la empresa: el que cubre el correlativo siguiente, sin caducar. */
async function pickCai(tenantId: string, siguiente: number): Promise<CaiRow | null> {
  const { data } = await (supabaseService as any)
    .from("cai")
    .select(
      "id, rango_inicial, rango_final, start_number, end_number, current_number, current_correlative, fecha_limite_emision, expiration_date, cai, cai_number"
    )
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("rango_inicial", { ascending: true });

  const hoy = new Date();
  const vigentes = (data || []).filter((r: CaiRow) => {
    const d = vence(r);
    return !d || d >= hoy;
  });
  if (vigentes.length === 0) return null;

  // El que contiene el correlativo siguiente manda; si ninguno lo contiene, el de
  // rango mas alto que aun alcanza, para no jumping de serie a la mitad.
  const contiene = vigentes.find((r: CaiRow) => {
    const { desde, hasta } = rango(r);
    return siguiente >= desde && siguiente <= hasta;
  });
  if (contiene) return contiene;

  return (
    vigentes.find((r: CaiRow) => rango(r).hasta >= siguiente) ||
    vigentes[0]
  );
}

export type NumeroResuelto = {
  invoiceNumber: string;
  correlativo: number;
  base: string;
  caiId: string | null;
  caiCode: string | null;
  rangoHasta: number | null;
  venceEl: Date | null;
};

/**
 * Siguiente numero de la empresa, sin reservarlo. Sirve para que la UI
 * muestre exactamente el numero que se va a emitir.
 */
export async function previewInvoiceNumber(tenantId: string): Promise<NumeroResuelto> {
  const last = await lastIssued(tenantId);
  const siguiente = last.correlativo + 1;
  const base = last.base;
  const cai = await pickCai(tenantId, siguiente);

  const correlativo = cai ? Math.max(current(cai), siguiente) : siguiente;
  return {
    invoiceNumber: formatInvoiceNumber(correlativo, base),
    correlativo,
    base: base || `${ESTABLECIMIENTO}-${PUNTO_VENTA}-${TIPO_FACTURA}`,
    caiId: cai?.id ?? null,
    caiCode: cai ? cai.cai || cai.cai_number || null : null,
    rangoHasta: cai ? rango(cai).hasta : null,
    venceEl: cai ? vence(cai) : null,
  };
}

/**
 * Reserva el siguiente numero. La reserva del CAI es condicional
 * (`.eq("current_number", valorLeido)`) para que dos emisiones simultaneas no
 * saquen el mismo correlativo: si la actualizacion no afecta filas, otro la
 * llevo y se reintenta. Mismo patron que `lib/services/stock-sale.ts`.
 *
 * `suelo` sirve para avanzar cuando el numero pedido no se puede usar porque
 * `Invoice_invoiceNumber_key` es UNIQUE **global**: si otra empresa ya tiene el
 * 00000026, la serie propia (que solo mira las facturas de esta empresa) volveria
 * a proponer 26 una y otra vez. Con el suelo se pide 27 y sigue.
 */
export async function reserveInvoiceNumber(
  tenantId: string,
  opciones: { suelo?: number } = {}
): Promise<NumeroResuelto> {
  const suelo = opciones.suelo ?? 0;
  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    const last = await lastIssued(tenantId);
    const siguiente = last.correlativo + 1;
    const base = last.base;
    const cai = await pickCai(tenantId, siguiente);

    if (!cai) {
      // Sin CAI no hay fila que reservar: el control lo da la comprobacion de
      // duplicados al final y, si aparece, el clash obliga a reintentar.
      const correlativo = Math.max(siguiente, suelo);
      return {
        invoiceNumber: formatInvoiceNumber(correlativo, base),
        correlativo,
        base: base || `${ESTABLECIMIENTO}-${PUNTO_VENTA}-${TIPO_FACTURA}`,
        caiId: null,
        caiCode: null,
        rangoHasta: null,
        venceEl: null,
      };
    }

    const { desde, hasta } = rango(cai);
    const correlativo = Math.max(current(cai), siguiente, suelo);

    // El rango se valida ANTES de tocar el CAI: si se actualizara primero, un
    // rechazo dejaria `current_number` mas alla del rango para siempre.
    if (correlativo > hasta) {
      throw new ExhaustedCaiError(hasta);
    }

    // El CAI quedo por detras de lo ya emitido (cambio de CAI a medias): se
    // alinea sin consumir numero. Si no, se reserva el siguiente.
    const { data, error } = await (supabaseService as any)
      .from("cai")
      .update({
        current_number: correlativo < desde ? correlativo : correlativo + 1,
        current_correlative: correlativo < desde ? correlativo : correlativo + 1,
      })
      .eq("id", cai.id)
      .eq("tenant_id", tenantId)
      .eq("current_number", current(cai))
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) continue; // carrera: otro proceso reservo antes

    return {
      invoiceNumber: formatInvoiceNumber(correlativo, base),
      correlativo,
      base: base || `${ESTABLECIMIENTO}-${PUNTO_VENTA}-${TIPO_FACTURA}`,
      caiId: cai.id,
      caiCode: cai.cai || cai.cai_number || null,
      rangoHasta: Number.isFinite(hasta) ? hasta : null,
      venceEl: vence(cai),
    };
  }

  throw new Error(
    "No se pudo reservar el correlativo de factura tras varios intentos. Reintenta la emision."
  );
}

export class ExhaustedCaiError extends Error {
  readonly hasta: number;
  constructor(hasta: number) {
    super(
      `El rango del CAI se agoto (ultimo numero ${Number.isFinite(hasta) ? hasta : "sin limite"}). Registra un CAI nuevo antes de emitir.`
    );
    this.name = "ExhaustedCaiError";
    this.hasta = hasta;
  }
}

/**
 * El numero ya emitido no puede estar repetido dentro de la misma empresa.
 * La consulta es por tenant: dos empresas pueden tener 001-01-01-00000001.
 */
export async function isInvoiceNumberTaken(
  tenantId: string,
  invoiceNumber: string
): Promise<boolean> {
  const { data } = await (supabaseService as any)
    .from("Invoice")
    .select("id")
    .eq("tenantId", tenantId)
    .eq("invoiceNumber", invoiceNumber)
    .limit(1);
  return !!data && data.length > 0;
}
