'use client';

import { useEffect, useState } from 'react';

// Las fotos y los documentos de empleado ya NO se sirven con `getPublicUrl`: los
// dos buckets son privados y la ruta devuelve una URL firmada de 1 hora. En la BD
// se guarda el PATH, no la URL firmada, porque `employees.photo` se lee dias
// despues y una firma caduca.
//
// Este componente pide la firma cuando se pinta y la vuelve a pedir si caduca,
// con lo que no hay que tocar los ~7 sitios que hacian `<img src={emp.photo}>`.
//
// Acepta las dos formas: el path (`ANGELOH7/<id>/photo_1.png`) y la URL publica
// antigua, de la que se extrae el path. No hay filas con la forma antigua (los
// buckets estaban vacios), pero no cuesta nada no romperlas.

type Modo = 'img' | 'enlace';

interface Props {
  /** Path del storage, o URL publica antigua. */
  valor: string | null | undefined;
  /** `employee-photos` para fotos; el resto va a `employee-documents`. */
  bucket: 'employee-photos' | 'employee-documents';
  modo?: Modo;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}

const PREFIJO_PUBLICO = '/storage/v1/object/public/';

// La firma dura 1 hora (el GET devuelve `expiresIn`). Se renueva 5 minutos antes
// de que caduque, y al volver a la pestaña si ya toca: asi una ficha abierta toda
// la manana no acaba con imagenes rotas. El margen no puede comerse el TTL entero:
// si la firma fuese mas corta que el margen, se renueva a mitad de vida.
const TTL_POR_DEFECTO_SEG = 3600;
const MARGEN_RENOVACION_SEG = 300;

function extraerPath(valor: string): string | null {
  if (!valor) return null;
  if (valor.includes(PREFIJO_PUBLICO)) {
    const detras = valor.split(PREFIJO_PUBLICO)[1];
    return detras ? detras.slice(detras.indexOf('/') + 1) : null;
  }
  if (valor.startsWith('blob:') || valor.startsWith('data:')) return null;
  if (/^https?:\/\//.test(valor)) return null;
  return valor;
}

export default function ArchivoPrivado({
  valor,
  bucket,
  modo = 'enlace',
  alt = '',
  className,
  children,
}: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const path = extraerPath(valor || '');

  useEffect(() => {
    if (!path) return;
    const companyId = typeof window !== 'undefined'
      ? window.location.pathname.split('/companies/')[1]?.split('/')[0]
      : '';
    if (!companyId) return;

    let vigente = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let expiraEn = 0;

    const cargar = async () => {
      if (timer) { clearTimeout(timer); timer = null; }
      try {
        const r = await fetch(`/api/companies/${companyId}/hr/storage?path=${encodeURIComponent(path)}&bucket=${bucket}`);
        const j = await r.json().catch(() => ({}));
        if (!vigente) return;
        if (!r.ok) {
          setFallo(j.error || 'No se pudo obtener el fichero');
          return;
        }
        setFallo(null);
        setSignedUrl(j.signedUrl);
        const ttl = typeof j.expiresIn === 'number' && j.expiresIn > 0 ? j.expiresIn : TTL_POR_DEFECTO_SEG;
        expiraEn = Date.now() + ttl * 1000;
        const hastaRenovar = ttl - MARGEN_RENOVACION_SEG > 0 ? ttl - MARGEN_RENOVACION_SEG : Math.floor(ttl / 2);
        timer = setTimeout(() => { void cargar(); }, hastaRenovar * 1000);
      } catch {
        if (vigente) setFallo('No se pudo obtener el fichero');
      }
    };

    void cargar();

    // Si la pestaña estuvo oculta mas de lo que dura la firma, los `setTimeout`
    // pueden haberse saltado; al volver a la vista se renueva si ya toca.
    const alVisible = () => {
      if (document.visibilityState === 'visible' && expiraEn && Date.now() > expiraEn - MARGEN_RENOVACION_SEG * 1000) {
        void cargar();
      }
    };
    document.addEventListener('visibilitychange', alVisible);

    return () => {
      vigente = false;
      document.removeEventListener('visibilitychange', alVisible);
      if (timer) clearTimeout(timer);
    };
  }, [path, bucket]);

  // Previsualizacion inmediata tras subir: el caller pasa el path recien creado y
  // todavia no quiere el viaje de vuelta al servidor.
  if (!path && valor && (valor.startsWith('blob:') || valor.startsWith('data:'))) {
    return modo === 'img'
      ? <img src={valor} alt={alt} className={className} />
      : <a href={valor} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }

  if (!path) return null;
  if (fallo) {
    return modo === 'img' ? null : <span className="text-xs text-red-500">{fallo}</span>;
  }
  if (!signedUrl) {
    return modo === 'img'
      ? <div className={`${className} bg-gray-100 animate-pulse`} aria-label="Cargando" />
      : <span className="text-xs text-gray-400">Cargando…</span>;
  }

  return modo === 'img' ? (
    <img src={signedUrl} alt={alt} className={className} />
  ) : (
    <a href={signedUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
