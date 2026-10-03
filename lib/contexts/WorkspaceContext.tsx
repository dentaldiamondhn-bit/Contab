"use client";

/**
 * Contexto de trabajo: empresa activa y sede activa.
 *
 * Ver AGENTS.md seccion 1b. Complementa a TenantContext, que sigue siendo el
 * dueño del tenant y de la impersonacion de superadmin; este se encarga de
 * QUE EMPRESA y QUE SEDE, que es donde estan los dos flujos del onboarding.
 *
 * POR QUE NO HAY React Query / Zustand / Redux EN ESTE PROYECTO
 * -----------------------------------------------------------
 * No hay ninguna de esas librerias en package.json: el estado global es React
 * Context y localStorage. No se anade una dependencia para esto porque cambiar
 * el modelo de estado de un proyecto que ya tiene 481 errores de typecheck es
 * un trabajo con riesgo propio, no un efecto secundario de agregar un selector.
 *
 * QUE "LIMPIAR EL ESTADO" SIGNIFICA AQUI, Y POR QUE NO ES COSA DE UN SETSTATE
 * ---------------------------------------------------------------------------
 * El peligro real al cambiar de empresa no es el estado de React: son las
 * respuestas HTTP que ya estan en vuelo. Si el usuario cambia de empresa
 * mientras se pide el inventario, la respuesta vieja aterriza DESPUES y
 * paints datos de la empresa anterior en la pantalla nueva, sin error y sin que
 * nadie lo note. Por eso hay un contador de generacion: cada cambio lo sube,
 * toda respuesta que llegue con una generacion vieja se descarta.
 *
 * Ademas se limpian las claves de cache de localStorage que empieza por
 * `ws_`, porque una entrada cacheada por cuenta cruzaria datos entre empresas.
 *
 * LO QUE NO SE HACE AQUI
 * ---------------------
 * No se decide la empresa activa sin permiso del servidor: se pide a
 * /api/workspace y se usa lo que responde. El cliente no es la fuente de
 * verdad; la membresia en user_company_access lo es.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type RolEspacio = "accountant" | "business_owner";

export type EmpresaActiva = {
  id: string;
  name: string | null;
  rtn: string | null;
  tenant_id: string;
  relationship: "owner" | "accountant" | "viewer";
  is_default: boolean;
};

export type SedeActiva = {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
};

type EstadoWorkspace = {
  cargando: boolean;
  error: string | null;
  role: RolEspacio | null;
  /** El usuario administra 2+ empresas, pero puede ser dueño de la activa. */
  multiEmpresa: boolean;
  /** Solo true si es dueño de la empresa ACTIVA. El contador no consolida. */
  permiteConsolidar: boolean;
  empresa: EmpresaActiva | null;
  empresas: EmpresaActiva[];
  sede: SedeActiva | null;
  sedes: SedeActiva[];
  consolidando: boolean;
  /**
   * Empresa "comprometida" con el arbol de UI. Cambia AL CAMBIAR DE EMPRESA y es
   * la `key` que remonta la aplicacion entera (ver WorkspaceShell). Se mantiene
   * estable mientras `empresa` es null (transicion) para no remontar dos veces.
   *
   * No es lo mismo que `empresa.id`: `empresa` se vacia al empezar la carga
   * (para no pintar datos viejos) y `activeCompanyId` sobrevive a esa limpieza.
   */
  activeCompanyId: string | null;
  /** Vacia el estado de la empresa en la UI (empresa/sede/consolidado). */
  limpiarEstado: () => void;
  cambiarEmpresa: (id: string) => Promise<void>;
  cambiarSede: (id: string | "ALL") => Promise<void>;
};

const Ctx = createContext<EstadoWorkspace | undefined>(undefined);

const COOKIE_EMPRESA = "active_company_id";
const COOKIE_SEDE = "active_location_id";

/** Cuanto vale una cookie de contexto: 8 horas. */
const MAX_AGE = 60 * 60 * 8;

