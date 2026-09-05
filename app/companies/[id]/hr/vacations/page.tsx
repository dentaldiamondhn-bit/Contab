'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Minus,
  Loader2,
  User,
  Briefcase,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Trash2,
  Inbox,
  Settings,
  Pencil,
  Save,
  X,
  Plane,
  Heart,
  Stethoscope,
  BriefcaseBusiness,
  Ban,
  Star,
  Zap,
  Gift,
  Home,
  BookOpen,
  Shield,
  Coffee
} from 'lucide-react';

type IconName = 'Plane' | 'Heart' | 'Stethoscope' | 'BriefcaseBusiness' | 'Ban' | 'Star' | 'Zap' | 'Gift' | 'Home' | 'BookOpen' | 'Shield' | 'Coffee';

const ICON_MAP: Record<IconName, any> = {
  Plane, Heart, Stethoscope, BriefcaseBusiness, Ban, Star, Zap, Gift, Home, BookOpen, Shield, Coffee
};

const ICON_OPTIONS: IconName[] = ['Plane', 'Heart', 'Stethoscope', 'BriefcaseBusiness', 'Ban', 'Star', 'Zap', 'Gift', 'Home', 'BookOpen', 'Shield', 'Coffee'];

const COLOR_OPTIONS = [
  { label: 'Azul', value: 'blue', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { label: 'Rosa', value: 'pink', text: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  { label: 'Rojo', value: 'red', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { label: 'Púrpura', value: 'purple', text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { label: 'Gris', value: 'gray', text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  { label: 'Verde', value: 'green', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { label: 'Naranja', value: 'orange', text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { label: 'Cyan', value: 'cyan', text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
];

interface PermissionTypeDef {
  id: string;
  label: string;
  icon: IconName;
  colorValue: string;
  annualDays: number;
  description: string;
  isDefault?: boolean;
}

const DEFAULT_TYPES: PermissionTypeDef[] = [
  { id: 'vacaciones', label: 'Vacaciones', icon: 'Plane', colorValue: 'blue', annualDays: 0, description: 'Según ley: <1 año=0, 1=10, 2=12, 3=14, 4+=min(20)', isDefault: true },
  { id: 'personal', label: 'Permiso Personal', icon: 'Heart', colorValue: 'pink', annualDays: 5, description: '5 días al año por motivo personal', isDefault: true },
  { id: 'enfermedad', label: 'Enfermedad', icon: 'Stethoscope', colorValue: 'red', annualDays: 12, description: 'Hasta 12 días al año con certificado médico', isDefault: true },
  { id: 'especial', label: 'Permiso Especial', icon: 'BriefcaseBusiness', colorValue: 'purple', annualDays: 3, description: '3 días al año por motivos especiales', isDefault: true },
  { id: 'sin_sueldo', label: 'Sin Goce de Sueldo', icon: 'Ban', colorValue: 'gray', annualDays: 10, description: 'Hasta 10 días al año sin goce de salario', isDefault: true },
];

function getColorClasses(colorValue: string) {
  return COLOR_OPTIONS.find(c => c.value === colorValue) || COLOR_OPTIONS[0];
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  startDate: string;
  salary: number;
  status: string;
}

interface PermissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  typeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface UsedDays {
  [empId: string]: { [typeId: string]: number };
}

type Tab = 'control' | 'solicitudes';

export default function PermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [permTypes, setPermTypes] = useState<PermissionTypeDef[]>(DEFAULT_TYPES);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedDays, setUsedDays] = useState<UsedDays>({});
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('control');
  const [filterType, setFilterType] = useState<string | 'all'>('all');

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [reqForm, setReqForm] = useState({ typeId: '', startDate: '', endDate: '', reason: '' });

  const [showTypesModal, setShowTypesModal] = useState(false);
  const [editingType, setEditingType] = useState<PermissionTypeDef | null>(null);
  const [typeForm, setTypeForm] = useState({ label: '', icon: 'Star' as IconName, colorValue: 'blue', annualDays: 0, description: '' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchEmployees();
    const savedTypes = localStorage.getItem(`permission_types_${companyId}`);
    if (savedTypes) {
      setPermTypes(JSON.parse(savedTypes));
    }
    const savedUsed = localStorage.getItem(`permissions_used_${companyId}`);
    if (savedUsed) setUsedDays(JSON.parse(savedUsed));
    const savedReqs = localStorage.getItem(`permissions_requests_${companyId}`);
    if (savedReqs) setRequests(JSON.parse(savedReqs));
  }, [companyId]);

  const saveTypes = (types: PermissionTypeDef[]) => {
    setPermTypes(types);
    localStorage.setItem(`permission_types_${companyId}`, JSON.stringify(types));
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/employees`);
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
      else if (data.employees) setEmployees(data.employees);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateVacationDays = (startDate: string): number => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const yearsDiff = now.getFullYear() - start.getFullYear();
    const monthsDiff = now.getMonth() - start.getMonth();
    const totalYears = yearsDiff + (monthsDiff < 0 ? -1 : 0);
    if (totalYears < 1) return 0;
    if (totalYears === 1) return 10;
    if (totalYears === 2) return 12;
    if (totalYears === 3) return 14;
    return Math.min(20, 14 + (totalYears - 3));
  };

  const getMaxDays = (emp: Employee, typeId: string): number => {
    const pt = permTypes.find(t => t.id === typeId);
    if (!pt) return 0;
    if (typeId === 'vacaciones') return calculateVacationDays(emp.startDate);
    return pt.annualDays;
  };

  const getUsedDays = (empId: string, typeId: string): number => {
    return usedDays[empId]?.[typeId] || 0;
  };

  const getAvailableDays = (emp: Employee, typeId: string): number => {
    return getMaxDays(emp, typeId) - getUsedDays(emp.id, typeId);
  };

  const getYearsOfService = (startDate: string): number => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const yearsDiff = now.getFullYear() - start.getFullYear();
    const monthsDiff = now.getMonth() - start.getMonth();
    return yearsDiff + (monthsDiff < 0 ? -1 : 0);
  };

  const calcDaysBetween = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const openRequestModal = (emp?: Employee) => {
    if (emp) setSelectedEmployee(emp);
    else setSelectedEmployee(null);
    setReqForm({ typeId: permTypes[0]?.id || '', startDate: '', endDate: '', reason: '' });
    setShowRequestModal(true);
  };

  const handleSubmitRequest = () => {
    if (!selectedEmployee || !reqForm.typeId || !reqForm.startDate || !reqForm.endDate || !reqForm.reason) return;
    const days = calcDaysBetween(reqForm.startDate, reqForm.endDate);
    if (days <= 0) return;
    const available = getAvailableDays(selectedEmployee, reqForm.typeId);
    if (days > available) return;

    const newRequest: PermissionRequest = {
      id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      employeeId: selectedEmployee.id,
      employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
      typeId: reqForm.typeId,
      startDate: reqForm.startDate,
      endDate: reqForm.endDate,
      days,
      reason: reqForm.reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const updated = [newRequest, ...requests];
    setRequests(updated);
    localStorage.setItem(`permissions_requests_${companyId}`, JSON.stringify(updated));
    setShowRequestModal(false);
    setSelectedEmployee(null);
  };

  const resolveRequest = (reqId: string, status: 'approved' | 'rejected') => {
    const approver = prompt(`Nombre de quien ${status === 'approved' ? 'aprueba' : 'rechaza'}:`);
    if (!approver || !approver.trim()) return;

    const updated = requests.map(r => {
      if (r.id === reqId) return { ...r, status, resolvedAt: new Date().toISOString(), resolvedBy: approver.trim() };
      return r;
    });
    setRequests(updated);
    localStorage.setItem(`permissions_requests_${companyId}`, JSON.stringify(updated));

    if (status === 'approved') {
      const req = requests.find(r => r.id === reqId);
      if (req) {
        const empUsed = usedDays[req.employeeId] || {};
        const currentUsed = empUsed[req.typeId] || 0;
        const updatedUsed = { ...usedDays, [req.employeeId]: { ...empUsed, [req.typeId]: currentUsed + req.days } };
        setUsedDays(updatedUsed);
        localStorage.setItem(`permissions_used_${companyId}`, JSON.stringify(updatedUsed));
      }
    }
  };

  const deleteRequest = (reqId: string) => {
    const updated = requests.filter(r => r.id !== reqId);
    setRequests(updated);
    localStorage.setItem(`permissions_requests_${companyId}`, JSON.stringify(updated));
  };

  const useManual = (empId: string, typeId: string, days: number) => {
    const empUsed = usedDays[empId] || {};
    const currentUsed = empUsed[typeId] || 0;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const max = getMaxDays(emp, typeId);
    const newUsed = Math.max(0, Math.min(max, currentUsed + days));
    const updated = { ...usedDays, [empId]: { ...empUsed, [typeId]: newUsed } };
    setUsedDays(updated);
    localStorage.setItem(`permissions_used_${companyId}`, JSON.stringify(updated));
  };

  const openAddType = () => {
    setEditingType(null);
    setTypeForm({ label: '', icon: 'Star', colorValue: 'blue', annualDays: 5, description: '' });
    setIsAdding(true);
    setShowTypesModal(true);
  };

  const openEditType = (pt: PermissionTypeDef) => {
    setEditingType(pt);
    setTypeForm({ label: pt.label, icon: pt.icon, colorValue: pt.colorValue, annualDays: pt.annualDays, description: pt.description });
    setIsAdding(false);
    setShowTypesModal(true);
  };

  const saveType = () => {
    if (!typeForm.label.trim()) return;
    if (editingType) {
      const updated = permTypes.map(t => t.id === editingType.id ? { ...t, label: typeForm.label, icon: typeForm.icon, colorValue: typeForm.colorValue, annualDays: typeForm.annualDays, description: typeForm.description } : t);
      saveTypes(updated);
    } else {
      const newType: PermissionTypeDef = {
        id: `custom_${Date.now()}`,
        label: typeForm.label,
        icon: typeForm.icon,
        colorValue: typeForm.colorValue,
        annualDays: typeForm.annualDays,
        description: typeForm.description,
      };
      saveTypes([...permTypes, newType]);
    }
    setShowTypesModal(false);
    setEditingType(null);
  };

  const deleteType = (typeId: string) => {
    const pt = permTypes.find(t => t.id === typeId);
    if (pt?.isDefault) { alert('No se pueden eliminar los tipos por defecto'); return; }
    if (!confirm(`¿Eliminar "${pt?.label}"? Se conservarán los registros existentes.`)) return;
    const updated = permTypes.filter(t => t.id !== typeId);
    saveTypes(updated);
    if (filterType === typeId) setFilterType('all');
  };

  const activeEmployees = employees.filter(e => e.status === 'active');
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const typesToShow = filterType === 'all' ? permTypes : permTypes.filter(t => t.id === filterType);

  const reqDays = calcDaysBetween(reqForm.startDate, reqForm.endDate);
  const reqEmpAvailable = selectedEmployee && reqForm.typeId ? getAvailableDays(selectedEmployee, reqForm.typeId) : 0;

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Permisos y Ausencias</h1>
          <p className="text-gray-500">{activeEmployees.length} empleados activos • {pendingRequests.length} solicitudes pendientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAddType}>
            <Settings className="h-4 w-4 mr-2" />
            Gestionar Tipos
          </Button>
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {permTypes.map((pt) => {
          const Icon = ICON_MAP[pt.icon] || Star;
          const colors = getColorClasses(pt.colorValue);
          const totalUsed = activeEmployees.reduce((sum, e) => sum + getUsedDays(e.id, pt.id), 0);
          const totalAvail = activeEmployees.reduce((sum, e) => sum + getAvailableDays(e, pt.id), 0);
          return (
            <Card key={pt.id} className={`cursor-pointer hover:shadow-md transition-shadow ${filterType === pt.id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setFilterType(filterType === pt.id ? 'all' : pt.id)}>
              <CardContent className="pt-4 pb-3">
                <div className="text-center">
                  <Icon className={`h-6 w-6 ${colors.text} mx-auto mb-1`} />
                  <div className="text-lg font-bold">{totalAvail}</div>
                  <div className="text-xs text-gray-500">{pt.label}</div>
                  <div className="text-xs text-gray-400 mt-1">Usados: {totalUsed}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          <button onClick={() => setActiveTab('control')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'control' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <Calendar className="h-4 w-4 inline mr-2" />
            Control de Permisos
          </button>
          <button onClick={() => setActiveTab('solicitudes')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'solicitudes' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <Inbox className="h-4 w-4 inline mr-2" />
            Solicitudes
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Tab: Control */}
      {activeTab === 'control' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Permisos por Empleado</CardTitle>
              {filterType !== 'all' && (
                <p className="text-sm text-gray-500 mt-1">
                  Filtrado por: {permTypes.find(t => t.id === filterType)?.label}
                  <button onClick={() => setFilterType('all')} className="ml-2 text-blue-600 underline">Mostrar todos</button>
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-500">Cargando empleados...</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay empleados registrados</p>
              </div>
            ) : (
              <div className="space-y-6">
                {employees.map((emp) => {
                  const years = getYearsOfService(emp.startDate);
                  const isActive = emp.status === 'active';
                  return (
                    <div key={emp.id} className={`p-4 border rounded-lg ${!isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                      <div className="mb-3">
                        <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                        <div className="text-sm text-gray-500">{emp.position} • {emp.department}</div>
                        <div className="text-xs text-gray-400">
                          Antigüedad: {years} año{years !== 1 ? 's' : ''} • Ingreso: {emp.startDate || 'N/A'}
                          {!isActive && <span className="ml-2 text-orange-500 font-medium">({emp.status})</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {typesToShow.map((pt) => {
                          const Icon = ICON_MAP[pt.icon] || Star;
                          const colors = getColorClasses(pt.colorValue);
                          const max = getMaxDays(emp, pt.id);
                          const used = getUsedDays(emp.id, pt.id);
                          const available = max - used;
                          const percentage = max > 0 ? (used / max) * 100 : 0;
                          return (
                            <div key={pt.id} className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className={`h-4 w-4 ${colors.text}`} />
                                <span className={`text-sm font-medium ${colors.text}`}>{pt.label}</span>
                              </div>
                              <div className="text-lg font-bold">{available} <span className="text-xs font-normal text-gray-500">/ {max} disp.</span></div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div className={`h-2 rounded-full ${percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min(100, percentage)}%` }} />
                              </div>
                              <div className="flex justify-between mt-1 text-xs text-gray-500">
                                <span>Usados: {used}</span>
                                <span>{Math.round(percentage)}%</span>
                              </div>
                              {isActive && (
                                <div className="flex gap-1 mt-2">
                                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                                    onClick={() => useManual(emp.id, pt.id, -1)} disabled={used <= 0}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                                    onClick={() => useManual(emp.id, pt.id, 1)} disabled={available <= 0}>
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Solicitudes */}
      {activeTab === 'solicitudes' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Solicitudes Pendientes ({pendingRequests.length})
              </CardTitle>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => openRequestModal()} disabled={activeEmployees.length === 0}>
                <Plus className="h-4 w-4 mr-1" />
                Nueva Solicitud
              </Button>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Inbox className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => {
                    const pt = permTypes.find(t => t.id === req.typeId);
                    const colors = pt ? getColorClasses(pt.colorValue) : COLOR_OPTIONS[0];
                    const Icon = pt ? (ICON_MAP[pt.icon] || Star) : Star;
                    return (
                      <div key={req.id} className={`flex items-center justify-between p-4 border rounded-lg ${colors.bg}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${colors.text}`} />
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {pt?.label || req.typeId}
                            </span>
                            <span className="font-medium">{req.employeeName}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {req.startDate} al {req.endDate} • {req.days} día{req.days !== 1 ? 's' : ''}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <FileText className="h-3 w-3 inline mr-1" />{req.reason}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Creada: {formatDate(req.createdAt)}</div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => resolveRequest(req.id, 'approved')}>
                            <CheckCircle className="h-4 w-4 mr-1" />Aprobar
                          </Button>
                          <Button size="sm" variant="destructive"
                            onClick={() => resolveRequest(req.id, 'rejected')}>
                            <XCircle className="h-4 w-4 mr-1" />Rechazar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-gray-500" />
                Historial de Solicitudes ({processedRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processedRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Inbox className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No hay solicitudes procesadas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {processedRequests.map((req) => {
                    const pt = permTypes.find(t => t.id === req.typeId);
                    const colors = pt ? getColorClasses(pt.colorValue) : COLOR_OPTIONS[0];
                    const Icon = pt ? (ICON_MAP[pt.icon] || Star) : Star;
                    return (
                      <div key={req.id} className={`flex items-center justify-between p-3 border rounded-lg ${req.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${colors.text}`} />
                            <span className="font-medium text-sm">{req.employeeName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>{pt?.label || req.typeId}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {req.startDate} al {req.endDate} • {req.days} día{req.days !== 1 ? 's' : ''} • {req.reason}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {req.resolvedBy && <span>{req.status === 'approved' ? 'Aprobado' : 'Rechazado'} por: {req.resolvedBy}</span>}
                            {req.resolvedAt && <span> • {formatDate(req.resolvedAt)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${req.status === 'approved' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            {req.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => deleteRequest(req.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold">Nueva Solicitud de Permiso</h2>
              {!selectedEmployee ? (
                <div className="mt-2">
                  <label className="text-sm font-medium text-gray-700">Seleccionar Empleado *</label>
                  <select value="" onChange={(e) => { const emp = activeEmployees.find(em => em.id === e.target.value); if (emp) setSelectedEmployee(emp); }}
                    className="w-full border rounded px-3 py-2 mt-1 text-sm">
                    <option value="">-- Seleccionar empleado --</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.position})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">{selectedEmployee.firstName} {selectedEmployee.lastName} • {selectedEmployee.position}</p>
              )}
            </div>
            {selectedEmployee && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo de Permiso *</label>
                  <select value={reqForm.typeId} onChange={(e) => setReqForm({ ...reqForm, typeId: e.target.value })}
                    className="w-full border rounded px-3 py-2 mt-1 text-sm">
                    <option value="">-- Seleccionar tipo --</option>
                    {permTypes.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.label} — {getAvailableDays(selectedEmployee, pt.id)} días disponibles</option>
                    ))}
                  </select>
                  {reqForm.typeId && <p className="text-xs text-gray-400 mt-1">{permTypes.find(t => t.id === reqForm.typeId)?.description}</p>}
                </div>
                {reqForm.typeId && (
                  <div className={`p-3 rounded-lg border ${getColorClasses(permTypes.find(t => t.id === reqForm.typeId)?.colorValue || 'blue').border} ${getColorClasses(permTypes.find(t => t.id === reqForm.typeId)?.colorValue || 'blue').bg}`}>
                    <span className={`text-sm font-medium ${getColorClasses(permTypes.find(t => t.id === reqForm.typeId)?.colorValue || 'blue').text}`}>
                      Disponibles: {reqEmpAvailable} días
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha Inicio *</label>
                    <input type="date" value={reqForm.startDate} onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                      className="w-full border rounded px-3 py-2 mt-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha Fin *</label>
                    <input type="date" value={reqForm.endDate} onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })}
                      min={reqForm.startDate} className="w-full border rounded px-3 py-2 mt-1 text-sm" />
                  </div>
                </div>
                {reqDays > 0 && (
                  <div className={`p-3 rounded-lg text-sm ${reqDays > reqEmpAvailable ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    <span className="font-medium">{reqDays} día{reqDays !== 1 ? 's' : ''}</span> solicitado{reqDays !== 1 ? 's' : ''}
                    {reqDays > reqEmpAvailable && <span className="block mt-1 text-red-600 font-medium">Excede los {reqEmpAvailable} días disponibles</span>}
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Motivo de la solicitud *</label>
                  <textarea value={reqForm.reason} onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                    rows={3} placeholder="Describa el motivo..."
                    className="w-full border rounded px-3 py-2 mt-1 text-sm" />
                </div>
              </div>
            )}
            <div className="border-t px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowRequestModal(false); setSelectedEmployee(null); }}>Cancelar</Button>
              {selectedEmployee && (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!reqForm.typeId || !reqForm.startDate || !reqForm.endDate || !reqForm.reason || reqDays <= 0 || reqDays > reqEmpAvailable}
                  onClick={handleSubmitRequest}>
                  <Send className="h-4 w-4 mr-1" />Enviar Solicitud
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Types Modal */}
      {showTypesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{isAdding ? 'Agregar Tipo de Permiso' : 'Gestionar Tipos de Permiso'}</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowTypesModal(false); setEditingType(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              {!isAdding && !editingType ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openAddType}>
                      <Plus className="h-4 w-4 mr-1" />Nuevo Tipo
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {permTypes.map((pt) => {
                      const Icon = ICON_MAP[pt.icon] || Star;
                      const colors = getColorClasses(pt.colorValue);
                      return (
                        <div key={pt.id} className={`flex items-center justify-between p-3 border rounded-lg ${colors.bg} ${colors.border}`}>
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${colors.text}`} />
                            <div>
                              <div className={`font-medium ${colors.text}`}>{pt.label}</div>
                              <div className="text-xs text-gray-500">{pt.annualDays === 0 ? 'Según ley' : `${pt.annualDays} días/año`} • {pt.description}</div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEditType(pt)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {!pt.isDefault && (
                              <Button size="sm" variant="destructive" onClick={() => deleteType(pt.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nombre *</label>
                    <input type="text" value={typeForm.label} onChange={(e) => setTypeForm({ ...typeForm, label: e.target.value })}
                      placeholder="Ej: Permiso de lactancia" className="w-full border rounded px-3 py-2 mt-1 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Días anuales</label>
                      <input type="number" value={typeForm.annualDays} min={0}
                        onChange={(e) => setTypeForm({ ...typeForm, annualDays: parseInt(e.target.value) || 0 })}
                        className="w-full border rounded px-3 py-2 mt-1 text-sm" />
                      <p className="text-xs text-gray-400 mt-1">0 = calculado por ley (solo vacaciones)</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ícono</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ICON_OPTIONS.map(iconName => {
                          const Ic = ICON_MAP[iconName];
                          return (
                            <button key={iconName}
                              className={`p-2 rounded border ${typeForm.icon === iconName ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                              onClick={() => setTypeForm({ ...typeForm, icon: iconName })}>
                              <Ic className="h-4 w-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Color</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c.value}
                          className={`px-3 py-1 rounded-full border text-sm ${typeForm.colorValue === c.value ? `border-gray-800 ${c.bg} ${c.text} font-medium` : `border-gray-200 ${c.text} hover:${c.bg}`}`}
                          onClick={() => setTypeForm({ ...typeForm, colorValue: c.value })}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Descripción</label>
                    <input type="text" value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                      placeholder="Descripción corta" className="w-full border rounded px-3 py-2 mt-1 text-sm" />
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => { setIsAdding(false); setEditingType(null); setShowTypesModal(false); }}>Cancelar</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!typeForm.label.trim()} onClick={saveType}>
                      <Save className="h-4 w-4 mr-1" />{editingType ? 'Guardar Cambios' : 'Crear Tipo'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
