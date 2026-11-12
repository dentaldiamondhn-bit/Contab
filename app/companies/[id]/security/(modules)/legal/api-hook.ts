import { useState, useEffect } from 'react';

interface RevisionLegal {
  id: string;
  categoria: 'arrendamiento' | 'seguro' | 'licencia';
  titulo: string;
  descripcion: string;
  fechaVencimiento: string;
  estado: 'vigente' | 'proximo' | 'vencido';
  monto?: number;
  detalles: { [key: string]: string };
  contacto?: { nombre: string; telefono?: string; email?: string };
}

export function useRevisionesLegales(companyId: string, anio: string) {
  const [revisiones, setRevisiones] = useState<RevisionLegal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 useEffect ejecutado - companyId:', companyId, 'anio:', anio);
    
    const cargarRevisiones = async () => {
      console.log('🔄 Iniciando carga de revisiones...');
      try {
        setLoading(true);
        setError(null);
        
        const url = `/api/companies/${companyId}/legal/revisiones?anio=${anio}`;
        console.log('📡 Fetch URL:', url);
        
        const response = await fetch(url);
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Response error:', errorText);
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Datos recibidos:', data.length, 'items');
        console.log('📝 Primer dato recibido:', data[0]?.titulo);
        setRevisiones(data);
      } catch (err) {
        console.error('❌ Error al cargar revisiones legales:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
        console.log('🏁 Carga completada - loading:', false);
      }
    };

    if (companyId) {
      cargarRevisiones();
    } else {
      console.warn('⚠️ companyId no disponible, omitiendo carga');
      setLoading(false);
    }
  }, [companyId, anio]);

  const refrescarRevisiones = async () => {
    const cargarRevisiones = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/companies/${companyId}/legal/revisiones?anio=${anio}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar las revisiones legales');
        }
        
        const data = await response.json();
        setRevisiones(data);
      } catch (err) {
        console.error('Error al cargar revisiones legales:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    await cargarRevisiones();
  };

  return {
    revisiones,
    loading,
    error,
    refrescarRevisiones
  };
}
