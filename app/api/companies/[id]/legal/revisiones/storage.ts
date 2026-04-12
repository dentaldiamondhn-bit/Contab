// Módulo de almacenamiento global para revisiones legales
// Este módulo mantiene los datos en memoria durante la ejecución del servidor

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

// Datos iniciales
const initialData: RevisionLegal[] = [
  {
    id: '1',
    categoria: 'arrendamiento',
    titulo: 'Contrato de Arrendamiento - Consultorio Principal',
    descripcion: 'Local comercial en Colonia Los Robles',
    fechaVencimiento: '2026-12-31',
    estado: 'proximo',
    monto: 15000,
    detalles: {
      'Monto Alquiler': 'L 15,000.00',
      'Ajuste Anual': '5%',
      'Retención Aplicable': '10%',
      'Depósito Garantía': 'L 45,000.00',
      'Arrendador': 'Inmobiliaria Honduras S.A.'
    }
  },
  {
    id: '2',
    categoria: 'seguro',
    titulo: 'Póliza de Seguro - Responsabilidad Civil',
    descripcion: 'Cobertura general para la clínica dental',
    fechaVencimiento: '2026-06-15',
    estado: 'proximo',
    monto: 36000,
    detalles: {
      'Prima Anual': 'L 36,000.00',
      'Forma de Pago': '12 cuotas mensuales',
      'Cuota Mensual': 'L 3,000.00',
      'Compañía': 'Seguros Atlántida S.A.'
    },
    contacto: {
      nombre: 'Carlos Méndez',
      telefono: '504-2234-5678',
      email: 'carlos.mendez@segurosatlantida.hn'
    }
  },
  {
    id: '3',
    categoria: 'licencia',
    titulo: 'Permiso de Operación Municipal',
    descripcion: 'Licencia de funcionamiento emitida por Alcaldía',
    fechaVencimiento: '2026-12-31',
    estado: 'proximo',
    detalles: {
      'Impuesto Municipal': 'L 8,000.00',
      'Fecha Emisión': '2024-12-31',
      'Número de Licencia': 'MUN-2024-12345'
    }
  }
];

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
