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
  ChevronRight,
  Network
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
  manager: string;
  createdAt: string;
  parentId?: string;
}

interface Position {
  id: string;
  name: string;
  department: string;
  description: string;
  minSalary: number;
  maxSalary: number;
  parentId?: string;
}

export default function DepartmentsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activeEmployees, setActiveEmployees] = useState<{ id: string; name: string; position: string; department: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [showAddPosition, setShowAddPosition] = useState<string | null>(null);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [newDept, setNewDept] = useState({ name: '', description: '', manager: '', parentId: '' });
  const [newPosition, setNewPosition] = useState({ name: '', description: '', minSalary: 0, maxSalary: 0, parentId: '' });

  useEffect(() => {
    loadData();
    fetchEmployees();
  }, [companyId]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees`);
      if (res.ok) {
        const data = await res.json();
        setActiveEmployees(
          data
            .filter((e: any) => e.status === 'active')
            .map((e: any) => ({
              id: e.id,
              name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
              position: e.position || '',
              department: e.department || '',
            }))
        );
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const loadData = async () => {
    try {
      const [deptRes, posRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/hr/departments`),
        fetch(`/api/companies/${companyId}/hr/positions`)
      ]);
      if (deptRes.ok) {
        const depts = await deptRes.json();
        setDepartments(depts.map((d: any) => ({ id: d.id, name: d.name, description: d.description, manager: d.manager, createdAt: d.created_at, parentId: d.parent_id })));
      }
      if (posRes.ok) {
        const pos = await posRes.json();
        setPositions(pos.map((p: any) => ({ id: p.id, name: p.name, department: p.department, description: p.description, minSalary: p.min_salary, maxSalary: p.max_salary, parentId: p.parent_id })));
      }
    } catch (err) {
      console.error('Error loading departments/positions:', err);
    }
  };

  const saveDepartments = async (data: Department[]) => {
    setDepartments(data);
  };

  const savePositions = async (data: Position[]) => {
    setPositions(data);
  };

  // Department CRUD
  const addDepartment = async () => {
    const res = await fetch(`/api/companies/${companyId}/hr/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDept.name, description: newDept.description, manager: newDept.manager, parentId: newDept.parentId || null })
    });
    if (res.ok) {
      const dept = await res.json();
      setDepartments([...departments, { id: dept.id, name: dept.name, description: dept.description, manager: dept.manager, createdAt: dept.created_at, parentId: dept.parent_id }]);
    }
    setNewDept({ name: '', description: '', manager: '', parentId: '' });
    setShowAdd(false);
  };

  const updateDepartment = async (id: string) => {
    const res = await fetch(`/api/companies/${companyId}/hr/departments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newDept.name, description: newDept.description, manager: newDept.manager, parentId: newDept.parentId || null })
    });
    if (res.ok) {
      setDepartments(departments.map(d => d.id === id ? { ...d, ...newDept } : d));
    }
    setEditingId(null);
    setNewDept({ name: '', description: '', manager: '', parentId: '' });
  };

  const removeDepartment = async (id: string) => {
    if (confirm('¿Eliminar este departamento? Se eliminarán sus puestos también.')) {
      const dept = departments.find(d => d.id === id);
      if (dept) {
        const toDelete = positions.filter(p => p.department === dept.name);
        for (const pos of toDelete) {
          await fetch(`/api/companies/${companyId}/hr/positions?id=${pos.id}`, { method: 'DELETE' });
        }
        savePositions(positions.filter(p => p.department !== dept.name));
      }
      await fetch(`/api/companies/${companyId}/hr/departments?id=${id}`, { method: 'DELETE' });
      setDepartments(departments.filter(d => d.id !== id));
    }
  };

  // Department hierarchy helpers
  const getRootDepartments = () => {
    return departments.filter(d => !d.parentId || !departments.some(dd => dd.id === d.parentId));
  };

  const getChildDepartments = (parentId: string) => {
    return departments.filter(d => d.parentId === parentId);
  };

  const getParentDeptName = (parentId?: string) => {
    if (!parentId) return null;
    const parent = departments.find(d => d.id === parentId);
    return parent ? parent.name : null;
  };

  const getAllDescendantIds = (deptId: string): string[] => {
    const children = departments.filter(d => d.parentId === deptId);
    return [deptId, ...children.flatMap(c => getAllDescendantIds(c.id))];
  };

  // Position CRUD
  const addPosition = async (department: string) => {
    const res = await fetch(`/api/companies/${companyId}/hr/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPosition.name, department, description: newPosition.description, minSalary: newPosition.minSalary, maxSalary: newPosition.maxSalary, parentId: newPosition.parentId || null })
    });
    if (res.ok) {
      const pos = await res.json();
      setPositions([...positions, { id: pos.id, name: pos.name, department: pos.department, description: pos.description, minSalary: pos.min_salary, maxSalary: pos.max_salary, parentId: pos.parent_id }]);
    }
    setNewPosition({ name: '', description: '', minSalary: 0, maxSalary: 0, parentId: '' });
    setShowAddPosition(null);
  };

  const updatePosition = async (id: string) => {
    const res = await fetch(`/api/companies/${companyId}/hr/positions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newPosition.name, department: newPosition.department || '', description: newPosition.description, minSalary: newPosition.minSalary, maxSalary: newPosition.maxSalary, parentId: newPosition.parentId || null })
    });
    if (res.ok) {
      setPositions(positions.map(p => p.id === id ? { ...p, ...newPosition } : p));
    }
    setEditingPositionId(null);
    setNewPosition({ name: '', description: '', minSalary: 0, maxSalary: 0, parentId: '' });
  };

  const removePosition = async (id: string) => {
    if (confirm('¿Eliminar este puesto?')) {
      await fetch(`/api/companies/${companyId}/hr/positions?id=${id}`, { method: 'DELETE' });
      savePositions(positions.filter(p => p.id !== id));
    }
  };

  const getEmployeeCount = (deptName: string) => {
    return activeEmployees.filter(e => e.department === deptName).length;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getParentName = (parentId?: string) => {
    if (!parentId) return null;
    const parent = positions.find(p => p.id === parentId);
    return parent ? parent.name : null;
  };

  const getRootPositions = (deptName: string) => {
    return positions.filter(p => p.department === deptName && (!p.parentId || !positions.some(pp => pp.id === p.parentId)));
  };

  const getChildPositions = (parentId: string) => {
    return positions.filter(p => p.parentId === parentId);
  };

  const getPositionHolder = (posName: string, deptName: string) => {
    return activeEmployees.find(e => e.position === posName && e.department === deptName);
  };

  const renderPositionTree = (pos: Position, depth: number = 0) => {
    const children = getChildPositions(pos.id);
    const parentName = getParentName(pos.parentId);
    const isEditing = editingPositionId === pos.id;

    return (
      <div key={pos.id} style={{ marginLeft: depth * 20 }}>
        <div className="p-2 border rounded flex justify-between items-center mb-1" style={{ borderLeftColor: depth === 0 ? '#6366f1' : '#c4b5fd', borderLeftWidth: depth === 0 ? 3 : 1 }}>
          {isEditing ? (
            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={newPosition.name}
                onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
              <select
                value={newPosition.parentId}
                onChange={(e) => setNewPosition({ ...newPosition, parentId: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="">Sin jefe (puesto raíz)</option>
                {positions
                  .filter(p => p.id !== pos.id && p.department === pos.department)
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
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
                {(() => {
                  const holder = getPositionHolder(pos.name, pos.department);
                  return holder ? (
                    <div className="text-xs text-green-600 font-medium">Ocupado por: {holder.name}</div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">Sin asignar</div>
                  );
                })()}
                {parentName && (
                  <div className="text-xs text-blue-600">Reporta a: {parentName}</div>
                )}
                {(pos.minSalary > 0 || pos.maxSalary > 0) && (
                  <div className="text-xs text-gray-500">
                    {pos.minSalary > 0 ? formatCurrency(pos.minSalary) : '?'} - {pos.maxSalary > 0 ? formatCurrency(pos.maxSalary) : '?'}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditingPositionId(pos.id); setNewPosition({ name: pos.name, description: pos.description, minSalary: pos.minSalary, maxSalary: pos.maxSalary, parentId: pos.parentId || '' }); }}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removePosition(pos.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>
        {children.map(child => renderPositionTree(child, depth + 1))}
      </div>
    );
  };

  const renderDeptTree = (dept: Department, depth: number) => {
    const deptPositions = positions.filter(p => p.department === dept.name);
    const empCount = getEmployeeCount(dept.name);
    const isExpanded = expandedDept === dept.id;
    const isEditingDept = editingId === dept.id;
    const children = getChildDepartments(dept.id);
    const parentName = getParentDeptName(dept.parentId);

    return (
      <div key={dept.id} style={{ marginLeft: depth * 24 }}>
        <Card className={depth > 0 ? 'border-l-4 border-l-blue-400' : ''}>
          <CardHeader className={`${depth > 0 ? 'bg-blue-50/50' : 'bg-gray-50'} border-b cursor-pointer`} onClick={() => setExpandedDept(isExpanded ? null : dept.id)}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {children.length > 0 ? (isExpanded ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-500" />) : <div className="w-5" />}
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
                  <div>
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                    {parentName && <div className="text-xs text-blue-600">Dentro de: {parentName}</div>}
                  </div>
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
                {children.length > 0 && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {children.length} subdeptos
                  </Badge>
                )}
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
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(dept.id); setNewDept({ name: dept.name, description: dept.description, manager: dept.manager, parentId: dept.parentId || '' }); }}>
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
              <div className="space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newDept.description}
                    onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                    placeholder="Descripción"
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <select
                    value={newDept.manager}
                    onChange={(e) => setNewDept({ ...newDept, manager: e.target.value })}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <select
                  value={newDept.parentId}
                  onChange={(e) => setNewDept({ ...newDept, parentId: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="">Sin departamento padre (raíz)</option>
                  {departments.filter(d => d.id !== dept.id).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
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

                {showAddPosition === dept.id && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                      <input type="text" value={newPosition.name} onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })} placeholder="Nombre del puesto" className="px-2 py-1 border rounded text-sm" />
                      <input type="text" value={newPosition.description} onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })} placeholder="Descripción" className="px-2 py-1 border rounded text-sm" />
                      <input type="number" value={newPosition.minSalary || ''} onChange={(e) => setNewPosition({ ...newPosition, minSalary: parseFloat(e.target.value) || 0 })} placeholder="Sal. Mínimo" className="px-2 py-1 border rounded text-sm" />
                      <input type="number" value={newPosition.maxSalary || ''} onChange={(e) => setNewPosition({ ...newPosition, maxSalary: parseFloat(e.target.value) || 0 })} placeholder="Sal. Máximo" className="px-2 py-1 border rounded text-sm" />
                    </div>
                    <div className="mb-2">
                      <select value={newPosition.parentId} onChange={(e) => setNewPosition({ ...newPosition, parentId: e.target.value })} className="w-full px-2 py-1 border rounded text-sm">
                        <option value="">Sin jefe (puesto raíz)</option>
                        {deptPositions.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                      </select>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => addPosition(dept.name)}><Save className="h-3 w-3 mr-1" /> Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddPosition(null); setNewPosition({ name: '', description: '', minSalary: 0, maxSalary: 0, parentId: '' }); }}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                    </div>
                  </div>
                )}

                {deptPositions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">No hay puestos en este departamento</p>
                ) : (
                  <div className="space-y-1">
                    {getRootPositions(dept.name).map(pos => renderPositionTree(pos, 0))}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
        {children.map(child => renderDeptTree(child, depth + 1))}
      </div>
    );
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
                <select
                  value={newDept.manager}
                  onChange={(e) => setNewDept({ ...newDept, manager: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar empleado...</option>
                  {activeEmployees.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Departamento padre (opcional)</label>
              <select
                value={newDept.parentId}
                onChange={(e) => setNewDept({ ...newDept, parentId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              >
                <option value="">Sin departamento padre (raíz)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Si se selecciona, este departamento será una subdivisión del departamento padre</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={addDepartment}><Save className="h-4 w-4 mr-2" /> Guardar</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departments List */}
      <div className="space-y-4">
      {getRootDepartments().map(dept => renderDeptTree(dept, 0))}
      </div>
    </div>
  );
}
