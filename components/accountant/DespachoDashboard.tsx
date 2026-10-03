"use client";

/**
 * Panel del despacho: la vista que abre el contador con N empresas clientes.
 *
 * No es la contabilidad de una empresa, es el control de las N a la vez: por eso
 * NO vive bajo `/companies/[id]/...` y por eso su ruta API se acota con
 * `user_company_access` y no con el `companyId` de la cookie.
 *
 * LO QUE ESTA VISTA NO HACE
 * -------------------------
 * No inventa un numero que no se pudo medir. Cada metrica que depende de una
 * tabla que no existe viaja como `null` y se pinta como "sin dato", no como 0.
 * En un panel cuyo trabajo es decidir a quien se llama primero, un 0 falso es un
 * error operativo, no un detalle de estilo.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileWarning,
  Loader2,
  Search,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import type {
  EmpresaDespacho,
  EstadoConciliacion,
  FiltroCumplimiento,
  PayloadDespacho,
  Semaforo,
} from "@/types/despacho";

// ---------------------------------------------------------------------------
// Presentacion del semaforo
// ---------------------------------------------------------------------------
// Los tres chips usan la misma paleta que las tablas de `business-reports`
// (pestana Mantenimiento): `bg-green-100 text-green-800`,
// `bg-yellow-100 text-yellow-800` y `bg-red-100 text-red-800`, sin borde. Verde =
// ok, amarillo = atencion, rojo = vencido, en ese orden.
const SEMAFORO: Record<
  Semaforo,
  { etiqueta: string; chip: string; punto: string; anillo: string }
> = {
  ok: {
    etiqueta: "Al día",
    chip: "bg-green-100 text-green-800",
    punto: "bg-green-500",
    anillo: "ring-green-500/25",
  },
  atencion: {
    etiqueta: "Por vencer",
    chip: "bg-yellow-100 text-yellow-800",
    punto: "bg-yellow-500",
    anillo: "ring-yellow-500/25",
  },
  vencido: {
    etiqueta: "Vencido",
    chip: "bg-red-100 text-red-800",
    punto: "bg-red-500",
    anillo: "ring-red-500/25",
  },
};

const CONCILIACION: Record<EstadoConciliacion, { etiqueta: string; chip: string }> = {
  conciliada: { etiqueta: "Conciliado", chip: "bg-green-100 text-green-800" },
  pendiente: { etiqueta: "Sin conciliar", chip: "bg-yellow-100 text-yellow-800" },
  "sin-bancos": { etiqueta: "Sin bancos", chip: "bg-gray-100 text-gray-800" },
};

/** `2026-10-29` -> `29 oct 2026`. Un texto corto, sin ambigüedad de formato. */
function fechaCorta(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" });
}

/** "vence en 27 días" / "venció hace 12 días". */
function diasEnTexto(dias: number): string {
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  if (dias === -1) return "venció ayer";
  if (dias > 0) return `vence en ${dias} días`;
  return `venció hace ${Math.abs(dias)} días`;
}

/**
 * Un dato no medido se pinta "sin dato", nunca 0.
 * Es la regla del proyecto para todo numero que venga de una consulta que pudo
 * fallar.
 */
function numero(valor: number | null, sufijo = ""): string {
  return valor === null ? "sin dato" : `${valor.toLocaleString("es-HN")}${sufijo}`;
}

// ---------------------------------------------------------------------------
// Tarjeta de KPI
// ---------------------------------------------------------------------------

function KpiCard({
  titulo,
  valor,
  detalle,
  icono: Icono,
  tono = "neutro",
  sinFuente,
}: {
  titulo: string;
  valor: string;
  detalle: React.ReactNode;
  icono: React.ElementType;
  tono?: "neutro" | "alerta" | "urgente";
  sinFuente?: boolean;
}) {
  const tonos = {
    neutro: "text-cyan-600 bg-cyan-50",
    alerta: "text-amber-600 bg-amber-50",
    urgente: "text-red-600 bg-red-50",
  } as const;

  return (
    <Card className="min-w-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {titulo}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold tabular-nums",
                sinFuente && "text-base font-semibold text-muted-foreground"
              )}
            >
              {valor}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-md p-2", tonos[tono])}>
            <Icono className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{detalle}</div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------

