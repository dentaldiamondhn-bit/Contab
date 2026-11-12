'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Users,
  Building2,
  Briefcase,
  Check,
  X
} from 'lucide-react';

interface Position {
  id: string;
  name: string;
  department: string;
  description: string;
  minSalary: number;
  maxSalary: number;
  parentId?: string;
}

interface Employee {
  id: string;
  position: string;
  department: string;
  firstName: string;
  lastName: string;
  status: string;
}

export default function HierarchyPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [editingParent, setEditingParent] = useState<string | null>(null);
  const [selectedParent, setSelectedParent] = useState<string>('');

  useEffect(() => {
    const loadPositions = async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}/hr/positions`);
        if (res.ok) {
          const data = await res.json();
          setPositions(data.map((p: any) => ({
            id: p.id,
            name: p.name,
            department: p.department,
            description: p.description,
            minSalary: p.min_salary,
            maxSalary: p.max_salary,
            parentId: p.parent_id || '',
          })));
        }
      } catch (err) {
        console.error('Error loading positions:', err);
      }
    };
    loadPositions();
    loadEmployees();
  }, [companyId]);

  const loadEmployees = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.map((e: any) => ({
          id: e.id,
          position: e.position || '',
          department: e.department || '',
          firstName: e.firstName || '',
          lastName: e.lastName || '',
          status: e.status || 'active',
        })));
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const savePositions = async (data: Position[]) => {
    try {
      // Save each position's parentId change to the API
      for (const pos of data) {
        await fetch(`/api/companies/${companyId}/hr/positions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pos.id,
            name: pos.name,
            department: pos.department,
            description: pos.description,
            minSalary: pos.minSalary,
            maxSalary: pos.maxSalary,
            parentId: pos.parentId || null,
          })
        });
      }
      setPositions(data);
    } catch (err) {
      console.error('Error saving positions:', err);
    }
  };

  const getEmployeeCountForPosition = (posName: string) => {
    return employees.filter(e => e.position === posName && e.status === 'active').length;
  };

  const setParentPosition = (childId: string, parentId: string) => {
    if (childId === parentId) return;
    const updated = positions.map(p => {
      if (p.id === childId) return { ...p, parentId };
      return p;
    });
    savePositions(updated);
    setEditingParent(null);
    setSelectedParent('');
  };

  const removeParentPosition = (childId: string) => {
    const updated = positions.map(p => {
      if (p.id === childId) return { ...p, parentId: '' };
      return p;
    });
    savePositions(updated);
    setEditingParent(null);
    setSelectedParent('');
  };

  const getDeptPositions = (deptName: string) => {
    return positions.filter(p => p.department === deptName && (!p.parentId || !positions.some(pp => pp.id === p.parentId)));
  };

  const getChildPositions = (parentId: string) => {
    return positions.filter(p => p.parentId === parentId);
  };

  const getPositionPath = (pos: Position): string[] => {
    if (!pos.parentId) return [pos.name];
    const parent = positions.find(p => p.id === pos.parentId);
    if (!parent) return [pos.name];
    return [...getPositionPath(parent), pos.name];
  };

  const renderPositionNode = (pos: Position, depth: number = 0) => {
    const children = getChildPositions(pos.id);
    const empCount = getEmployeeCountForPosition(pos.name);
    const isEditing = editingParent === pos.id;
    const parentPos = pos.parentId ? positions.find(p => p.id === pos.parentId) : null;

    return (
      <div key={pos.id} style={{ marginLeft: depth * 24 }}>
        <div className={`flex items-center justify-between p-3 rounded-lg border mb-2 ${depth === 0 ? 'bg-white' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-3">
            {children.length > 0 ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <div className="w-4" />
            )}
            <Briefcase className="h-5 w-5 text-purple-600" />
            <div>
              <div className="font-medium">{pos.name}</div>
              {pos.description && (
                <div className="text-xs text-gray-500">{pos.description}</div>
              )}
              {parentPos && (
                <div className="text-xs text-blue-600 mt-0.5">
                  Reporta a: {parentPos.name}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-purple-100 text-purple-800">
              {empCount} empleados
            </Badge>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <select
                  value={selectedParent}
                  onChange={(e) => setSelectedParent(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="">Sin jefe (raíz)</option>
                  {positions
                    .filter(p => p.id !== pos.id && p.department === pos.department)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <Button size="sm" variant="ghost" onClick={() => setParentPosition(pos.id, selectedParent)}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingParent(null); setSelectedParent(''); }}>
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setEditingParent(pos.id); setSelectedParent(pos.parentId || ''); }}
                >
                  Jerarquía
                </Button>
                {pos.parentId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeParentPosition(pos.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        {children.map(child => renderPositionNode(child, depth + 1))}
      </div>
    );
  };

  const departments = [...new Set(positions.map(p => p.department))];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Jerarquía de Puestos</h1>
          <p className="text-gray-500">{positions.length} puestos definidos • {departments.length} departamentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr/departments`)}>
            <Building2 className="h-4 w-4 mr-2" />
            Gestionar Puestos
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-800">
            <strong>¿Cómo funciona?</strong> Usa el botón "Jerarquía" para asignar el puesto superior al que reporta cada puesto.
            Los puestos sin jefe se muestran como raíces del organigrama.
          </p>
        </CardContent>
      </Card>

      {positions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No hay puestos definidos</p>
            <p className="text-sm mt-1">Crea puestos en la sección de Departamentos y Puestos</p>
            <Button className="mt-4" onClick={() => router.push(`/companies/${companyId}/hr/departments`)}>
              <Building2 className="h-4 w-4 mr-2" />
              Ir a Departamentos
            </Button>
          </CardContent>
        </Card>
      ) : (
        departments.map(dept => {
          const isExpanded = expandedDepts.has(dept);
          const rootPositions = getDeptPositions(dept);
          const deptEmpCount = employees.filter(e => e.department === dept && e.status === 'active').length;

          return (
            <Card key={dept}>
              <CardHeader
                className="bg-gray-50 border-b cursor-pointer"
                onClick={() => {
                  const next = new Set(expandedDepts);
                  if (next.has(dept)) next.delete(dept);
                  else next.add(dept);
                  setExpandedDepts(next);
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-500" />}
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{dept}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      <Users className="h-3 w-3 mr-1" />
                      {deptEmpCount} empleados
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-800">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {rootPositions.length} puestos raíz
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-4 space-y-2">
                  {rootPositions.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No hay puestos raíz en este departamento
                    </p>
                  ) : (
                    rootPositions.map(pos => renderPositionNode(pos, 0))
                  )}
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {/* Full Tree View */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Vista Completa del Árbol
            </CardTitle>
          </CardHeader>
          <CardContent>
            {positions.filter(p => !p.parentId || !positions.some(pp => pp.id === p.parentId)).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Todos los puestos tienen un superior asignado
              </p>
            ) : (
              positions
                .filter(p => !p.parentId || !positions.some(pp => pp.id === p.parentId))
                .map(pos => renderPositionNode(pos, 0))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
