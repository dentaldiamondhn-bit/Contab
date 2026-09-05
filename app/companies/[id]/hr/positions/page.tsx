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
  Briefcase,
  Building2,
  Save,
  X,
  Users
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
}

interface Position {
  id: string;
  name: string;
  department: string;
  description: string;
  minSalary: number;
  maxSalary: number;
  createdAt: string;
}

export default function PositionsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDept, setFilterDept] = useState('');
  const [newPosition, setNewPosition] = useState({ 
    name: '', 
    department: '', 
    description: '', 
    minSalary: 0, 
    maxSalary: 0 
  });

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = () => {
    const posKey = `positions_${companyId}`;
    const deptKey = `departments_${companyId}`;
    const savedPos = localStorage.getItem(posKey);
    const savedDept = localStorage.getItem(deptKey);
    if (savedPos) setPositions(JSON.parse(savedPos));
    if (savedDept) setDepartments(JSON.parse(savedDept));
  };

  const savePositions = (data: Position[]) => {
    localStorage.setItem(`positions_${companyId}`, JSON.stringify(data));
    setPositions(data);
  };

  const addPosition = () => {
    const pos: Position = {
      id: `pos-${Date.now()}`,
      ...newPosition,
      createdAt: new Date().toISOString()
    };
    savePositions([...positions, pos]);
    setNewPosition({ name: '', department: '', description: '', minSalary: 0, maxSalary: 0 });
    setShowAdd(false);
  };

  const updatePosition = (id: string) => {
    savePositions(positions.map(p => 
      p.id === id ? { ...p, ...newPosition } : p
    ));
    setEditingId(null);
    setNewPosition({ name: '', department: '', description: '', minSalary: 0, maxSalary: 0 });
  };

  const removePosition = (id: string) => {
    if (confirm('¿Eliminar este puesto?')) {
      savePositions(positions.filter(p => p.id !== id));
    }
  };

  const startEdit = (pos: Position) => {
    setEditingId(pos.id);
    setNewPosition({ 
      name: pos.name, 
      department: pos.department, 
      description: pos.description,
      minSalary: pos.minSalary,
      maxSalary: pos.maxSalary
    });
  };

  const getEmployeeCount = (posName: string, deptName: string) => {
    const empKey = `employees_${companyId}`;
    const saved = localStorage.getItem(empKey);
    if (saved) {
      const employees = JSON.parse(saved);
      return employees.filter((e: any) => 
        e.position === posName && e.department === deptName && e.status === 'active'
      ).length;
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

  const filteredPositions = filterDept 
    ? positions.filter(p => p.department === filterDept)
    : positions;

  // Group positions by department
  const groupedPositions = departments.map(dept => ({
    ...dept,
    positions: filteredPositions.filter(p => p.department === dept.name)
  })).filter(group => group.positions.length > 0 || !filterDept);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Puestos por Departamento</h1>
          <p className="text-gray-500">{positions.length} puestos registrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Puesto
          </Button>
        </div>
      </div>

      {/* Filter by Department */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="font-medium">Filtrar por departamento:</label>
            <select 
              value={filterDept} 
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Todos los departamentos</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Add Position Form */}
      {showAdd && (
        <Card className="border-2 border-dashed border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Nuevo Puesto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre del puesto *</label>
                <input
                  type="text"
                  value={newPosition.name}
                  onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: Gerente de Ventas"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Departamento *</label>
                <select
                  value={newPosition.department}
                  onChange={(e) => setNewPosition({ ...newPosition, department: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar departamento...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Descripción</label>
                <input
                  type="text"
                  value={newPosition.description}
                  onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Responsabilidades del puesto"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Salario Mínimo (L.)</label>
                <input
                  type="number"
                  value={newPosition.minSalary}
                  onChange={(e) => setNewPosition({ ...newPosition, minSalary: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Salario Máximo (L.)</label>
                <input
                  type="number"
                  value={newPosition.maxSalary}
                  onChange={(e) => setNewPosition({ ...newPosition, maxSalary: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addPosition}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Positions by Department */}
      {departments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No hay departamentos creados</h3>
            <p className="text-gray-500">Primero crea departamentos en Recursos Humanos → Departamentos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedPositions.map((group) => (
            <Card key={group.id || group.name}>
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    {group.positions.length} puesto{group.positions.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-500">{group.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {group.positions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay puestos en este departamento</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.positions.map((pos) => {
                      const isEditing = editingId === pos.id;
                      const empCount = getEmployeeCount(pos.name, pos.department);
                      
                      return (
                        <div key={pos.id} className={`p-4 border rounded-lg ${isEditing ? 'border-blue-300 bg-blue-50' : ''}`}>
                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-gray-600">Nombre:</label>
                                <input
                                  type="text"
                                  value={newPosition.name}
                                  onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">Descripción:</label>
                                <input
                                  type="text"
                                  value={newPosition.description}
                                  onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-gray-600">Sal. Mín:</label>
                                  <input
                                    type="number"
                                    value={newPosition.minSalary}
                                    onChange={(e) => setNewPosition({ ...newPosition, minSalary: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600">Sal. Máx:</label>
                                  <input
                                    type="number"
                                    value={newPosition.maxSalary}
                                    onChange={(e) => setNewPosition({ ...newPosition, maxSalary: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => updatePosition(pos.id)}>
                                  <Save className="h-3 w-3 mr-1" />
                                  Guardar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                  <X className="h-3 w-3 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">{pos.name}</span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {empCount}
                                </Badge>
                              </div>
                              {pos.description && (
                                <p className="text-sm text-gray-600 mb-2">{pos.description}</p>
                              )}
                              {(pos.minSalary > 0 || pos.maxSalary > 0) && (
                                <div className="text-sm text-gray-500 mb-2">
                                  Salario: {pos.minSalary > 0 ? formatCurrency(pos.minSalary) : '?'} - {pos.maxSalary > 0 ? formatCurrency(pos.maxSalary) : '?'}
                                </div>
                              )}
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="outline" onClick={() => startEdit(pos)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => removePosition(pos.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
