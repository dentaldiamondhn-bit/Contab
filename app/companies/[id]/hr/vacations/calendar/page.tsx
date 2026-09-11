'use client';

import { use, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Calendar, Filter, X,
  Trash2, Edit, CheckCircle, XCircle, Clock, Save
} from 'lucide-react';

const COLOR_OPTIONS: Record<string, { text: string; bg: string; border: string; dot: string; light: string }> = {
  blue:   { text: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-300',   dot: 'bg-blue-500',   light: 'bg-blue-50' },
  pink:   { text: 'text-pink-700',   bg: 'bg-pink-100',   border: 'border-pink-300',   dot: 'bg-pink-500',   light: 'bg-pink-50' },
  red:    { text: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-300',    dot: 'bg-red-500',    light: 'bg-red-50' },
  purple: { text: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-300', dot: 'bg-purple-500', light: 'bg-purple-50' },
  gray:   { text: 'text-gray-700',   bg: 'bg-gray-100',   border: 'border-gray-300',   dot: 'bg-gray-500',   light: 'bg-gray-50' },
  green:  { text: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-300',  dot: 'bg-green-500',  light: 'bg-green-50' },
  orange: { text: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-300', dot: 'bg-orange-500', light: 'bg-orange-50' },
  cyan:   { text: 'text-cyan-700',   bg: 'bg-cyan-100',   border: 'border-cyan-300',   dot: 'bg-cyan-500',   light: 'bg-cyan-50' },
};

const DEFAULT_TYPES = [
  { id: 'vacaciones', label: 'Vacaciones', colorValue: 'blue' },
  { id: 'personal', label: 'Permiso Personal', colorValue: 'pink' },
  { id: 'enfermedad', label: 'Enfermedad', colorValue: 'red' },
  { id: 'especial', label: 'Permiso Especial', colorValue: 'purple' },
  { id: 'sin_sueldo', label: 'Sin Goce de Sueldo', colorValue: 'gray' },
];

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAY_NAMES_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

type ViewMode = 'month' | 'week' | 'day';

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

interface CalendarEvent {
  request: PermissionRequest;
  color: string;
  isStart: boolean;
  isEnd: boolean;
}

function getColor(value: string) {
  return COLOR_OPTIONS[value] || COLOR_OPTIONS.blue;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLong(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

function formatDateShort(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function dateToStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const s = parseDate(start);
  const e = parseDate(end);
  const current = new Date(s);
  while (current <= e) {
    days.push(dateToStr(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function getWeekDays(year: number, month: number, day: number): { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] {
  const d = new Date(year, month, day);
  const dow = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - dow);
  const today = dateToStr(new Date());
  const result: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    const ds = dateToStr(cur);
    result.push({ date: cur, dateStr: ds, isCurrentMonth: cur.getMonth() === month, isToday: ds === today });
  }
  return result;
}

function calcDaysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = parseDate(start);
  const e = parseDate(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export default function VacationCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [permTypes, setPermTypes] = useState(DEFAULT_TYPES);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentDay, setCurrentDay] = useState(new Date().getDate());

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<PermissionRequest | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    typeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'pending' as 'pending' | 'approved' | 'rejected',
  });

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, typesRes, reqsRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/hr/payroll/employees`),
        fetch(`/api/companies/${companyId}/hr/permissions/types`),
        fetch(`/api/companies/${companyId}/hr/permissions/requests`),
      ]);
      if (empRes.ok) {
        const data = await empRes.json();
        if (Array.isArray(data)) {
          setEmployees(data.map((e: any) => ({
            id: e.id,
            firstName: (e.name || '').split(' ')[0] || '',
            lastName: (e.name || '').split(' ').slice(1).join(' ') || '',
            position: e.position || '',
            department: e.department || '',
            startDate: e.startDate || '',
            salary: e.salary || 0,
            status: e.status || 'active',
          })));
        }
      }
      if (typesRes.ok) {
        const types = await typesRes.json();
        if (Array.isArray(types) && types.length > 0) setPermTypes(types);
      }
      if (reqsRes.ok) {
        const reqs = await reqsRes.json();
        if (Array.isArray(reqs)) setRequests(reqs);
      }
    } catch (e) {
      console.error('Error fetching calendar data:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesEmployee = filterEmployee === 'all' || r.employeeId === filterEmployee;
      const matchesType = filterType === 'all' || r.typeId === filterType;
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchesEmployee && matchesType && matchesStatus;
    });
  }, [requests, filterEmployee, filterType, filterStatus]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredRequests.forEach(req => {
      const days = getDaysInRange(req.startDate, req.endDate);
      const pt = permTypes.find(t => t.id === req.typeId);
      const color = pt?.colorValue || 'blue';
      days.forEach((day, idx) => {
        if (!map[day]) map[day] = [];
        map[day].push({ request: req, color, isStart: idx === 0, isEnd: idx === days.length - 1 });
      });
    });
    return map;
  }, [filteredRequests, permTypes]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsByDay[selectedDay] || [];
  }, [selectedDay, eventsByDay]);

  const monthStats = useMemo(() => {
    const firstStr = dateToStr(new Date(currentYear, currentMonth, 1));
    const lastStr = dateToStr(new Date(currentYear, currentMonth + 1, 0));
    let totalDays = 0;
    const empSet = new Set<string>();
    filteredRequests.forEach(req => {
      const reqStart = req.startDate > firstStr ? req.startDate : firstStr;
      const reqEnd = req.endDate < lastStr ? req.endDate : lastStr;
      if (reqStart <= reqEnd) {
        totalDays += getDaysInRange(reqStart, reqEnd).length;
        empSet.add(req.employeeId);
      }
    });
    return { totalDays, activeEmployees: empSet.size, totalRequests: filteredRequests.length, pending: filteredRequests.filter(r => r.status === 'pending').length };
  }, [filteredRequests, currentYear, currentMonth]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const prevMonthLast = new Date(currentYear, currentMonth, 0);
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLast.getDate() - i);
      days.push({ date: d, dateStr: dateToStr(d), isCurrentMonth: false, isToday: false });
    }
    const today = dateToStr(new Date());
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const ds = dateToStr(d);
      days.push({ date: d, dateStr: ds, isCurrentMonth: true, isToday: ds === today });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({ date: d, dateStr: dateToStr(d), isCurrentMonth: false, isToday: false });
    }
    return days;
  }, [currentYear, currentMonth]);

  const weekDays = useMemo(() => {
    return getWeekDays(currentYear, currentMonth, currentDay);
  }, [currentYear, currentMonth, currentDay]);

  const navigatePrev = useCallback(() => {
    setSelectedDay(null);
    if (viewMode === 'month') {
      const d = new Date(currentYear, currentMonth - 1, 1);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    } else if (viewMode === 'week') {
      const d = new Date(currentYear, currentMonth, currentDay - 7);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setCurrentDay(d.getDate());
    } else {
      const d = new Date(currentYear, currentMonth, currentDay - 1);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setCurrentDay(d.getDate());
    }
  }, [viewMode, currentYear, currentMonth, currentDay]);

  const navigateNext = useCallback(() => {
    setSelectedDay(null);
    if (viewMode === 'month') {
      const d = new Date(currentYear, currentMonth + 1, 1);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    } else if (viewMode === 'week') {
      const d = new Date(currentYear, currentMonth, currentDay + 7);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setCurrentDay(d.getDate());
    } else {
      const d = new Date(currentYear, currentMonth, currentDay + 1);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setCurrentDay(d.getDate());
    }
  }, [viewMode, currentYear, currentMonth, currentDay]);

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setCurrentDay(now.getDate());
    setSelectedDay(dateToStr(now));
  };

  const openEditModal = (req: PermissionRequest) => {
    setEditingRequest(req);
    setEditForm({
      typeId: req.typeId,
      startDate: req.startDate,
      endDate: req.endDate,
      reason: req.reason,
      status: req.status,
    });
  };

  const saveEdit = async () => {
    if (!editingRequest) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/permissions/requests/${editingRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          days: calcDaysBetween(editForm.startDate, editForm.endDate),
        }),
      });
      if (res.ok) {
        setRequests(prev => prev.map(r =>
          r.id === editingRequest.id
            ? { ...r, ...editForm, days: calcDaysBetween(editForm.startDate, editForm.endDate) }
            : r
        ));
        setEditingRequest(null);
      }
    } catch (e) {
      console.error('Error updating request:', e);
    } finally {
      setSaving(false);
    }
  };

  const deleteRequest = async (reqId: string) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/permissions/requests/${reqId}`, { method: 'DELETE' });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== reqId));
        setShowDeleteConfirm(null);
      }
    } catch (e) {
      console.error('Error deleting request:', e);
    }
  };

  const resolveRequest = async (reqId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/permissions/requests/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolvedAt: new Date().toISOString() }),
      });
      if (res.ok) {
        setRequests(prev => prev.map(r =>
          r.id === reqId ? { ...r, status, resolvedAt: new Date().toISOString() } : r
        ));
      }
    } catch (e) {
      console.error('Error resolving request:', e);
    }
  };

  const hasActiveFilters = filterEmployee !== 'all' || filterType !== 'all' || filterStatus !== 'all';

  const navigationLabel = useMemo(() => {
    if (viewMode === 'month') return `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    if (viewMode === 'week') {
      const first = weekDays[0];
      const last = weekDays[6];
      if (first.date.getMonth() === last.date.getMonth()) {
        return `${first.date.getDate()} - ${last.date.getDate()} de ${MONTH_NAMES[first.date.getMonth()]} ${first.date.getFullYear()}`;
      }
      return `${formatDateShort(first.dateStr)} - ${formatDateShort(last.dateStr)} ${first.date.getFullYear()}`;
    }
    return `${DAY_NAMES_FULL[currentDay !== undefined ? new Date(currentYear, currentMonth, currentDay).getDay() : 0]} ${currentDay} de ${MONTH_NAMES[currentMonth]} ${currentYear}`;
  }, [viewMode, currentYear, currentMonth, currentDay, weekDays]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/hr/vacations`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Calendario de Vacaciones y Permisos
          </h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-3"><CardContent className="text-center">
          <div className="text-2xl font-bold text-blue-600">{monthStats.totalDays}</div>
          <div className="text-xs text-gray-500">Días este mes</div>
        </CardContent></Card>
        <Card className="py-3"><CardContent className="text-center">
          <div className="text-2xl font-bold text-green-600">{monthStats.activeEmployees}</div>
          <div className="text-xs text-gray-500">Empleados ausentes</div>
        </CardContent></Card>
        <Card className="py-3"><CardContent className="text-center">
          <div className="text-2xl font-bold text-purple-600">{monthStats.totalRequests}</div>
          <div className="text-xs text-gray-500">Solicitudes</div>
        </CardContent></Card>
        <Card className="py-3"><CardContent className="text-center">
          <div className="text-2xl font-bold text-orange-600">{monthStats.pending}</div>
          <div className="text-xs text-gray-500">Pendientes</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card><CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="all">Todos los empleados</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="all">Todos los tipos</option>
            {permTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="border rounded px-2 py-1.5 text-sm">
            <option value="all">Todos los estados</option>
            <option value="approved">Aprobadas</option>
            <option value="pending">Pendientes</option>
            <option value="rejected">Rechazadas</option>
          </select>
          {hasActiveFilters && (
            <button onClick={() => { setFilterEmployee('all'); setFilterType('all'); setFilterStatus('all'); }}
              className="text-sm text-blue-600 underline flex items-center gap-1">
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
        </div>
      </CardContent></Card>

      {/* Navigation + View Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrev}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold min-w-[220px] text-center">{navigationLabel}</h2>
          <Button variant="outline" size="sm" onClick={navigateNext}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">Hoy</Button>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {([['day','Día'],['week','Semana'],['month','Mes']] as [ViewMode, string][]).map(([mode, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === mode ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          {permTypes.map(pt => {
            const c = getColor(pt.colorValue);
            return (
              <div key={pt.id} className="flex items-center gap-1 text-xs">
                <div className={`w-3 h-3 rounded-sm ${c.dot}`} />
                <span className="text-gray-600">{pt.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== MONTH VIEW ===== */}
      {viewMode === 'month' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {DAY_NAMES.map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const events = eventsByDay[day.dateStr] || [];
              const isSelected = selectedDay === day.dateStr;
              return (
                <div key={idx} onClick={() => setSelectedDay(isSelected ? null : day.dateStr)}
                  className={`min-h-[90px] border-b border-r p-1.5 cursor-pointer transition-colors ${
                    !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white hover:bg-gray-50'
                  } ${day.isToday ? 'ring-2 ring-inset ring-blue-500' : ''} ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}>
                  <div className={`text-xs font-medium mb-1 ${day.isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((ev, i) => {
                      const c = getColor(ev.color);
                      return (
                        <div key={i} onClick={(e) => { e.stopPropagation(); openEditModal(ev.request); }}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${c.bg} ${c.text} border ${c.border}`}
                          title={`${ev.request.employeeName} — ${ev.request.days} día(s) — Click para editar`}>
                          {ev.isStart ? ev.request.employeeName.split(' ')[0] : '→'}
                          {ev.request.days > 1 && !ev.isEnd && ' ─'}
                        </div>
                      );
                    })}
                    {events.length > 3 && <div className="text-[10px] text-gray-500 font-medium">+{events.length - 3} más</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== WEEK VIEW ===== */}
      {viewMode === 'week' && (() => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
        return (
          <div className="border rounded-lg overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b bg-gray-50">
              <div className="py-2 text-center text-[10px] text-gray-400 font-medium border-r">Hora</div>
              {weekDays.map((day, i) => (
                <div key={i} onClick={() => { setCurrentDay(day.date.getDate()); setViewMode('day'); setSelectedDay(day.dateStr); }}
                  className={`py-2 text-center cursor-pointer hover:bg-gray-100 transition-colors border-r last:border-r-0 ${day.isToday ? 'bg-blue-50' : ''}`}>
                  <div className="text-[10px] text-gray-500">{DAY_NAMES[i]}</div>
                  <div className={`text-lg font-bold ${day.isToday ? 'text-blue-600' : ''}`}>{day.date.getDate()}</div>
                </div>
              ))}
            </div>
            {/* All-day events row */}
            <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b bg-gray-50/50 min-h-[40px]">
              <div className="py-1 text-[10px] text-gray-400 text-center border-r flex items-center justify-center">Todo el día</div>
              {weekDays.map((day, i) => {
                const events = eventsByDay[day.dateStr] || [];
                return (
                  <div key={i} className={`border-r last:border-r-0 p-0.5 ${day.isToday ? 'bg-blue-50/20' : ''}`}>
                    <div className="space-y-0.5">
                      {events.map((ev, j) => {
                        const c = getColor(ev.color);
                        const pt = permTypes.find(t => t.id === ev.request.typeId);
                        return (
                          <div key={j} onClick={() => openEditModal(ev.request)}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${c.bg} ${c.text} border ${c.border}`}
                            title={`${ev.request.employeeName} — ${pt?.label} — Click para editar`}>
                            {ev.request.employeeName.split(' ')[0]}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Time grid */}
            <div className="grid grid-cols-[48px_repeat(7,1fr)] max-h-[600px] overflow-y-auto relative">
              {HOURS.map((hour) => (
                <div key={hour} className="contents">
                  <div className="h-[50px] border-r border-b border-gray-100 text-[10px] text-gray-400 text-right pr-1 pt-0 relative">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                  {weekDays.map((day, i) => (
                    <div key={i} className={`h-[50px] border-r border-b border-gray-100 last:border-r-0 relative ${day.isToday ? 'bg-blue-50/10' : ''}`}>
                      {day.isToday && hour === currentHour && (
                        <div className="absolute left-0 right-0 z-10" style={{ top: `${(currentMinute / 60) * 100}%` }}>
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                            <div className="flex-1 h-[2px] bg-red-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ===== DAY VIEW ===== */}
      {viewMode === 'day' && (() => {
        const ds = dateToStr(new Date(currentYear, currentMonth, currentDay));
        const events = eventsByDay[ds] || [];
        const isToday = ds === dateToStr(new Date());
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
        return (
          <div className="border rounded-lg overflow-hidden">
            {/* All-day events section */}
            <div className={`border-b ${isToday ? 'bg-blue-50/50' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-[48px_1fr]">
                <div className="py-2 text-[10px] text-gray-400 text-center border-r flex items-center justify-center">Todo el día</div>
                <div className="p-2">
                  {events.length === 0 ? (
                    <div className="text-xs text-gray-400 py-1">Sin permisos este día</div>
                  ) : (
                    <div className="space-y-1">
                      {events.map((ev, i) => {
                        const c = getColor(ev.color);
                        const pt = permTypes.find(t => t.id === ev.request.typeId);
                        const emp = employees.find(e => e.id === ev.request.employeeId);
                        return (
                          <div key={i} onClick={() => openEditModal(ev.request)}
                            className={`flex items-center justify-between p-2 rounded border cursor-pointer hover:shadow-sm transition-shadow ${c.border} ${c.light}`}>
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${c.bg} ${c.text}`}>{pt?.label || ev.request.typeId}</span>
                              <span className="font-medium text-sm truncate">{ev.request.employeeName}</span>
                              {emp?.position && <span className="text-xs text-gray-400 truncate hidden sm:inline">— {emp.position}</span>}
                              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                                ev.request.status === 'approved' ? 'bg-green-100 text-green-700' :
                                ev.request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {ev.request.status === 'approved' ? 'Aprobada' : ev.request.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                              </span>
                              {ev.request.days > 1 && <span className="text-[10px] text-gray-400">{ev.request.days}d</span>}
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              {ev.request.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={(e) => { e.stopPropagation(); resolveRequest(ev.request.id, 'approved'); }}>
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-red-600 border-red-300 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); resolveRequest(ev.request.id, 'rejected'); }}>
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="outline" className="h-6 w-6 p-0"
                                onClick={(e) => { e.stopPropagation(); openEditModal(ev.request); }}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(ev.request.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Time grid */}
            <div className="max-h-[600px] overflow-y-auto">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[48px_1fr] relative">
                  <div className="h-[50px] border-r border-b border-gray-100 text-[10px] text-gray-400 text-right pr-1 pt-0">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                  <div className={`h-[50px] border-b border-gray-100 relative ${isToday && hour === currentHour ? 'bg-blue-50/10' : ''}`}>
                    {isToday && hour === currentHour && (
                      <div className="absolute left-0 right-0 z-10" style={{ top: `${(currentMinute / 60) * 100}%` }}>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-[2px] bg-red-500" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Selected Day Detail (month view) */}
      {selectedDay && viewMode === 'month' && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{formatDateLong(selectedDay)} — {selectedDayEvents.length} permiso(s)</span>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay permisos en este día</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev, i) => {
                  const c = getColor(ev.color);
                  const pt = permTypes.find(t => t.id === ev.request.typeId);
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${c.border} ${c.light}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${c.bg} ${c.text}`}>{pt?.label || ev.request.typeId}</span>
                          <span className="font-medium text-sm">{ev.request.employeeName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            ev.request.status === 'approved' ? 'bg-green-100 text-green-700' :
                            ev.request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {ev.request.status === 'approved' ? 'Aprobada' : ev.request.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDateLong(ev.request.startDate)} — {formatDateLong(ev.request.endDate)} • {ev.request.days} día(s)
                        </div>
                        {ev.request.reason && <div className="text-xs text-gray-400 mt-0.5">{ev.request.reason}</div>}
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        {ev.request.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => resolveRequest(ev.request.id, 'approved')}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => resolveRequest(ev.request.id, 'rejected')}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" className="h-7" onClick={() => openEditModal(ev.request)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-red-500 hover:bg-red-50"
                          onClick={() => setShowDeleteConfirm(ev.request.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mobile legend */}
      <div className="md:hidden flex flex-wrap items-center gap-3 justify-center">
        {permTypes.map(pt => {
          const c = getColor(pt.colorValue);
          return (
            <div key={pt.id} className="flex items-center gap-1 text-xs">
              <div className={`w-3 h-3 rounded-sm ${c.dot}`} />
              <span className="text-gray-600">{pt.label}</span>
            </div>
          );
        })}
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingRequest(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Editar Permiso
              </h3>
              <button onClick={() => setEditingRequest(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Empleado</label>
                <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">{editingRequest.employeeName}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de Permiso</label>
                <select value={editForm.typeId} onChange={e => setEditForm(f => ({ ...f, typeId: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {permTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Fecha Inicio</label>
                  <input type="date" value={editForm.startDate}
                    onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Fecha Fin</label>
                  <input type="date" value={editForm.endDate}
                    onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {calcDaysBetween(editForm.startDate, editForm.endDate)} día(s)
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Motivo</label>
                <textarea value={editForm.reason} rows={2}
                  onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Estado</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="pending">Pendiente</option>
                  <option value="approved">Aprobada</option>
                  <option value="rejected">Rechazada</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setEditingRequest(null)}>Cancelar</Button>
              <Button onClick={saveEdit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM MODAL ===== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <Trash2 className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">Eliminar Permiso</h3>
            <p className="text-sm text-gray-500 mb-5">¿Estás seguro de que deseas eliminar esta solicitud? Esta acción no se puede deshacer.</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteRequest(showDeleteConfirm)}>
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