export default function DespachoDashboard() {
  const { empresa: empresaActiva, cambiarEmpresa } = useWorkspace();

  const [datos, setDatos] = useState<PayloadDespacho | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroCumplimiento>("todos");
  const [entrandoEn, setEntrandoEn] = useState<string | null>(null);

  const cargar = useCallback(async (signal: AbortSignal) => {
    setCargando(true);
    try {
      const res = await fetch("/api/accountant/despacho", { cache: "no-store", signal });
      const cuerpo = await res.json().catch(() => null);
      if (signal.aborted) return;
      if (!res.ok) {
        setError(cuerpo?.error || `Error ${res.status}`);
        setDatos(null);
        return;
      }
      setError(null);
      setDatos(cuerpo as PayloadDespacho);
      setAvisos(Array.isArray(cuerpo?.avisos) ? cuerpo.avisos : []);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError("No se pudo cargar el panel del despacho.");
      setDatos(null);
    } finally {
      if (!signal.aborted) setCargando(false);
    }
  }, []);

  // Un solo efecto con las dos dependencias. El panel mira TODAS las empresas del
// contador, no la activa, asi que el cambio de empresa no deberia vaciarlo, pero
// despues de "Entrar" se vuelve a pedir para que la vista no se quede con lo que
// era cierto antes del cambio de contexto.
useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar, empresaActiva?.id]);

  /**
   * Busqueda y filtro se aplican sobre el dataset ya traido, no contra el
   * servidor: son 8 filas, no 8000. Un fetch por tecla haria parpadear la tabla.
   */
  const empresas = useMemo<EmpresaDespacho[]>(() => {
    const todas = datos?.empresas ?? [];
    const q = busqueda.trim().toLowerCase();
    return todas.filter((e) => {
      if (filtro !== "todos" && e.semaforo !== filtro) return false;
      if (!q) return true;
      // RTN a veces viene con guiones ("0101-0220-312304"). Se comparan tambien
      // los digitos sueltos para que escribir "01010220312304" lo encuentre.
      const soloDigitos = q.replace(/\D/g, "");
      const rtn = (e.rtn ?? "").toLowerCase();
      return (
        (e.nombre ?? "").toLowerCase().includes(q) ||
        rtn.includes(q) ||
        (soloDigitos.length > 0 && rtn.replace(/\D/g, "").includes(soloDigitos))
      );
    });
  }, [datos, busqueda, filtro]);

  const entrar = useCallback(
    async (id: string) => {
      if (id === empresaActiva?.id) return;
      setEntrandoEn(id);
      try {
        // `cambiarEmpresa` es el unico cambio de contexto del proyecto: aborta lo
        // que esta en vuelo, borra la cache `ws_*`, remonta el arbol por la `key`
        // y navega a `/companies/[id]`. Reimplementarlo aqui seria una segunda
        // via de cambio de empresa, que es exactamente donde se desincroniza el
        // contexto. (AGENTS.md seccion 1b)
        await cambiarEmpresa(id);
      } finally {
        setEntrandoEn(null);
      }
    },
    [cambiarEmpresa, empresaActiva?.id]
  );

  if (cargando && !datos) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando panel del despacho…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Panel del despacho</h1>
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={() => {
                const c = new AbortController();
                void cargar(c.signal);
              }}
              className="mt-2 underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!datos) return null;

