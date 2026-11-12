import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import type { ContextoEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

/**
 * Lectura de libros contables.
 *
 * Las funciones RPC de la 027c (`get_libro_diario_integrado`, etc.) nunca se
 * aplicaron a esta base: PostgREST responde PGRST202. Ademas las tablas
 * `Transaction`/`Account` reales no tienen `voucherType`, `totalAmount` ni
 * `code`, asi que reconstruir el libro a mano contra ellas tampoco es posible.
 *
 * La base SI tiene creadas las vistas de reportes, y son las que ya usan las
 * pantallas de reportes:
 *
 *   - `v_transacciones_cierre`  una fila por asiento (fecha, poliza, cuenta,
 *     debito, credito) ya con `company_id` en texto.
 *   - `balanza_comprobacion`    saldos por cuenta, ya agregados.
 *   - `flujo_efectivo_mensual`  ingresos/egresos por mes.
 *
 * Se leen las vistas y se agrupa en JS. Ventajas: no depende de que existan
 * funciones en Postgres (no hay que migrar nada) y el aislamiento es el mismo
 * `company_id` que ya usan los reportes. El filtro se aplica SIEMPRE en la
 * consulta (`.match`), no solo al final: el cliente usa service_role y salta
 * RLS, asi que filtrar despues seria solo cosmetico.
 *
 * Unidades: la contabilidad guarda centavos (la 027c dividia entre 100 al
 * exponer los libros y `LibroIngresos` vuelve a dividir). Aqui se normaliza a
 * lempiras en `debit`/`credit`/`balance`/`total_amount`; en ingresos/egresos se
 * conserva ademas `entry.amount` en centavos porque es lo que espera
 * `LibroIngresos`.
 */

export type LineaAsiento = {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  description: string;
  /** Importe firmado en centavos (positivo = debe). Compatibilidad con LibroIngresos. */
  amount: number;
  /** Cuenta anidada, forma que consumia el endpoint anterior. */
  account: { code: string; name: string };
};

export type Comprobante = {
  id: string;
  date: string;
  voucher_type: string;
  voucher_number: number;
  description: string;
  reference: string;
  total_amount: number;
  currency: string;
  entries: LineaAsiento[];
};

export type CuentaMayor = {
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  balance: number;
};

export type FilaResumen = {
  anio: number;
  mes: number;
  tipo: "INGRESO" | "EGRESO";
  total_transacciones: number;
  total_monto: number;
  total_debe: number;
  total_haber: number;
};

type Rango = { desde?: string | null; hasta?: string | null };

type LineaVista = {
  id_transaccion: string | null;
  fecha: string | null;
  concepto: string | null;
  origen: string | null;
  cuenta_codigo: string | null;
  cuenta_nombre: string | null;
  debito: number | string | null;
  credito: number | string | null;
  monto: number | string | null;
  company_id: string | null;
};

const CAMPOS_LINEA =
  "id_transaccion, fecha, concepto, origen, cuenta_codigo, cuenta_nombre, debito, credito, monto, company_id";

const CENTAVOS = 100;

function aNumero(valor: unknown): number {
  const n = typeof valor === "number" ? valor : Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Centavos -> lempiras, redondeado a 2 decimales para no arrastrar flotantes. */
function aLempiras(valor: unknown): number {
  return Math.round(aNumero(valor)) / CENTAVOS;
}

function texto(valor: unknown, porDefecto = ""): string {
  return valor === null || valor === undefined ? porDefecto : String(valor);
}

function iso(valor: string | null | undefined): string | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function alcance(empresa: ContextoEmpresa) {
  return filtroEmpresaOCompany(empresa);
}

/**
 * Filas de asiento del periodo, ya filtradas por empresa en la propia consulta.
 * `tipo` se compara sin distinguir mayusculas: las polizas historicas usan
 * INGRESO/EGRESO pero no hay garantia de que siempre sea asi.
 */
async function leerLineas(
  empresa: ContextoEmpresa,
  opciones: Rango & { tipo?: string | null } = {}
): Promise<LineaVista[]> {
  let query = getSupabaseServer()
    .from("v_transacciones_cierre")
    .select(CAMPOS_LINEA)
    .match(alcance(empresa));

  const desde = iso(opciones.desde);
  const hasta = iso(opciones.hasta);
  if (desde) query = query.gte("fecha", desde);
  if (hasta) query = query.lte("fecha", hasta);
  if (opciones.tipo) query = query.ilike("origen", opciones.tipo);

  const { data, error } = await query
    .order("fecha", { ascending: true })
    .order("id_transaccion", { ascending: true });

  if (error) {
    throw Object.assign(
      new Error(`No se pudo leer v_transacciones_cierre: ${error.message}`),
      { status: 500 }
    );
  }
  return (data ?? []) as LineaVista[];
}

function lineaVacia(fila: LineaVista): boolean {
  return (
    !texto(fila.cuenta_codigo).trim() &&
    aNumero(fila.debito) === 0 &&
    aNumero(fila.credito) === 0
  );
}

/**
 * Agrupa filas de asiento en comprobantes.
 *
 * `v_transacciones_cierre` no expone el numero de poliza, asi que se numera de
 * forma estable por tipo en el orden fecha/id. Es el unico dato que la vista no
 * puede aportar; el resto (fecha, tipo, concepto, cuentas, debe/haber) si viene
 * de la base.
 */
export function agruparComprobantes(lineas: LineaVista[]): Comprobante[] {
  const porTransaccion = new Map<string, Comprobante>();

  for (const fila of lineas) {
    if (lineaVacia(fila)) continue;

    const id = texto(fila.id_transaccion) || `sin-id-${porTransaccion.size}`;
    let comprobante = porTransaccion.get(id);

    if (!comprobante) {
      comprobante = {
        id,
        date: texto(fila.fecha),
        voucher_type: texto(fila.origen, "DIARIO") || "DIARIO",
        voucher_number: 0,
        description: texto(fila.concepto),
        reference: "",
        total_amount: 0,
        currency: "HNL",
        entries: [],
      };
      porTransaccion.set(id, comprobante);
    }

    const debit = aLempiras(fila.debito);
    const credit = aLempiras(fila.credito);
    const code = texto(fila.cuenta_codigo);
    const name = texto(fila.cuenta_nombre);

    comprobante.entries.push({
      id: `${id}-${comprobante.entries.length}`,
      account_code: code || "-",
      account_name: name || "Sin cuenta",
      account_type: "",
      debit,
      credit,
      description: texto(fila.concepto),
      amount: Math.round((debit - credit) * CENTAVOS),
      account: { code, name },
    });
  }

  const comprobantes = Array.from(porTransaccion.values());
  const contadorPorTipo = new Map<string, number>();
  for (const comprobante of comprobantes) {
    const siguiente = (contadorPorTipo.get(comprobante.voucher_type) ?? 0) + 1;
    contadorPorTipo.set(comprobante.voucher_type, siguiente);
    comprobante.voucher_number = siguiente;

    // Una poliza cuadrada tiene debe == haber. Se toma el lado deudor; si la
    // poliza solo trae acreedoras (asientos de ajuste), se usa el haber.
    const debe = comprobante.entries.reduce((suma, linea) => suma + linea.debit, 0);
    const haber = comprobante.entries.reduce((suma, linea) => suma + linea.credit, 0);
    comprobante.total_amount = Math.round((debe > 0 ? debe : haber) * 100) / 100;
  }

  return comprobantes;
}

export async function libroDiario(
  empresa: ContextoEmpresa,
  opciones: Rango & { tipo?: string | null } = {}
): Promise<Comprobante[]> {
  return agruparComprobantes(await leerLineas(empresa, opciones));
}

/** Ingresos/egresos comparten forma con el libro diario; solo cambia el filtro. */
export async function comprobantesPorTipo(
  empresa: ContextoEmpresa,
  tipo: string,
  opciones: Rango = {}
): Promise<Comprobante[]> {
  return agruparComprobantes(await leerLineas(empresa, { ...opciones, tipo }));
}

/**
 * Libro mayor y balance de comprobacion salen de la vista agregada
 * `balanza_comprobacion`. No admite filtro por fecha (la vista no expone el
 * periodo): el rango se aplica en el diario, y estas pestañas muestran los
 * saldos acumulados, igual que hacia la RPC original con los saldos.
 */
async function leerSaldos(empresa: ContextoEmpresa): Promise<CuentaMayor[]> {
  const { data, error } = await getSupabaseServer()
    .from("balanza_comprobacion")
    .select("id, name, type, total_debitos, total_creditos")
    .match(alcance(empresa))
    .order("id", { ascending: true });

  if (error) {
    throw Object.assign(
      new Error(`No se pudo leer balanza_comprobacion: ${error.message}`),
      { status: 500 }
    );
  }

  return (data ?? []).map((fila: any) => {
    const debit = aLempiras(fila.total_debitos);
    const credit = aLempiras(fila.total_creditos);
    return {
      account_code: texto(fila.id),
      account_name: texto(fila.name),
      account_type: texto(fila.type),
      debit,
      credit,
      // La vista calcula el saldo segun la naturaleza de la cuenta; la UI pinta
      // deudor/acreedor con el signo, que es debe - haber.
      balance: Math.round((debit - credit) * 100) / 100,
    };
  });
}

export const libroMayor = leerSaldos;
export const balanceComprobacion = leerSaldos;

/** Resumen mensual ingresos/egresos a partir de `flujo_efectivo_mensual`. */
export async function resumenIngresosEgresos(
  empresa: ContextoEmpresa,
  opciones: Rango = {}
): Promise<FilaResumen[]> {
  let query = getSupabaseServer()
    .from("flujo_efectivo_mensual")
    .select("mes, ingresos, egresos, flujo_neto")
    .match(alcance(empresa));

  const desde = iso(opciones.desde);
  const hasta = iso(opciones.hasta);
  if (desde) query = query.gte("mes", desde);
  if (hasta) query = query.lte("mes", hasta);

  const { data, error } = await query.order("mes", { ascending: true });

  if (error) {
    throw Object.assign(
      new Error(`No se pudo leer flujo_efectivo_mensual: ${error.message}`),
      { status: 500 }
    );
  }

  const filas: FilaResumen[] = [];
  for (const fila of (data ?? []) as any[]) {
    const fecha = new Date(fila.mes);
    const anio = Number.isNaN(fecha.getTime()) ? 0 : fecha.getFullYear();
    const mes = Number.isNaN(fecha.getTime()) ? 0 : fecha.getMonth() + 1;
    filas.push({
      anio,
      mes,
      tipo: "INGRESO",
      total_transacciones: 0,
      total_monto: aLempiras(fila.ingresos),
      total_debe: 0,
      total_haber: 0,
    });
    filas.push({
      anio,
      mes,
      tipo: "EGRESO",
      total_transacciones: 0,
      total_monto: aLempiras(fila.egresos),
      total_debe: 0,
      total_haber: 0,
    });
  }
  return filas;
}
