'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Pencil, Trash2, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  CRITERIA,
  CRITERIO_LABEL,
  MAX_COMENTARIO,
  type Criterio,
  nota,
  globalDe,
} from '@/lib/supplier-ratings';

interface Calificacion {
  id: string;
  quality: number;
  price: number;
  punctuality: number;
  service: number;
  comment: string | null;
  created_at: string;
  global: number;
  autor: string;
  esMia: boolean;
}

interface RespuestaRatings {
  media: number | null;
  total: number;
  miCalificacionId: string | null;
  calificaciones: Calificacion[];
}

interface SupplierRatingsProps {
  supplierId: string;
}

/** Estrellas de solo lectura, con medias decimales (4.3 -> 4 llenas). */
function EstrellasLectura({ valor, size = 14 }: { valor: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={n <= Math.round(valor) ? 'w-4 h-4 fill-amber-400 text-amber-400' : 'w-4 h-4 text-gray-300'}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}

/** Selector 1..5. Un solo boton de submit: no se guarda por criterio. */
function SelectorEstrellas({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const activo = hover ?? value ?? 0;

  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} de 5 estrellas`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            className={
              n <= activo ? 'w-6 h-6 fill-amber-400 text-amber-400' : 'w-6 h-6 text-gray-300'
            }
          />
        </button>
      ))}
    </span>
  );
}

/** Resumen por criterio: media de cada uno, no solo el global. */
function ResumenCriterios({ filas }: { filas: Calificacion[] }) {
  const resumen = useMemo(() => {
    if (!filas.length) return null;
    return CRITERIA.map((c) => {
      const media =
        Math.round(
          (filas.reduce((acc, f) => acc + (f[c] ?? 0), 0) / filas.length) * 10
        ) / 10;
      return { criterio: c, media, conteo: filas.length };
    });
  }, [filas]);

  if (!resumen) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {resumen.map(({ criterio, media, conteo }) => (
        <div key={criterio} className="flex items-center justify-between gap-2 text-sm">
          <span className="text-gray-600">{CRITERIO_LABEL[criterio]}</span>
          <span className="flex items-center gap-2">
            <EstrellasLectura valor={media} size={12} />
            <span className="text-xs text-gray-500 tabular-nums">
              {media.toFixed(1)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SupplierRatings({ supplierId }: SupplierRatingsProps) {
  const [datos, setDatos] = useState<RespuestaRatings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Record<Criterio, number | null>>({
    quality: null,
    price: null,
    punctuality: null,
    service: null,
  });
  const [comentario, setComentario] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      // Sin `?companyId`: la ruta saca la empresa del contexto validado y
      // descarta ese parametro a proposito. Mandarlo permitiria leer de otra.
      const res = await fetch(`/api/suppliers/ratings?supplierId=${supplierId}`);
      if (!res.ok) {
        setError('No se pudieron cargar las calificaciones.');
        return;
      }
      setDatos((await res.json()) as RespuestaRatings);
      setError(null);
    } catch {
      setError('No se pudieron cargar las calificaciones.');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const formVacio = Object.values(form).every((v) => v === null);

  const globalForm = useMemo(() => {
    if (formVacio) return null;
    return globalDe(form as Record<Criterio, number>);
  }, [form, formVacio]);

  const guardar = async () => {
    if (formVacio) {
      setError('Elige al menos una estrella.');
      return;
    }
    if (comentario.length > MAX_COMENTARIO) {
      setError(`El comentario no puede pasar de ${MAX_COMENTARIO} caracteres.`);
      return;
    }

    setGuardando(true);
    try {
      const payload: Record<string, unknown> = { comment: comentario };
      for (const c of CRITERIA) payload[c] = form[c];

      // El `supplier_id` va en AMBOS casos: el PATCH lo necesita para revalidar
      // que el proveedor sigue siendo de esta empresa. Si se mandara solo el
      // `id`, un PATCH no comprobaria nada del proveedor.
      const editandoId = editando;
      const res = await fetch('/api/suppliers/ratings', {
        method: editandoId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editandoId
            ? { id: editandoId, supplier_id: supplierId, ...payload }
            : { supplier_id: supplierId, ...payload }
        ),
      });

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => ({}));
        setError(cuerpo.error || 'No se pudo guardar la calificacion.');
        return;
      }

      setEditando(null);
      setForm({ quality: null, price: null, punctuality: null, service: null });
      setComentario('');
      setError(null);
      await cargar();
    } catch {
      setError('No se pudo guardar la calificacion.');
    } finally {
      setGuardando(false);
    }
  };

  const empezarEdicion = (c: Calificacion) => {
    setEditando(c.id);
    setForm({
      quality: c.quality,
      price: c.price,
      punctuality: c.punctuality,
      service: c.service,
    });
    setComentario(c.comment || '');
    setError(null);
  };

  const borrar = async (id: string) => {
    if (!confirm('¿Eliminar tu calificacion?')) return;
    try {
      const res = await fetch(`/api/suppliers/ratings?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('No se pudo eliminar la calificacion.');
        return;
      }
      if (editando === id) {
        setEditando(null);
        setForm({ quality: null, price: null, punctuality: null, service: null });
        setComentario('');
      }
      await cargar();
    } catch {
      setError('No se pudo eliminar la calificacion.');
    }
  };

  const calificaciones = datos?.calificaciones ?? [];
  const miCalificacion = calificaciones.find((c) => c.esMia);

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Calificaciones y comentarios</h3>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm py-2">Cargando calificaciones...</div>
      ) : (
        <>
          {/* Promedio global + resumen por criterio */}
          <div className="rounded-md border bg-gray-50 p-3 space-y-3">
            {calificaciones.length === 0 ? (
              <div className="text-sm text-gray-500">
                Todavia no hay calificaciones para este proveedor.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-semibold tabular-nums">
                    {(datos?.media ?? 0).toFixed(1)}
                  </span>
                  <div>
                    <EstrellasLectura valor={datos?.media ?? 0} size={18} />
                    <div className="text-xs text-gray-500">
                      {calificaciones.length}{' '}
                      {calificaciones.length === 1 ? 'calificacion' : 'calificaciones'}
                    </div>
                  </div>
                </div>
                <ResumenCriterios filas={calificaciones} />
              </>
            )}
          </div>

          {/* Formulario: uno nuevo, o edicion de la propia */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                {editando ? 'Editando tu calificacion' : 'Calificar a este proveedor'}
              </h4>
              {editando && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditando(null);
                    setForm({ quality: null, price: null, punctuality: null, service: null });
                    setComentario('');
                  }}
                >
                  <X className="w-3 h-3" />
                  Cancelar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CRITERIA.map((c) => (
                <div key={c} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600">{CRITERIO_LABEL[c]}</span>
                  <SelectorEstrellas
                    value={form[c]}
                    onChange={(n) => setForm((f) => ({ ...f, [c]: n }))}
                  />
                </div>
              ))}
            </div>

            {globalForm !== null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Global</span>
                <EstrellasLectura valor={globalForm} />
                <span className="tabular-nums text-gray-500">{globalForm.toFixed(1)}</span>
              </div>
            )}

            <div className="space-y-1">
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Comentario (opcional)"
                rows={3}
                maxLength={MAX_COMENTARIO}
              />
              <div className="text-xs text-gray-400 text-right tabular-nums">
                {comentario.length}/{MAX_COMENTARIO}
              </div>
            </div>

            <Button onClick={guardar} disabled={guardando || formVacio}>
              {editando ? 'Guardar cambios' : 'Enviar calificacion'}
            </Button>
          </div>

          {/* Lista */}
          {calificaciones.length > 0 && (
            <div className="space-y-3">
              {calificaciones.map((c) => (
                <div key={c.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.autor}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <EstrellasLectura valor={c.global} size={12} />
                        <span className="text-xs text-gray-500 tabular-nums">
                          {c.global.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    {c.esMia && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => empezarEdicion(c)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => borrar(c.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {CRITERIA.map((k) => (
                      <div key={k} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{CRITERIO_LABEL[k]}</span>
                        <span className="tabular-nums">{c[k]}/5</span>
                      </div>
                    ))}
                  </div>

                  {c.comment && (
                    <div className="flex gap-2 text-sm text-gray-700">
                      <MessageSquare className="w-3 h-3 mt-1 shrink-0 text-gray-400" />
                      <span className="whitespace-pre-wrap">{c.comment}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {miCalificacion && !editando && (
            <p className="text-xs text-gray-400">
              Ya calificaste a este proveedor. Puedes editar tu calificacion.
            </p>
          )}
        </>
      )}
    </div>
  );
}