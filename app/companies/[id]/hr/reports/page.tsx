'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, BarChart3, Users, Clock, DollarSign, FileText,
  TrendingUp, Calendar, Download
} from 'lucide-react';

export default function HRReportsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const reports = [
    {
      title: 'Reportes de Asistencia',
      description: 'Análisis de asistencia, tardanzas, ausencias, horas extra y incapacidades con gráficos interactivos',
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      path: `/companies/${companyId}/hr/attendance/reports`,
    },
    {
      title: 'Reportes de Nómina',
      description: 'Resumen de planilla, deducciones IGSS/IHSS/RAP, salario neto y historial de cierres',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      path: `/companies/${companyId}/hr/payroll`,
    },
    {
      title: 'Reportes de Empleados',
      description: 'Directorio de empleados, distribución por departamento, antigüedad y contratos',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: `/companies/${companyId}/hr/employees`,
    },
    {
      title: 'Reportes de Permisos y Vacaciones',
      description: 'Uso de permisos, saldos de vacaciones, solicitudes pendientes y aprobadas',
      icon: Calendar,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      path: `/companies/${companyId}/hr/vacations`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/companies/${companyId}/hr`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Volver
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-cyan-600" />Reportes de Recursos Humanos
          </h1>
          <p className="text-sm text-gray-500">Centro de reportes y análisis del módulo de RRHH</p>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <Card
              key={report.title}
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-200"
              onClick={() => router.push(report.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${report.bgColor}`}>
                    <report.icon className={`h-8 w-8 ${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{report.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />Resumen Rápido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Selecciona un tipo de reporte para ver el análisis detallado. Los reportes incluyen gráficos interactivos,
              tablas de datos y exportación a CSV.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
