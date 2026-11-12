import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import { usuarioAppId, empresasDelUsuario } from "@/lib/workspace";
import { ErrorDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import type {
  CargaOperativa,
  EmpresaDespacho,
  EstadoConciliacion,
  HonorariosDespacho,
  KpisDespacho,
  PayloadDespacho,
  Semaforo,
  VencimientoTributario,
} from "@/types/despacho";

/**
 * Panel del despacho: una fila por empresa cliente del contador.
 *
 * QUE AISLA ESTA RUTA
 * --------------------
 * Por `user_company_access`, no por `tenant_id` ni por un `companyId` del cliente.
 * La lista de empresas sale de `empresasDelUsuario(userId)`, que es el mismo
 * filtro de pertenencia que usa `contextoDeEspacio` para autorizar UNA empresa.
 * Aqui se aplica a las N de golpe.
 *
 * Por eso NO se usa `contextoDeEmpresa`: esa funcion resuelve y valida UNA
 * empresa concreta, y un panel tiene que mirar varias a la vez. Usarla obligaria
 * a elegir una, que es exactamente el bug que la seccion 1b de AGENTS.md
 * explica (TEST1DS tiene "test 1" y "test 2"; elegir una es adivinar).
 *
 * Y por eso no hay `?companyId` en esta ruta: aunque el cliente lo mandara, el
 * `.in("company_id", ids)` usa `ids`, que salen de la membresia. Un
 * `?companyId` de otra empresa no cambia ni una fila del resultado.
 *
 * OJO con `viewer`: `empresasDelUsuario` ya lo excluye (no es un rol de los dos
 * flujos del onboarding). Por eso el `relationship` de la fila no lleva `viewer`
 * en la practica aunque el tipo lo admita.
 */

/** Dias de margen: a partir de aqui un vencimiento pasa de "ok" a "atencion". */
const DIAS_ALERTA = 30;

/** `File.status` con el que un documento deja de estar pendiente. */
const DOCUMENTO_PROCESADO = "processed";

export const dynamic = "force-dynamic";

/** Diferencia en dias calendario entre hoy y `fecha`. Negativo si ya paso. */
function diasHasta(fecha: string, hoy: Date): number {
  // Se compara a medianoche en ambos extremos. Si se dejara la hora del dia, un
  // vencimiento que es "hoy" daria 0 a las 00:00 y -1 a las 12:00, y el semaforo
  // dependeria de la hora a la que se abrio el panel.
  const f = new Date(`${fecha}T00:00:00`);
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((f.getTime() - h.getTime()) / 86400000);
}

function semaforoDe(dias: number): Semaforo {
  if (dias < 0) return "vencido";
  if (dias <= DIAS_ALERTA) return "atencion";
  return "ok";
}

/**
 * Una consulta que puede fallar sin tumbar el panel.
 *
 * Devuelve `null` cuando no se pudo leer, y eso se traduce en un `null` en la
 * pantalla. Un `catch` que devuelve `[]` es lo que produce el "0 documentos
 * pendientes" que hace creer que una empresa esta al dia cuando lo que fallo fue
 * la consulta.
 */
async function leer<T>(
  etiqueta: string,
  fn: () => Promise<{ data: T | null; error: unknown }>
): Promise<{ filas: T[] | null; aviso: string | null }> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.error(`[despacho] ${etiqueta}:`, error);
      return { filas: null, aviso: `No se pudo leer ${etiqueta}.` };
    }
    return { filas: Array.isArray(data) ? data : [], aviso: null };
  } catch (e) {
    console.error(`[despacho] ${etiqueta} lanzo:`, e);
    return { filas: null, aviso: `No se pudo leer ${etiqueta}.` };
  }
}