const { kpis } = datos;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel del despacho</h1>
          <p className="text-sm text-gray-600">
            Estado tributario y operativo de las {kpis.totalEmpresas}{" "}
            {kpis.totalEmpresas === 1 ? "empresa" : "empresas"} que administras.
          </p>
        </div>
        <Badge variant="outline" className="bg-white text-gray-700">
          Corte al {fechaCorta(datos.fechaCorte)}
        </Badge>
      </header>

      {avisos.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Parte de los datos no se pudo leer</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs">
              Las cifras afectadas se muestran como &laquo;sin dato&raquo;, no como 0.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Empresas"
          valor={String(kpis.totalEmpresas)}
          detalle={
            <>
              {kpis.porSemaforo.ok} al día · {kpis.porSemaforo.atencion} por vencer ·{" "}
              <span className="font-medium text-red-700">{kpis.porSemaforo.vencido} vencidas</span>
            </>
          }
          icono={Building2}
        />

        <KpiCard
          titulo="Vencimientos próximos"
          valor={numero(kpis.vencimientosProximos)}
          detalle={<>Vencen o vencieron en los últimos {datos.diasAlerta} días</>}
          icono={AlertTriangle}
          tono={kpis.porSemaforo.vencido > 0 ? "urgente" : kpis.porSemaforo.atencion > 0 ? "alerta" : "neutro"}
          sinFuente={kpis.vencimientosProximos === null}
        />

        <KpiCard
          titulo="Docs por digitar"
          valor={numero(kpis.documentosPendientes)}
          detalle={
            <>
              {kpis.conciliacionesPendientes === null
                ? "Conciliación sin dato"
                : `${kpis.conciliacionesPendientes} con el banco sin conciliar`}
            </>
          }
          icono={FileWarning}
          tono={(kpis.documentosPendientes ?? 0) > 0 ? "alerta" : "neutro"}
          sinFuente={kpis.documentosPendientes === null}
        />

        <KpiCard
          titulo="Cobro de honorarios"
          valor={kpis.honorarios.hayFuente ? numero(kpis.honorarios.empresasPendientes) : "Sin fuente"}
          detalle={
            kpis.honorarios.hayFuente ? (
              <>
                {numero(kpis.honorarios.empresasAlDia)} al día · {numero(kpis.honorarios.empresasVencidas)}{" "}
                vencidas
              </>
            ) : (
              <>No hay tabla que registre lo que el cliente debe al despacho</>
            )
          }
          icono={Wallet}
          sinFuente={!kpis.honorarios.hayFuente}
        />
      </div>

      {/* ------------------------------------------------------- Herramientas */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="despacho-buscar" className="text-[11px] font-medium text-muted-foreground">
              Buscar por razón social o RTN
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="despacho-buscar"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre de empresa o RTN…"
                className="pl-8"
              />
            </div>
          </div>

          <div className="w-full sm:w-64">
            <label htmlFor="despacho-filtro" className="text-[11px] font-medium text-muted-foreground">
              Cumplimiento
            </label>
            <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroCumplimiento)}>
              <SelectTrigger id="despacho-filtro" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas ({kpis.totalEmpresas})</SelectItem>
                <SelectItem value="ok">Al día ({kpis.porSemaforo.ok})</SelectItem>
                <SelectItem value="atencion">Por vencer ({kpis.porSemaforo.atencion})</SelectItem>
                <SelectItem value="vencido">Vencido ({kpis.porSemaforo.vencido})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="ml-auto pb-2.5 text-xs text-muted-foreground tabular-nums">
            {empresas.length} de {kpis.totalEmpresas}
            {empresas.length !== kpis.totalEmpresas && " (filtradas)"}
          </p>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------ Tabla */}
      {/* Mismo formato que las tablas de `business-reports` (pestana
          Mantenimiento): `Card` con `CardHeader`/`CardTitle`, `CardContent` con
          `overflow-x-auto` y un `<table className="w-full text-sm">` a pelo, con
          `thead` en `bg-gray-50`, `th` de `px-4 py-2` y `td` de `px-4 py-3`. No el `Table` de
          `components/ui/table`, que aplica su propio padding y se ve distinto al
          de al lado. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-600" />
            Estado de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Razón Social</th>
                  <th className="px-4 py-2 text-left">RTN</th>
                  <th className="px-4 py-2 text-center">Estado Tributario</th>
                  <th className="px-4 py-2 text-center">Próx. Vencimiento</th>
                  <th className="px-4 py-2 text-center">Carga Operativa</th>
                  <th className="px-4 py-2 text-center">Honorarios</th>
                  <th className="px-4 py-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {empresas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                      Ninguna empresa coincide con el filtro.
                    </td>
                  </tr>
                )}

                {empresas.map((e) => {
                  const semaforo = SEMAFORO[e.semaforo];
                  const esActiva = e.id === empresaActiva?.id;
                  const entrando = entrandoEn === e.id;
                  const con = e.carga.conciliacion;

                  return (
                    <tr key={e.id} className={cn("border-b", esActiva && "bg-cyan-50")}>
                      {/* Identificacion */}
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn("h-2 w-2 shrink-0 rounded-full", semaforo.punto)}
                            aria-hidden
                          />
                          <span className="truncate">{e.nombre || "(sin nombre)"}</span>
                        </div>
                        {esActiva && (
                          <span className="ml-4 text-xs text-cyan-700">Empresa activa</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">{e.rtn ?? "—"}</td>

                      {/* Estado tributario */}
                      <td className="px-4 py-3 text-center">
                        <Badge className={semaforo.chip}>{semaforo.etiqueta}</Badge>
                        {e.relationship === "accountant" && (
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
                            Contabilidad de cliente
                          </p>
                        )}
                      </td>

                      {/* Vencimiento */}
                      <td className="px-4 py-3 text-center">
                        {e.vencimiento ? (
                          <>
                            <p className="font-medium">{fechaCorta(e.vencimiento.fecha)}</p>
                            <p className="text-xs text-gray-500">
                              {e.vencimiento.tipo}
                              {e.vencimiento.referencia ? ` · ${e.vencimiento.referencia}` : ""}
                            </p>
                            <p
                              className={cn(
                                "text-xs font-medium",
                                e.vencimiento.semaforo === "vencido" && "text-red-600",
                                e.vencimiento.semaforo === "atencion" && "text-yellow-700"
                              )}
                            >
                              {diasEnTexto(e.vencimiento.dias)}
                            </p>
                          </>
                        ) : (
                          <span className="text-gray-500">Sin vencimiento</span>
                        )}
                      </td>

                      {/* Carga operativa */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <Badge
                            className={cn(
                              e.carga.documentosPendientes === null
                                ? "bg-gray-100 text-gray-500"
                                : e.carga.documentosPendientes > 0
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                            )}
                          >
                            {e.carga.documentosPendientes === null
                              ? "Docs sin dato"
                              : `${e.carga.documentosPendientes} docs`}
                          </Badge>
                          <Badge className={CONCILIACION[con].chip}>{CONCILIACION[con].etiqueta}</Badge>
                          {e.carga.estadoProcesamiento && (
                            <p className="text-[10px] text-gray-500">
                              Estado: {e.carga.estadoProcesamiento}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Honorarios */}
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-gray-100 text-gray-500">Sin fuente</Badge>
                      </td>

                      {/* Accion */}
                      <td className="px-4 py-3 text-center">
                        {esActiva ? (
                          <Button variant="outline" size="sm" disabled>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Aquí
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={entrando}
                            onClick={() => void entrar(e.id)}
                            className="bg-cyan-600 hover:bg-cyan-700"
                          >
                            {entrando ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ArrowRight className="mr-1 h-3.5 w-3.5" />
                            )}
                            Entrar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Cada empresa tiene su contabilidad separada. &laquo;Entrar&raquo; cambia el contexto
        completo a esa empresa y borra los datos que estaban en pantalla de la anterior.
      </p>
    </div>
  );
}