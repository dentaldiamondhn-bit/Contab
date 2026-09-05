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
  X
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
  manager: string;
  createdAt: string;
}

export default function DepartmentsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDept, setNewDept] = useState({ name: '', description: '', manager: '' });

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = () => {
    const key = `departments_${companyId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setDepartments(JSON.parse(saved));
    } else {
      // Default departments
      const defaults: Department[] = [
        { id: 'dept-1', name: 'Administración', description: 'Gestión general y administrativa', manager: '', createdAt: new Date().toISOString() },
        { id: 'dept-2', name: 'Contabilidad', description: 'Contabilidad y finanzas', manager: '', createdAt: new Date().toISOString() },
        { id: 'dept-3', name: 'Recursos Humanos', description: 'Gestión de personal', manager: '', createdAt: new Date().toISOString() },
        { id: 'dept-4', name: 'Ventas', description: 'Ventas y atención al cliente', manager: '', createdAt: new Date().toISOString() },
        { id: 'dept-5', name: 'Operaciones', description: 'Operaciones del negocio', manager: '', createdAt: new Date().toISOString() }
      ];
      localStorage.setItem(key, JSON.stringify(defaults));
      setDepartments(defaults);
    }
  };

  const saveDepartments = (data: Department[]) => {
    localStorage.setItem(`departments_${companyId}`, JSON.stringify(data));
    setDepartments(data);
  };

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
    saveDepartments(departments.map(d => 
      d.id === id ? { ...d, ...newDept } : d
    ));
    setEditingId(null);
    setNewDept({ name: '', description: '', manager: '' });
  };

  const removeDepartment = (id: string) => {
    if (confirm('¿Eliminar este departamento?')) {
      saveDepartments(departments.filter(d => d.id !== id));
    }
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setNewDept({ name: dept.name, description: dept.description, manager: dept.manager });
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Departamentos</h1>
          <p className="text-gray-500">{departments.length} departamentos registrados</p>
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
                  placeholder="Breve descripción del departamento"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gerente / Encargado</label>
                <input
                  type="text"
                  value={newDept.manager}
                  onChange={(e) => setNewDept({ ...newDept, manager: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Nombre del encargado"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addDepartment}>
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

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const empCount = getEmployeeCount(dept.name);
          const isEditing = editingId === dept.id;
          
          return (
            <Card key={dept.id} className={`${isEditing ? 'border-2 border-blue-300' : ''}`}>
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={newDept.name}
                        onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                        className="px-2 py-1 border rounded font-medium"
                      />
                    ) : (
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                    )}
                  </div>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    <Users className="h-3 w-3 mr-1" />
                    {empCount}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-sm text-gray-600">Descripción:</label>
                      <input
                        type="text"
                        value={newDept.description}
                        onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                        className="w-full mt-1 px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Gerente:</label>
                      <input
                        type="text"
                        value={newDept.manager}
                        onChange={(e) => setNewDept({ ...newDept, manager: e.target.value })}
                        className="w-full mt-1 px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateDepartment(dept.id)}>
                        <Save className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">{dept.description || 'Sin descripción'}</p>
                    {dept.manager && (
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Encargado:</span> {dept.manager}
                      </p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs text-gray-400">
                        {empCount} empleado{empCount !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => startEdit(dept)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeDepartment(dept.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
