/**
 * CAI del proveedor: evaluacion PURA y compartida (cliente + servidor).
 *
 * La regla del negocio es **advertir, no bloquear**: al registrar la factura de
 * una compra, si el proveedor tiene un CAI configurado y la factura cae fuera
 * del rango autorizado o el CAI vencio, se muestra una alerta preventiva. La
 * compra se guarda igual: el CAI del proveedor es un dato maestro que puede
 * estar sin actualizar, y bloquear la operacion seria peor que el aviso.
 *
 * No importa nada de servidor: es puro para poder usar la misma evaluacion en el
 * cliente (`'use client'`) y en pruebas, sin reimplementarla.
 */

export type SeveridadCai = 'aviso' | 'error';

export type CodigoProblemaCai =
  | 'CAI_VENCIDO'
  | 'CAI_POR_VENCER'
  | 'FUERA_DE_RANGO'
  | 'CAI_DISTINTO';

export interface ProblemaCai {
  codigo: CodigoProblemaCai;
  severidad: SeveridadCai;
  mensaje: string;
}

export type EstadoCai = 'ok' | 'aviso' | 'error';

export interface EvaluacionCai {
  estado: EstadoCai;
  problemas: ProblemaCai[];
}

/** CAI del proveedor (columnas de `Supplier`). */
export interface DatosCaiProveedor {
  cai?: string | null;
  cai_expiration_date?: string | null;
  cai_range_from?: string | null;
  cai_range_to?: string | null;
}

/** Datos de la factura de compra que se evalua. */
export interface DatosFacturaCai {
  cai?: string | null;
  invoice_number?: string | null;
}

/** Dias de antelacion con que se avisa que el CAI del proveedor esta por vencer. */
export const DIAS_POR_VENCER = 30;

/**
 * Normaliza un CAI para comparar: solo alfanumericos, en mayusculas. El CAI
 * hondureño se escribe con guiones (`XXXXXX-XXXXXX-...`), y dos capturas del
 * mismo codigo pueden diferir en guiones o espacios; comparar el texto crudo
 * daria un falso "distinto".
 */
export function normalizarCai(valor?: string | null): string {
  return String(valor ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Correlativo de un numero de factura o de un extremo de rango: la ultima
 * secuencia de digitos. `'000-001-01-00001234'` -> 1234. `null` si no hay
 * digitos, para no inventar comparaciones.
 */
export function correlativoDe(valor?: string | null): number | null {
  const m = String(valor ?? '').match(/(\d+)\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** `'YYYY-MM-DD'` (o el prefijo de un ISO) como Date local a medianoche; `null` si no es una fecha valida. */
export function fechaLocal(valor?: string | null): Date | null {
  if (!valor) return null;
  const m = String(valor).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function inicioDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatearFecha(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Evaluacion del CAI del proveedor frente a una factura de compra. Devuelve los
 * problemas encontrados (vacio = nada que advertir) y el peor nivel.
 */
export function evaluarCai(
  proveedor: DatosCaiProveedor | null | undefined,
  factura: DatosFacturaCai | null | undefined,
  hoy: Date = new Date()
): EvaluacionCai {
  const problemas: ProblemaCai[] = [];
  const proveedorCai = normalizarCai(proveedor?.cai);
  const facturaCai = normalizarCai(factura?.cai);

  // 1) El CAI de la factura no coincide con el registrado en el proveedor.
  if (proveedorCai && facturaCai && proveedorCai !== facturaCai) {
    problemas.push({
      codigo: 'CAI_DISTINTO',
      severidad: 'aviso',
      mensaje:
        'El CAI de la factura no coincide con el CAI registrado del proveedor. Verifique el documento o actualice el CAI del proveedor.',
    });
  }

  // 2) Vigencia del CAI del proveedor.
  const vence = fechaLocal(proveedor?.cai_expiration_date);
  if (vence) {
    const dias = Math.floor((vence.getTime() - inicioDelDia(hoy).getTime()) / 86400000);
    if (dias < 0) {
      problemas.push({
        codigo: 'CAI_VENCIDO',
        severidad: 'error',
        mensaje: `El CAI del proveedor venció el ${formatearFecha(vence)} (hace ${Math.abs(dias)} día(s)). No debería aceptar facturas de ese talonario.`,
      });
    } else if (dias <= DIAS_POR_VENCER) {
      problemas.push({
        codigo: 'CAI_POR_VENCER',
        severidad: 'aviso',
        mensaje: `El CAI del proveedor vence el ${formatearFecha(vence)} (en ${dias} día(s)). Solicite el nuevo CAI.`,
      });
    }
  }

  // 3) Rango autorizado de facturacion.
  const desde = correlativoDe(proveedor?.cai_range_from);
  const hasta = correlativoDe(proveedor?.cai_range_to);
  const numero = correlativoDe(factura?.invoice_number);
  if (desde !== null && hasta !== null && numero !== null) {
    const min = Math.min(desde, hasta);
    const max = Math.max(desde, hasta);
    if (numero < min || numero > max) {
      problemas.push({
        codigo: 'FUERA_DE_RANGO',
        severidad: 'error',
        mensaje: `El número de factura (${numero}) está fuera del rango autorizado del CAI (${min} - ${max}).`,
      });
    }
  }

  const estado: EstadoCai = problemas.some((p) => p.severidad === 'error')
    ? 'error'
    : problemas.length > 0
      ? 'aviso'
      : 'ok';

  return { estado, problemas };
}
