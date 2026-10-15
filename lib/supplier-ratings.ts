/**
 * Constantes compartidas de las calificaciones de proveedor (migracion 042).
 *
 * Vive aparte de `app/api/suppliers/ratings/route.ts` a proposito: un
 * `route.ts` del App Router solo puede exportar metodos HTTP y `config`, y
 * exportar un `CRITERIA` de ahi rompe el build. Ademas lo necesitan el
 * servidor (validar 1..5) y el cliente (pintar las estrellas), y duplicar esa
 * lista en dos sitios es la forma de que acaben discrepando en silencio.
 */

export const CRITERIA = ['quality', 'price', 'punctuality', 'service'] as const;
export type Criterio = (typeof CRITERIA)[number];

export const CRITERIO_LABEL: Record<Criterio, string> = {
  quality: 'Calidad',
  price: 'Precio',
  punctuality: 'Puntualidad',
  service: 'Servicio',
};

export const MAX_COMENTARIO = 2000;

/**
 * Un entero 1..5, o `null` si no lo es.
 *
 * Devuelve `null` y no `0` para que un 0 no pueda colarse como nota: la
 * separacion entre "no vino" y "viene malo" la hace quien llama. Acepta string
 * porque un `<input>` de numero siempre manda texto, y `"4"` es una nota
 * valida mientras que `4.5` no lo es.
 */
export function nota(valor: unknown): number | null {
  const n = typeof valor === 'string' ? Number(valor) : valor;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

/** El "global" es el promedio de los cuatro criterios, redondeado a 1 decimal. */
export function globalDe(notas: Partial<Record<Criterio, unknown>>): number {
  const suma = CRITERIA.reduce((acc, c) => acc + (typeof notas?.[c] === 'number' ? (notas[c] as number) : 0), 0);
  return Math.round((suma / CRITERIA.length) * 10) / 10;
}