export async function GET(request: NextRequest) {
  try {
    // `contextoDeEmpresa` va DENTRO del try a proposito: fuera, su 403 escapa sin
    // traducir y Next responde 500 (ver AGENTS.md seccion 1).
    const userId = await usuarioAppId();
    if (!userId) {
      throw new ErrorDeEmpresa(401, "Sin sesión.");
    }

    const permitidas = await empresasDelUsuario(userId);
    if (permitidas.length === 0) {
      throw new ErrorDeEmpresa(403, "Tu usuario no tiene ninguna empresa asignada.");
    }

    const hoy = new Date();
    const fechaCorte = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
      hoy.getDate()
    ).padStart(2, "0")}`;

    // Un solo id por empresa. Es la lista que sale de la membresia, y TODAS las
    // consultas de abajo van filtradas por ella: ninguna lee una empresa ajena.
    const ids = permitidas.map((e) => e.id);
    const supabase = getSupabaseServer() as any;

    // Una consulta por tabla, no una por empresa. Con 8 empresas y 5 tablas, 5
    // consultas en vez de 40. El `.in()` con la lista completa es ademas lo que
    // hace imposible que una empresa se cuele: no hay forma de pasar un id.
    const [cai, talonarios, files, conciliaciones, bancos] = await Promise.all([
      leer("los CAI", () =>
        supabase
          .from("cai")
          .select("id, cai_number, company_id, fecha_limite_emision, expiration_date, estado")
          .in("company_id", ids)
      ),
      leer("los talonarios", () =>
        supabase
          .from("talonarios")
          .select("id, company_id, fecha_vencimiento, expiry_date, estado")
          .in("company_id", ids)
      ),
      leer("los documentos", () =>
        supabase
          .from("File")
          .select("id, company_id, status, category")
          .in("company_id", ids)
          .is("deleted_at", null)
      ),
      leer("las conciliaciones", () =>
        supabase
          .from("Reconciliation")
          .select("id, company_id, statementDate, closingBalance")
          .in("company_id", ids)
          .order("statementDate", { ascending: false })
      ),
      leer("los bancos", () =>
        supabase
          .from("bankaccount")
          .select("id, company_id, is_active")
          .in("company_id", ids)
      ),
    ]);

    const avisosGlobales: string[] = [];
    for (const a of [cai.aviso, talonarios.aviso, files.aviso, conciliaciones.aviso, bancos.aviso]) {
      if (a && !avisosGlobales.includes(a)) avisosGlobales.push(a);
    }

    // ----------------------------------------------------------------------
    // Vencimientos: el mas proximo de los dos juegos de autorizaciones.
    // ----------------------------------------------------------------------
    // `cai` tiene DOS convenciones de fecha superpuestas (AGENTS.md seccion 4) y
    // `expiration_date` llega como cadena vacia en filas reales, no como NULL. Se
    // acepta la que exista y se descarta la vacia, o el "" parsearia a una fecha
    // invalida y `dias` seria NaN, que es falsy y colaria un semaforo "ok".
    const fechasDe = (a: unknown, b: unknown): string | null => {
      for (const v of [a, b]) {
        const s = v == null ? "" : String(v).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      }
      return null;
    };

    type Candidato = { fecha: string; tipo: "CAI" | "Talonario"; referencia: string | null };
    const candidatos: Record<string, Candidato[]> = {};

    for (const c of (cai.filas ?? []) as any[]) {
      const fecha = fechasDe(c.fecha_limite_emision, c.expiration_date);
      if (!fecha) continue;
      (candidatos[c.company_id] ??= []).push({
        fecha,
        tipo: "CAI",
        referencia: c.cai_number ?? c.id ?? null,
      });
    }
    for (const t of (talonarios.filas ?? []) as any[]) {
      const fecha = fechasDe(t.fecha_vencimiento, t.expiry_date);
      if (!fecha) continue;
      (candidatos[t.company_id] ??= []).push({
        fecha,
        tipo: "Talonario",
        referencia: t.id ?? null,
      });
    }

    const vencimientoDe = (companyId: string): VencimientoTributario | null => {
      const lista = candidatos[companyId];
      if (!lista || lista.length === 0) return null;
      // El mas proximo: puede estar ya vencido o ser de dentro de un ano, pero es
      // el que obliga a actuar. Ordenar por fecha ISO compara bien como texto.
      const mejor = [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
      const dias = diasHasta(mejor.fecha, hoy);
      return {
        fecha: mejor.fecha,
        tipo: mejor.tipo,
        referencia: mejor.referencia,
        dias,
        semaforo: semaforoDe(dias),
      };
    };

    // ----------------------------------------------------------------------
    // Documentos pendientes y conciliacion, agrupados por empresa.
    // ----------------------------------------------------------------------
    const pendientesPor = new Map<string, { total: number; estados: Set<string> }>();
    if (files.filas) {
      for (const f of files.filas as any[]) {
        if (f.status === DOCUMENTO_PROCESADO) continue;
        const actual = pendientesPor.get(f.company_id) ?? { total: 0, estados: new Set<string>() };
        actual.total += 1;
        if (f.status) actual.estados.add(String(f.status));
        pendientesPor.set(f.company_id, actual);
      }
    }

    const conciliadas = new Set<string>();
    if (conciliaciones.filas) {
      for (const r of conciliaciones.filas as any[]) {
        if (r.company_id) conciliadas.add(r.company_id);
      }
    }

    const conBancos = new Set<string>();
    if (bancos.filas) {
      for (const b of bancos.filas as any[]) {
        if (b.company_id && b.is_active !== false) conBancos.add(b.company_id);
      }
    }

    const conciliacionDe = (companyId: string): EstadoConciliacion => {
      if (conciliadas.has(companyId)) return "conciliada";
      return conBancos.has(companyId) ? "pendiente" : "sin-bancos";
    };

    // ----------------------------------------------------------------------
    // Honorarios: sin fuente, y se dice.
    // ----------------------------------------------------------------------
    // Se recorre el esquema entero antes de escribir esto (OpenAPI de PostgREST):
    // no hay ninguna tabla que registre lo que un cliente debe al despacho por
    // servicios. `Invoice` es la direccion contraria (la empresa factura a SUS
    // clientes), `AccountReceivable` y `payment_vouchers` estan vacias, y
    // `Tenant.monthlycost` es la cuota de software, no un honorario.
    //
    // La unica respuesta honesta es `estado: null`. Poner 0 seria afirmar que
    // todos estan al corriente, y en un panel cuyo trabajo es decidir a quien
    // llamar primero hoy, ese 0 manda al contador a la empresa equivocada.
    const HONORARIOS_SIN_FUENTE = {
      estado: null,
      monto: null,
      ultimoCobro: null,
      motivo: "sin-fuente",
      detalle: "El esquema no tiene una tabla de honorarios del despacho.",
    } as const satisfies HonorariosDespacho;

    // ----------------------------------------------------------------------
    // Filas
    // ----------------------------------------------------------------------
    const empresas: EmpresaDespacho[] = permitidas.map((e) => {
      const avisos: string[] = [];
      const pendiente = pendientesPor.get(e.id);
      const vencimiento = vencimientoDe(e.id);

      const carga: CargaOperativa = {
        documentosPendientes: files.filas ? pendiente?.total ?? 0 : null,
        estadoProcesamiento: pendiente ? [...pendiente.estados].sort().join(", ") || null : null,
        conciliacion: bancos.filas && conciliaciones.filas ? conciliacionDe(e.id) : "sin-bancos",
      };

      // Sin vencimiento registrado el semaforo es "ok": no hay nada que cumplir.
      // No es lo mismo que "vencido", y marcarlo en rojo seria gritarle al
      // contador por una empresa que simplemente aun no registro su CAI.
      const semaforo: Semaforo = vencimiento ? vencimiento.semaforo : "ok";

      if (!cai.filas && !talonarios.filas) {
        avisos.push("No hay fecha de vencimiento fiscal registrada.");
      }
      if (!conciliaciones.filas) avisos.push("No se pudo leer la conciliación bancaria.");

      return {
        id: e.id,
        nombre: e.name ?? null,
        rtn: e.rtn ?? null,
        tenantId: e.tenant_id,
        relationship: e.relationship,
        vencimiento,
        semaforo,
        carga,
        honorarios: { ...HONORARIOS_SIN_FUENTE },
        avisos,
      };
    });

    // ----------------------------------------------------------------------
    // KPIs de cabecera
    // ----------------------------------------------------------------------
    const porSemaforo: Record<Semaforo, number> = { ok: 0, atencion: 0, vencido: 0 };
    for (const e of empresas) porSemaforo[e.semaforo] += 1;

    // Los documentos pendientes se suman solo si TODAS las lecturas salieron
    // bien. Con una fallida, la suma parcial seria un numero con una parte
    // faltante, que es peor que no dar ninguno: no se puede ver que le falta.
    const documentosPendientes = files.filas
      ? empresas.reduce((acc, e) => acc + (e.carga.documentosPendientes ?? 0), 0)
      : null;

    const conciliacionesPendientes =
      bancos.filas && conciliaciones.filas
        ? empresas.filter((e) => e.carga.conciliacion !== "conciliada").length
        : null;

    const kpis: KpisDespacho = {
      totalEmpresas: empresas.length,
      vencimientosProximos:
        cai.filas || talonarios.filas
          ? empresas.filter((e) => e.vencimiento && e.vencimiento.dias <= DIAS_ALERTA).length
          : null,
      porSemaforo,
      documentosPendientes,
      conciliacionesPendientes,
      honorarios: {
        empresasAlDia: null,
        empresasPendientes: null,
        empresasVencidas: null,
        hayFuente: false,
      },
    };

    const payload: PayloadDespacho = {
      kpis,
      empresas,
      fechaCorte,
      diasAlerta: DIAS_ALERTA,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, ...payload, avisos: avisosGlobales });
  } catch (error) {
    // Sin esto, un 403 se reporta como 500 y un problema de permisos parece un
    // fallo del servidor (AGENTS.md seccion 1).
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error("[despacho] error no controlado:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo cargar el panel del despacho." },
      { status: 500 }
    );
  }
}