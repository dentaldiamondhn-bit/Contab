'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Calendar,
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
  Inbox
} from 'lucide-react';

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

interface VacationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
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
  [empId: string]: number;
}

type Tab = 'control' | 'solicitudes';

export default function VacationsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedDays, setUsedDays] = useState<UsedDays>({});
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('control');

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [reqForm, setReqForm] = useState({ startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    fetchEmployees();
    const savedUsed = localStorage.getItem(`vacation_used_${companyId}`);
    if (savedUsed) setUsedDays(JSON.parse(savedUsed));
    const savedReqs = localStorage.getItem(`vacation_requests_${companyId}`);
    if (savedReqs) setRequests(JSON.parse(savedReqs));
  }, [companyId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/employees`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      } else if (data.employees) {
        setEmployees(data.employees);
      }
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

  const openRequestModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setReqForm({ startDate: '', endDate: '', reason: '' });
    setShowRequestModal(true);
  };

  const handleSubmitRequest = () => {
    if (!selectedEmployee || !reqForm.startDate || !reqForm.endDate || !reqForm.reason) return;
    const days = calcDaysBetween(reqForm.startDate, reqForm.endDate);
    if (days <= 0) return;

    const totalDays = calculateVacationDays(selectedEmployee.startDate);
    const used = usedDays[selectedEmployee.id] || 0;
    const available = totalDays - used;
    if (days > available) return;

    const newRequest: VacationRequest = {
      id: `vr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      employeeId: selectedEmployee.id,
      employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
      startDate: reqForm.startDate,
      endDate: reqForm.endDate,
      days,
      reason: reqForm.reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const updated = [newRequest, ...requests];
    setRequests(updated);
    localStorage.setItem(`vacation_requests_${companyId}`, JSON.stringify(updated));
    setShowRequestModal(false);
    setSelectedEmployee(null);
  };

  const resolveRequest = (reqId: string, status: 'approved' | 'rejected') => {
    const approver = prompt(`Nombre de quien ${status === 'approved' ? 'aprueba' : 'rechaza'}:`);
    if (!approver || !approver.trim()) return;

    const updated = requests.map(r => {
      if (r.id === reqId) {
        return { ...r, status, resolvedAt: new Date().toISOString(), resolvedBy: approver.trim() };
      }
      return r;
    });
    setRequests(updated);
    localStorage.setItem(`vacation_requests_${companyId}`, JSON.stringify(updated));

    if (status === 'approved') {
      const req = requests.find(r => r.id === reqId);
      if (req) {
        const currentUsed = usedDays[req.employeeId] || 0;
        const updatedUsed = { ...usedDays, [req.employeeId]: currentUsed + req.days };
        setUsedDays(updatedUsed);
        localStorage.setItem(`vacation_used_${companyId}`, JSON.stringify(updatedUsed));
      }
    }
  };

  const deleteRequest = (reqId: string) => {
    const updated = requests.filter(r => r.id !== reqId);
    setRequests(updated);
    localStorage.setItem(`vacation_requests_${companyId}`, JSON.stringify(updated));
  };

  const useVacation = (empId: string, days: number) => {
    const currentUsed = usedDays[empId] || 0;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const totalDays = calculateVacationDays(emp.startDate);
    const newUsed = Math.max(0, Math.min(totalDays, currentUsed + days));
    const updated = { ...usedDays, [empId]: newUsed };
    setUsedDays(updated);
    localStorage.setItem(`vacation_used_${companyId}`, JSON.stringify(updated));
  };

  const activeEmployees = employees.filter(e => e.status === 'active');
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const totalAvailable = activeEmployees.reduce((sum, e) => {
    const total = calculateVacationDays(e.startDate);
    const used = usedDays[e.id] || 0;
    return sum + (total - used);
  }, 0);
  const totalUsed = activeEmployees.reduce((sum, e) => sum + (usedDays[e.id] || 0), 0);

  const getAvailableDays = (emp: Employee): number => {
    const total = calculateVacationDays(emp.startDate);
    const used = usedDays[emp.id] || 0;
    return total - used;
  };

  const reqDays = calcDaysBetween(reqForm.startDate, reqForm.endDate);
  const reqEmpAvailable = selectedEmployee ? getAvailableDays(selectedEmployee) : 0;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Control de Vacaciones</h1>
          <p className="text-gray-500">{activeEmployees.length} empleados activos • {totalAvailable} días disponibles en total</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
              <div className="text-sm text-gray-500">Total Empleados</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
              <div className="text-sm text-gray-500">Días Disponibles</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{totalUsed}</div>
              <div className="text-sm text-gray-500">Días Usados</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
              <div className="text-sm text-gray-500">Solicitudes Pendientes</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('control')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'control'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Control de Vacaciones
          </button>
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'solicitudes'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Inbox className="h-4 w-4 inline mr-2" />
            Solicitudes
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab: Control de Vacaciones */}
      {activeTab === 'control' && (
        <Card>
          <CardHeader>
            <CardTitle>Vacaciones por Empleado</CardTitle>
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
              <div className="space-y-4">
                {employees.map((emp) => {
                  const totalDays = calculateVacationDays(emp.startDate);
                  const used = usedDays[emp.id] || 0;
                  const available = totalDays - used;
                  const percentage = totalDays > 0 ? (used / totalDays) * 100 : 0;
                  const years = getYearsOfService(emp.startDate);
                  const isActive = emp.status === 'active';

                  return (
                    <div key={emp.id} className={`p-4 border rounded-lg ${!isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <div className="font-medium">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{emp.position} • {emp.department}</div>
                          <div className="text-xs text-gray-400">
                            Antigüedad: {years} año{years !== 1 ? 's' : ''} • Ingreso: {emp.startDate || 'N/A'}
                            {!isActive && <span className="ml-2 text-orange-500 font-medium">({emp.status})</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`font-bold ${available > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {available} días disponibles
                            </div>
                            <div className="text-sm text-gray-500">de {totalDays} días totales</div>
                          </div>
                          {isActive && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => useVacation(emp.id, -1)}
                                disabled={used <= 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => openRequestModal(emp)}
                                disabled={available <= 0}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Solicitar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-orange-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-sm text-gray-500">
                        <span>Usados: {used} días</span>
                        <span>{Math.round(percentage)}% utilizado</span>
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
          {/* Pending */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Solicitudes Pendientes ({pendingRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Inbox className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                      <div className="flex-1">
                        <div className="font-medium">{req.employeeName}</div>
                        <div className="text-sm text-gray-600">
                          {req.startDate} al {req.endDate} • {req.days} día{req.days !== 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          <FileText className="h-3 w-3 inline mr-1" />
                          {req.reason}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Creada: {formatDate(req.createdAt)}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => resolveRequest(req.id, 'approved')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => resolveRequest(req.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
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
                  {processedRequests.map((req) => (
                    <div key={req.id} className={`flex items-center justify-between p-3 border rounded-lg ${req.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{req.employeeName}</div>
                        <div className="text-xs text-gray-500">
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold">Solicitar Vacaciones</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedEmployee.firstName} {selectedEmployee.lastName} • {selectedEmployee.position}
              </p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-blue-600 font-medium">
                  Disponibles: {reqEmpAvailable} días
                </span>
                <span className="text-gray-500">
                  Totales: {calculateVacationDays(selectedEmployee.startDate)} días
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha Inicio *</label>
                  <input
                    type="date"
                    value={reqForm.startDate}
                    onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                    className="w-full border rounded px-3 py-2 mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha Fin *</label>
                  <input
                    type="date"
                    value={reqForm.endDate}
                    onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })}
                    min={reqForm.startDate}
                    className="w-full border rounded px-3 py-2 mt-1 text-sm"
                  />
                </div>
              </div>

              {reqDays > 0 && (
                <div className={`p-3 rounded-lg text-sm ${reqDays > reqEmpAvailable ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  <span className="font-medium">{reqDays} día{reqDays !== 1 ? 's' : ''}</span> solicitado{reqDays !== 1 ? 's' : ''}
                  {reqDays > reqEmpAvailable && (
                    <span className="block mt-1 text-red-600 font-medium">
                      Excede los {reqEmpAvailable} días disponibles
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">Motivo de la solicitud *</label>
                <textarea
                  value={reqForm.reason}
                  onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                  rows={3}
                  placeholder="Ej: Vacaciones anuales, viaje familiar, asuntos personales..."
                  className="w-full border rounded px-3 py-2 mt-1 text-sm"
                />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowRequestModal(false); setSelectedEmployee(null); }}
              >
                Cancelar
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!reqForm.startDate || !reqForm.endDate || !reqForm.reason || reqDays <= 0 || reqDays > reqEmpAvailable}
                onClick={handleSubmitRequest}
              >
                <Send className="h-4 w-4 mr-1" />
                Enviar Solicitud
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
