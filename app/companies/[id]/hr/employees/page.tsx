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
  employeeId: string;
  firstName: string;
  lastName: string;
  identityNumber: string;
  photo: string;
  cv: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  status: 'active' | 'inactive';
  phone: string;
  email: string;
  address: string;
  civilStatus: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'unión libre';
  vacationDays: number;
  usedVacationDays: number;
  // Contrato y trabajo
  contractType: 'indefinido' | 'determinado' | 'por obra' | 'prueba' | 'temporada';
  supervisor: string;
  schedule: 'completa' | 'media' | 'personalizada';
  scheduleHours: string;
  modality: 'presencial' | 'remoto' | 'híbrido';
  // Académico
  educationLevel: 'basico' | 'medio' | 'universitario' | 'tecnico' | 'maestria' | 'doctorado';
  university: string;
  degree: string;
  graduationYear: string;
  // Habilidades
  languages: string;
  certifications: string;
  driverLicense: boolean;
  otherSkills: string;
  // Seguridad Social
  socialSecurityNumber: string;
  pensionFund: string;
  laborRiskInsurer: string;
  // Permisos
  workPermitStatus: string;
  visaExpiry: string;
  // Documentos
  docIdentity: string;
  docAddressProof: string;
  docContract: string;
  docNDA: string;
  docEducationCerts: string;
  docPreviousJobs: string;
  docMedicalCert: string;
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
    firstName: '',
    lastName: '',
    identityNumber: '',
    photo: '',
    cv: '',
    position: '',
    department: '',
    salary: 0,
    startDate: '',
    phone: '',
    email: '',
    address: '',
    civilStatus: 'soltero' as const,
    vacationDays: 15,
    contractType: 'indefinido' as const,
    supervisor: '',
    schedule: 'completa' as const,
    scheduleHours: '08:00 - 17:00',
    modality: 'presencial' as const,
    educationLevel: 'universitario' as const,
    university: '',
    degree: '',
    graduationYear: '',
    languages: '',
    certifications: '',
    driverLicense: false,
    otherSkills: '',
    socialSecurityNumber: '',
    pensionFund: '',
    laborRiskInsurer: '',
    workPermitStatus: '',
    visaExpiry: '',
    docIdentity: '',
    docAddressProof: '',
    docContract: '',
    docNDA: '',
    docEducationCerts: '',
    docPreviousJobs: '',
    docMedicalCert: ''
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        alert('La foto no debe superar 500KB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee({ ...newEmployee, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) {
        alert('El CV no debe superar 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee({ ...newEmployee, cv: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5000000) {
        alert('El archivo no debe superar 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee({ ...newEmployee, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateEmployeeId = () => {
    const empCount = employees.length + 1;
    const prefix = companyId.substring(0, 4).toUpperCase();
    const number = String(empCount).padStart(4, '0');
    return `${prefix}-${number}`;
  };

  const addEmployee = () => {
    const emp: Employee = {
      id: `emp-${Date.now()}`,
      employeeId: generateEmployeeId(),
      ...newEmployee,
      vacationDays: calculateVacationDays(newEmployee.startDate),
      status: 'active',
      usedVacationDays: 0
    };
    saveEmployees([...employees, emp]);
    setNewEmployee({ firstName: '', lastName: '', identityNumber: '', photo: '', cv: '', position: '', department: '', salary: 0, startDate: '', phone: '', email: '', address: '', civilStatus: 'soltero', vacationDays: 0, contractType: 'indefinido', supervisor: '', schedule: 'completa', scheduleHours: '08:00 - 17:00', modality: 'presencial', educationLevel: 'universitario', university: '', degree: '', graduationYear: '', languages: '', certifications: '', driverLicense: false, otherSkills: '', socialSecurityNumber: '', pensionFund: '', laborRiskInsurer: '', workPermitStatus: '', visaExpiry: '', docIdentity: '', docAddressProof: '', docContract: '', docNDA: '', docEducationCerts: '', docPreviousJobs: '', docMedicalCert: '' });
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
    (`${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase())
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
            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="text-sm font-medium text-gray-600">No. Empleado (generado automáticamente)</label>
              <div className="text-lg font-bold text-blue-600">{generateEmployeeId()}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Nombres *</label>
                <input
                  type="text"
                  value={newEmployee.firstName}
                  onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: Juan Carlos"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apellidos *</label>
                <input
                  type="text"
                  value={newEmployee.lastName}
                  onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: Pérez López"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">No. Identidad *</label>
                <input
                  type="text"
                  value={newEmployee.identityNumber}
                  onChange={(e) => setNewEmployee({ ...newEmployee, identityNumber: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: 0801-1990-12345"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Foto del empleado</label>
                <div className="mt-1 flex items-center gap-4">
                  {newEmployee.photo ? (
                    <div className="relative">
                      <img 
                        src={newEmployee.photo} 
                        alt="Preview" 
                        className="w-20 h-20 object-cover rounded-full border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setNewEmployee({ ...newEmployee, photo: '' })}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400">
                        <UserPlus className="h-8 w-8 text-gray-400" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="text-xs text-gray-500">
                    <p>Formato: JPG, PNG</p>
                    <p>Tamaño máximo: 500KB</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Estado Civil *</label>
                <select
                  value={newEmployee.civilStatus}
                  onChange={(e) => setNewEmployee({ ...newEmployee, civilStatus: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="soltero">Soltero/a</option>
                  <option value="casado">Casado/a</option>
                  <option value="divorciado">Divorciado/a</option>
                  <option value="viudo">Viudo/a</option>
                  <option value="unión libre">Unión Libre</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Departamento *</label>
                <select
                  value={newEmployee.department}
                  onChange={(e) => {
                    const deptName = e.target.value;
                    const dept = departments.find(d => d.name === deptName);
                    setNewEmployee({ ...newEmployee, department: deptName, position: '', supervisor: dept?.manager || '' });
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar departamento...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Cargo *</label>
                <select
                  value={newEmployee.position}
                  onChange={(e) => {
                    const posName = e.target.value;
                    const pos = positions.find(p => p.name === posName && p.department === newEmployee.department);
                    setNewEmployee({ 
                      ...newEmployee, 
                      position: posName,
                      salary: pos ? pos.minSalary || pos.maxSalary || 0 : newEmployee.salary
                    });
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar puesto...</option>
                  {positions
                    .filter(p => !newEmployee.department || p.department === newEmployee.department)
                    .map((pos) => (
                      <option key={pos.id} value={pos.name}>
                        {pos.name} {pos.minSalary > 0 || pos.maxSalary > 0 ? `(${pos.minSalary > 0 ? formatCurrency(pos.minSalary) : '?'} - ${pos.maxSalary > 0 ? formatCurrency(pos.maxSalary) : '?'})` : ''}
                      </option>
                    ))}
                </select>
                {newEmployee.department && positions.filter(p => p.department === newEmployee.department).length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">No hay puestos para este departamento</p>
                )}
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
              <div className="md:col-span-3">
                <label className="text-sm font-medium">Dirección exacta</label>
                <input
                  type="text"
                  value={newEmployee.address}
                  onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: Col. Kennedy, Calle 12, Casa #456"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Teléfono</label>
                <input
                  type="text"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="9999-8888"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            {/* Contrato y Trabajo */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Contrato y Trabajo</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo de contrato *</label>
                  <select
                    value={newEmployee.contractType}
                    onChange={(e) => setNewEmployee({ ...newEmployee, contractType: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="indefinido">Indefinido</option>
                    <option value="determinado">Determinado</option>
                    <option value="por obra">Por Obra</option>
                    <option value="prueba">Período de Prueba</option>
                    <option value="temporada">Temporada</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Jefe Directo</label>
                  <input
                    type="text"
                    value={newEmployee.supervisor}
                    onChange={(e) => setNewEmployee({ ...newEmployee, supervisor: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Se asigna según departamento"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Jornada *</label>
                  <select
                    value={newEmployee.schedule}
                    onChange={(e) => setNewEmployee({ ...newEmployee, schedule: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="completa">Tiempo Completo</option>
                    <option value="media">Medio Tiempo</option>
                    <option value="personalizada">Personalizada</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Horario</label>
                  <input
                    type="text"
                    value={newEmployee.scheduleHours}
                    onChange={(e) => setNewEmployee({ ...newEmployee, scheduleHours: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="08:00 - 17:00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Modalidad *</label>
                  <select
                    value={newEmployee.modality}
                    onChange={(e) => setNewEmployee({ ...newEmployee, modality: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="remoto">Remoto</option>
                    <option value="híbrido">Híbrido</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Nivel Académico */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Nivel Académico</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Nivel de escolaridad</label>
                  <select
                    value={newEmployee.educationLevel}
                    onChange={(e) => setNewEmployee({ ...newEmployee, educationLevel: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="basico">Básico</option>
                    <option value="medio">Medio</option>
                    <option value="tecnico">Técnico</option>
                    <option value="universitario">Universitario</option>
                    <option value="maestria">Maestría</option>
                    <option value="doctorado">Doctorado</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Institución de egreso</label>
                  <input
                    type="text"
                    value={newEmployee.university}
                    onChange={(e) => setNewEmployee({ ...newEmployee, university: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: Universidad Nacional"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Título / Carrera</label>
                  <input
                    type="text"
                    value={newEmployee.degree}
                    onChange={(e) => setNewEmployee({ ...newEmployee, degree: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: Ingeniero en Sistemas"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Año de graduación</label>
                  <input
                    type="text"
                    value={newEmployee.graduationYear}
                    onChange={(e) => setNewEmployee({ ...newEmployee, graduationYear: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: 2020"
                  />
                </div>
              </div>
            </div>

            {/* Habilidades */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Habilidades y Competencias</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Idiomas</label>
                  <input
                    type="text"
                    value={newEmployee.languages}
                    onChange={(e) => setNewEmployee({ ...newEmployee, languages: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: Español (nativo), Inglés (avanzado)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Certificaciones profesionales</label>
                  <input
                    type="text"
                    value={newEmployee.certifications}
                    onChange={(e) => setNewEmployee({ ...newEmployee, certifications: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: PMP, CPA, Scrum Master"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Otras habilidades</label>
                  <input
                    type="text"
                    value={newEmployee.otherSkills}
                    onChange={(e) => setNewEmployee({ ...newEmployee, otherSkills: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: Manejo de Excel, Trabajo en equipo"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Licencia de conducir</label>
                  <input
                    type="checkbox"
                    checked={newEmployee.driverLicense}
                    onChange={(e) => setNewEmployee({ ...newEmployee, driverLicense: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            </div>

            {/* Seguridad Social */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Seguridad Social y Legal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">No. Seguridad Social (IHSS)</label>
                  <input
                    type="text"
                    value={newEmployee.socialSecurityNumber}
                    onChange={(e) => setNewEmployee({ ...newEmployee, socialSecurityNumber: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Número de afiliación"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Fondo de pensiones</label>
                  <input
                    type="text"
                    value={newEmployee.pensionFund}
                    onChange={(e) => setNewEmployee({ ...newEmployee, pensionFund: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: RAP, AHPRONAFI"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Aseguradora de riesgos laborales</label>
                  <input
                    type="text"
                    value={newEmployee.laborRiskInsurer}
                    onChange={(e) => setNewEmployee({ ...newEmployee, laborRiskInsurer: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: ARL Confederación"
                  />
                </div>
              </div>
            </div>

            {/* Permisos y Visas */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Permisos y Visas (Empleados Extranjeros)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Estatus legal de trabajo</label>
                  <select
                    value={newEmployee.workPermitStatus}
                    onChange={(e) => setNewEmployee({ ...newEmployee, workPermitStatus: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="">No aplica</option>
                    <option value="nacional">Nacional</option>
                    <option value="residencia_permanente">Residencia Permanente</option>
                    <option value="residencia_temporal">Residencia Temporal</option>
                    <option value="permiso_trabajo">Permiso de Trabajo</option>
                    <option value="asilo">Asilo Político</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Vigencia de visa</label>
                  <input
                    type="date"
                    value={newEmployee.visaExpiry}
                    onChange={(e) => setNewEmployee({ ...newEmployee, visaExpiry: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* CV */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Curriculum Vitae</h3>
              <div>
                <label className="text-sm font-medium">Archivo CV (PDF)</label>
                <div className="mt-1 flex items-center gap-4">
                  {newEmployee.cv ? (
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-green-700">CV cargado</span>
                      <button
                        type="button"
                        onClick={() => setNewEmployee({ ...newEmployee, cv: '' })}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                        <Upload className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">Seleccionar archivo PDF</span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleCVUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <span className="text-xs text-gray-500">Máximo 2MB</span>
                </div>
              </div>
            </div>

            {/* Documentos Adjuntos */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Documentos Adjuntos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Copia de documento de identidad */}
                <div>
                  <label className="text-sm font-medium">Copia de documento de identidad</label>
                  <div className="mt-1">
                    {newEmployee.docIdentity ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docIdentity: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docIdentity')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Comprobante de domicilio */}
                <div>
                  <label className="text-sm font-medium">Comprobante de domicilio</label>
                  <div className="mt-1">
                    {newEmployee.docAddressProof ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docAddressProof: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docAddressProof')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Contrato de trabajo firmado */}
                <div>
                  <label className="text-sm font-medium">Contrato de trabajo firmado</label>
                  <div className="mt-1">
                    {newEmployee.docContract ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docContract: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docContract')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Acuerdo de confidencialidad/NDA */}
                <div>
                  <label className="text-sm font-medium">Acuerdo de confidencialidad / NDA</label>
                  <div className="mt-1">
                    {newEmployee.docNDA ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docNDA: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docNDA')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Certificados de estudios */}
                <div>
                  <label className="text-sm font-medium">Certificados de estudios</label>
                  <div className="mt-1">
                    {newEmployee.docEducationCerts ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docEducationCerts: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docEducationCerts')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Certificados de empleos anteriores */}
                <div>
                  <label className="text-sm font-medium">Certificados de empleos anteriores</label>
                  <div className="mt-1">
                    {newEmployee.docPreviousJobs ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docPreviousJobs: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docPreviousJobs')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Certificados médicos ocupacionales */}
                <div>
                  <label className="text-sm font-medium">Certificados médicos ocupacionales de ingreso</label>
                  <div className="mt-1">
                    {newEmployee.docMedicalCert ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docMedicalCert: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docMedicalCert')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
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
                  <div className="flex items-start gap-4">
                    {emp.photo ? (
                      <img 
                        src={emp.photo} 
                        alt={`${emp.firstName} ${emp.lastName}`}
                        className="w-16 h-16 object-cover rounded-full border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                        <span className="text-xl font-medium text-gray-400">
                          {(emp.firstName || emp.name || '').charAt(0)}{(emp.lastName || '').charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{emp.employeeId}</span>
                        <h3 className="font-medium">{emp.firstName || emp.name} {emp.lastName || ''}</h3>
                        <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                          {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{emp.position} • {emp.department}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        {emp.identityNumber && <span>Identidad: {emp.identityNumber}</span>}
                        <span>Salario: {formatCurrency(emp.salary)}</span>
                        <span>Ingreso: {emp.startDate || '-'}</span>
                        {emp.phone && <span>Tel: {emp.phone}</span>}
                        {emp.email && <span>Email: {emp.email}</span>}
                        {emp.address && <span>Dirección: {emp.address}</span>}
                        {emp.civilStatus && <span>Estado civil: {emp.civilStatus}</span>}
                        <span>Antigüedad: {Math.floor((new Date().getTime() - new Date(emp.startDate || '').getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años</span>
                        <span>Vacaciones: {calculateVacationDays(emp.startDate)} días</span>
                      </div>
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