function ponerCookie(nombre: string, valor: string) {
  document.cookie = `${nombre}=${encodeURIComponent(valor)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<RolEspacio | null>(null);
  const [multiEmpresa, setMultiEmpresa] = useState(false);
  const [permiteConsolidar, setPermiteConsolidar] = useState(false);
  const [empresa, setEmpresa] = useState<EmpresaActiva | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaActiva[]>([]);
  const [sede, setSede] = useState<SedeActiva | null>(null);
  const [sedes, setSedes] = useState<SedeActiva[]>([]);
  const [consolidando, setConsolidando] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  const router = useRouter();
  // Cada cambio de empresa o sede sube la generacion. Las respuestas que lleguen
  // con una generacion vieja se tiran. Sin esto, cambiar de empresa a mitad de
  // carga deja datos de la anterior en pantalla.
  const generacion = useRef(0);
  const abortadores = useRef<Set<AbortController>>(new Set());

  const borrarCacheLocal = useCallback(() => {
    // Solo lo que escribe este modulo. Se deja `selected_tenant` y
    // `tenant_id` intactos a proposito: son de TenantContext, que tiene su
    // propia invalidacion, y no son datos de empresa.
    const claves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("ws_")) claves.push(k);
    }
    for (const k of claves) localStorage.removeItem(k);
  }, []);

  /**
   * Deja la UI sin la empresa anterior: empresa/sede/consolidado a cero. Es el
   * "RESET_STORE" de este proyecto (no hay Redux/Zustand ni, por tanto, un
   * `queryClient.clear()`). No borra la lista de `empresas` ni el `role`: eso lo
   * repone la carga de la empresa nueva.
   */
  const limpiarEstado = useCallback(() => {
    setEmpresa(null);
    setSede(null);
    setSedes([]);
    setConsolidando(false);
  }, []);

  const abortarEnVuelo = useCallback(() => {
    for (const c of abortadores.current) c.abort();
    abortadores.current.clear();
  }, []);

  const cargar = useCallback(
    async (companyId?: string, locationId?: string): Promise<string | null> => {
      const mine = ++generacion.current;
      const controller = new AbortController();
      abortadores.current.add(controller);
      setCargando(true);

      const params = new URLSearchParams();
      if (companyId) params.set("companyId", companyId);
      if (locationId) params.set("locationId", locationId);
      const qs = params.toString();

      try {
        const res = await fetch(`/api/workspace${qs ? `?${qs}` : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (mine !== generacion.current) return null; // respuesta vieja
        if (!res.ok) {
          setError(data?.error || `Error ${res.status}`);
          setEmpresa(null);
          return null;
        }
        setError(null);
        setRole(data.role ?? null);
        setMultiEmpresa(Boolean(data.multiEmpresa));
        setPermiteConsolidar(Boolean(data.permiteConsolidar));
        setEmpresas(Array.isArray(data.empresas) ? data.empresas : []);
        // Solo avanza cuando la carga termino bien: si falla, la key no cambia y
        // el arbol no se remonta con datos a medias.
        setActiveCompanyId(data.activeCompanyId ?? null);
        setEmpresa(data.empresas?.find((e: EmpresaActiva) => e.id === data.activeCompanyId) ?? null);
        setSedes(Array.isArray(data.locations) ? data.locations : []);
        setSede(data.locations?.find((l: SedeActiva) => l.id === data.activeLocationId) ?? null);
        setConsolidando(!data.activeLocationId && Boolean(data.permiteConsolidar));
        // Se devuelve la empresa que el servidor confirmo: si venia una `?companyId`
        // que no es de este usuario, `activa` es otra, y quien llama necesita
        // saberlo para no dejar la UI apuntando a una empresa no autorizada.
        return data.activeCompanyId ?? null;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return null;
        if (mine !== generacion.current) return null;
        setError("No se pudo cargar el contexto de trabajo.");
        return null;
      } finally {
        abortadores.current.delete(controller);
        if (mine === generacion.current) setCargando(false);
      }
    },
    []
  );

  useEffect(() => {
    // En la carga inicial manda el `[id]` de la URL: es la empresa que estan
    // consultando las paginas. Sin esto el contexto caia a la empresa por
    // defecto y el selector/badge mostraban una distinta a la de la pantalla.
    // Fuera de `/companies/...` no hay `[id]` y el servidor usa la cookie.
    const enUrl = typeof window !== "undefined"
      ? window.location.pathname.split("/companies/")[1]?.split("/")[0] || undefined
      : undefined;
    void cargar(enUrl);
    return () => abortarEnVuelo();
  }, [cargar, abortarEnVuelo]);

  const cambiarEmpresa = useCallback(
    async (id: string) => {
      if (id === empresa?.id) return;
      // La empresa de la que se sale, para poder volver si el servidor no
      // acepta la nueva.
      const previa = empresa?.id ?? null;
      // El orden importa: primero se invalida todo lo viejo, despues se pide lo
      // nuevo. Al reves, la respuesta vieja podria pintar en la pantalla nueva.
      abortarEnVuelo();
      borrarCacheLocal();
      limpiarEstado();
      // La key del arbol cambia AQUI, antes del fetch: React desmonta toda la UI
      // de la empresa anterior (useState locales, filtros, formularios) y monta
      // una limpia que muestra "cargando" hasta que llega la respuesta nueva.
      setActiveCompanyId(id);
      ponerCookie(COOKIE_EMPRESA, id);
      ponerCookie(COOKIE_SEDE, ""); // limpiar la sede: pertenece a la empresa anterior
      const confirmada = await cargar(id);
      // Si el servidor no confirmo ESA empresa (403 sin membresia, cookie
      // caducada, error de red), `setActiveCompanyId(id)` habia dejado el menu
      // apuntando a una empresa que el servidor no acepta. Se vuelve a la
      // anterior: es preferible un enlace a la empresa previa, que es valida, que
      // uno a una empresa rechazada.
      if (confirmada !== id) {
        setActiveCompanyId(confirmada ?? previa);
        if (previa) ponerCookie(COOKIE_EMPRESA, previa);
        return;
      }
      // Se navega a la empresa: sin esto los Server Components de la pagina
      // actual se quedan con el contexto viejo, que es exactamente por lo que
      // TenantContext acaba recomendando un window.location.reload().
      router.push(`/companies/${id}`);
    },
    [empresa?.id, abortarEnVuelo, borrarCacheLocal, limpiarEstado, cargar, router]
  );

  const cambiarSede = useCallback(
    async (id: string | "ALL") => {
      if (id === "ALL" && !permiteConsolidar) {
        // El contador no tiene vista consolidada entre empresas. Se avisa en
        // vez de ignorar el clic en silencio, que es como se confunde a un
        // usuario que acaba de cambiar de rol.
        setError("La vista consolidada solo existe para el empresario.");
        return;
      }
      if (id !== "ALL" && id === sede?.id) return;
      abortarEnVuelo();
      borrarCacheLocal();
      setConsolidando(id === "ALL");
      if (id === "ALL") {
        ponerCookie(COOKIE_SEDE, "");
      } else {
        ponerCookie(COOKIE_SEDE, id);
        setSede(sedes.find((s) => s.id === id) ?? null);
      }
      await cargar(empresa?.id, id === "ALL" ? undefined : id);
    },
    [permiteConsolidar, sede?.id, sedes, empresa?.id, abortarEnVuelo, borrarCacheLocal, cargar]
  );

  const valor = useMemo<EstadoWorkspace>(
    () => ({
      cargando,
      error,
      role,
      multiEmpresa,
      permiteConsolidar,
      empresa,
      empresas,
      sede,
      sedes,
      consolidando,
      activeCompanyId,
      limpiarEstado,
      cambiarEmpresa,
      cambiarSede,
    }),
    [cargando, error, role, multiEmpresa, permiteConsolidar, empresa, empresas, sede, sedes, consolidando, activeCompanyId, limpiarEstado, cambiarEmpresa, cambiarSede]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useWorkspace(): EstadoWorkspace {
  const c = useContext(Ctx);
  if (c === undefined) throw new Error("useWorkspace debe usarse dentro de WorkspaceProvider");
  return c;
}
