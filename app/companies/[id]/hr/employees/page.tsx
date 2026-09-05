'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Search
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

export default function EmployeesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
    const savedEmp = localStorage.getItem(empKey);
    if (savedEmp) setEmployees(JSON.parse(savedEmp));
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
          <p className="text-gray-500">{employees.length} empleados registrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={() => setShowAddEmployee(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar Empleado
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cargo o departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Employee Form */}
      {showAddEmployee && (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle>Nuevo Empleado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre completo *</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cargo *</label>
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
                <label className="text-sm font-medium">Salario mensual (L.) *</label>
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

      {/* Employees List */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No hay empleados registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEmployees.map((emp) => (
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
                      <span>Tel: {emp.phone || '-'}</span>
                      <span>Email: {emp.email || '-'}</span>
                      <span>Vacaciones: {emp.vacationDays - emp.usedVacationDays} días</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
