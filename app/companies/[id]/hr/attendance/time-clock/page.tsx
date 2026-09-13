'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Clock, Play, Pause, Coffee, Utensils, LogOut,
  RotateCcw, Timer, Users, Building2, ChevronRight, ChevronDown,
  CheckCircle, XCircle, UserPlus, Settings, Trash2, Star,
  Circle, Shield, Eye, Pencil, Plus, Calendar, Copy
} from 'lucide-react';

type EventType = 'entrance' | 'break_start' | 'break_end' | 'lunch_start' | 'lunch_end' | 'end_of_shift' | 'overtime_start' | 'overtime_end';
type EmployeeRole = 'gerente' | 'supervisor' | 'empleado';

interface TimeEntry {
  id: string;
  employee_id: string;
  date: string;
  event_type: EventType;
  event_time: string;
  notes: string | null;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  schedule_entry: string;
  schedule_exit: string;
  status: string;
  role: EmployeeRole;
  reports_to: string | null;
  work_schedule_id: string | null;
}

interface Team {
  id: string;
  name: string;
  department: string;
  description: string | null;
  color: string;
  members: { employee_id: string; role: string }[];
}

interface WorkSchedule {
  id: string;
  tenant_id: string;
  name: string;
  entry_time: string;
  exit_time: string;
  break_start: string | null;
  break_end: string | null;
  break2_start: string | null;
  break2_end: string | null;
  break3_start: string | null;
  break3_end: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  free_days: number[];
  created_at: string;
  updated_at: string;
}

const EVENT_CONFIG: Record<EventType, { label: string; icon: typeof Play; color: string; activeColor: string }> = {
  entrance:      { label: 'Entrada',             icon: Play,     color: 'bg-green-100 text-green-700 border-green-300',   activeColor: 'bg-green-500 text-white border-green-600' },
  break_start:   { label: 'Salida (Break)',      icon: Pause,    color: 'bg-yellow-100 text-yellow-700 border-yellow-300', activeColor: 'bg-yellow-500 text-white border-yellow-600' },
  break_end:     { label: 'Regreso (Break)',     icon: Play,     color: 'bg-blue-100 text-blue-700 border-blue-300',     activeColor: 'bg-blue-500 text-white border-blue-600' },
  lunch_start:   { label: 'Salida (Almuerzo)',   icon: Utensils, color: 'bg-orange-100 text-orange-700 border-orange-300', activeColor: 'bg-orange-500 text-white border-orange-600' },
  lunch_end:     { label: 'Regreso (Almuerzo)',  icon: Coffee,   color: 'bg-purple-100 text-purple-700 border-purple-300', activeColor: 'bg-purple-500 text-white border-purple-600' },
  end_of_shift:  { label: 'Salida Final',        icon: LogOut,   color: 'bg-red-100 text-red-700 border-red-300',       activeColor: 'bg-red-500 text-white border-red-600' },
  overtime_start:{ label: 'Iniciar HE',          icon: Star,     color: 'bg-amber-100 text-amber-700 border-amber-300',  activeColor: 'bg-amber-500 text-white border-amber-600' },
  overtime_end:  { label: 'Finalizar HE',        icon: CheckCircle, color: 'bg-teal-100 text-teal-700 border-teal-300', activeColor: 'bg-teal-500 text-white border-teal-600' },
};

const EVENT_SEQUENCE: EventType[] = ['entrance', 'break_start', 'break_end', 'lunch_start', 'lunch_end', 'end_of_shift'];

function formatTimeFull(iso: string) {
  return new Date(iso).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getEmpStatus(entries: TimeEntry[]): string {
  if (entries.find(e => e.event_type === 'end_of_shift')) return 'completed';
  if (entries.find(e => e.event_type === 'lunch_start') && !entries.find(e => e.event_type === 'lunch_end')) return 'lunch';
  if (entries.find(e => e.event_type === 'break_start') && !entries.find(e => e.event_type === 'break_end')) return 'break';
  if (entries.find(e => e.event_type === 'entrance')) return 'present';
  return 'absent';
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'present': return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs"><Circle className="h-3 w-3 mr-1 fill-green-500" />Presente</Badge>;
    case 'break': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs"><Pause className="h-3 w-3 mr-1" />Break</Badge>;
    case 'lunch': return <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs"><Utensils className="h-3 w-3 mr-1" />Almuerzo</Badge>;
    case 'completed': return <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Finalizado</Badge>;
    case 'absent': return <Badge className="bg-red-50 text-red-500 border-red-200 text-xs"><XCircle className="h-3 w-3 mr-1" />Ausente</Badge>;
    default: return <Badge className="bg-gray-50 text-gray-400 border-gray-200 text-xs">--</Badge>;
  }
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  empleado: 'Empleado',
};

