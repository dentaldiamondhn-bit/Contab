'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Download,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  status: 'active' | 'inactive';
  phone: string;
  email: string;
  vacationDays: number;
  usedVacationDays: number;
}

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'late' | 'vacation' | 'sick';
}

export default function HRPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState('employees');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    position: '',
    department: '',
    salary: 0,
    startDate: '',
    phone: '',
    email: '',
    vacationDays: 15
  });

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = () => {
    const empKey = `employees_${companyId}`;
    const attKey = `attendance_${companyId}`;
    const savedEmp = localStorage.getItem(empKey);
    const savedAtt = localStorage.getItem(attKey);
    if (savedEmp) setEmployees(JSON.parse(savedEmp));
    if (savedAtt) setAttendance(JSON.parse(savedAtt));
  };

  const saveEmployees = (data: Employee[]) => {
    localStorage.setItem(`employees_${companyId}`, JSON.stringify(data));
    setEmployees(data);
  };

  const addEmployee = () => {
    const emp: Employee = {
      id: `emp-${Date.now()}`,
      ...newEmployee,
      status: 'active',
      usedVacationDays: 0
    };
    saveEmployees([...employees, emp]);
    setNewEmployee({ name: '', position: '', department: '', salary: 0, startDate: '', phone: '', email: '', vacationDays: 15 });
    setShowAddEmployee(false);
  };

  const removeEmployee = (id: string) => {
    if (confirm('¿Eliminar este empleado?')) {
      saveEmployees(employees.filter(e => e.id !== id));
    }
  };

  const toggleEmployeeStatus = (id: string) => {
    saveEmployees(employees.map(e => 
      e.id === id ? { ...e, status: e.status === 'active' ? 'inactive' : 'active' } : e
    ));
  };

  const updateEmployee = (id: string, field: string, value: any) => {
    saveEmployees(employees.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const recordAttendance = (employeeId: string, status: Attendance['status']) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === today);
    const newAttendance: Attendance = {
      id: existing?.id || `att-${Date.now()}`,
      employeeId,
      date: today,
      checkIn: new Date().toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }),
      checkOut: '',
      status
    };
    const updated = existing 
      ? attendance.map(a => a.id === existing.id ? newAttendance : a)
      : [...attendance, newAttendance];
    localStorage.setItem(`attendance_${companyId}`, JSON.stringify(updated));
    setAttendance(updated);
  };

  const getTodayAttendance = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return attendance.find(a => a.employeeId === employeeId && a.date === today);
  };

  const getMonthlyPayroll = () => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    const totalBase = activeEmployees.reduce((sum, e) => sum + e.salary, 0);
    const igssEmployee = totalBase * 0.01;
    const igssEmployer = totalBase * 0.024;
    const ihss = totalBase * 0.025;
    const rap = totalBase * 0.005;
    return {
      totalBase,
      igssEmployee,
      igssEmployer,
      ihss,
      rap,
      totalDeductions: igssEmployee + ihss + rap,
      netPay: totalBase - igssEmployee - ihss - rap
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

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
            <div className="text-2xl font-bold text-blue-600">
              {employees.filter(e => e.status === 'active').length}
            </div>
            <p className="text-xs text-gray-500">
              de {employees.length} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nómina Mensual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getMonthlyPayroll().totalBase)}
            </div>
            <p className="text-xs text-gray-500">
              Salarios brutos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deducciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(getMonthlyPayroll().totalDeductions)}
            </div>
            <p className="text-xs text-gray-500">
              IGSS + IHSS + RAP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pago Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(getMonthlyPayroll().netPay)}
            </div>
            <p className="text-xs text-gray-500">
              Total a pagar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia</TabsTrigger>
          <TabsTrigger value="payroll">Nómina</TabsTrigger>
          <TabsTrigger value="vacations">Vacaciones</TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Lista de Empleados</h2>
            <Button onClick={() => setShowAddEmployee(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Empleado
            </Button>
          </div>

          {showAddEmployee && (
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle>Nuevo Empleado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nombre completo</label>
                    <input
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cargo</label>
                    <input
                      type="text"
                      value={newEmployee.position}
                      onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Departamento</label>
                    <input
                      type="text"
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="Ej: Administración"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Salario mensual</label>
                    <input
                      type="number"
                      value={newEmployee.salary}
                      onChange={(e) => setNewEmployee({ ...newEmployee, salary: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha de ingreso</label>
                    <input
                      type="date"
                      value={newEmployee.startDate}
                      onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Días de vacaciones</label>
                    <input
                      type="number"
                      value={newEmployee.vacationDays}
                      onChange={(e) => setNewEmployee({ ...newEmployee, vacationDays: parseInt(e.target.value) || 15 })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <input
                      type="text"
                      value={newEmployee.phone}
                      onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addEmployee}>Guardar</Button>
                  <Button variant="outline" onClick={() => setShowAddEmployee(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {employees.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No hay empleados registrados</h3>
                <p className="text-gray-500">Agrega el primer empleado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => (
                <Card key={emp.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{emp.name}</h3>
                          <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                            {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{emp.position} • {emp.department}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                          <span>Salario: {formatCurrency(emp.salary)}</span>
                          <span>Ingreso: {emp.startDate || '-'}</span>
                          <span>Vacaciones: {emp.vacationDays - emp.usedVacationDays} días</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => recordAttendance(emp.id, 'present')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => recordAttendance(emp.id, 'absent')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleEmployeeStatus(emp.id)}
                        >
                          {emp.status === 'active' ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeEmployee(emp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {getTodayAttendance(emp.id) && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                        <span className="font-medium">Hoy: </span>
                        {getTodayAttendance(emp.id)?.status === 'present' && '✅ Presente'}
                        {getTodayAttendance(emp.id)?.status === 'absent' && '❌ Ausente'}
                        {getTodayAttendance(emp.id)?.status === 'late' && '⏰ Tardanza'}
                        {getTodayAttendance(emp.id)?.status === 'vacation' && '🏖️ Vacaciones'}
                        {getTodayAttendance(emp.id)?.status === 'sick' && '🤒 Enfermedad'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <h2 className="text-xl font-bold">Registro de Asistencia - Hoy</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {employees.filter(e => e.status === 'active').map((emp) => {
                  const todayAtt = getTodayAttendance(emp.id);
                  return (
                    <div key={emp.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-sm text-gray-500">{emp.position}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={todayAtt?.status === 'present' ? 'default' : 'outline'}
                          onClick={() => recordAttendance(emp.id, 'present')}
                        >
                          Presente
                        </Button>
                        <Button
                          size="sm"
                          variant={todayAtt?.status === 'absent' ? 'destructive' : 'outline'}
                          onClick={() => recordAttendance(emp.id, 'absent')}
                        >
                          Ausente
                        </Button>
                        <Button
                          size="sm"
                          variant={todayAtt?.status === 'late' ? 'default' : 'outline'}
                          onClick={() => recordAttendance(emp.id, 'late')}
                        >
                          Tardanza
                        </Button>
                        <Button
                          size="sm"
                          variant={todayAtt?.status === 'vacation' ? 'default' : 'outline'}
                          onClick={() => recordAttendance(emp.id, 'vacation')}
                        >
                          Vacaciones
                        </Button>
                        <Button
                          size="sm"
                          variant={todayAtt?.status === 'sick' ? 'default' : 'outline'}
                          onClick={() => recordAttendance(emp.id, 'sick')}
                        >
                          Enfermedad
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <h2 className="text-xl font-bold">Nómina Mensual</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {employees.filter(e => e.status === 'active').map((emp) => (
                  <div key={emp.id} className="grid grid-cols-4 gap-4 p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-gray-500">{emp.position}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Salario Base</div>
                      <div className="font-medium">{formatCurrency(emp.salary)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Deducciones</div>
                      <div className="font-medium text-red-600">
                        {formatCurrency(emp.salary * 0.04)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Neto</div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(emp.salary * 0.96)}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="border-t-2 pt-4 mt-4">
                  <h3 className="font-bold text-lg mb-3">Resumen de Nómina</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Salarios Brutos</div>
                      <div className="text-lg font-bold text-blue-600">{formatCurrency(getMonthlyPayroll().totalBase)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">IGSS Empleado (1%)</div>
                      <div className="text-lg font-bold text-red-600">{formatCurrency(getMonthlyPayroll().igssEmployee)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">IHSS (2.5%)</div>
                      <div className="text-lg font-bold text-red-600">{formatCurrency(getMonthlyPayroll().ihss)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">RAP (0.5%)</div>
                      <div className="text-lg font-bold text-red-600">{formatCurrency(getMonthlyPayroll().rap)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">IGSS Patronal (2.4%)</div>
                      <div className="text-lg font-bold text-orange-600">{formatCurrency(getMonthlyPayroll().igssEmployer)}</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">Total Pago Neto Empleados</div>
                      <div className="text-lg font-bold text-green-600">{formatCurrency(getMonthlyPayroll().netPay)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vacations Tab */}
        <TabsContent value="vacations" className="space-y-4">
          <h2 className="text-xl font-bold">Control de Vacaciones</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {employees.filter(e => e.status === 'active').map((emp) => {
                  const available = emp.vacationDays - emp.usedVacationDays;
                  const percentage = emp.vacationDays > 0 ? (emp.usedVacationDays / emp.vacationDays) * 100 : 0;
                  return (
                    <div key={emp.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-sm text-gray-500">{emp.position}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">{available} días disponibles</div>
                          <div className="text-sm text-gray-500">de {emp.vacationDays} días</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-sm text-gray-500">
                        <span>Usados: {emp.usedVacationDays} días</span>
                        <span>{Math.round(percentage)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
