'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Scale, 
  PieChart, 
  TrendingUp, 
  Wallet,
  ExternalLink
} from 'lucide-react';

const financialStatements = [
  {
    id: 'balance-comprobacion',
    title: 'Balance de Comprobación',
    description: 'Verifica que los débitos sean iguales a los créditos del período contable. Estructura de 6 columnas con saldos anteriores, movimientos y saldos actuales.',
    icon: Scale,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    path: '/accounting/financial-statements/balance-comprobacion',
    status: 'active'
  },
  {
    id: 'balance-general',
    title: 'Balance General',
    description: 'Muestra los activos, pasivos y patrimonio de la empresa a una fecha determinada. Incluye firmas de responsabilidad.',
    icon: PieChart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    path: '/accounting/financial-statements/balance-general',
    status: 'active'
  },
  {
    id: 'estado-resultados',
    title: 'Estado de Resultados',
    description: 'Ingresos, costos, gastos y utilidad neta. Incluye cálculo de ISR 25% y análisis de gastos.',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    path: '/accounting/financial-statements/estado-resultados',
    status: 'active'
  },
  {
    id: 'flujo-efectivo',
    title: 'Estado de Flujo de Efectivo',
    description: 'Detalla los flujos de entrada y salida de efectivo por actividades operativas, de inversión y financiamiento. Incluye conciliación y burn rate.',
    icon: Wallet,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    path: '/accounting/financial-statements/flujo-efectivo',
    status: 'active'
  }
];

export default function FinancialStatementsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const handleCardClick = (statement: typeof financialStatements[0]) => {
    if (statement.status === 'active') {
      router.push(`/companies/${companyId}${statement.path}`);
    } else {
      alert(`${statement.title} - Próximamente disponible`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${companyId}/modules`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📑 Estados Financieros</h1>
                <p className="text-gray-600">Genera y visualiza los estados financieros de la empresa</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Statements Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {financialStatements.map((statement) => {
            const IconComponent = statement.icon;
            return (
              <Card 
                key={statement.id}
                className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  statement.status === 'coming-soon' ? 'opacity-75' : ''
                }`}
                onClick={() => handleCardClick(statement)}
              >
                <CardHeader className={`${statement.bgColor} border-b`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                      <IconComponent className={`h-6 w-6 ${statement.color}`} />
                    </div>
                    {statement.status === 'coming-soon' && (
                      <Badge variant="secondary" className="text-xs">
                        Próximamente
                      </Badge>
                    )}
                    {statement.status === 'active' && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Activo
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3">{statement.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {statement.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {statement.status === 'active' ? 'Haz clic para acceder' : 'En desarrollo'}
                    </span>
                    {statement.status === 'active' ? (
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    ) : (
                      <span className="text-gray-400 text-xs">🔒</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