const ROLE_COLORS: Record<EmployeeRole, string> = {
  gerente: 'bg-purple-100 text-purple-700 border-purple-300',
  supervisor: 'bg-blue-100 text-blue-700 border-blue-300',
  empleado: 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function TimeClockPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTimeTracking, setAllTimeTracking] = useState<Record<string, TimeEntry[]>>({});
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fichaje' | 'equipo' | 'horarios'>('dashboard');
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    const safeFetch = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    };

    const [empData, ttData, teamData, scheduleData] = await Promise.all([
      safeFetch(`/api/companies/${companyId}/employees?fields=id,first_name,last_name,position_id,department,status,schedule_entry,schedule_exit,role,reports_to,work_schedule_id`),
      safeFetch(`/api/companies/${companyId}/hr/attendance/time-tracking?date=${today}`),
      safeFetch(`/api/companies/${companyId}/hr/teams`),
      safeFetch(`/api/companies/${companyId}/hr/work-schedules`),
    ]);

    if (empData) {
      const emps = empData
        .filter((e: any) => e.status === 'active')
        .map((e: any) => ({
          id: e.id,
          name: `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim(),
          position: e.position || '',
          department: e.department || '',
          schedule_entry: e.schedule_entry || e.scheduleEntry || '',
          schedule_exit: e.schedule_exit || e.scheduleExit || '',
          status: e.status,
          role: (e.role || 'empleado') as EmployeeRole,
          reports_to: e.reportsTo || e.reports_to || null,
          work_schedule_id: e.work_schedule_id || e.workScheduleId || null,
        }));
      setEmployees(emps);

      const savedUserId = localStorage.getItem('timeclock_user_id');
      if (savedUserId) {
        const found = emps.find((e: Employee) => e.id === savedUserId);
        if (found) setCurrentUser(found);
      }
    }

    if (ttData && Array.isArray(ttData)) {
      const grouped: Record<string, TimeEntry[]> = {};
      ttData.forEach((tt: any) => {
        const empId = tt.employee_id;
        if (!grouped[empId]) grouped[empId] = [];
        grouped[empId].push(tt);
      });
      setAllTimeTracking(grouped);
    }

    if (teamData && Array.isArray(teamData)) setTeams(teamData);
    if (scheduleData && Array.isArray(scheduleData)) setWorkSchedules(scheduleData);
    setLoading(false);
  }, [companyId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'empleado' && !selectedEmployee) {
      setSelectedEmployee(currentUser.id);
    }
  }, [currentUser, selectedEmployee]);

  const loadEmployeeEntries = useCallback(async (empId: string) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/attendance/time-tracking?date=${today}&employee_id=${empId}`);
      if (res.ok) setTodayEntries(await res.json());
    } catch { /* */ }
  }, [companyId, today]);

  useEffect(() => {
    if (selectedEmployee) loadEmployeeEntries(selectedEmployee);
  }, [selectedEmployee, loadEmployeeEntries]);

  const clockEvent = async (eventType: EventType) => {
    if (!selectedEmployee || clocking) return;
    setClocking(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/attendance/time-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selectedEmployee, date: today, event_type: eventType, event_time: new Date().toISOString() }),
      });
      if (res.ok) {
        await loadEmployeeEntries(selectedEmployee);
        loadData();
      }
    } catch { /* */ }
    finally { setClocking(false); }
  };

  const deleteEvent = async (eventType: EventType) => {
    if (!selectedEmployee) return;
    if (!confirm(`Eliminar registro de ${EVENT_CONFIG[eventType].label}?`)) return;
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/attendance/time-tracking?employee_id=${selectedEmployee}&date=${today}&event_type=${eventType}`, { method: 'DELETE' });
      if (res.ok) { await loadEmployeeEntries(selectedEmployee); loadData(); }
    } catch { /* */ }
  };

  const getEventTime = (eventType: EventType): string | null => {
    const entry = todayEntries.find(e => e.event_type === eventType);
    return entry ? formatTimeFull(entry.event_time) : null;
  };

  const getNextEvent = (): EventType | null => {
    for (const evt of EVENT_SEQUENCE) {
      if (!todayEntries.find(e => e.event_type === evt)) return evt;
    }
    return null;
  };

  const getVisibleEmployees = (): Employee[] => {
    if (!currentUser) return [];
    if (currentUser.role === 'gerente') return employees;
    if (currentUser.role === 'supervisor') {
      const directReports = employees.filter(e => e.reports_to === currentUser.id);
      return [currentUser, ...directReports];
    }
    return [currentUser];
  };

  const getManageableEmployees = (): Employee[] => {
    if (!currentUser) return [];
    if (currentUser.role === 'gerente') return employees;
    if (currentUser.role === 'supervisor') return employees.filter(e => e.reports_to === currentUser.id);
    return [];
  };

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
  const visibleEmployees = getVisibleEmployees().filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-cyan-700 text-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" className="text-white hover:bg-cyan-600" onClick={() => router.push(`/companies/${companyId}/modules`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Timer className="h-6 w-6" />
          <div>
            <h1 className="text-xl font-bold">Control de Asistencia</h1>
            <p className="text-cyan-200 text-sm">{formatDate(today)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-2 bg-cyan-800 px-3 py-1.5 rounded-lg">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">{currentUser.name}</span>
              <Badge className={`text-xs ${ROLE_COLORS[currentUser.role]}`}>{ROLE_LABELS[currentUser.role]}</Badge>
              <button onClick={() => { setCurrentUser(null); setSelectedEmployee(''); localStorage.removeItem('timeclock_user_id'); }} className="text-cyan-300 hover:text-white ml-1 text-xs">cambiar</button>
            </div>
          )}
          <span className="text-lg font-mono bg-cyan-800 px-3 py-1 rounded">{now?.toLocaleTimeString('es-HN') || '--:--:--'}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'dashboard' ? 'bg-cyan-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            <Eye className="h-4 w-4 mr-2 inline" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('fichaje')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'fichaje' ? 'bg-cyan-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            <Timer className="h-4 w-4 mr-2 inline" /> Mi Fichaje
          </button>
          {(currentUser?.role === 'supervisor' || currentUser?.role === 'gerente') && (
            <button onClick={() => setActiveTab('equipo')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'equipo' ? 'bg-cyan-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
              <Users className="h-4 w-4 mr-2 inline" /> Mi Equipo
              {currentUser?.role === 'gerente' ? ' (Todos)' : ''}
            </button>
          )}
          <button onClick={() => setActiveTab('horarios')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'horarios' ? 'bg-cyan-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            <Calendar className="h-4 w-4 mr-2 inline" /> Horarios
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <DashboardTab
            employees={employees}
            allTimeTracking={allTimeTracking}
            onSelectEmployee={(id) => { setSelectedEmployee(id); setActiveTab('fichaje'); }}
            now={now}
            loading={loading}
          />
        )}

        {activeTab === 'fichaje' && currentUser && (
          <MiFichajeTab
            currentUser={currentUser}
            employees={visibleEmployees}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={(id) => { setSelectedEmployee(id); setSearch(''); }}
            search={search}
            onSearchChange={setSearch}
            todayEntries={todayEntries}
            nextEvent={getNextEvent()}
            clocking={clocking}
            clockEvent={clockEvent}
            deleteEvent={deleteEvent}
            getEventTime={getEventTime}
            now={now}
            loading={loading}
          />
        )}

        {activeTab === 'equipo' && currentUser && (
          <EquipoTab
            currentUser={currentUser}
            employees={employees}
            allTimeTracking={allTimeTracking}
            teams={teams}
            departments={departments}
            expandedDepts={expandedDepts}
            setExpandedDepts={setExpandedDepts}
            onSelectEmployee={(id) => { setSelectedEmployee(id); setActiveTab('fichaje'); }}
            now={now}
            loading={loading}
          />
        )}

        {activeTab === 'horarios' && (
          <HorariosTab
            companyId={companyId}
            workSchedules={workSchedules}
            employees={employees}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  );
}

function DashboardTab({
  employees, allTimeTracking, onSelectEmployee, now, loading,
}: {
  employees: Employee[];
  allTimeTracking: Record<string, TimeEntry[]>;
  onSelectEmployee: (id: string) => void;
  now: Date | null;
  loading: boolean;
}) {
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showActive, setShowActive] = useState(true);

  const stats = {
    present: 0,
    break: 0,
    lunch: 0,
    completed: 0,
    absent: 0,
    total: employees.length,
  };

  const activeEmployees: Employee[] = [];
  const absentEmployees: Employee[] = [];

  employees.forEach(emp => {
    const entries = allTimeTracking[emp.id] || [];
    const s = getEmpStatus(entries);
    if (s === 'present') { stats.present++; activeEmployees.push(emp); }
    else if (s === 'break') { stats.break++; activeEmployees.push(emp); }
    else if (s === 'lunch') { stats.lunch++; activeEmployees.push(emp); }
    else if (s === 'completed') { stats.completed++; activeEmployees.push(emp); }
    else { stats.absent++; absentEmployees.push(emp); }
  });

  const displayEmployees = showAll ? employees : activeEmployees;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-green-700">{stats.present}</div>
            <div className="text-xs text-green-600">En trabajo</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-yellow-700">{stats.break}</div>
            <div className="text-xs text-yellow-600">En break</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-orange-700">{stats.lunch}</div>
            <div className="text-xs text-orange-600">Almuerzo</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-gray-700">{stats.completed}</div>
            <div className="text-xs text-gray-600">Finalizados</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-red-700">{stats.absent}</div>
            <div className="text-xs text-red-600">Ausentes</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Timer className="h-4 w-4" />
          {stats.total} empleados activos
        </div>
        <span className="text-sm font-mono text-gray-500">{now?.toLocaleTimeString('es-HN') || '--:--:--'}</span>
      </div>

      {activeEmployees.length > 0 && (
        <div>
          <button onClick={() => setShowActive(!showActive)} className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-3 hover:text-gray-700">
            {showActive ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Empleados en turno ({activeEmployees.length})
          </button>
          {showActive && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeEmployees.map(emp => {
              const entries = allTimeTracking[emp.id] || [];
              const status = getEmpStatus(entries);
              const lastEvent = entries[entries.length - 1];
              const isExpanded = expandedEmp === emp.id;

              let borderColor = 'border-green-200 bg-green-50';
              if (status === 'break' || status === 'lunch') borderColor = 'border-yellow-200 bg-yellow-50';
              else if (status === 'completed') borderColor = 'border-gray-200 bg-gray-50';

              return (
                <div
                  key={emp.id}
                  className={`rounded-xl border-2 transition-all ${borderColor} ${isExpanded ? 'shadow-md col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2' : 'hover:shadow-md'}`}
                >
                  <div className="p-4 cursor-pointer" onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                        <div className="font-medium text-sm truncate">{emp.name}</div>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    <div className="text-xs text-gray-500 mb-1 ml-6">{emp.department || '--'} {emp.position ? `- ${emp.position}` : ''}</div>
                    {lastEvent && (
                      <div className="text-[10px] text-gray-400 mt-1 ml-6">
                        {EVENT_CONFIG[lastEvent.event_type]?.label}: {formatTimeFull(lastEvent.event_time)}
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-200/50">
                      {entries.length > 0 ? (
                        <div className="space-y-1.5 pt-3">
                          {entries.map((entry, i) => {
                            const config = EVENT_CONFIG[entry.event_type];
                            const Icon = config?.icon;
                            return (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
                                <span className="text-gray-500 w-28">{config?.label || entry.event_type}</span>
                                <span className="font-mono text-gray-700">{formatTimeFull(entry.event_time)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 pt-2">Sin registros de asistencia hoy</div>
                      )}
                      <Button variant="outline" size="sm" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); onSelectEmployee(emp.id); }}>
                        <Timer className="h-3.5 w-3.5 mr-1.5" /> Fichar este empleado
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => setShowAll(!showAll)} className="text-sm text-cyan-600 hover:text-cyan-800 font-medium flex items-center gap-1">
          {showAll ? <ChevronRight className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4" />}
          {showAll ? 'Ocultar ausentes' : `Ver ausentes (${stats.absent})`}
        </button>
      </div>

      {showAll && absentEmployees.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Ausentes ({absentEmployees.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {absentEmployees.map(emp => {
              const entries = allTimeTracking[emp.id] || [];
              const isExpanded = expandedEmp === emp.id;

              return (
                <div
                  key={emp.id}
                  className={`rounded-xl border-2 border-red-200 bg-red-50 transition-all ${isExpanded ? 'shadow-md col-span-1 sm:col-span-2' : 'hover:shadow-md'}`}
                >
                  <div className="p-4 cursor-pointer" onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                        <div className="font-medium text-sm truncate">{emp.name}</div>
                      </div>
                      {getStatusBadge('absent')}
                    </div>
                    <div className="text-xs text-gray-500 ml-6">{emp.department || '--'} {emp.position ? `- ${emp.position}` : ''}</div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-red-200/50">
                      <div className="text-xs text-gray-400 pt-3">Sin registros de asistencia hoy</div>
                      <Button variant="outline" size="sm" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); onSelectEmployee(emp.id); }}>
                        <Timer className="h-3.5 w-3.5 mr-1.5" /> Fichar este empleado
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && employees.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No hay empleados activos registrados
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const FREE_DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const EMPTY_SCHEDULE = { name: '', entry_time: '08:00', exit_time: '17:00', breaks: [{ start: '', end: '' }], lunch_start: '12:00', lunch_end: '13:00', free_days: [0] };

function HorariosTab({ companyId, workSchedules, employees, onRefresh }: {
  companyId: string;
  workSchedules: WorkSchedule[];
  employees: Employee[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [assigningSchedule, setAssigningSchedule] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = () => { setEditingId(null); setForm(EMPTY_SCHEDULE); setShowForm(true); };
  const openEdit = (s: WorkSchedule) => {
    setEditingId(s.id);
    const breaks: { start: string; end: string }[] = [];
    if (s.break_start || s.break_end) breaks.push({ start: s.break_start?.slice(0, 5) || '', end: s.break_end?.slice(0, 5) || '' });
    if (s.break2_start || s.break2_end) breaks.push({ start: s.break2_start?.slice(0, 5) || '', end: s.break2_end?.slice(0, 5) || '' });
    if (s.break3_start || s.break3_end) breaks.push({ start: s.break3_start?.slice(0, 5) || '', end: s.break3_end?.slice(0, 5) || '' });
    if (breaks.length === 0) breaks.push({ start: '', end: '' });
    setForm({
      name: s.name,
      entry_time: s.entry_time?.slice(0, 5) || '08:00',
      exit_time: s.exit_time?.slice(0, 5) || '17:00',
      breaks,
      lunch_start: s.lunch_start?.slice(0, 5) || '',
      lunch_end: s.lunch_end?.slice(0, 5) || '',
      free_days: s.free_days || [0],
    });
    setShowForm(true);
  };

  const toggleFreeDay = (day: number) => {
    setForm(f => ({
      ...f,
      free_days: f.free_days.includes(day) ? f.free_days.filter(d => d !== day) : [...f.free_days, day].sort(),
    }));
  };

  const updateBreak = (index: number, field: 'start' | 'end', value: string) => {
    setForm(f => {
      const breaks = [...f.breaks];
      breaks[index] = { ...breaks[index], [field]: value };
      return { ...f, breaks };
    });
  };

  const addBreak = () => {
    setForm(f => {
      if (f.breaks.length >= 3) return f;
      return { ...f, breaks: [...f.breaks, { start: '', end: '' }] };
    });
  };

  const removeBreak = (index: number) => {
    setForm(f => {
      if (f.breaks.length <= 1) return f;
      return { ...f, breaks: f.breaks.filter((_, i) => i !== index) };
    });
  };

  const saveSchedule = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        entry_time: form.entry_time || '08:00',
        exit_time: form.exit_time || '17:00',
        break_start: form.breaks[0]?.start || null,
        break_end: form.breaks[0]?.end || null,
        break2_start: form.breaks[1]?.start || null,
        break2_end: form.breaks[1]?.end || null,
        break3_start: form.breaks[2]?.start || null,
        break3_end: form.breaks[2]?.end || null,
        lunch_start: form.lunch_start || null,
        lunch_end: form.lunch_end || null,
        free_days: form.free_days,
      };
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(`/api/companies/${companyId}/hr/work-schedules`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) { setShowForm(false); onRefresh(); }
    } finally { setSaving(false); }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Eliminar este horario?')) return;
    const res = await fetch(`/api/companies/${companyId}/hr/work-schedules?id=${id}`, { method: 'DELETE' });
    if (res.ok) onRefresh();
  };

  const assignToEmployee = async (empId: string, scheduleId: string | null) => {
    await fetch(`/api/companies/${companyId}/employees`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: empId, workScheduleId: scheduleId || null }),
    });
    setAssigningSchedule(null);
    onRefresh();
  };

  const getAssignedCount = (scheduleId: string) => {
    return employees.filter(e => e.work_schedule_id === scheduleId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          {workSchedules.length} horarios creados
        </div>
        <Button onClick={openCreate} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" /> Crear Horario
        </Button>
      </div>

      {showForm && (
        <Card className="border-cyan-200">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">{editingId ? 'Editar Horario' : 'Nuevo Horario'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div>
              <label className="text-sm font-medium">Nombre del horario *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Horario Normal, Turno Tarde..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium">Entrada</label>
                <input type="time" value={form.entry_time} onChange={e => setForm(f => ({ ...f, entry_time: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Salida</label>
                <input type="time" value={form.exit_time} onChange={e => setForm(f => ({ ...f, exit_time: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Inicio Almuerzo</label>
                <input type="time" value={form.lunch_start} onChange={e => setForm(f => ({ ...f, lunch_start: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Fin Almuerzo</label>
                <input type="time" value={form.lunch_end} onChange={e => setForm(f => ({ ...f, lunch_end: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Breaks ({form.breaks.length}/3)</label>
                {form.breaks.length < 3 && (
                  <button type="button" onClick={addBreak} className="text-xs text-cyan-600 hover:text-cyan-800 font-medium flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Agregar break
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {form.breaks.map((brk, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-16 shrink-0">Break {i + 1}</span>
                    <input type="time" value={brk.start} onChange={e => updateBreak(i, 'start', e.target.value)} className="flex-1 px-3 py-2 border rounded-md text-sm" placeholder="Inicio" />
                    <input type="time" value={brk.end} onChange={e => updateBreak(i, 'end', e.target.value)} className="flex-1 px-3 py-2 border rounded-md text-sm" placeholder="Fin" />
                    {form.breaks.length > 1 && (
                      <button type="button" onClick={() => removeBreak(i)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Dias Libres</label>
              <div className="flex gap-1 mt-1">
                {FREE_DAY_LABELS.map((label, i) => (
                  <button key={i} type="button" onClick={() => toggleFreeDay(i)}
                    className={`w-10 h-10 rounded-lg text-xs font-medium border transition-colors ${form.free_days.includes(i) ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveSchedule} disabled={saving || !form.name.trim()} className="bg-cyan-600 hover:bg-cyan-700">
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Horario'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workSchedules.map(s => {
          const isExpanded = expandedCards.has(s.id);
          return (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <div className="pt-4 px-4 cursor-pointer" onClick={() => toggleCard(s.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                      <h4 className="font-bold text-base truncate">{s.name}</h4>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5 ml-6">
                      {s.entry_time?.slice(0, 5)} - {s.exit_time?.slice(0, 5)}
                      <span className="ml-2 text-xs text-gray-400">({getAssignedCount(s.id)} asignado(s))</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteSchedule(s.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <CardContent className="pt-3 space-y-3">
                  {(s.break_start || s.break2_start || s.break3_start || s.lunch_start) && (
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {s.break_start && <div>Break 1: {s.break_start?.slice(0, 5)} - {s.break_end?.slice(0, 5) || '--'}</div>}
                      {s.break2_start && <div>Break 2: {s.break2_start?.slice(0, 5)} - {s.break2_end?.slice(0, 5) || '--'}</div>}
                      {s.break3_start && <div>Break 3: {s.break3_start?.slice(0, 5)} - {s.break3_end?.slice(0, 5) || '--'}</div>}
                      {s.lunch_start && <div>Almuerzo: {s.lunch_start?.slice(0, 5)} - {s.lunch_end?.slice(0, 5) || '--'}</div>}
                    </div>
                  )}

                  <div className="flex gap-0.5">
                    {FREE_DAY_LABELS.map((label, i) => (
                      <span key={i} className={`w-7 h-7 rounded text-[10px] flex items-center justify-center font-medium ${s.free_days?.includes(i) ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {label}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-xs text-gray-400">{getAssignedCount(s.id)} empleado(s) asignado(s)</span>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setAssigningSchedule(assigningSchedule === s.id ? null : s.id); }}>
                      <UserPlus className="h-3 w-3 mr-1" /> Asignar
                    </Button>
                  </div>

                  {assigningSchedule === s.id && (
                    <div className="border-t pt-2 space-y-1 max-h-40 overflow-y-auto">
                      {employees.map(emp => {
                        const assigned = emp.work_schedule_id === s.id;
                        return (
                          <button key={emp.id} onClick={() => assignToEmployee(emp.id, assigned ? null : s.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${assigned ? 'bg-cyan-50 text-cyan-700' : 'hover:bg-gray-50'}`}>
                            <span className="truncate">{emp.name}</span>
                            {assigned && <Badge className="bg-cyan-100 text-cyan-700 text-[10px]">Asignado</Badge>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {!showForm && workSchedules.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No hay horarios creados. Crea uno para asignarlo a tus empleados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiFichajeTab({
  currentUser, employees, selectedEmployee, onSelectEmployee, search, onSearchChange,
  todayEntries, nextEvent, clocking, clockEvent, deleteEvent, getEventTime,
  now, loading,
}: {
  currentUser: Employee;
  employees: Employee[];
  selectedEmployee: string;
  onSelectEmployee: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  todayEntries: TimeEntry[];
  nextEvent: EventType | null;
  clocking: boolean;
  clockEvent: (e: EventType) => void;
  deleteEvent: (e: EventType) => void;
  getEventTime: (e: EventType) => string | null;
  now: Date | null;
  loading: boolean;
}) {
  const isEmpleado = currentUser.role === 'empleado';
  const displayEmployees = isEmpleado ? [currentUser] : employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const activeEmpId = isEmpleado ? currentUser.id : selectedEmployee;

  const workedHours = (() => {
    const entrance = todayEntries.find(e => e.event_type === 'entrance');
    if (!entrance) return '--';
    const start = new Date(entrance.event_time).getTime();
    const endShift = todayEntries.find(e => e.event_type === 'end_of_shift');
    const end = endShift ? new Date(endShift.event_time).getTime() : (now || new Date()).getTime();
    let totalMs = end - start;
    const breakStarts = todayEntries.filter(e => e.event_type === 'break_start' || e.event_type === 'lunch_start');
    const breakEnds = todayEntries.filter(e => e.event_type === 'break_end' || e.event_type === 'lunch_end');
    for (const b of breakStarts) {
      const r = breakEnds.find(re => new Date(re.event_time) > new Date(b.event_time));
      if (r) totalMs -= new Date(r.event_time).getTime() - new Date(b.event_time).getTime();
      else totalMs -= (now || new Date()).getTime() - new Date(b.event_time).getTime();
    }
    if (totalMs < 0) totalMs = 0;
    const hours = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    return `${hours}h ${mins}m ${secs}s`;
  })();

  return (
    <div className="space-y-6">
      {!isEmpleado && (
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Buscar empleado..." value={search} onChange={e => onSearchChange(e.target.value)} className="flex-1 px-3 py-2 border rounded-md text-sm" />
          <span className="text-sm text-gray-500">{displayEmployees.length} empleados</span>
        </div>
      )}

      {!isEmpleado && !selectedEmployee && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {displayEmployees.map(emp => (
            <button key={emp.id} onClick={() => onSelectEmployee(emp.id)} className={`p-3 rounded-lg border-2 text-left transition-all ${selectedEmployee === emp.id ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-300' : 'border-gray-200 bg-white hover:border-cyan-300 hover:bg-gray-50'}`}>
              <div className="text-sm font-medium truncate">{emp.name}</div>
              <div className="text-xs text-gray-400 truncate">{emp.department || '--'}</div>
              <Badge className={`mt-1 text-xs ${ROLE_COLORS[emp.role]}`}>{ROLE_LABELS[emp.role]}</Badge>
            </button>
          ))}
        </div>
      )}

      {activeEmpId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{employees.find(e => e.id === activeEmpId)?.name || currentUser.name}</h3>
                    <Badge className={ROLE_COLORS[employees.find(e => e.id === activeEmpId)?.role || currentUser.role]}>
                      {ROLE_LABELS[employees.find(e => e.id === activeEmpId)?.role || currentUser.role]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-cyan-600" />
                    <span className="text-2xl font-mono">{now?.toLocaleTimeString('es-HN') || '--:--:--'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {EVENT_SEQUENCE.map(evt => {
                    const config = EVENT_CONFIG[evt];
                    const time = getEventTime(evt);
                    const isNext = nextEvent === evt;
                    const Icon = config.icon;
                    return (
                      <div key={evt} className="relative">
                        <button
                          onClick={() => clockEvent(evt)}
                          disabled={clocking || !!time}
                          className={`w-full p-4 rounded-xl border-2 text-center transition-all ${time ? config.activeColor : isNext ? `${config.color} border-dashed animate-pulse hover:scale-105` : 'bg-gray-50 text-gray-400 border-gray-200'} ${clocking && isNext ? 'opacity-50' : ''}`}
                        >
                          <Icon className="h-6 w-6 mx-auto mb-1" />
                          <div className="text-sm font-medium">{config.label}</div>
                          {time ? <div className="text-lg font-mono mt-1">{time}</div> : <div className="text-xs mt-1 opacity-60">{isNext ? 'Ahora' : 'Pendiente'}</div>}
                        </button>
                        {time && (
                          <button onClick={() => deleteEvent(evt)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600">x</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {nextEvent && (
                  <div className="mt-4 p-3 bg-cyan-50 rounded-lg border border-cyan-200 text-center">
                    <span className="text-sm text-cyan-700">Proximo evento: <strong>{EVENT_CONFIG[nextEvent].label}</strong></span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Horas Extras</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['overtime_start', 'overtime_end'] as EventType[]).map(evt => {
                      const config = EVENT_CONFIG[evt];
                      const time = getEventTime(evt);
                      const Icon = config.icon;
                      return (
                        <button
                          key={evt}
                          onClick={() => clockEvent(evt)}
                          disabled={clocking || !!time}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${time ? config.activeColor : `${config.color} hover:scale-105`} ${clocking ? 'opacity-50' : ''}`}
                        >
                          <Icon className="h-4 w-4 mx-auto mb-0.5" />
                          <div className="text-xs font-medium">{config.label}</div>
                          {time ? <div className="text-sm font-mono mt-0.5">{time}</div> : <div className="text-[10px] mt-0.5 opacity-60">Marcar</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <div className="text-sm text-gray-500">Horas trabajadas</div>
                  <div className="text-3xl font-bold text-cyan-700">{workedHours}</div>
                </div>
                <div className="space-y-2">
                  {EVENT_SEQUENCE.map(evt => {
                    const time = getEventTime(evt);
                    return (
                      <div key={evt} className="flex justify-between text-sm">
                        <span className="text-gray-500">{EVENT_CONFIG[evt].label}</span>
                        <span className={`font-mono ${time ? 'text-gray-800' : 'text-gray-300'}`}>{time || '--'}</span>
                      </div>
                    );
                  })}
                  <div className="pt-2 mt-2 border-t border-gray-100">
                    {(['overtime_start', 'overtime_end'] as EventType[]).map(evt => {
                      const time = getEventTime(evt);
                      return (
                        <div key={evt} className="flex justify-between text-sm">
                          <span className="text-amber-600">{EVENT_CONFIG[evt].label}</span>
                          <span className={`font-mono ${time ? 'text-amber-700' : 'text-gray-300'}`}>{time || '--'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
            {!isEmpleado && (
              <Button variant="outline" className="w-full" onClick={() => onSelectEmployee('')}>
                <RotateCcw className="h-4 w-4 mr-2" /> Cambiar empleado
              </Button>
            )}
          </div>
        </div>
      )}

      {!activeEmpId && !loading && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            {isEmpleado ? 'Cargando tu reloj...' : 'Selecciona un empleado para registrar su asistencia'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EquipoTab({
  currentUser, employees, allTimeTracking, teams, departments,
  expandedDepts, setExpandedDepts, onSelectEmployee, now, loading,
}: {
  currentUser: Employee;
  employees: Employee[];
  allTimeTracking: Record<string, TimeEntry[]>;
  teams: Team[];
  departments: string[];
  expandedDepts: Set<string>;
  setExpandedDepts: (s: Set<string>) => void;
  onSelectEmployee: (id: string) => void;
  now: Date | null;
  loading: boolean;
}) {
  const manageable = currentUser.role === 'gerente'
    ? employees
    : employees.filter(e => e.reports_to === currentUser.id);

  const manageableIds = new Set(manageable.map(e => e.id));
  const toggleDept = (dept: string) => {
    const next = new Set(expandedDepts);
    if (next.has(dept)) next.delete(dept);
    else next.add(dept);
    setExpandedDepts(next);
  };

  const deptGroups = [...new Set(manageable.map(e => e.department).filter(Boolean))].sort();

  const presentCount = manageable.filter(e => {
    const entries = allTimeTracking[e.id] || [];
    const s = getEmpStatus(entries);
    return s === 'present' || s === 'break' || s === 'lunch';
  }).length;
  const absentCount = manageable.filter(e => getEmpStatus(allTimeTracking[e.id] || []) === 'absent').length;
  const completedCount = manageable.filter(e => getEmpStatus(allTimeTracking[e.id] || []) === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-700">{presentCount}</div>
            <div className="text-xs text-green-600">En trabajo</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-700">{absentCount}</div>
            <div className="text-xs text-red-600">Ausentes</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{completedCount}</div>
            <div className="text-xs text-gray-600">Finalizados</div>
          </CardContent>
        </Card>
        <Card className="bg-cyan-50 border-cyan-200">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-cyan-700">{manageable.length}</div>
            <div className="text-xs text-cyan-600">Total a cargo</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Eye className="h-4 w-4" />
        {currentUser.role === 'gerente'
          ? 'Viendo todos los empleados (Gerente)'
          : `Viendo tus empleados directos (Supervisor) - ${manageable.length} a cargo`}
      </div>

      {deptGroups.map(dept => {
        const deptEmps = manageable.filter(e => e.department === dept);
        const isExpanded = expandedDepts.has(dept);
        const deptPresent = deptEmps.filter(e => {
          const s = getEmpStatus(allTimeTracking[e.id] || []);
          return s === 'present' || s === 'break' || s === 'lunch';
        }).length;

        return (
          <Card key={dept}>
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleDept(dept)}>
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                <Building2 className="h-5 w-5 text-cyan-600" />
                <span className="font-bold">{dept}</span>
                <span className="text-sm text-gray-500">{deptEmps.length} empleados</span>
                <span className="text-sm text-green-600">({deptPresent} presentes)</span>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
                  {deptEmps.map(emp => {
                    const entries = allTimeTracking[emp.id] || [];
                    const status = getEmpStatus(entries);
                    const lastEvent = entries[entries.length - 1];
                    return (
                      <div key={emp.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${status === 'present' ? 'bg-green-50 border-green-200' : status === 'break' || status === 'lunch' ? 'bg-yellow-50 border-yellow-200' : status === 'completed' ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-100'}`} onClick={() => onSelectEmployee(emp.id)}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{emp.name}</div>
                          <div className="text-xs text-gray-400">{emp.position || emp.department}</div>
                          {lastEvent && <div className="text-[10px] text-gray-400 mt-0.5">{EVENT_CONFIG[lastEvent.event_type]?.label} {formatTimeFull(lastEvent.event_time)}</div>}
                        </div>
                        {getStatusBadge(status)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {deptGroups.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            {currentUser.role === 'empleado'
              ? 'No tienes empleados a tu cargo'
              : 'No hay empleados asignados a tu supervision'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
