'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BookOpen, BarChart3, FileText, RefreshCw } from 'lucide-react';

import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';

interface IntegratedBookData {
  [key: string]: any;
}

// Estado por defecto cuando useWorkspace no está disponible (ej. SSR)
const workspaceDefaultState: EstadoWorkspace = {
  cargando: false,
  error: null,
  role: null,
  multiEmpresa: false,
  permiteConsolidar: false,
  empresa: null,
  empresas: [],
  sede: null,
  sedes: [],
  consolidando: false,
  activeCompanyId: null,
  limpiarEstado: () => {},
  cambiarEmpresa: async () => {},
  cambiarSede: async () => {},
};

const IntegratedBooksViewer: React.FC = () => {
  const { currentTenant } = useTenant();

  // Usar useWorkspace con captura de error
  let workspace: EstadoWorkspace;
  try {
    workspace = useWorkspace();
  } catch {
    // Si useWorkspace no está disponible (ej. SSR inicial), usar defaults
    workspace = workspaceDefaultState;
  }

  const { empresa } = workspace;

  // Antes era `currentTenant?.id || '1'`: un fallback fijo a la empresa 1 que
  // AGENTS.md prohibe, porque ademas de ser la empresa equivocada no es un
  // `companies.id` y no vale como isolation key. Las funciones de la 027c
  // exigen `p_company_id`, asi que sin empresa activa esta vista no tiene nada
  // que pedir: mejor un aviso que un libro sin filtrar.
  const tenantId = currentTenant?.id ?? null;
  const companyId = workspace.empresa?.id ?? null;

  const [bookType, setBookType] = useState<string>('diario');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [data, setData] = useState<IntegratedBookData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [syncing, setSyncing] = useState<boolean>(false);

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Libros Contables Integrados</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Visualización integrada de libros de ingresos, egresos, diario, mayor y balance de comprobación
        </p>
      </CardContent>
    </Card>
  );
};

export default IntegratedBooksViewer;

interface EstadoWorkspace {
  cargando: boolean;
  error: string | null;
  role: RolEspacio | null;
  multiEmpresa: boolean;
  permiteConsolidar: boolean;
  empresa: EmpresaActiva | null;
  empresas: EmpresaActiva[];
  sede: SedeActiva | null;
  sedes: SedeActiva[];
  consolidando: boolean;
  activeCompanyId: string | null;
  limpiarEstado: () => void;
  cambiarEmpresa: (id: string) => Promise<void>;
  cambiarSede: (id: string | "ALL") => Promise<void>;
}

type RolEspacio = "accountant" | "business_owner";

type EmpresaActiva = {
  id: string;
  name: string | null;
  rtn: string | null;
  tenant_id: string;
  relationship: "owner" | "accountant" | "viewer";
  is_default: boolean;
};

type SedeActiva = {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
};