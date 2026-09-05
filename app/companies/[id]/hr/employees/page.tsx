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
  Search,
  Upload,
  Download
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

interface Department {
  id: string;
  name: string;
  description: string;
  manager: string;
}

interface Position {
  id: string;
  name: string;
  department: string;
  description: string;
  minSalary: number;
  maxSalary: number;
}

export default function EmployeesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
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
    const deptKey = `departments_${companyId}`;
    const posKey = `positions_${companyId}`;
    const savedEmp = localStorage.getItem(empKey);
    const savedDept = localStorage.getItem(deptKey);
    const savedPos = localStorage.getItem(posKey);
    if (savedEmp) setEmployees(JSON.parse(savedEmp));
    if (savedDept) setDepartments(JSON.parse(savedDept));
    if (savedPos) setPositions(JSON.parse(savedPos));
  };

  const saveEmployees = (data: Employee[]) => {
    localStorage.setItem(`employees_${companyId}`, JSON.stringify(data));
    setEmployees(data);
  };

  const addEmployee = () => {
    const emp: Employee = {
      id: `emp-${Date.now()}`,
      ...newEmployee,
      vacationDays: calculateVacationDays(newEmployee.startDate),
      status: 'active',
      usedVacationDays: 0
    };
    saveEmployees([...employees, emp]);
    setNewEmployee({ name: '', position: '', department: '', salary: 0, startDate: '', phone: '', email: '', vacationDays: 0 });
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

  const calculateVacationDays = (startDate: string): number => {
    if (!startDate) return 15;
    const start = new Date(startDate);
    const now = new Date();
    const yearsDiff = now.getFullYear() - start.getFullYear();
    const monthsDiff = now.getMonth() - start.getMonth();
    const totalYears = yearsDiff + (monthsDiff < 0 ? -1 : 0);
    
    if (totalYears < 1) return 0;
    if (totalYears === 1) return 10;
    if (totalYears === 2) return 12;
    if (totalYears === 3) return 14;
    // 4+ años: 14 + 1 por cada año adicional, máximo 20
    return Math.min(20, 14 + (totalYears - 3));
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('El archivo debe tener al menos un encabezado y una fila de datos');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const preview: any[] = [];

      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        preview.push(row);
      }

      setUploadPreview(preview);
    };
    reader.readAsText(file);
  };

  const confirmUpload = () => {
    const newEmployees = uploadPreview.map(row => ({
      id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: row.name || row.nombre || '',
      position: row.position || row.cargo || row.puesto || '',
      department: row.department || row.departamento || '',
      salary: parseFloat(row.salary || row.salario || '0') || 0,
      startDate: row.startdate || row.fecha_ingreso || row.fecha || '',
      status: 'active' as const,
      phone: row.phone || row.telefono || '',
      email: row.email || row.correo || '',
      vacationDays: parseInt(row.vacationdays || row.dias_vacaciones || '15') || 15,
      usedVacationDays: 0
    })).filter(emp => emp.name);

    saveEmployees([...employees, ...newEmployees]);
    setUploadPreview([]);
    setShowUpload(false);
    alert(`${newEmployees.length} empleados importados correctamente`);
  };

  const downloadTemplate = () => {
    const csv = 'name,position,department,salary,startDate,phone,email,vacationDays\nJuan Pérez,Doctor,Medicina,15000,2024-01-15,9999-8888,juan@email.com,15\nMaría López,Enfermera,Enfermería,12000,2024-02-01,8888-7777,maria@email.com,15';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_empleados.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Template
          </Button>
          <Button variant="outline" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Subir Archivo
          </Button>
          <Button onClick={() => setShowAddEmployee(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar Empleado
          </Button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Importar Empleados desde Archivo CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Formato del archivo CSV:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>name</strong> o <strong>nombre</strong>: Nombre completo del empleado</li>
                <li>• <strong>position</strong> o <strong>cargo</strong>: Cargo o puesto</li>
                <li>• <strong>department</strong> o <strong>departamento</strong>: Departamento</li>
                <li>• <strong>salary</strong> o <strong>salario</strong>: Salario mensual</li>
                <li>• <strong>startDate</strong> o <strong>fecha</strong>: Fecha de ingreso</li>
                <li>• <strong>phone</strong> o <strong>telefono</strong>: Teléfono</li>
                <li>• <strong>email</strong> o <strong>correo</strong>: Correo electrónico</li>
                <li>• <strong>vacationDays</strong> o <strong>dias_vacaciones</strong>: Días de vacaciones</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <Button variant="outline" onClick={() => { setShowUpload(false); setUploadPreview([]); }}>
                Cancelar
              </Button>
            </div>

            {uploadPreview.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Vista previa ({uploadPreview.length} empleados):</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2 px-3">Nombre</th>
                        <th className="text-left py-2 px-3">Cargo</th>
                        <th className="text-left py-2 px-3">Departamento</th>
                        <th className="text-right py-2 px-3">Salario</th>
                        <th className="text-left py-2 px-3">Fecha</th>
                        <th className="text-left py-2 px-3">Teléfono</th>
                        <th className="text-left py-2 px-3">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadPreview.map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="py-2 px-3">{row.name || row.nombre}</td>
                          <td className="py-2 px-3">{row.position || row.cargo || row.puesto}</td>
                          <td className="py-2 px-3">{row.department || row.departamento}</td>
                          <td className="py-2 px-3 text-right">{row.salary || row.salario}</td>
                          <td className="py-2 px-3">{row.startdate || row.fecha_ingreso || row.fecha}</td>
                          <td className="py-2 px-3">{row.phone || row.telefono}</td>
                          <td className="py-2 px-3">{row.email || row.correo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={confirmUpload}>
                    Confirmar Importación ({uploadPreview.length} empleados)
                  </Button>
                  <Button variant="outline" onClick={() => setUploadPreview([])}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                <select
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar puesto...</option>
                  {positions
                    .filter(p => !newEmployee.department || p.department === newEmployee.department)
                    .map((pos) => (
                      <option key={pos.id} value={pos.name}>{pos.name}</option>
                    ))}
                </select>
                {newEmployee.department && positions.filter(p => p.department === newEmployee.department).length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">No hay puestos para este departamento</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Departamento</label>
                <select
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar departamento...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
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
                <label className="text-sm font-medium">Fecha de ingreso *</label>
                <input
                  type="date"
                  value={newEmployee.startDate}
                  onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Días de vacaciones</label>
                <div className="w-full mt-1 px-3 py-2 border rounded-md bg-gray-50 text-gray-600">
                  Se calcula automáticamente por antigüedad
                </div>
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
                      <span>Antigüedad: {Math.floor((new Date().getTime() - new Date(emp.startDate || '').getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años</span>
                      <span>Vacaciones: {calculateVacationDays(emp.startDate)} días</span>
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
