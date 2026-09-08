'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Users,
  UserCheck,
  Building2,
  Network,
  Search,
  X,
  Check,
  Briefcase,
  Mail,
  Phone,
  Upload,
  Camera,
  FileSpreadsheet,
  Download
} from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  salary: number;
  status: string;
  photo: string;
  email: string;
  phone: string;
  reportsTo: string | null;
}

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
  depth: number;
}

export default function OrgChartPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingManager, setEditingManager] = useState<string | null>(null);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [view, setView] = useState<'tree' | 'list'>('tree');
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [showImportCSV, setShowImportCSV] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{success: number; errors: string[]} | null>(null);

  useEffect(() => {
    loadEmployees();
  }, [companyId]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.filter((e: any) => e.status === 'active').map((e: any) => ({
          id: e.id,
          firstName: e.firstName || '',
          lastName: e.lastName || '',
          position: e.position || '',
          department: e.department || '',
          salary: e.salary || 0,
          status: e.status || 'active',
          photo: e.photo || '',
          email: e.email || '',
          phone: e.phone || '',
          reportsTo: e.reportsTo || null,
        })));
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => {
    return [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = !search ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        e.position.toLowerCase().includes(search.toLowerCase()) ||
        e.department.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !selectedDept || e.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [employees, search, selectedDept]);

  const buildTree = useMemo(() => {
    const empMap = new Map<string, Employee>();
    filteredEmployees.forEach(e => empMap.set(e.id, e));

    const roots: TreeNode[] = [];
    const childSet = new Set<string>();

    filteredEmployees.forEach(e => {
      if (e.reportsTo && empMap.has(e.reportsTo)) {
        childSet.add(e.id);
      }
    });

    filteredEmployees.forEach(e => {
      if (!e.reportsTo || !empMap.has(e.reportsTo)) {
        roots.push({ employee: e, children: [], depth: 0 });
      }
    });

    const buildChildren = (node: TreeNode) => {
      const children = filteredEmployees
        .filter(e => e.reportsTo === node.employee.id)
        .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
      
      node.children = children.map(c => ({
        employee: c,
        children: [],
        depth: node.depth + 1,
      }));

      node.children.forEach(buildChildren);
    };

    roots.forEach(buildChildren);

    roots.sort((a, b) => {
      const nameA = `${a.employee.lastName} ${a.employee.firstName}`;
      const nameB = `${b.employee.lastName} ${b.employee.firstName}`;
      return nameA.localeCompare(nameB);
    });

    return roots;
  }, [filteredEmployees]);

  const totalCount = useMemo(() => {
    let count = 0;
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        count++;
        traverse(n.children);
      });
    };
    traverse(buildTree);
    return count;
  }, [buildTree]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        if (n.children.length > 0) allIds.add(n.employee.id);
        traverse(n.children);
      });
    };
    traverse(buildTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => setExpandedNodes(new Set());

  const setManager = async (employeeId: string, managerId: string) => {
    try {
      const emp = employees.find(e => e.id === employeeId);
      if (!emp) return;

      const res = await fetch(`/api/companies/${companyId}/employees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          identityNumber: '',
          position: emp.position,
          department: emp.department,
          salary: emp.salary,
          startDate: '',
          status: emp.status,
          phone: emp.phone,
          email: emp.email,
          address: '',
          civilStatus: '',
          contractType: 'indefinido',
          supervisor: '',
          reportsTo: managerId || null,
          schedule: 'completa',
          modality: 'presencial',
          educationLevel: '',
          university: '',
          degree: '',
          languages: '',
          certifications: '',
          otherSkills: '',
          photo: emp.photo,
          cv: '',
          hrDocuments: [],
        })
      });

      if (res.ok) {
        setEmployees(prev => prev.map(e =>
          e.id === employeeId ? { ...e, reportsTo: managerId || null } : e
        ));
      }
    } catch (err) {
      console.error('Error setting manager:', err);
    }
    setEditingManager(null);
    setSelectedManager('');
  };

  const removeManager = (employeeId: string) => {
    setManager(employeeId, '');
  };

  const getManagerName = (reportsTo: string | null) => {
    if (!reportsTo) return null;
    const mgr = employees.find(e => e.id === reportsTo);
    return mgr ? `${mgr.firstName} ${mgr.lastName}` : null;
  };

  const getSubordinateCount = (employeeId: string) => {
    let count = 0;
    const countChildren = (id: string) => {
      const children = employees.filter(e => e.reportsTo === id);
      count += children.length;
      children.forEach(c => countChildren(c.id));
    };
    countChildren(employeeId);
    return count;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  };

  const uploadPhoto = async (employeeId: string, file: File) => {
    try {
      setUploadingPhoto(employeeId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `${companyId}/photos`);
      formData.append('bucket', 'employee-photos');

      const res = await fetch(`/api/companies/${companyId}/hr/storage`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        const emp = employees.find(e => e.id === employeeId);
        if (emp) {
          await fetch(`/api/companies/${companyId}/employees`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: employeeId,
              firstName: emp.firstName,
              lastName: emp.lastName,
              identityNumber: '',
              position: emp.position,
              department: emp.department,
              salary: emp.salary,
              startDate: '',
              status: emp.status,
              phone: emp.phone,
              email: emp.email,
              address: '',
              civilStatus: '',
              contractType: 'indefinido',
              supervisor: '',
              reportsTo: emp.reportsTo,
              schedule: 'completa',
              modality: 'presencial',
              educationLevel: '',
              university: '',
              degree: '',
              languages: '',
              certifications: '',
              otherSkills: '',
              photo: url,
              cv: '',
              hrDocuments: [],
            })
          });
          setEmployees(prev => prev.map(e =>
            e.id === employeeId ? { ...e, photo: url } : e
          ));
        }
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handlePhotoClick = (employeeId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('La imagen no debe superar 5MB');
          return;
        }
        uploadPhoto(employeeId, file);
      }
    };
    input.click();
  };

  const importHierarchyCSV = async () => {
    if (!csvData.trim()) return;
    setImporting(true);
    setImportResult(null);

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const empNameIdx = headers.findIndex(h => h.includes('empleado') || h.includes('employee') || h.includes('nombre'));
      const mgrNameIdx = headers.findIndex(h => h.includes('jefe') || h.includes('manager') || h.includes('supervisor') || h.includes('reporta'));
      
      if (empNameIdx === -1 || mgrNameIdx === -1) {
        setImportResult({ success: 0, errors: ['CSV debe tener columnas: empleado, jefe (o employee, manager)'] });
        return;
      }

      let success = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const empName = cols[empNameIdx]?.toLowerCase();
        const mgrName = cols[mgrNameIdx]?.toLowerCase();

        if (!empName) continue;

        const emp = employees.find(e =>
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(empName)
        );

        if (!emp) {
          errors.push(`Línea ${i + 1}: Empleado "${cols[empNameIdx]}" no encontrado`);
          continue;
        }

        let mgrId: string | null = null;
        if (mgrName && mgrName !== '' && mgrName !== 'null' && mgrName !== 'ninguno') {
          const mgr = employees.find(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(mgrName)
          );
          if (!mgr) {
            errors.push(`Línea ${i + 1}: Jefe "${cols[mgrNameIdx]}" no encontrado`);
            continue;
          }
          if (mgr.id === emp.id) {
            errors.push(`Línea ${i + 1}: "${cols[empNameIdx]}" no puede reportarse a sí mismo`);
            continue;
          }
          mgrId = mgr.id;
        }

        try {
          const res = await fetch(`/api/companies/${companyId}/employees`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              identityNumber: '',
              position: emp.position,
              department: emp.department,
              salary: emp.salary,
              startDate: '',
              status: emp.status,
              phone: emp.phone,
              email: emp.email,
              address: '',
              civilStatus: '',
              contractType: 'indefinido',
              supervisor: '',
              reportsTo: mgrId,
              schedule: 'completa',
              modality: 'presencial',
              educationLevel: '',
              university: '',
              degree: '',
              languages: '',
              certifications: '',
              otherSkills: '',
              photo: emp.photo,
              cv: '',
              hrDocuments: [],
            })
          });
          if (res.ok) success++;
          else errors.push(`Línea ${i + 1}: Error al guardar`);
        } catch {
          errors.push(`Línea ${i + 1}: Error de conexión`);
        }
      }

      setImportResult({ success, errors });
      if (success > 0) await loadEmployees();
    } catch (err) {
      setImportResult({ success: 0, errors: ['Error al procesar CSV'] });
    } finally {
      setImporting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const csv = 'empleado,jefe\nJuan Pérez,María García\nCarlos López,Juan Pérez\nAna Martínez,María García';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_jerarquia.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (depth: number) => {
    const colors = [
      'border-l-blue-500 bg-blue-50',
      'border-l-green-500 bg-green-50',
      'border-l-purple-500 bg-purple-50',
      'border-l-orange-500 bg-orange-50',
      'border-l-cyan-500 bg-cyan-50',
    ];
    return colors[depth % colors.length];
  };

  const getLevelBadge = (depth: number) => {
    if (depth === 0) return <Badge className="bg-blue-600 text-white text-xs">Gerente</Badge>;
    if (depth === 1) return <Badge className="bg-green-600 text-white text-xs">Supervisor</Badge>;
    return <Badge className="bg-gray-500 text-white text-xs">Empleado</Badge>;
  };

  const renderTreeNode = (node: TreeNode) => {
    const isExpanded = expandedNodes.has(node.employee.id);
    const hasChildren = node.children.length > 0;
    const isEditing = editingManager === node.employee.id;
    const mgrName = getManagerName(node.employee.reportsTo);
    const subCount = getSubordinateCount(node.employee.id);

    return (
      <div key={node.employee.id} className={`${node.depth > 0 ? 'ml-6' : ''}`}>
        <div className={`border-l-4 ${getLevelColor(node.depth)} rounded-r-lg p-3 mb-2 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button onClick={() => toggleExpand(node.employee.id)} className="p-0.5 hover:bg-gray-200 rounded">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
              </button>
            ) : (
              <div className="w-5" />
            )}
            
            {node.employee.photo ? (
              <div className="relative group">
                <img src={node.employee.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
                <button
                  onClick={() => handlePhotoClick(node.employee.id)}
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  title="Cambiar foto"
                >
                  <Camera className="h-4 w-4 text-white" />
                </button>
                {uploadingPhoto === node.employee.id && (
                  <div className="absolute inset-0 bg-blue-500/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => handlePhotoClick(node.employee.id)}
                className="relative group w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow hover:from-blue-500 hover:to-blue-700 transition-all"
                title="Subir foto"
              >
                {uploadingPhoto === node.employee.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    {getInitials(node.employee.firstName, node.employee.lastName)}
                    <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="h-2.5 w-2.5 text-blue-600" />
                    </div>
                  </>
                )}
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{node.employee.firstName} {node.employee.lastName}</span>
                {getLevelBadge(node.depth)}
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Briefcase className="h-3 w-3" />
                {node.employee.position || 'Sin puesto'}
                {node.employee.department && (
                  <>
                    <span className="text-gray-300">•</span>
                    <Building2 className="h-3 w-3" />
                    {node.employee.department}
                  </>
                )}
              </div>
              {mgrName && (
                <div className="text-xs text-blue-600 mt-0.5">
                  Reporta a: {mgrName}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {subCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {subCount} subordinados
              </Badge>
            )}
            
            {node.employee.email && (
              <a href={`mailto:${node.employee.email}`} className="p-1 hover:bg-gray-100 rounded" title={node.employee.email}>
                <Mail className="h-4 w-4 text-gray-400" />
              </a>
            )}
            
            {isEditing ? (
              <div className="flex items-center gap-1">
                <select
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="text-sm border rounded px-2 py-1 max-w-[200px]"
                >
                  <option value="">Sin jefe (raíz)</option>
                  {employees
                    .filter(e => e.id !== node.employee.id && !isDescendant(node.employee.id, e.id))
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} — {e.position || 'Sin puesto'}
                      </option>
                    ))}
                </select>
                <Button size="sm" variant="ghost" onClick={() => setManager(node.employee.id, selectedManager)}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingManager(null); setSelectedManager(''); }}>
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setEditingManager(node.employee.id); setSelectedManager(node.employee.reportsTo || ''); }}
                >
                  {node.employee.reportsTo ? 'Cambiar Jefe' : 'Asignar Jefe'}
                </Button>
                {node.employee.reportsTo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeManager(node.employee.id)}
                    title="Remover jefe directo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="border-l-2 border-dashed border-gray-200 ml-2">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const isDescendant = (ancestorId: string, descendantId: string): boolean => {
    const emp = employees.find(e => e.id === descendantId);
    if (!emp || !emp.reportsTo) return false;
    if (emp.reportsTo === ancestorId) return true;
    return isDescendant(ancestorId, emp.reportsTo);
  };

  const renderListView = () => {
    const grouped = new Map<string, Employee[]>();
    filteredEmployees.forEach(e => {
      const key = e.department || 'Sin departamento';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e);
    });

    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([dept, emps]) => (
      <Card key={dept}>
        <CardHeader className="bg-gray-50 border-b py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            {dept}
            <Badge className="bg-blue-100 text-blue-800">{emps.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-2">Empleado</th>
                <th className="px-4 py-2">Puesto</th>
                <th className="px-4 py-2">Jefe Directo</th>
                <th className="px-4 py-2">Subordinados</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {emps.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)).map(emp => {
                const mgrName = getManagerName(emp.reportsTo);
                const subCount = getSubordinateCount(emp.id);
                const isEditing = editingManager === emp.id;

                return (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {emp.photo ? (
                          <div className="relative group">
                            <img src={emp.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <button
                              onClick={() => handlePhotoClick(emp.id)}
                              className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                              title="Cambiar foto"
                            >
                              <Camera className="h-3 w-3 text-white" />
                            </button>
                            {uploadingPhoto === emp.id && (
                              <div className="absolute inset-0 bg-blue-500/50 rounded-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePhotoClick(emp.id)}
                            className="relative group w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold hover:from-blue-500 hover:to-blue-700 transition-all"
                            title="Subir foto"
                          >
                            {uploadingPhoto === emp.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                            ) : (
                              <>
                                {getInitials(emp.firstName, emp.lastName)}
                                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Upload className="h-2 w-2 text-blue-600" />
                                </div>
                              </>
                            )}
                          </button>
                        )}
                        <div>
                          <div className="font-medium text-sm">{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-gray-400">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{emp.position || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={selectedManager}
                            onChange={(e) => setSelectedManager(e.target.value)}
                            className="text-xs border rounded px-2 py-1 max-w-[180px]"
                          >
                            <option value="">Sin jefe</option>
                            {employees
                              .filter(e => e.id !== emp.id && !isDescendant(emp.id, e.id))
                              .map(e => (
                                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                              ))}
                          </select>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setManager(emp.id, selectedManager)}>
                            <Check className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingManager(null)}>
                            <X className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-blue-600">{mgrName || <span className="text-gray-400">—</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {subCount > 0 ? (
                        <Badge variant="outline">{subCount}</Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => { setEditingManager(emp.id); setSelectedManager(emp.reportsTo || ''); }}
                        >
                          {emp.reportsTo ? 'Cambiar' : 'Asignar'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    ));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando organigrama...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8 text-blue-600" />
            Organigrama de Empleados
          </h1>
          <p className="text-gray-500">
            {totalCount} empleados activos • {buildTree.filter(n => !n.employee.reportsTo).length} raíces
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-800">
            <strong>¿Cómo funciona?</strong> Define quién reporta a quién usando el botón "Asignar Jefe" o "Cambiar Jefe".
            Los empleados sin jefe directo se muestran como raíces del organigrama. Puede usar la vista de árbol o lista.
          </p>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, puesto o departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos los departamentos</option>
          {departments.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setView('tree')}
            className={`px-3 py-2 text-sm ${view === 'tree' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            <Network className="h-4 w-4 mr-1 inline" />
            Árbol
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            <Users className="h-4 w-4 mr-1 inline" />
            Lista
          </button>
        </div>

        {view === 'tree' && (
          <>
            <Button variant="outline" size="sm" onClick={expandAll}>Expandir Todo</Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>Colapsar Todo</Button>
          </>
        )}

        <Button variant="outline" size="sm" onClick={() => setShowImportCSV(true)}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Importar CSV
        </Button>
      </div>

      {/* Content */}
      {view === 'tree' ? (
        <Card>
          <CardContent className="pt-4">
            {buildTree.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-500">No hay empleados para mostrar</p>
                <p className="text-sm text-gray-400 mt-1">
                  {employees.length === 0
                    ? 'Agrega empleados primero'
                    : 'No se encontraron empleados con los filtros aplicados'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {buildTree.map(node => renderTreeNode(node))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {renderListView()}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {buildTree.filter(n => !n.employee.reportsTo).length}
            </div>
            <p className="text-xs text-gray-500">Empleados raíz (sin jefe)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {employees.filter(e => e.reportsTo && getSubordinateCount(e.id) > 0).length}
            </div>
            <p className="text-xs text-gray-500">Con subordinados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {employees.filter(e => !e.reportsTo).length}
            </div>
            <p className="text-xs text-gray-500">Nivel Gerencia</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {departments.length}
            </div>
            <p className="text-xs text-gray-500">Departamentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Import CSV Modal */}
      {showImportCSV && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Importar Jerarquía desde CSV
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowImportCSV(false); setCsvData(''); setImportResult(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Formato del CSV:</strong> Debe tener dos columnas: <code>empleado</code> y <code>jefe</code>.
                Los nombres deben coincidir parcialmente con los nombres en el sistema.
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
                  <Download className="h-4 w-4 mr-1" />
                  Descargar Plantilla
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium">Pegar contenido CSV:</label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="empleado,jefe&#10;Juan Pérez,María García&#10;Carlos López,Juan Pérez"
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm font-mono h-32"
                />
              </div>

              {importResult && (
                <div className={`p-3 rounded-lg text-sm ${importResult.errors.length === 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
                  <p className="font-medium">{importResult.success} empleados actualizados</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowImportCSV(false); setCsvData(''); setImportResult(null); }}>
                  Cancelar
                </Button>
                <Button onClick={importHierarchyCSV} disabled={!csvData.trim() || importing}>
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
