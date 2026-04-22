'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Plus, 
  Eye, 
  Settings, 
  Users, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Activity,
  MapPin,
  Phone,
  Mail,
  Briefcase
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
  config_fiscal?: Array<{
    cai_activo?: string;
    fecha_limite_emision?: string;
  }>;
  _count?: {
    polizas: number;
    accounts: number;
  };
}

interface NewCompanyData {
  business_name: string;
  business_rtn: string;
  industry: string;
  regimen_tributario: string;
  actividad_economica: string;
  direccion_fiscal: string;
  telefono_fiscal: string;
  email_fiscal: string;
}

const industries = [
  'Servicios Profesionales',
  'Comercio',
  'Manufactura',
  'Construcción',
  'Tecnología',
  'Salud',
  'Educación',
  'Restaurantes',
  'Transporte',
  'Otros'
];

const regimenesTributarios = [
  'Régimen General',
  'Régimen de Pequeños Contribuyentes',
  'Régimen Especial',
  'Régimen Simplificado'
];

export default function CompaniesPage() {
  // Tooltip wrapper component
  const TooltipWrapper = ({ title, children }: { title: string; children: React.ReactNode }) => {
    return (
      <div className="group relative inline-block">
        {children}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {title}
        </div>
      </div>
    );
  };
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<NewCompanyData>({
    business_name: '',
    business_rtn: '',
    industry: '',
    regimen_tributario: '',
    actividad_economica: '',
    direccion_fiscal: '',
    telefono_fiscal: '',
    email_fiscal: ''
  });

  // Datos de ejemplo para desarrollo
  const mockCompanies: Company[] = [
    {
      id: '1',
      business_name: 'Empresa Ejemplo S.A.',
      business_rtn: '08011999012345',
      industry: 'Servicios Profesionales',
      regimen_tributario: 'Régimen General',
      actividad_economica: 'Consultoría de Negocios',
      direccion_fiscal: 'Colonia Palmira, Tegucigalpa',
      telefono_fiscal: '+504 2234-5678',
      email_fiscal: 'contacto@empresa-ejemplo.hn',
      is_active: true,
      created_at: '2024-01-15T10:30:00Z',
      config_fiscal: [
        {
          cai_activo: 'DFA-01012024-1234567890',
          fecha_limite_emision: '2024-12-31'
        }
      ],
      _count: {
        polizas: 156,
        accounts: 45
      }
    },
    {
      id: '2',
      business_name: 'Negocio Demo',
      business_rtn: '08011999012346',
      industry: 'Comercio',
      regimen_tributario: 'Régimen de Pequeños Contribuyentes',
      actividad_economica: 'Venta de Productos',
      direccion_fiscal: 'Boulevard Morazán, San Pedro Sula',
      telefono_fiscal: '+504 2550-1234',
      email_fiscal: 'info@negocio-demo.hn',
      is_active: true,
      created_at: '2024-02-20T14:15:00Z',
      _count: {
        polizas: 89,
        accounts: 32
      }
    },
    {
      id: '3',
      business_name: 'Tech Solutions HN',
      business_rtn: '08011999012347',
      industry: 'Tecnología',
      regimen_tributario: 'Régimen General',
      actividad_economica: 'Desarrollo de Software',
      direccion_fiscal: 'Edificio Torre Central, Tegucigalpa',
      telefono_fiscal: '+504 2232-9876',
      email_fiscal: 'soporte@techsolutions.hn',
      is_active: false,
      created_at: '2024-03-10T09:45:00Z',
      config_fiscal: [
        {
          cai_activo: 'DFB-01032024-0987654321',
          fecha_limite_emision: '2024-06-30'
        }
      ],
      _count: {
        polizas: 234,
        accounts: 67
      }
    }
  ];

  useEffect(() => {
    if (companies.length === 0) {
      loadCompanies();
    }
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      
      // Datos mock para desarrollo
      const mockCompanies = [
        {
          id: "1",
          business_name: "Dental Diamond Center",
          business_rtn: "08011999012345",
          industry: "Servicios Profesionales",
          regimen_tributario: "Régimen General",
          actividad_economica: "Consultoría Dental",
          direccion_fiscal: "Colonia Palmira, Tegucigalpa, Honduras",
          telefono_fiscal: "+504 2234-5678",
          email_fiscal: "contacto@dentaldiamond.com",
          is_active: true,
          created_at: "2024-01-15T10:30:00Z",
          _count: {
            polizas: 156,
            accounts: 45,
            talonarios: 8
          }
        },
        {
          id: "2",
          business_name: "Clínica Médica San José",
          business_rtn: "08011999067890",
          industry: "Salud",
          regimen_tributario: "Régimen General",
          actividad_economica: "Servicios Médicos",
          direccion_fiscal: "Boulevard Suyapa, Tegucigalpa, Honduras",
          telefono_fiscal: "+504 2255-6789",
          email_fiscal: "contacto@clinicamedica.com",
          is_active: true,
          created_at: "2024-01-20T14:15:00Z",
          _count: {
            polizas: 89,
            accounts: 32,
            talonarios: 5
          }
        },
        {
          id: "3",
          business_name: "Laboratorio Dental Pro",
          business_rtn: "08011999054321",
          industry: "Salud",
          regimen_tributario: "Régimen General",
          actividad_economica: "Laboratorio Dental",
          direccion_fiscal: "Avenida Morazán, San Pedro Sula, Honduras",
          telefono_fiscal: "+504 2345-1234",
          email_fiscal: "info@labdentalpro.com",
          is_active: false,
          created_at: "2024-01-10T09:30:00Z",
          _count: {
            polizas: 0,
            accounts: 0,
            talonarios: 0
          }
        }
      ];
      
      setCompanies(mockCompanies);
      
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error al cargar datos desde la base de datos. Mostrando datos de ejemplo.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.business_rtn.includes(searchTerm) ||
    company.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let response;
      
      if (editingCompany) {
        // Actualizar empresa existente
        response = await fetch('/api/companies', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingCompany.id,
            ...formData
          }),
        });
      } else {
        // Crear nueva empresa
        response = await fetch('/api/companies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar la solicitud');
      }

      const result = await response.json();
      console.log('Resultado:', result);

      // Recargar empresas desde el servidor
      await loadCompanies();
      
      setMessage({ 
        type: 'success', 
        text: editingCompany ? 'Empresa actualizada exitosamente' : 'Empresa creada exitosamente' 
      });

      // Resetear formulario
      setFormData({
        business_name: '',
        business_rtn: '',
        industry: '',
        regimen_tributario: '',
        actividad_economica: '',
        direccion_fiscal: '',
        telefono_fiscal: '',
        email_fiscal: ''
      });
      setShowAddDialog(false);
      setEditingCompany(null);

    } catch (error) {
      console.error('Error al procesar empresa:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al procesar la solicitud' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      business_name: company.business_name,
      business_rtn: company.business_rtn,
      industry: company.industry,
      regimen_tributario: company.regimen_tributario,
      actividad_economica: company.actividad_economica,
      direccion_fiscal: company.direccion_fiscal,
      telefono_fiscal: company.telefono_fiscal,
      email_fiscal: company.email_fiscal
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (companyId: string) => {
    if (confirm('¿Está seguro de eliminar esta empresa? Esta acción no se puede deshacer.')) {
      try {
        setLoading(true);
        
        // Enviar solicitud DELETE al API
        const response = await fetch(`/api/companies?id=${companyId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar la empresa');
        }

        const result = await response.json();
        console.log('Empresa eliminada:', result);

        // Recargar empresas desde el servidor
        await loadCompanies();
        setMessage({ type: 'success', text: 'Empresa eliminada exitosamente' });

      } catch (error) {
        console.error('Error al eliminar empresa:', error);
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al eliminar la empresa' });
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleCompanyStatus = async (companyId: string) => {
    try {
      setCompanies(prev => prev.map(comp => 
        comp.id === companyId 
          ? { ...comp, is_active: !comp.is_active }
          : comp
      ));
      setMessage({ type: 'success', text: 'Estado actualizado exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el estado' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600">Administra las empresas de contabilidad</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
              </DialogTitle>
              <DialogDescription>
                {editingCompany 
                  ? 'Modifica los datos de la empresa existente'
                  : 'Registra una nueva empresa para llevar su contabilidad'
                }
              </DialogDescription>
            </DialogHeader>
            
            {message && (
              <Alert className={message.type === 'error' ? 'border-red-200' : 'border-green-200'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Nombre de la Empresa *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                    placeholder="Ej: Empresa S.A. de C.V."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="business_rtn">RTN *</Label>
                  <Input
                    id="business_rtn"
                    value={formData.business_rtn}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_rtn: e.target.value }))}
                    placeholder="0801-1999-12345"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industria *</Label>
                  <select
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecciona una industria</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="regimen_tributario">Régimen Tributario *</Label>
                  <select
                    id="regimen_tributario"
                    value={formData.regimen_tributario}
                    onChange={(e) => setFormData(prev => ({ ...prev, regimen_tributario: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecciona un régimen</option>
                    {regimenesTributarios.map(regimen => (
                      <option key={regimen} value={regimen}>{regimen}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="actividad_economica">Actividad Económica *</Label>
                  <Input
                    id="actividad_economica"
                    value={formData.actividad_economica}
                    onChange={(e) => setFormData(prev => ({ ...prev, actividad_economica: e.target.value }))}
                    placeholder="Ej: Consultoría de negocios, venta de productos, etc."
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="direccion_fiscal">Dirección Fiscal *</Label>
                  <Input
                    id="direccion_fiscal"
                    value={formData.direccion_fiscal}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion_fiscal: e.target.value }))}
                    placeholder="Ej: Colonia Palmira, Tegucigalpa, Honduras"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefono_fiscal">Teléfono Fiscal</Label>
                  <Input
                    id="telefono_fiscal"
                    value={formData.telefono_fiscal}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono_fiscal: e.target.value }))}
                    placeholder="+504 2234-5678"
                  />
                </div>
                <div>
                  <Label htmlFor="email_fiscal">Email Fiscal</Label>
                  <Input
                    id="email_fiscal"
                    type="email"
                    value={formData.email_fiscal}
                    onChange={(e) => setFormData(prev => ({ ...prev, email_fiscal: e.target.value }))}
                    placeholder="contacto@empresa.hn"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingCompany(null);
                    setFormData({
                      business_name: '',
                      business_rtn: '',
                      industry: '',
                      regimen_tributario: '',
                      actividad_economica: '',
                      direccion_fiscal: '',
                      telefono_fiscal: '',
                      email_fiscal: ''
                    });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : editingCompany ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mensajes */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200' : 'border-green-200'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, RTN o industria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Empresas</p>
                <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {companies.filter(c => c.is_active).length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactivas</p>
                <p className="text-2xl font-bold text-red-600">
                  {companies.filter(c => !c.is_active).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pólizas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {companies.reduce((sum, c) => sum + (c._count?.polizas || 0), 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Empresas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${company.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <CardTitle className="text-lg">{company.business_name}</CardTitle>
                    <CardDescription className="text-sm">
                      RTN: {company.business_rtn}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={company.is_active ? 'default' : 'secondary'}>
                  {company.is_active ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Briefcase className="h-4 w-4 mr-2" />
                  {company.industry}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  {company.direccion_fiscal}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {company.telefono_fiscal}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {company.email_fiscal}
                </div>
              </div>

              {company.config_fiscal && company.config_fiscal.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center text-sm text-blue-800">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="font-medium">CAI Activo</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    {company.config_fiscal[0].cai_activo}
                  </p>
                  <p className="text-xs text-blue-600">
                    Vence: {company.config_fiscal[0].fecha_limite_emision}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{company._count?.polizas || 0}</p>
                  <p className="text-xs text-gray-600">Pólizas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{company._count?.accounts || 0}</p>
                  <p className="text-xs text-gray-600">Cuentas</p>
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t">
                <div className="flex space-x-2">
                  <TooltipWrapper title={`Ver detalles de ${company.business_name}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/companies/${company.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                  <TooltipWrapper title={`Editar ${company.business_name}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(company)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                  <TooltipWrapper title={`${company.is_active ? 'Desactivar' : 'Activar'} ${company.business_name}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCompanyStatus(company.id)}
                    >
                      {company.is_active ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                  </TooltipWrapper>
                </div>
                <TooltipWrapper title={`Eliminar ${company.business_name}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(company.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'Intenta con otros términos de búsqueda'
              : 'Comienza registrando tu primera empresa'
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Empresa
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
