// Módulo de almacenamiento global para revisiones legales
// Este módulo mantiene los datos en memoria durante la ejecución del servidor.
// Actualmente sin datos precargados: las revisiones provienen de la base de datos.

export interface RevisionLegal {
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

// Datos iniciales (vacío - sin datos de demostración)
const initialData: RevisionLegal[] = [];

// Usar globalThis para persistir entre hot reloads
declare global {
  var __revisionesLegalesStorage: RevisionLegal[] | undefined;
}

if (!globalThis.__revisionesLegalesStorage) {
  globalThis.__revisionesLegalesStorage = [...initialData];
}

export const storage = {
  getAll(): RevisionLegal[] {
    return [...(globalThis.__revisionesLegalesStorage || [])];
  },

  getById(id: string): RevisionLegal | undefined {
    return globalThis.__revisionesLegalesStorage!.find(r => r.id === id);
  },

  update(id: string, data: Partial<RevisionLegal>): RevisionLegal | null {
    const index = globalThis.__revisionesLegalesStorage!.findIndex(r => r.id === id);
    if (index >= 0) {
      globalThis.__revisionesLegalesStorage![index] = {
        ...globalThis.__revisionesLegalesStorage![index],
        ...data,
        id
      };
      return globalThis.__revisionesLegalesStorage![index];
    }
    return null;
  },

  create(data: Omit<RevisionLegal, 'id'>): RevisionLegal {
    const newId = String(globalThis.__revisionesLegalesStorage!.length + 1);
    const newRevision: RevisionLegal = {
      ...data,
      id: newId
    };
    globalThis.__revisionesLegalesStorage!.push(newRevision);
    return newRevision;
  },

  reset(): void {
    globalThis.__revisionesLegalesStorage! = [...initialData];
  }
};