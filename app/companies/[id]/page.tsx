'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateForDisplay, formatDateRange } from '@/lib/date-utils';
import { 
  Building2, 
  ArrowLeft,
  Plus, 
  Eye, 
  Settings, 
  FileText, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Edit,
  Trash2,
  DollarSign,
  Activity,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Receipt,
  Clock,
  TrendingUp,
  BarChart3,
  Users,
  Copy,
  Download,
  Scale,
  PieChart,
  Wallet,
  LayoutGrid,
  ExternalLink
} from 'lucide-react';

interface Company {
  id: string;
  business_name: string;
  business_rtn: string;
  industry: string;
  regimen_tributario: string;
  actividad_economica: string;
  direccion_fiscal: string;
  telefono_fiscal: string;
  email_fiscal: string;
  is_active: boolean;
  created_at: string;
  _count?: {
    polizas: number;
    accounts: number;
    talonarios: number;
  };
}

interface CAI {
  id: string;
  cai_number: string;
  fecha_limite_emision: string;
  fecha_asignacion: string;
  rango_inicial: number;
  rango_final: number;
  cantidad_recibos: number;
  recibos_utilizados: number;
  recibos_disponibles: number;
  estado: 'activo' | 'vencido' | 'agotado' | 'por_vencer';
  current_correlative?: number;
  created_at: string;
}

interface Talonario {
  id: string;
  cai_id: string;
  numero_talonario: string;
  fecha_solicitud: string;
  fecha_vencimiento: string;
  cantidad_recibos: number;
  recibos_utilizados: number;
  recibos_disponibles: number;
  estado: 'activo' | 'vencido' | 'agotado' | 'por_vencer';
  current_correlative: number;
  created_at: string;
}

interface NewCAIData {
  cai_number: string;
  fecha_limite_emision: string;
  rango_inicial: number;
  rango_final: number;
}

interface NewTalonarioData {
  cai_id: string;
  cantidad_recibos: number;
  fecha_vencimiento: string;
}

