'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Building2,
  BookOpen,
  FileText,
  Scale,
  Receipt,
  Package,
  ShoppingCart,
  Calculator,
  BarChart3,
  Shield,
  Settings,
  TrendingUp,
  Wallet,
  PieChart,
  DollarSign,
  Users,
  ClipboardList,
  Lock,
  Cog,
  ExternalLink
} from 'lucide-react';

interface Company {
  id: string;
  business_name: string;
  business_rtn: string;
}

const modules = [
  {
    id: 'accounting',
    title: '📒 Registro Contable',
    description: 'Gestiona las operaciones contables, asientos, pólizas y registros diarios.',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    path: '/accounting',
    status: 'active'
  },
  {
    id: 'financial-statements',
    title: '📑 Estados Financieros',
    description: 'Genera balances, estados de resultados y flujos de efectivo.',
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    path: '/accounting/financial-statements',
    status: 'active'
  },
  {
    id: 'legal-books',
    title: '🧾 Libros Legales',
    description: 'Libro de ingresos, egresos, diario, mayor y otros registros legales.',
    icon: Scale,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    path: '/accounting/books',
    status: 'active'
  },
  {
    id: 'invoicing',
    title: '💰 Facturación y Ventas',
    description: 'Gestiona facturas, CAI, enlaces de pago y recibos de venta.',
    icon: Receipt,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    path: '/billing/pos',
    status: 'active'
  },
  {
    id: 'inventory',
    title: '📦 Inventarios',
    description: 'Control de existencias, movimientos de almacén y valuación.',
    icon: Package,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    path: '/inventory',
    status: 'active'
  },
  {
    id: 'purchases',
    title: '🛒 Compras y Proveedores',
    description: 'Gestión de proveedores, órdenes de compra y cuentas por pagar.',
    icon: ShoppingCart,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    path: '/suppliers',
    status: 'active'
  },
  {
    id: 'financial-control',
    title: '🧮 Control Financiero',
    description: 'Presupuestos, flujo de caja y análisis financiero.',
    icon: Calculator,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    path: '/financial-control',
    status: 'active'
  },
  {
    id: 'reports',
    title: '📊 Reportes y Análisis',
    description: 'Reportes gerenciales, indicadores KPI y business intelligence.',
    icon: BarChart3,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    path: '/business-reports',
    status: 'active'
  },
  {
    id: 'security',
    title: '🔐 Seguridad y Control',
    description: 'Seguridad física, legal y digital de la clínica.',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    path: '/security',
    status: 'active'
  },
  {
    id: 'other',
    title: '⚙️ Otras Características',
    description: 'Integraciones, automatización, personalización y cumplimiento legal.',
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    path: '/other-features',
    status: 'active'
  }
];

export default function CompanyModulesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies/${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setCompany(data);
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  const handleModuleClick = (module: typeof modules[0]) => {
    if (module.status === 'active' && module.path) {
      router.push(`/companies/${companyId}${module.path}`);
    } else {
      alert(`${module.title} - Próximamente disponible`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-600">Cargando módulos...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-600">Empresa no encontrada</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Módulos de la Empresa</h1>
              <p className="text-gray-600">{company.business_name} • RTN: {company.business_rtn}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Building2 className="h-10 w-10 text-blue-600" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${companyId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {modules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Card 
                key={module.id}
                className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  module.status === 'coming-soon' ? 'opacity-75' : ''
                }`}
                onClick={() => handleModuleClick(module)}
              >
                <CardHeader className={`${module.bgColor} border-b`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                      <IconComponent className={`h-6 w-6 ${module.color}`} />
                    </div>
                    {module.status === 'coming-soon' && (
                      <Badge variant="secondary" className="text-xs">
                        Próximamente
                      </Badge>
                    )}
                    {module.status === 'active' && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Activo
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3">{module.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {module.status === 'active' ? 'Haz clic para acceder' : 'En desarrollo'}
                    </span>
                    {module.status === 'active' ? (
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Selecciona un módulo para comenzar a trabajar con {company.business_name}
          </p>
        </div>
      </div>
    </div>
  );
}
