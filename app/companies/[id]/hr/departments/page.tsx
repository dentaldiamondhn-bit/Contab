'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Users,
  Building2,
  Save,
  X,
  Briefcase,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
  manager: string;
  createdAt: string;
}

interface Position {
  id: string;
  name: string;
  department: string;
  description: string;
  minSalary: number;
  maxSalary: number;
}

export default function DepartmentsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [showAddPosition, setShowAddPosition] = useState<string | null>(null);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [newDept, setNewDept] = useState({ name: '', description: '', manager: '' });
  const [newPosition, setNewPosition] = useState({ name: '', description: '', minSalary: 0, maxSalary: 0 });

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = () => {
    const deptKey = `departments_${companyId}`;
    const posKey = `positions_${companyId}`;
    const savedDept = localStorage.getItem(deptKey);
    const savedPos = localStorage.getItem(posKey);
    if (savedDept) {
      setDepartments(JSON.parse(savedDept));
    } else {
      const defaults: Department[] = [
        { id: 'dept-1', name: 'Administración', description: 'Gestión general y administrativa', manager: '', createdAt: new Date().toISOString() },
        { id: 'dept-2', name: 'Contabilidad', description: 'Contabilidad y finanzas', manager: '', createdAt: new Date().toISOString() },
        { id: 'dept-3', name: 'Recursos Humanos', description: 'Gestión de personal', manager: '', createdAt: new Date().toISOString() },
        { id: 'dept-4', name: 'Ventas', description: 'Ventas y atención al cliente', manager: '', createdAt: new Date().toISOString() },
        { id: 'dept-5', name: 'Operaciones', description: 'Operaciones del negocio', manager: '', createdAt: new Date().toISOString() }
      ];
      localStorage.setItem(deptKey, JSON.stringify(defaults));
      setDepartments(defaults);
    }
    if (savedPos) setPositions(JSON.parse(savedPos));
  };

  const saveDepartments = (data: Department[]) => {
    localStorage.setItem(`departments_${companyId}`, JSON.stringify(data));
    setDepartments(data);
  };

  const savePositions = (data: Position[]) => {
    localStorage.setItem(`positions_${companyId}`, JSON.stringify(data));
    setPositions(data);
  };

  // Department CRUD
  const addDepartment = () => {
    const dept: Department = {
      id: `dept-${Date.now()}`,
      ...newDept,
      createdAt: new Date().toISOString()
    };
    saveDepartments([...departments, dept]);
    setNewDept({ name: '', description: '', manager: '' });
    setShowAdd(false);
  };

  const updateDepartment = (id: string) => {
    saveDepartments(departments.map(d => d.id === id ? { ...d, ...newDept } : d));
    setEditingId(null);
    setNewDept({ name: '', description: '', manager: '' });
  };

  const removeDepartment = (id: string) => {
    if (confirm('¿Eliminar este departamento? Se eliminarán sus puestos también.')) {
      const dept = departments.find(d => d.id === id);
      if (dept) {
        savePositions(positions.filter(p => p.department !== dept.name));
      }
      saveDepartments(departments.filter(d => d.id !== id));
    }
  };

  // Position CRUD
  const addPosition = (department: string) => {
    const pos: Position = {
      id: `pos-${Date.now()}`,
      name: newPosition.name,
      department,
      description: newPosition.description,
      minSalary: newPosition.minSalary,
      maxSalary: newPosition.maxSalary
    };
    savePositions([...positions, pos]);
    setNewPosition({ name: '', description: '', minSalary: 0, maxSalary: 0 });
    setShowAddPosition(null);
  };

  const updatePosition = (id: string) => {
    savePositions(positions.map(p => p.id === id ? { ...p, ...newPosition } : p));
    setEditingPositionId(null);
    setNewPosition({ name: '', description: '', minSalary: 0, maxSalary: 0 });
  };

  const removePosition = (id: string) => {
    if (confirm('¿Eliminar este puesto?')) {
      savePositions(positions.filter(p => p.id !== id));
    }
  };

  const getEmployeeCount = (deptName: string) => {
    const empKey = `employees_${companyId}`;
    const saved = localStorage.getItem(empKey);
    if (saved) {
      const employees = JSON.parse(saved);
      return employees.filter((e: any) => e.department === deptName && e.status === 'active').length;
    }
    return 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Departamentos y Puestos</h1>
          <p className="text-gray-500">{departments.length} departamentos, {positions.length} puestos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Departamento
          </Button>
        </div>
      </div>

      {/* Add Department Form */}
      {showAdd && (
        <Card className="border-2 border-dashed border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Nuevo Departamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre *</label>
                <input
                  type="text"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: Marketing"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <input
                  type="text"
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gerente / Encargado</label>
                <input
                  type="text"
                  value={newDept.manager}
                  onChange={(e) => setNewDept({ ...newDept, manager: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addDepartment}><Save className="h-4 w-4 mr-2" /> Guardar</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departments List */}
      {departments.map((dept) => {
        const deptPositions = positions.filter(p => p.department === dept.name);
        const empCount = getEmployeeCount(dept.name);
        const isExpanded = expandedDept === dept.id;
        const isEditingDept = editingId === dept.id;

        return (
          <Card key={dept.id}>
            <CardHeader className="bg-gray-50 border-b cursor-pointer" onClick={() => setExpandedDept(isExpanded ? null : dept.id)}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-500" />}
                  <Building2 className="h-5 w-5 text-blue-600" />
                  {isEditingDept ? (
                    <input
                      type="text"
                      value={newDept.name}
                      onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 border rounded font-medium"
                    />
                  ) : (
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    <Users className="h-3 w-3 mr-1" />
                    {empCount} empleados
                  </Badge>
                  <Badge variant="default" className="bg-purple-100 text-purple-800">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {deptPositions.length} puestos
                  </Badge>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {isEditingDept ? (
                      <>
                        <Button size="sm" onClick={() => updateDepartment(dept.id)}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(dept.id); setNewDept({ name: dept.name, description: dept.description, manager: dept.manager }); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeDepartment(dept.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {isEditingDept && (
                <div className="grid grid-cols-2 gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={newDept.description}
                    onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                    placeholder="Descripción"
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <input
                    type="text"
                    value={newDept.manager}
                    onChange={(e) => setNewDept({ ...newDept, manager: e.target.value })}
                    placeholder="Gerente"
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
              )}
            </CardHeader>

            {isExpanded && (
              <CardContent className="p-4">
                {!isEditingDept && dept.description && (
                  <p className="text-sm text-gray-500 mb-3">{dept.description}</p>
                )}
                {!isEditingDept && dept.manager && (
                  <p className="text-sm text-gray-500 mb-3"><span className="font-medium">Encargado:</span> {dept.manager}</p>
                )}

                {/* Positions Section */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">Puestos del Departamento</h4>
                    <Button size="sm" variant="outline" onClick={() => setShowAddPosition(dept.id)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar Puesto
                    </Button>
                  </div>

                  {/* Add Position Form */}
                  {showAddPosition === dept.id && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        <input
                          type="text"
                          value={newPosition.name}
                          onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                          placeholder="Nombre del puesto"
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="text"
                          value={newPosition.description}
                          onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                          placeholder="Descripción"
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="number"
                          value={newPosition.minSalary || ''}
                          onChange={(e) => setNewPosition({ ...newPosition, minSalary: parseFloat(e.target.value) || 0 })}
                          placeholder="Sal. Mínimo"
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="number"
                          value={newPosition.maxSalary || ''}
                          onChange={(e) => setNewPosition({ ...newPosition, maxSalary: parseFloat(e.target.value) || 0 })}
                          placeholder="Sal. Máximo"
                          className="px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => addPosition(dept.name)}>
                          <Save className="h-3 w-3 mr-1" />
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddPosition(null)}>
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Positions List */}
                  {deptPositions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">No hay puestos en este departamento</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {deptPositions.map((pos) => (
                        <div key={pos.id} className="p-2 border rounded flex justify-between items-center">
                          {editingPositionId === pos.id ? (
                            <div className="flex-1 space-y-1">
                              <input
                                type="text"
                                value={newPosition.name}
                                onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => updatePosition(pos.id)}>
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingPositionId(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div>
                                <div className="font-medium text-sm">{pos.name}</div>
                                {(pos.minSalary > 0 || pos.maxSalary > 0) && (
                                  <div className="text-xs text-gray-500">
                                    {pos.minSalary > 0 ? formatCurrency(pos.minSalary) : '?'} - {pos.maxSalary > 0 ? formatCurrency(pos.maxSalary) : '?'}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => { setEditingPositionId(pos.id); setNewPosition({ name: pos.name, description: pos.description, minSalary: pos.minSalary, maxSalary: pos.maxSalary }); }}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removePosition(pos.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
