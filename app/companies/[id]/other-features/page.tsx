'use client';

import { use, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  ChevronLeft, 
  Building2,
  Plug,
  Bot,
  Palette,
  Scale,
  CreditCard,
  ShoppingCart,
  FileText,
  ScanText,
  CalendarClock,
  Bell,
  DollarSign,
  Users,
  Paintbrush,
  FileCheck,
  BarChart3,
  Archive,
  Eye,
  Globe,
  Landmark,
  Calculator,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Receipt,
  Shield,
  Database,
  Zap,
  Clock,
  PenTool,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OtherFeaturesPageProps {
  params: Promise<{
    id: string;
  }>;
}

const integrations = [
  {
    icon: CreditCard,
    title: 'Integración Bancaria (Bank Feeds)',
    description: 'Conexión automática con bancos para descargar estados de cuenta',
    features: [
      'Descarga automática de estados de cuenta',
      'Conciliación bancaria en tiempo real',
      'Detección de transacciones duplicadas',
      'Categorización automática de movimientos',
      'Soporte para múltiples bancos hondureños'
    ],
    status: 'available'
  },
  {
    icon: ShoppingCart,
    title: 'Pasarelas de Pago',
    description: 'Integración con procesadores de pagos locales e internacionales',
    features: [
      'PayPal - Pagos internacionales',
      'Stripe - Tarjetas de crédito/débito',
      'Procesadores locales (Honduras)',
      'Pago de facturas directo desde el sistema',
      'Confirmación automática de pagos recibidos'
    ],
    status: 'available'
  },
  {
    icon: Globe,
    title: 'Sincronización E-commerce',
    description: 'APIs para importar ventas automáticamente desde plataformas',
    features: [
      'Shopify - Sincronización de órdenes',
      'WooCommerce - Importación automática',
      'Actualización de inventario en tiempo real',
      'Generación automática de facturas',
      'Reportes de ventas consolidados'
    ],
    status: 'planned'
  }
];

const automationTools = [
  {
    icon: ScanText,
    title: 'Motor de OCR',
    description: 'Reconocimiento Óptico de Caracteres para facturas y recibos',
    features: [
      'Subir foto de factura/recibo',
      'Extracción automática de monto',
      'Detección de fecha y proveedor',
      'Reconocimiento de CAI (Honduras)',
      'Clasificación automática de gastos'
    ],
    status: 'available'
  },
  {
    icon: CalendarClock,
    title: 'Facturas Recurrentes',
    description: 'Programación de facturas para servicios de suscripción',
    features: [
      'Configuración de frecuencia (mensual, quincenal)',
      'Generación automática en fecha programada',
      'Envío automático por email',
      'Recordatorios de vencimiento',
      'Historial completo de facturas generadas'
    ],
    status: 'available'
  },
  {
    icon: Bell,
    title: 'Alertas y Recordatorios',
    description: 'Notificaciones automáticas sobre vencimientos importantes',
    features: [
      'Vencimientos de impuestos (SAR)',
      'Facturas por cobrar vencidas',
      'Presupuestos excedidos',
      'Pagos a proveedores programados',
      'Renovación de contratos y licencias'
    ],
    status: 'available'
  }
];

const customizationOptions = [
  {
    icon: DollarSign,
    title: 'Multimoneda',
    description: 'Manejo de diferentes divisas con actualización automática',
    features: [
      'HNL (Lempiras) - Moneda principal',
      'USD (Dólares) - Conversión automática',
      'Actualización automática de tipos de cambio',
      'Reportes en moneda de preferencia',
      'Historial de tasas de cambio'
    ],
    status: 'active'
  },
  {
    icon: Users,
    title: 'Gestión de Permisos (Roles)',
    description: 'Definir accesos según el perfil de usuario',
    roles: [
      { name: 'Administrador', access: 'Acceso total al sistema' },
      { name: 'Contador/Auditor', access: 'Ver y editar asientos, reportes' },
      { name: 'Vendedor', access: 'Solo facturación y clientes' },
      { name: 'Auditor Externo', access: 'Solo lectura de reportes' }
    ]
  },
  {
    icon: Paintbrush,
    title: 'Personalización de Documentos',
    description: 'Editor visual para personalizar facturas y reportes',
    features: [
      'Logo de la empresa en documentos',
      'Paleta de colores personalizada',
      'Términos y condiciones legales',
      'Formato de factura CAI (Honduras)',
      'Plantillas de reportes personalizables'
    ],
    status: 'available'
  }
];

const legalComplianceHonduras = [
  {
    icon: FileCheck,
    title: 'Formato de Facturación CAI',
    description: 'Generación de documentos con Código de Autorización de Impresión',
    features: [
      'Generación de CAI según normativa SAR',
      'Rangos autorizados de numeración',
      'Validez de facturas ante el fisco',
      'Reporte de facturas emitidas al SAR',
      'Control de talonarios autorizados'
    ]
  },
  {
    icon: Calculator,
    title: 'Cálculo de Retenciones',
    description: 'Automatización de retenciones según legislación hondureña',
    features: [
      'Retención ISR según escala',
      'Retención IVA (valor agregado)',
      'Retención a proveedores del exterior',
      'Generación de constancias de retención',
      'Reportes de retenciones para SAR'
    ]
  },
  {
    icon: Archive,
    title: 'Exportación de Libros Legales',
    description: 'Generación de archivos para declaraciones informativas',
    features: [
      'Libro de Ingresos (formato SAR)',
      'Libro de Egresos (formato SAR)',
      'Libro Diario',
      'Libro Mayor',
      'Exportación a Excel y PDF',
      'Listos para presentación fiscal'
    ]
  }
];

const suggestedTools = [
  {
    feature: 'Auditoría de Logs',
    purpose: 'Seguridad',
    value: 'Registro de quién editó qué movimiento y cuándo',
    icon: Eye
  },
  {
    feature: 'Centro de Archivos',
    purpose: 'Almacenamiento',
    value: 'Guardar PDFs de contratos o garantías asociados a asientos',
    icon: Archive
  },
  {
    feature: 'Generador de Reportes',
    purpose: 'Análisis',
    value: 'Dashboards visuales con gráficos de barras/pasteles',
    icon: BarChart3
  }
];

export default function OtherFeaturesPage({ params }: OtherFeaturesPageProps) {
  const { id: companyId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('integrations');

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-gray-600" />
            Otras Características
          </h1>
          <p className="text-gray-600">Integraciones, automatización, personalización y cumplimiento legal</p>
        </div>
        <div className="flex items-center gap-4">
          <Building2 className="h-8 w-8 text-gray-400" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/companies/${companyId}/modules`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Integraciones Activas</CardTitle>
            <Plug className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3/5</div>
            <p className="text-xs text-gray-500 mt-1">Banco, Pagos, OCR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Automatizaciones</CardTitle>
            <Bot className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-gray-500 mt-1">Reglas activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cumplimiento SAR</CardTitle>
            <Scale className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-green-600 mt-1">Al día con normativa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Personalización</CardTitle>
            <Palette className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-gray-500 mt-1">Configurado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integraciones
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Automatización
          </TabsTrigger>
          <TabsTrigger value="customization" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Personalización
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Cumplimiento Legal
          </TabsTrigger>
        </TabsList>

        {/* Integraciones y Conectividad */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plug className="h-5 w-5 text-cyan-600" />
                Integraciones y Conectividad (APIs)
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                El software contable conectado con otros sistemas
              </p>
            </div>
            <Badge variant="default" className="bg-cyan-600">3 Activas</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {integrations.map((item, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-50 rounded-lg">
                        <item.icon className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </div>
                    </div>
                    {item.status === 'available' ? (
                      <Badge className="bg-green-600">Activa</Badge>
                    ) : (
                      <Badge variant="outline">Planificado</Badge>
                    )}
                  </div>
                  <CardDescription className="mt-2">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {item.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-cyan-200 bg-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-800">
                <Database className="h-5 w-5" />
                Configuración de APIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded border">
                  <p className="font-medium text-sm">Bank Feed API</p>
                  <p className="text-xs text-gray-500">Conectado: Banco Ficohsa</p>
                  <Badge className="mt-2 bg-green-600 text-xs">Conectado</Badge>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="font-medium text-sm">Stripe API</p>
                  <p className="text-xs text-gray-500">Modo: Producción</p>
                  <Badge className="mt-2 bg-green-600 text-xs">Activo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automatización */}
        <TabsContent value="automation" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-600" />
                Automatización y Herramientas Inteligentes
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Ahorro de tiempo mediante procesos automatizados
              </p>
            </div>
            <Badge variant="default" className="bg-purple-600">12 Reglas</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {automationTools.map((item, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <item.icon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="mt-2">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {item.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2 text-sm">
                        <Zap className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Reglas Automáticas Configuradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ScanText className="h-5 w-5 text-green-600" />
                    <span className="font-medium">OCR auto-alerta si monto {'>'} L. 10,000</span>
                  </div>
                  <Badge className="bg-green-600">Activa</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium">Alerta 3 días antes de vencimiento ISR</span>
                  </div>
                  <Badge className="bg-green-600">Activa</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-5 w-5 text-cyan-600" />
                    <span className="font-medium">Factura recurrente - Arriendo mensual</span>
                  </div>
                  <Badge className="bg-green-600">Activa</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personalización */}
        <TabsContent value="customization" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Palette className="h-5 w-5 text-orange-600" />
                Configuración y Personalización
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                El sistema adaptado a las necesidades específicas del negocio
              </p>
            </div>
            <Badge variant="default" className="bg-orange-600">85% Configurado</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {customizationOptions.map((item, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <item.icon className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="mt-2">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {item.roles ? (
                    <div className="space-y-2">
                      {item.roles.map((role, rIndex) => (
                        <div key={rIndex} className="p-2 bg-gray-50 rounded text-sm">
                          <span className="font-medium">{role.name}:</span>
                          <span className="text-gray-600 ml-1">{role.access}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {item.features?.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-orange-600" />
                Personalización de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="font-medium mb-2">Vista Previa - Factura</p>
                  <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                    [Logo] Factura #001-001-0000123
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Paintbrush className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      Vista Previa
                    </Button>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="font-medium mb-2">Configuración de Colores</p>
                  <div className="flex gap-2 mb-3">
                    <div className="w-8 h-8 rounded bg-cyan-600 border-2 border-blue-800"></div>
                    <div className="w-8 h-8 rounded bg-gray-600"></div>
                    <div className="w-8 h-8 rounded bg-green-600"></div>
                    <div className="w-8 h-8 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <span className="text-xs text-gray-400">+</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Tema actual: Corporate Blue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cumplimiento Legal Honduras */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Scale className="h-5 w-5 text-green-600" />
                Localización y Cumplimiento Legal
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Normativa específica para Honduras (SAR)
              </p>
            </div>
            <Badge variant="default" className="bg-green-600">100% SAR</Badge>
          </div>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Landmark className="h-8 w-8 text-green-700" />
                <div>
                  <p className="font-semibold text-green-800">Servicio de Administración de Rentas (SAR) - Honduras</p>
                  <p className="text-sm text-green-700">Cumplimiento total con normativa fiscal hondureña</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {legalComplianceHonduras.map((item, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <item.icon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="mt-2">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {item.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2 text-sm">
                        <FileCheck className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-600" />
                Configuración CAI Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Rango Autorizado SAR</p>
                  <p className="text-xs text-gray-600 mt-1">001-001-0000001 al 001-001-0005000</p>
                  <Badge className="mt-2 bg-green-600">Vigente</Badge>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Próximo Vencimiento</p>
                  <p className="text-xs text-gray-600 mt-1">31 de diciembre 2025</p>
                  <Badge className="mt-2 bg-yellow-600">6 meses restantes</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tabla Comparativa de Herramientas */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-600" />
            Tabla Comparativa de Herramientas Sugeridas
          </CardTitle>
          <CardDescription>
            Características adicionales recomendadas para el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Característica</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Propósito</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Valor Agregado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suggestedTools.map((tool, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <tool.icon className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{tool.feature}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{tool.purpose}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{tool.value}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-green-600 text-xs">Implementado</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