// Actividades económicas disponibles según SAR
const economicActivities = [
  "Servicios Profesionales",
  "Comercio al por Mayor",
  "Comercio al por Menor",
  "Industria Manufacturera",
  "Construcción",
  "Transporte",
  "Servicios de Hostelería y Restauración",
  "Servicios de Información y Comunicación",
  "Actividades Financieras y de Seguros",
  "Actividades Inmobiliarias",
  "Educación",
  "Salud",
  "Otras Actividades Económicas"
];

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [cais, setCAIs] = useState<CAI[]>([]);
  const [talonarios, setTalonarios] = useState<Talonario[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCAIDialog, setShowCAIDialog] = useState(false);
  const [showTalonarioDialog, setShowTalonarioDialog] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Debug logging
  console.log('CompanyDetailPage - companyId:', companyId);
  console.log('CompanyDetailPage - cais:', cais);
  console.log('CompanyDetailPage - talonarios:', talonarios);
  
  const [caiFormData, setCaiFormData] = useState<NewCAIData>({
    cai_number: '',
    fecha_limite_emision: '',
    rango_inicial: 0,
    rango_final: 0
  });

  const [talonarioFormData, setTalonarioFormData] = useState<NewTalonarioData>({
    cai_id: '',
    cantidad_recibos: 0,
    fecha_vencimiento: ''
  });

  const updateCompanyField = async (field: string, value: string) => {
    try {
      const response = await fetch('/api/companies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: companyId,
          [field]: value
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating company:', errorData);
        setMessage({ 
          type: 'error', 
          text: errorData.error || 'Error al actualizar empresa' 
        });
        return;
      }

      const result = await response.json();
      setCompany(result.company);
      setMessage({ 
        type: 'success', 
        text: 'Empresa actualizada exitosamente' 
      });
    } catch (error) {
      console.error('Error updating company:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error al actualizar empresa' 
      });
    }
  };

  // Datos de ejemplo
  const mockCompany: Company = {
    id: '1',
    business_name: 'Empresa Ejemplo S.A.',
    business_rtn: '08011999012345',
    industry: 'Servicios Profesionales',
    regimen_tributario: 'Régimen General',
    actividad_economica: 'Consultoría de Negocios',
    direccion_fiscal: 'Colonia Palmira, Tegucigalpa, Honduras',
    telefono_fiscal: '+504 2234-5678',
    email_fiscal: 'contacto@empresa-ejemplo.hn',
    is_active: true,
    created_at: '2024-01-15T10:30:00Z',
    _count: {
      polizas: 156,
      accounts: 45,
      talonarios: 8
    }
  };

  const mockCAIs: CAI[] = [
    {
      id: '1',
      cai_number: 'DFA-01012024-1234567890',
      fecha_limite_emision: '2024-12-31',
      fecha_asignacion: '2024-01-01',
      rango_inicial: 1,
      rango_final: 1000,
      cantidad_recibos: 1000,
      recibos_utilizados: 456,
      recibos_disponibles: 544,
      estado: 'activo',
      current_correlative: 457,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      cai_number: 'DFB-01012024-0987654321',
      fecha_limite_emision: '2024-06-30',
      fecha_asignacion: '2024-01-15',
      rango_inicial: 1001,
      rango_final: 2000,
      cantidad_recibos: 1000,
      recibos_utilizados: 1000,
      recibos_disponibles: 0,
      estado: 'agotado',
      current_correlative: 2001,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: '3',
      cai_number: 'DFC-01032024-5678901234',
      fecha_limite_emision: '2024-08-31',
      fecha_asignacion: '2024-03-01',
      rango_inicial: 2001,
      rango_final: 3000,
      cantidad_recibos: 1000,
      recibos_utilizados: 234,
      recibos_disponibles: 766,
      estado: 'por_vencer',
      current_correlative: 235,
      created_at: '2024-03-01T00:00:00Z'
    }
  ];

  const mockTalonarios: Talonario[] = [
    {
      id: '1',
      cai_id: '1',
      numero_talonario: 'TAL-001-2024',
      fecha_solicitud: '2024-01-15',
      fecha_vencimiento: '2024-12-31',
      cantidad_recibos: 100,
      recibos_utilizados: 67,
      recibos_disponibles: 33,
      estado: 'activo',
      current_correlative: 68,
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      cai_id: '1',
      numero_talonario: 'TAL-002-2024',
      fecha_solicitud: '2024-02-01',
      fecha_vencimiento: '2024-12-31',
      cantidad_recibos: 100,
      recibos_utilizados: 89,
      recibos_disponibles: 11,
      estado: 'por_vencer',
      current_correlative: 90,
      created_at: '2024-02-01T14:20:00Z'
    },
    {
      id: '3',
      cai_id: '1',
      numero_talonario: 'TAL-003-2024',
      fecha_solicitud: '2024-03-15',
      fecha_vencimiento: '2024-12-31',
      cantidad_recibos: 100,
      recibos_utilizados: 100,
      recibos_disponibles: 0,
      estado: 'agotado',
      current_correlative: 201,
      created_at: '2024-03-15T09:45:00Z'
    }
  ];

  useEffect(() => {
    if (companyId && !company && !loading) {
      loadCompanyData();
    }
  }, [companyId, loading]);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos reales desde el API
      const response = await fetch('/api/companies');
      
      if (!response.ok) {
        throw new Error('Error al cargar empresas desde el API');
      }
      
      const companiesData = await response.json();
      const companyData = companiesData.companies.find((c: Company) => c.id === companyId);
      
      if (companyData) {
        setCompany(companyData);
      } else {
        console.log('Empresa no encontrada, usando empresa por defecto');
        setCompany(mockCompany);
      }
      
      // Cargar datos reales de CAIs y Talonarios desde el API
      try {
        // Usar el ID de la empresa
        const companyIdentifier = companyId;
        console.log('Loading CAIs and Talonarios for company:', companyIdentifier);
        
        const [caisResponse, talonariosResponse] = await Promise.all([
          fetch(`/api/cai?company_id=${companyIdentifier}`),
          fetch(`/api/talonarios?company_id=${companyIdentifier}`)
        ]);

        if (caisResponse.ok) {
          const caisData = await caisResponse.json();
          console.log('CAIs data received:', caisData);
          setCAIs(caisData.data || []);
        } else {
          console.error('Error loading CAIs:', caisResponse.statusText);
          setCAIs(mockCAIs); // Fallback a mock
        }

        if (talonariosResponse.ok) {
          const talonariosData = await talonariosResponse.json();
          console.log('Talonarios data received:', talonariosData);
          setTalonarios(talonariosData.talonarios || []);
        } else {
          console.error('Error loading Talonarios:', talonariosResponse.statusText);
          setTalonarios(mockTalonarios); // Fallback a mock
        }
      } catch (error) {
        console.error('Error loading CAIs and Talonarios:', error);
        // Fallback a datos mock si hay error
        setCAIs(mockCAIs);
        setTalonarios(mockTalonarios);
      }
      
    } catch (error) {
      console.error('Error al cargar empresa:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error al cargar datos desde la base de datos. Mostrando datos de ejemplo.' 
      });
      // En caso de error, usar datos mock
      setCompany(mockCompany);
      setCAIs(mockCAIs);
      setTalonarios(mockTalonarios);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const cantidad = caiFormData.rango_final - caiFormData.rango_inicial + 1;
      const newCAI: CAI = {
        id: Date.now().toString(),
        cai_number: caiFormData.cai_number,
        fecha_limite_emision: caiFormData.fecha_limite_emision,
        fecha_asignacion: new Date().toISOString().split('T')[0],
        rango_inicial: caiFormData.rango_inicial,
        rango_final: caiFormData.rango_final,
        cantidad_recibos: cantidad,
        recibos_utilizados: 0,
        recibos_disponibles: cantidad,
        estado: 'activo',
        current_correlative: caiFormData.rango_inicial,
        created_at: new Date().toISOString()
      };

      setCAIs(prev => [...prev, newCAI]);
      setMessage({ type: 'success', text: 'CAI creado exitosamente' });
      setShowCAIDialog(false);
      setCaiFormData({
        cai_number: '',
        fecha_limite_emision: '',
        rango_inicial: 0,
        rango_final: 0
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al crear el CAI' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTalonario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const newTalonario: Talonario = {
        id: Date.now().toString(),
        cai_id: talonarioFormData.cai_id,
        numero_talonario: `TAL-${String(talonarios.length + 1).padStart(3, '0')}-${new Date().getFullYear()}`,
        fecha_solicitud: new Date().toISOString().split('T')[0],
        fecha_vencimiento: talonarioFormData.fecha_vencimiento,
        cantidad_recibos: talonarioFormData.cantidad_recibos,
        recibos_utilizados: 0,
        recibos_disponibles: talonarioFormData.cantidad_recibos,
        estado: 'activo',
        current_correlative: 1,
        created_at: new Date().toISOString()
      };

      setTalonarios(prev => [...prev, newTalonario]);
      setMessage({ type: 'success', text: 'Talonario creado exitosamente' });
      setShowTalonarioDialog(false);
      setTalonarioFormData({
        cai_id: '',
        cantidad_recibos: 0,
        fecha_vencimiento: ''
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al crear el talonario' });
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activo':
        return <Badge className="bg-green-100 text-green-800">Activo</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
      case 'agotado':
        return <Badge className="bg-gray-100 text-gray-800">Agotado</Badge>;
      case 'por_vencer':
        return <Badge className="bg-yellow-100 text-yellow-800">Por Vencer</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconocido</Badge>;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'text-green-600';
      case 'vencido': return 'text-red-600';
      case 'agotado': return 'text-gray-600';
      case 'por_vencer': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressPercentage = (utilizados: number, total: number) => {
    return (utilizados / total) * 100;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Empresa no encontrada</h3>
        <p className="text-gray-600 mb-4">La empresa que buscas no existe o ha sido eliminada</p>
        <Button onClick={() => router.push('/companies')} className="bg-blue-600 hover:bg-blue-700">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Empresas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/companies')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{company.business_name}</h1>
            <p className="text-gray-600">RTN: {company.business_rtn}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={company.is_active ? 'default' : 'secondary'}>
            {company.is_active ? 'Activa' : 'Inactiva'}
          </Badge>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Mensajes */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200' : 'border-green-200'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="cai">CAI</TabsTrigger>
          <TabsTrigger value="talonarios">Talonarios</TabsTrigger>
          <TabsTrigger value="recibos">Recibos</TabsTrigger>
          <TabsTrigger value="financials">Estados Financieros</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        {/* Tab Resumen */}
        <TabsContent value="overview" className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Industria</p>
                  <p className="font-medium">{company.industry}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Régimen Tributario</p>
                  <p className="font-medium">{company.regimen_tributario}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Actividad Económica</p>
                  <select
                    value={company.actividad_economica}
                    onChange={(e) => {
                      // Actualizar la actividad económica en la base de datos
                      updateCompanyField('actividad_economica', e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    {economicActivities.map((activity) => (
                      <option key={activity} value={activity}>
                        {activity}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha de Creación</p>
                  <p className="font-medium">{formatDateForDisplay(company.created_at)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Contacto Fiscal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Dirección</p>
                  <p className="font-medium">{company.direccion_fiscal}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="font-medium">{company.telefono_fiscal}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{company.email_fiscal}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pólizas</span>
                  <span className="font-medium">{company._count?.polizas || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cuentas</span>
                  <span className="font-medium">{company._count?.accounts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">CAI Activos</span>
                  <span className="font-medium">{cais.filter(c => c.estado === 'activo').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Talonarios</span>
                  <span className="font-medium">{company._count?.talonarios || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Módulos */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
              onClick={() => router.push(`/companies/${company.id}/modules`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center text-blue-800">
                  <LayoutGrid className="h-5 w-5 mr-2" />
                  Módulos de la Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-blue-600">
                  Accede a todos los módulos disponibles: contabilidad, facturación, inventarios, compras, reportes y más.
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Módulos
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* CAI Activos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  CAI Activos
                </div>
                <Button onClick={() => setShowCAIDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo CAI
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cais.filter(cai => cai.estado === 'activo').map((cai) => (
                  <div key={cai.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{cai.cai_number}</h4>
                        <p className="text-sm text-gray-600">
                          Vence: {formatDateForDisplay(cai.fecha_limite_emision)}
                        </p>
                      </div>
                      <div className="text-right">
                        {getEstadoBadge(cai.estado)}
                        <p className="text-sm text-gray-600 mt-1">
                          {cai.recibos_disponibles} disponibles
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso de uso</span>
                        <span>{cai.recibos_utilizados}/{cai.cantidad_recibos}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(getProgressPercentage(cai.recibos_utilizados, cai.cantidad_recibos))}`}
                          style={{ width: `${getProgressPercentage(cai.recibos_utilizados, cai.cantidad_recibos)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab CAI */}
        <TabsContent value="cai" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Configuración CAI</h2>
            <Button onClick={() => setShowCAIDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo CAI
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cais.map((cai) => (
              <Card key={cai.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{cai.cai_number}</CardTitle>
                      <CardDescription>
                        Asignado: {formatDateForDisplay(cai.fecha_asignacion)}
                      </CardDescription>
                    </div>
                    {getEstadoBadge(cai.estado)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rango:</span>
                      <span className="font-medium">{cai.rango_inicial} - {cai.rango_final}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Recibos:</span>
                      <span className="font-medium">{cai.cantidad_recibos}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Utilizados:</span>
                      <span className="font-medium">{cai.recibos_utilizados}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Disponibles:</span>
                      <span className="font-medium text-green-600">{cai.recibos_disponibles}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vencimiento:</span>
                      <span className="font-medium">{formatDateForDisplay(cai.fecha_limite_emision)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso de uso</span>
                      <span>{Math.round(getProgressPercentage(cai.recibos_utilizados, cai.cantidad_recibos))}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(getProgressPercentage(cai.recibos_utilizados, cai.cantidad_recibos))}`}
                        style={{ width: `${getProgressPercentage(cai.recibos_utilizados, cai.cantidad_recibos)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2 border-t">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Talonarios */}
        <TabsContent value="talonarios" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Talonarios</h2>
            <Button onClick={() => setShowTalonarioDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Talonario
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {talonarios.map((talonario) => (
              <Card key={talonario.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{talonario.numero_talonario}</CardTitle>
                      <CardDescription>
                        Solicitado: {formatDateForDisplay(talonario.fecha_solicitud)}
                      </CardDescription>
                    </div>
                    {getEstadoBadge(talonario.estado)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CAI Asociado:</span>
                      <span className="font-medium">{cais.find(c => c.id === talonario.cai_id)?.cai_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Recibos:</span>
                      <span className="font-medium">{talonario.cantidad_recibos}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Utilizados:</span>
                      <span className="font-medium">{talonario.recibos_utilizados}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Disponibles:</span>
                      <span className="font-medium text-green-600">{talonario.recibos_disponibles}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Correlativo Actual:</span>
                      <span className="font-medium">{talonario.current_correlative}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vencimiento:</span>
                      <span className="font-medium">{formatDateForDisplay(talonario.fecha_vencimiento)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso de uso</span>
                      <span>{Math.round(getProgressPercentage(talonario.recibos_utilizados, talonario.cantidad_recibos))}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(getProgressPercentage(talonario.recibos_utilizados, talonario.cantidad_recibos))}`}
                        style={{ width: `${getProgressPercentage(talonario.recibos_utilizados, talonario.cantidad_recibos)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2 border-t">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Recibos */}
        <TabsContent value="recibos" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Recibos Emitidos</h2>
            <div className="flex space-x-2">
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay recibos emitidos</h3>
                <p className="text-gray-600">Los recibos emitidos aparecerán aquí</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Estados Financieros */}
        <TabsContent value="financials" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">📑 Estados Financieros</h2>
              <p className="text-gray-600 mt-1">Genera y visualiza los estados financieros de la empresa</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/companies/${company.id}/accounting/books?tab=comprobacion`)}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Scale className="h-5 w-5 mr-2 text-blue-600" />
                  Balance de Comprobación
                </CardTitle>
                <CardDescription>Verifica que los débitos sean iguales a los créditos</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Comprueba la igualdad entre el total de débitos y créditos del período contable.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => alert('Balance General - Próximamente')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-green-600" />
                  Balance General
                </CardTitle>
                <CardDescription>Posición financiera de la empresa</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Muestra los activos, pasivos y patrimonio de la empresa a una fecha determinada.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => alert('Estado de Resultados - Próximamente')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                  Estado de Resultados
                </CardTitle>
                <CardDescription>Rendimiento del período</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Presenta los ingresos, gastos y utilidad o pérdida neta del período.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => alert('Estado de Flujo de Efectivo - Próximamente')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="h-5 w-5 mr-2 text-orange-600" />
                  Estado de Flujo de Efectivo
                </CardTitle>
                <CardDescription>Movimientos de efectivo</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Detalla los flujos de entrada y salida de efectivo por actividades operativas, de inversión y financiamiento.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Configuración */}
        <TabsContent value="settings" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Configuración</h2>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configuración Avanzada
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración Fiscal</CardTitle>
                <CardDescription>Configuración relacionada con impuestos y reportes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Retención ISR</p>
                    <p className="text-sm text-gray-600">Porcentaje de retención estándar</p>
                  </div>
                  <Input type="number" placeholder="12.5" className="w-20" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Retención IVA</p>
                    <p className="text-sm text-gray-600">Porcentaje de retención de IVA</p>
                  </div>
                  <Input type="number" placeholder="15" className="w-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuración de Reportes</CardTitle>
                <CardDescription>Personalización de reportes y documentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Logo de la Empresa</p>
                    <p className="text-sm text-gray-600">Logo para documentos fiscales</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Subir Logo
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Firma Digital</p>
                    <p className="text-sm text-gray-600">Firma para documentos</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Nuevo CAI */}
      <Dialog open={showCAIDialog} onOpenChange={setShowCAIDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo CAI</DialogTitle>
            <DialogDescription>
              Registra un nuevo Código de Autorización de Impresión para esta empresa
            </DialogDescription>
          </DialogHeader>

          {message && (
            <Alert className={message.type === 'error' ? 'border-red-200' : 'border-green-200'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateCAI} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="cai_number">Número CAI *</Label>
                <Input
                  id="cai_number"
                  value={caiFormData.cai_number}
                  onChange={(e) => setCaiFormData(prev => ({ ...prev, cai_number: e.target.value }))}
                  placeholder="Ej: DFA-01012024-1234567890"
                  required
                />
              </div>
              <div>
                <Label htmlFor="rango_inicial">Rango Inicial *</Label>
                <Input
                  id="rango_inicial"
                  type="number"
                  value={caiFormData.rango_inicial}
                  onChange={(e) => setCaiFormData(prev => ({ ...prev, rango_inicial: parseInt(e.target.value) || 0 }))}
                  placeholder="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="rango_final">Rango Final *</Label>
                <Input
                  id="rango_final"
                  type="number"
                  value={caiFormData.rango_final}
                  onChange={(e) => setCaiFormData(prev => ({ ...prev, rango_final: parseInt(e.target.value) || 0 }))}
                  placeholder="1000"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="fecha_limite_emision">Fecha Límite de Emisión *</Label>
                <Input
                  id="fecha_limite_emision"
                  type="date"
                  value={caiFormData.fecha_limite_emision}
                  onChange={(e) => setCaiFormData(prev => ({ ...prev, fecha_limite_emision: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCAIDialog(false);
                  setCaiFormData({
                    cai_number: '',
                    fecha_limite_emision: '',
                    rango_inicial: 0,
                    rango_final: 0
                  });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Crear CAI'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuevo Talonario */}
      <Dialog open={showTalonarioDialog} onOpenChange={setShowTalonarioDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Talonario</DialogTitle>
            <DialogDescription>
              Solicita un nuevo talonario de recibos fiscales
            </DialogDescription>
          </DialogHeader>

          {message && (
            <Alert className={message.type === 'error' ? 'border-red-200' : 'border-green-200'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateTalonario} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cai_id">CAI Asociado *</Label>
                <select
                  id="cai_id"
                  value={talonarioFormData.cai_id}
                  onChange={(e) => setTalonarioFormData(prev => ({ ...prev, cai_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecciona un CAI</option>
                  {cais.filter(cai => cai.estado === 'activo').map(cai => (
                    <option key={cai.id} value={cai.id}>{cai.cai_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="cantidad_recibos">Cantidad de Recibos *</Label>
                <Input
                  id="cantidad_recibos"
                  type="number"
                  value={talonarioFormData.cantidad_recibos}
                  onChange={(e) => setTalonarioFormData(prev => ({ ...prev, cantidad_recibos: parseInt(e.target.value) || 0 }))}
                  placeholder="100"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento *</Label>
                <Input
                  id="fecha_vencimiento"
                  type="date"
                  value={talonarioFormData.fecha_vencimiento}
                  onChange={(e) => setTalonarioFormData(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTalonarioDialog(false);
                  setTalonarioFormData({
                    cai_id: '',
                    cantidad_recibos: 0,
                    fecha_vencimiento: ''
                  });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Crear Talonario'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
