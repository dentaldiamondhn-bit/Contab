/**
 * Tipos del panel del despacho (vista multi-empresa del contador).
 *
 * Todos los numeros vienen como `number | null` y NO como 0. La distincion es
 * deliberada y es la regla del proyecto: un 0 afirma "se midio y no hay nada",
 * que es un dato; un `null` afirma "no se pudo medir". Confundirlos es como se
 * termina mostrando "0 documentos pendientes" en una empresa cuya consulta fallo,
 * y en un panel que sirve para decidir a quien se llama primero hoy, ese 0 falso
 * manda al contador a la empresa equivocada.
 *
 * Cada metrica viaja con `fuente` (de donde sale) o `sinFuente` (por que no se
 * pudo medir), para que la pantalla pueda decirlo en vez de hideslo.
 */

/** Semaforo de cumplimiento tributario. El corte de dias vive en la ruta. */
export type Semaforo = "ok" | "atencion" | "vencido";

export type FiltroCumplimiento = "todos" | Semaforo;

/** Razon por la que una metrica no se pudo medir. */
export type MotivoSinDato =
  /** La tabla que la respalda no existe todavia en el esquema. */
  | "sin-fuente"
  /** La consulta fallo (red, permisos, PostgREST). Se guarda el mensaje. */
  | "consulta-fallida";

/**
 * Vencimiento tributario mas proximo de una empresa.
 *
 * Viene de las autorizaciones de impresion (`cai` y `talonarios`), que son lo
 * unico del esquema con fecha de vencimiento fiscal por empresa. No hay una
 * tabla de declaraciones con fecha de vencimiento, asi que `tipo` dice QUE
 * vence y no se inventa el nombre de un impuesto.
 */
export type VencimientoTributario = {
  /** Fecha de vencimiento en ISO `YYYY-MM-DD`. */
  fecha: string;
  /** Que es lo que vence: "CAI" (autorizacion de impresion) o "Talonario". */
  tipo: "CAI" | "Talonario";
  /** Identificador del registro, para el enlace directo. */
  referencia: string | null;
  /** Dias hasta el vencimiento. Negativo si ya vencio. */
  dias: number;
  semaforo: Semaforo;
};

/** Carga operativa: documentos por digitar y estado de la conciliacion bancaria. */
export type CargaOperativa = {
  /** Documentos subidos que todavia no estan procesados. */
  documentosPendientes: number | null;
  /** El ultimo estado de `File.status` entre los pendientes (p. ej. "partial"). */
  estadoProcesamiento: string | null;
  /** Ultimo estado de conciliacion bancaria de la empresa. */
  conciliacion: EstadoConciliacion;
};

export type EstadoConciliacion =
  /** Hay conciliaciones registradas para el ejercicio actual. */
  | "conciliada"
  /** Hay bancos pero ninguna conciliacion: el banco esta sin trabajar. */
  | "pendiente"
  /** La empresa no tiene ningun banco dado de alta. */
  | "sin-bancos";

/**
 * Honorarios del despacho.
 *
 * `estado` es `null` mientras no exista la tabla que los registre. Hoy el
 * esquema no tiene ninguna: `Invoice` son facturas que la empresa emite a SUS
 * clientes (direccion contraria), `AccountReceivable`/`payment_vouchers` estan
 * vacias y `Tenant.monthlycost` es la cuota de software, no el honorario del
 * despacho. Inventar un saldo aqui seria el tipo de error que hace que un
 * contador deje de fiarse del panel.
 */
export type HonorariosDespacho = {
  estado: null | "al-dia" | "pendiente" | "vencido";
  monto: number | null;
  /** Fecha del ultimo cobro, si se llegara a registrar. */
  ultimoCobro: string | null;
  motivo: MotivoSinDato | null;
  detalle?: string | null;
};

/** Una fila de la tabla de estado de clientes. */
export type EmpresaDespacho = {
  /** `companies.id`. Es el isolation key y lo que viaja al cambiar de empresa. */
  id: string;
  nombre: string | null;
  rtn: string | null;
  tenantId: string;
  /** Relacion del usuario con ESTA empresa. Ver `rolDeEmpresa` en lib/workspace. */
  relationship: "owner" | "accountant" | "viewer";

  vencimiento: VencimientoTributario | null;
  /** Semaforo global de la empresa: el peor de sus fronts. */
  semaforo: Semaforo;
  carga: CargaOperativa;
  honorarios: HonorariosDespacho;

  /** Por que esta metrica no se pudo medir, si no se pudo. */
  avisos: string[];
};

/** Metricas de cabecera del panel. */
export type KpisDespacho = {
  totalEmpresas: number;
  /** Vencimientos ya pasados o dentro de `diasAlerta` dias. */
  vencimientosProximos: number | null;
  /** Reparto por semaforo. Suman `totalEmpresas`. */
  porSemaforo: Record<Semaforo, number>;
  documentosPendientes: number | null;
  /** Empresas con conciliacion pendiente o sin bancos. */
  conciliacionesPendientes: number | null;
  honorarios: {
    empresasAlDia: number | null;
    empresasPendientes: number | null;
    empresasVencidas: number | null;
    /** `false` mientras no exista la fuente. Evita pintar "0". */
    hayFuente: boolean;
  };
};

export type PayloadDespacho = {
  kpis: KpisDespacho;
  empresas: EmpresaDespacho[];
  /** Fecha de corte con la que se calculo todo (`YYYY-MM-DD`). */
  fechaCorte: string;
  /** Dias de margen que se consideran "por vencer". */
  diasAlerta: number;
  generatedAt: string;
};