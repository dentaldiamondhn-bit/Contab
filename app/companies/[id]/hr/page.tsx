'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Download,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Building2
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  status: 'active' | 'inactive';
  vacationDays: number;
  usedVacationDays: number;
}

interface Department {
  id: string;
  name: string;
  description: string;
  manager: string;
  createdAt: string;
}

export default function HRDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const empKey = `employees_${companyId}`;
    const deptKey = `departments_${companyId}`;
    const savedEmp = localStorage.getItem(empKey);
    const savedDept = localStorage.getItem(deptKey);
    if (savedEmp) setEmployees(JSON.parse(savedEmp));
    if (savedDept) setDepartments(JSON.parse(savedDept));
  }, [companyId]);

  const activeEmployees = employees.filter(e => e.status === 'active');
  const totalPayroll = activeEmployees.reduce((sum, e) => sum + e.salary, 0);
  const pendingVacations = activeEmployees.reduce((sum, e) => sum + (e.vacationDays - e.usedVacationDays), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const shortcuts = [
    {
      title: 'Empleados',
      description: 'Gestión de empleados, agregar, editar y activar/desactivar',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      count: `${activeEmployees.length} activos`,
      path: '/hr/employees'
    },
    {
      title: 'Departamentos',
      description: 'Crear y gestionar departamentos de la empresa',
      icon: Building2,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      count: `${departments.length} departamentos`,
      path: '/hr/departments'
    },
    {
      title: 'Asistencia',
      description: 'Registro diario de asistencia, tardanzas y faltas',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      count: 'Hoy',
      path: '/hr/attendance'
    },
    {
      title: 'Nómina',
      description: 'Cálculo de nómina mensual, deducciones y pagos netos',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      count: formatCurrency(totalPayroll),
      path: '/hr/payroll'
    },
    {
      title: 'Vacaciones',
      description: 'Control de días de vacaciones disponibles y solicitadas',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      count: `${pendingVacations} días`,
      path: '/hr/vacations'
    },
    {
      title: 'Reportes',
      description: 'Reportes de nómina, asistencia y general de empleados',
      icon: FileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      count: 'Ver reportes',
      path: '/hr/reports'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Recursos Humanos</h1>
          <p className="text-gray-500">Gestión de empleados, nómina y asistencia</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/companies/${companyId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeEmployees.length}</div>
            <p className="text-xs text-gray-500">de {employees.length} totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nómina Mensual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPayroll)}</div>
            <p className="text-xs text-gray-500">Salarios brutos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deducciones</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalPayroll * 0.04)}
            </div>
            <p className="text-xs text-gray-500">IGSS + IHSS + RAP</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacaciones Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingVacations}</div>
            <p className="text-xs text-gray-500">días disponibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Shortcuts Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">Accesos Directos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shortcuts.map((shortcut) => {
            const IconComponent = shortcut.icon;
            return (
              <Card
                key={shortcut.title}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => router.push(`/companies/${companyId}${shortcut.path}`)}
              >
                <CardHeader className={`${shortcut.bgColor} border-b`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                      <IconComponent className={`h-6 w-6 ${shortcut.color}`} />
                    </div>
                    <Badge variant="default" className="text-xs bg-green-600">
                      {shortcut.count}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{shortcut.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {shortcut.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Haz clic para acceder</span>
                    <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
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
