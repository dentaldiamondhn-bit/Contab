'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Trash2,
  Settings,
  Save,
  X,
  Plane,
  DollarSign,
  TrendingUp,
  FileText,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  RotateCcw,
  Star,
  Plus,
  CalendarOff,
  BarChart3,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  status: 'active' | 'inactive' | 'terminated' | 'suspended';
  contractType?: 'indefinido' | 'temporal' | 'obra';
  gender?: 'M' | 'F';
  scheduleEntry?: string;
  scheduleExit?: string;
  freeDays?: number[];
  terminationDate?: string;
}

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'late' | 'vacation' | 'overtime' | 'unpaid_leave' | 'disability' | 'holiday' | 'free_day';
  amount?: number;
  hours?: number;
  overtimeHours?: number;
  overtimeAmount?: number;
  overtimeRate?: number;
  holidayType?: 'doble' | 'triple';
  notes?: string;
}

interface Holiday {
  date: string;
  name: string;
  type: 'doble' | 'triple';
}

interface WorkSchedule {
  employeeId: string;
  freeDays: number[]; // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
}

type DisabilityPaymentType = 'full' | 'ihss' | 'none' | 'maternity';

interface DisabilityType {
  value: DisabilityPaymentType;
  label: string;
  percentage: number;
  description: string;
  isFemaleOnly?: boolean;
}

const DISABILITY_TYPES: DisabilityType[] = [
  { value: 'full', label: 'Incapacidad 100%', percentage: 100, description: 'Patrón paga el 100%' },
  { value: 'ihss', label: 'Incapacidad IHSS', percentage: 33, description: 'Patrón paga 33%, IHSS cubre el resto' },
  { value: 'none', label: 'Incapacidad sin pago', percentage: 0, description: 'Sin goce de salario' },
  { value: 'maternity', label: 'Incapacidad por Maternidad', percentage: 100, description: '100% pagada - 84 días (Ley del IHSS)', isFemaleOnly: true },
];

const DEFAULT_SCHEDULES: Record<string, number[]> = {
  'lun-sab': [0], // Dom libre
  'lun-vie': [0, 6], // Dom y Sab libre
  'mirob-sab': [3], // Miércoles libre
};

const DEFAULT_HONDURAS_HOLIDAYS: Holiday[] = [
  { date: '2026-01-01', name: 'Año Nuevo', type: 'doble' },
  { date: '2026-04-14', name: 'Día de las Américas', type: 'doble' },
  { date: '2026-04-17', name: 'Viernes Santo', type: 'doble' },
  { date: '2026-04-18', name: 'Sábado de Gloria', type: 'doble' },
  { date: '2026-05-01', name: 'Día del Trabajo', type: 'doble' },
  { date: '2026-06-15', name: 'Día del Padre', type: 'doble' },
  { date: '2026-09-15', name: 'Día de la Independencia', type: 'doble' },
  { date: '2026-10-03', name: 'Nacimiento de Francisco Morazán', type: 'doble' },
  { date: '2026-10-12', name: 'Día de la Raza', type: 'doble' },
  { date: '2026-10-21', name: 'Día de las Fuerzas Armadas', type: 'doble' },
  { date: '2026-12-25', name: 'Navidad', type: 'doble' },
];

interface DeductionConfig {
  absent: { type: 'fixed' | 'daily'; value: number };
  late: { type: 'fixed' | 'hourly'; value: number };
  vacation: { type: 'none' | 'paid'; value: number };
  unpaid_leave: { type: 'fixed' | 'daily'; value: number };
  disability: { type: 'none' | 'paid'; value: number };
  overtime: { type: 'hourly'; value: number };
}

const DEFAULT_DEDUCTION_CONFIG: DeductionConfig = {
  absent: { type: 'daily', value: 0 },
  late: { type: 'hourly', value: 0 },
  vacation: { type: 'paid', value: 0 },
  unpaid_leave: { type: 'daily', value: 0 },
  disability: { type: 'paid', value: 0 },
  overtime: { type: 'hourly' as 'hourly' | 'hourly_200' | 'fixed', value: 0 },
};

const STATUS_OPTIONS: { value: Attendance['status']; label: string; color: string; bgColor: string }[] = [
  { value: 'present', label: 'P', color: 'text-green-700', bgColor: 'bg-green-100 hover:bg-green-200' },
  { value: 'absent', label: 'A', color: 'text-red-700', bgColor: 'bg-red-100 hover:bg-red-200' },
  { value: 'late', label: 'T', color: 'text-yellow-700', bgColor: 'bg-yellow-100 hover:bg-yellow-200' },
  { value: 'vacation', label: 'V', color: 'text-blue-700', bgColor: 'bg-blue-100 hover:bg-blue-200' },
  { value: 'overtime', label: 'HE', color: 'text-orange-700', bgColor: 'bg-orange-100 hover:bg-orange-200' },
  { value: 'unpaid_leave', label: 'SP', color: 'text-gray-700', bgColor: 'bg-gray-200 hover:bg-gray-300' },
  { value: 'disability', label: 'I', color: 'text-pink-700', bgColor: 'bg-pink-100 hover:bg-pink-200' },
  { value: 'holiday', label: 'F', color: 'text-indigo-700', bgColor: 'bg-indigo-100 hover:bg-indigo-200' },
  { value: 'free_day', label: 'DL', color: 'text-teal-700', bgColor: 'bg-teal-100 hover:bg-teal-200' },
];

function getQuincenaDates(startDate: string): string[] {
  const dates: string[] = [];
  const base = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.toLocaleDateString('es-HN', { weekday: 'short' });
  const num = d.getDate();
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} ${num}`;
}

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showConfig, setShowConfig] = useState(false);
  const [deductionConfig, setDeductionConfig] = useState<DeductionConfig>(DEFAULT_DEDUCTION_CONFIG);
  const [editingAmount, setEditingAmount] = useState<{ empId: string; status: string } | null>(null);
  const [tempAmount, setTempAmount] = useState('');
  const [tempHours, setTempHours] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<{ empName: string; empId: string; date: string; status: string; amount: number; hours: number; error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'day' | 'quincena'>('day');
  const [latePrompt, setLatePrompt] = useState<{ empId: string; empName: string; date: string } | null>(null);
  const [lateHours, setLateHours] = useState('1');
  const [lateMinutes, setLateMinutes] = useState('0');
  const [overtimePrompt, setOvertimePrompt] = useState<{ empId: string; empName: string; date: string } | null>(null);
  const [overtimeHours, setOvertimeHours] = useState('1');
  const [overtimeMinutes, setOvertimeMinutes] = useState('0');
  const [holidays, setHolidays] = useState<Holiday[]>(DEFAULT_HONDURAS_HOLIDAYS);
  const [showHolidaysConfig, setShowHolidaysConfig] = useState(false);
  const [holidayPrompt, setHolidayPrompt] = useState<{ empId: string; empName: string; date: string } | null>(null);
  const [disabilityPrompt, setDisabilityPrompt] = useState<{ empId: string; empName: string; date: string } | null>(null);
  const [disabilityHours, setDisabilityHours] = useState('8');
  const [disabilityMinutes, setDisabilityMinutes] = useState('0');
  const [collapsedEmployees, setCollapsedEmployees] = useState<Set<string>>(new Set());
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [showScheduleConfig, setShowScheduleConfig] = useState(false);
  const [selectedScheduleTemplate, setSelectedScheduleTemplate] = useState('lun-sab');
  const [undoHistory, setUndoHistory] = useState<Attendance[][]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'terminated' | 'suspended'>('all');
  const [selectedStatFilter, setSelectedStatFilter] = useState<string | null>(null);
  const [quincenaStartDate, setQuincenaStartDate] = useState(() => {
    const now = new Date();
    const day = now.getDate();
    if (day <= 15) return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    return new Date(now.getFullYear(), now.getMonth(), 16).toISOString().split('T')[0];
  });

  useEffect(() => {
    loadData();
  }, [companyId]);

  useEffect(() => {
    if (viewMode === 'quincena' && activeEmployees.length > 0) {
      autoMarkFreeDays();
      if (holidays.length > 0) {
        applyHolidayDefaults();
      }
    }
  }, [viewMode, quincenaStartDate, schedules, holidays]);

  useEffect(() => {
    if (viewMode === 'quincena') {
      const inQuincena = quincenaDates.includes(selectedDate);
      if (!inQuincena) {
        const now = new Date(selectedDate + 'T00:00:00');
        const day = now.getDate();
        if (day <= 15) {
          setQuincenaStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
        } else {
          setQuincenaStartDate(new Date(now.getFullYear(), now.getMonth(), 16).toISOString().split('T')[0]);
        }
      }
    }
  }, [viewMode, selectedDate]);

  const loadData = async () => {
    try {
      const [attRes, configRes, holidaysRes, schedulesRes, empRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/hr/attendance`),
        fetch(`/api/companies/${companyId}/hr/attendance/config`),
        fetch(`/api/companies/${companyId}/hr/attendance/holidays`),
        fetch(`/api/companies/${companyId}/hr/attendance/schedules`),
        fetch(`/api/companies/${companyId}/employees`),
      ]);
      if (attRes.ok) {
        const data = await attRes.json();
        setAttendance(data.map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id || r.employeeId,
          date: r.date,
          checkIn: r.check_in || r.checkIn || '',
          checkOut: r.check_out || r.checkOut || '',
          status: r.status,
          amount: r.amount || 0,
          hours: r.hours || 0,
          overtimeHours: r.overtime_hours || r.overtimeHours || 0,
          overtimeAmount: r.overtime_amount || r.overtimeAmount || 0,
          overtimeRate: r.overtime_rate || r.overtimeRate,
          holidayType: r.holiday_type || r.holidayType,
          notes: r.notes || '',
        })));
      }
      if (configRes.ok) {
        const data = await configRes.json();
        setDeductionConfig({ ...DEFAULT_DEDUCTION_CONFIG, ...data });
      }
      if (holidaysRes.ok) {
        const data = await holidaysRes.json();
        if (data.length > 0) setHolidays(data.map((h: any) => ({ date: h.date, name: h.name, type: h.type })));
      }
      let currentSchedules: WorkSchedule[] = [];
      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        currentSchedules = data.map((s: any) => ({ employeeId: s.employee_id || s.employeeId, freeDays: s.free_days || s.freeDays || [] }));
        setSchedules(currentSchedules);
      }
      if (empRes.ok) {
        const data = await empRes.json();
        const emps = data.map((e: any) => ({
          id: e.id,
          name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
          position: e.position || '',
          department: e.department || '',
          salary: e.salary || 0,
          status: e.status || 'active',
          contractType: e.contractType || e.contract_type || 'indefinido',
          gender: e.gender || undefined,
          freeDays: e.freeDays || [],
          scheduleEntry: e.scheduleEntry || '',
          scheduleExit: e.scheduleExit || '',
          terminationDate: e.terminationDate || '',
        }));
        setEmployees(emps);
        let schedulesChanged = false;
        emps.forEach(emp => {
          if (emp.freeDays && emp.freeDays.length > 0) {
            const existing = currentSchedules.find(s => s.employeeId === emp.id);
            if (!existing || JSON.stringify(existing.freeDays) !== JSON.stringify(emp.freeDays)) {
              const idx = currentSchedules.findIndex(s => s.employeeId === emp.id);
              if (idx >= 0) currentSchedules[idx] = { employeeId: emp.id, freeDays: emp.freeDays };
              else currentSchedules.push({ employeeId: emp.id, freeDays: emp.freeDays });
              schedulesChanged = true;
            }
          }
        });
        if (schedulesChanged) {
          for (const schedule of currentSchedules) {
            await fetch(`/api/companies/${companyId}/hr/attendance/schedules`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employee_id: schedule.employeeId, free_days: schedule.freeDays }),
            });
          }
          setSchedules(currentSchedules);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const saveAttendanceRecords = async (records: Attendance[]) => {
    try {
      for (const record of records) {
        await fetch(`/api/companies/${companyId}/hr/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: record.employeeId,
            date: record.date,
            status: record.status,
            amount: record.amount || 0,
            overtime_amount: record.overtimeAmount || 0,
            overtime_hours: record.overtimeHours || 0,
            holiday_type: record.holidayType || null,
            disability_type: record.disabilityType || null,
            notes: record.notes || '',
          }),
        });
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
    }
  };

  const saveSingleRecord = async (record: Attendance) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: record.employeeId,
          date: record.date,
          status: record.status,
          amount: record.amount || 0,
          overtime_amount: record.overtimeAmount || 0,
          overtime_hours: record.overtimeHours || 0,
          holiday_type: record.holidayType || null,
          disability_type: record.disabilityType || null,
          notes: record.notes || '',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Error saving single record:', err);
      }
    } catch (err) {
      console.error('Error saving single record:', err);
    }
  };

  const saveConfig = async () => {
    try {
      await fetch(`/api/companies/${companyId}/hr/attendance/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deductionConfig),
      });
    } catch (err) {
      console.error('Error saving config:', err);
    }
    setShowConfig(false);
  };

  const saveHolidays = async () => {
    try {
      for (const holiday of holidays) {
        await fetch(`/api/companies/${companyId}/hr/attendance/holidays`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: holiday.date, name: holiday.name, type: holiday.type }),
        });
      }
    } catch (err) {
      console.error('Error saving holidays:', err);
    }
    setShowHolidaysConfig(false);
  };

  const saveSchedules = async () => {
    try {
      for (const schedule of schedules) {
        await fetch(`/api/companies/${companyId}/hr/attendance/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: schedule.employeeId, free_days: schedule.freeDays }),
        });
      }
    } catch (err) {
      console.error('Error saving schedules:', err);
    }
    setShowScheduleConfig(false);
  };

  const getSchedule = (empId: string): WorkSchedule | undefined => {
    return schedules.find(s => s.employeeId === empId);
  };

  const applyScheduleToEmployee = (empId: string, freeDays: number[]) => {
    setSchedules(prev => {
      const existing = prev.find(s => s.employeeId === empId);
      const updated = existing
        ? prev.map(s => s.employeeId === empId ? { ...s, freeDays } : s)
        : [...prev, { employeeId: empId, freeDays }];
      fetch(`/api/companies/${companyId}/hr/attendance/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: empId, free_days: freeDays }),
      }).catch(err => console.error('Error saving schedule:', err));
      return updated;
    });
  };

  const applyScheduleToAll = async (freeDays: number[]) => {
    const updated = activeEmployees.map(emp => ({
      employeeId: emp.id,
      freeDays,
    }));
    setSchedules(updated);
    try {
      for (const schedule of updated) {
        await fetch(`/api/companies/${companyId}/hr/attendance/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: schedule.employeeId, free_days: schedule.freeDays }),
        });
      }
    } catch (err) {
      console.error('Error saving schedules:', err);
    }
  };

  const autoMarkFreeDays = () => {
    const updated = [...attendance];
    let changed = false;
    activeEmployees.forEach(employee => {
      const schedule = getSchedule(employee.id);
      if (!schedule) return;
      quincenaDates.forEach(date => {
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();
        if (!schedule.freeDays.includes(dayOfWeek)) return;
        const existing = updated.find(a => a.employeeId === employee.id && a.date === date);
        if (existing && existing.status === 'free_day') return;
        if (existing && existing.status !== 'present') return;
        const record: Attendance = {
          id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          employeeId: employee.id,
          date,
          checkIn: '',
          checkOut: '',
          status: 'free_day',
          amount: 0,
          hours: 0,
          notes: 'Dia libre según horario',
        };
        if (existing) {
          const idx = updated.findIndex(a => a.id === existing.id);
          updated[idx] = record;
        } else {
          updated.push(record);
        }
        changed = true;
      });
    });
    if (changed) {
      pushUndo();
      saveAttendanceRecords(updated);
      setAttendance(updated);
    }
  };

  const getHoliday = (date: string): Holiday | undefined => {
    return holidays.find(h => h.date === date);
  };

  const addHoliday = (date: string, name: string) => {
    if (!date || !name) return;
    if (holidays.find(h => h.date === date)) {
      alert('Ya existe un feriado en esta fecha');
      return;
    }
    setHolidays([...holidays, { date, name, type: 'libre' }]);
  };

  const removeHoliday = (date: string) => {
    setHolidays(holidays.filter(h => h.date !== date));
  };

  const updateHolidayType = (date: string, type: 'doble' | 'triple') => {
    setHolidays(holidays.map(h => h.date === date ? { ...h, type } : h));
  };

  const pushUndo = () => {
    setUndoHistory(prev => [...prev, structuredClone(attendance)]);
  };

  const undo = () => {
    if (undoHistory.length === 0) return;
    const last = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));
    saveAttendanceRecords(last);
    setAttendance(last);
  };

  const getDefaultAmount = (emp: Employee, status: string): { amount: number; hours: number } => {
    const config = deductionConfig[status as keyof DeductionConfig];
    if (!config || !emp.salary) return { amount: 0, hours: 0 };
    const dailySalary = emp.salary / 30;
    const hourlySalary = emp.salary / 240; // Salario base / 240 horas mensuales (30 días × 8 horas)
    switch (status) {
      case 'absent':
        if (config.type === 'daily') return { amount: config.value || dailySalary, hours: 8 };
        return { amount: config.value, hours: 8 };
      case 'late':
        if (config.type === 'hourly') return { amount: config.value || hourlySalary, hours: 1 };
        return { amount: config.value, hours: 1 };
      case 'unpaid_leave':
        if (config.type === 'daily') return { amount: config.value || dailySalary, hours: 8 };
        return { amount: config.value, hours: 8 };
      case 'overtime':
        return { amount: config.value || hourlySalary * 1.5, hours: 0 };
      default:
        return { amount: 0, hours: 0 };
    }
  };

  const recordAttendance = (employeeId: string, status: Attendance['status'], date?: string) => {
    const targetDate = date || selectedDate;
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === targetDate);
    const emp = employees.find(e => e.id === employeeId);
    const defaults = emp ? getDefaultAmount(emp, status) : { amount: 0, hours: 0 };
    const newAttendance: Attendance = {
      id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employeeId,
      date: targetDate,
      checkIn: new Date().toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }),
      checkOut: '',
      status,
      amount: defaults.amount,
      hours: defaults.hours,
      notes: ''
    };
    const updated = existing 
      ? attendance.map(a => a.id === existing.id ? newAttendance : a)
      : [...attendance, newAttendance];
    pushUndo();
    saveSingleRecord(newAttendance);
    setAttendance(updated);
  };

  const recordDisability = (employeeId: string, disabilityType: DisabilityPaymentType, date?: string, hours?: number) => {
    const targetDate = date || selectedDate;
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === targetDate);
    const emp = employees.find(e => e.id === employeeId);
    const config = DISABILITY_TYPES.find(d => d.value === disabilityType);
    const dailySalary = emp ? emp.salary / 30 : 0;
    const hourlySalary = dailySalary / 8;
    const disabilityHours = hours !== undefined ? hours : 8;
    let amount: number;
    let label: string;
    if (disabilityType === 'none') {
      amount = dailySalary - (hourlySalary * disabilityHours);
      label = `Incapacidad sin pago (${disabilityHours}h) - Descuento: L ${(hourlySalary * disabilityHours).toFixed(2)}`;
    } else if (disabilityType === 'maternity') {
      amount = dailySalary;
      label = 'Incapacidad por Maternidad (84 días) - 100% pagada';
    } else {
      amount = dailySalary * (config?.percentage || 0) / 100 * (disabilityHours / 8);
      label = config?.label || 'Incapacidad';
    }
    const newAttendance: Attendance = {
      id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employeeId,
      date: targetDate,
      checkIn: '',
      checkOut: '',
      status: 'disability',
      amount,
      hours: disabilityHours,
      notes: label,
    };
    const updated = existing
      ? attendance.map(a => a.id === existing.id ? newAttendance : a)
      : [...attendance, newAttendance];
    pushUndo();
    saveSingleRecord(newAttendance);
    setAttendance(updated);
    setDisabilityPrompt(null);
  };

  const updateAttendanceAmount = (empId: string, status: string, amount: number, hours?: number) => {
    const existing = attendance.find(a => a.employeeId === empId && a.date === selectedDate);
    const updated = attendance.map(a => {
      if (a.employeeId === empId && a.date === selectedDate) {
        return { ...a, amount, ...(hours !== undefined ? { hours } : {}) };
      }
      return a;
    });
    const changed = updated.find(a => a.employeeId === empId && a.date === selectedDate);
    pushUndo();
    if (changed) saveSingleRecord(changed);
    setAttendance(updated);
    setEditingAmount(null);
  };

  const getAttendance = (employeeId: string, date?: string) => {
    return attendance.find(a => a.employeeId === employeeId && a.date === (date || selectedDate));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'vacation': return 'bg-blue-100 text-blue-800';
      case 'overtime': return 'bg-orange-100 text-orange-800';
      case 'unpaid_leave': return 'bg-gray-200 text-gray-800';
      case 'disability': return 'bg-pink-100 text-pink-800';
      case 'holiday': return 'bg-indigo-100 text-indigo-800';
      case 'free_day': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Presente';
      case 'absent': return 'Ausente';
      case 'late': return 'Tardanza';
      case 'vacation': return 'Vacaciones';
      case 'overtime': return 'Horas Extras';
      case 'unpaid_leave': return 'Permiso s/pago';
      case 'disability': return 'Incapacidad';
      case 'holiday': return 'Feriado';
      case 'free_day': return 'Dia libre';
      default: return 'Sin registro';
    }
  };

  const todayStats = {
    present: attendance.filter(a => a.date === selectedDate && a.status === 'present').length,
    absent: attendance.filter(a => a.date === selectedDate && a.status === 'absent').length,
    late: attendance.filter(a => a.date === selectedDate && a.status === 'late').length,
    vacation: attendance.filter(a => a.date === selectedDate && a.status === 'vacation').length,
    overtime: attendance.filter(a => a.date === selectedDate && a.overtimeHours && a.overtimeHours > 0).length,
    unpaid_leave: attendance.filter(a => a.date === selectedDate && a.status === 'unpaid_leave').length,
    disability: attendance.filter(a => a.date === selectedDate && a.status === 'disability').length,
    holiday: attendance.filter(a => a.date === selectedDate && a.status === 'holiday').length,
    free_day: attendance.filter(a => a.date === selectedDate && a.status === 'free_day').length,
  };

  const activeEmployees = employees.filter(e => {
    if (filterStatus === 'all') return e.status === 'active' || e.status === 'suspended';
    return e.status === filterStatus;
  });
  const departments = useMemo(() => [...new Set(activeEmployees.map(e => e.department).filter(Boolean))].sort(), [activeEmployees]);
  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchesSearch = searchTerm === '' || emp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
      return matchesSearch && matchesDept;
    });
  }, [activeEmployees, searchTerm, filterDepartment]);
  const quincenaDates = getQuincenaDates(quincenaStartDate);

  const clearAttendance = () => {
    if (!confirm('¿Limpiar todo el registro de asistencia para esta fecha?')) return;
    const updated = attendance.filter(a => a.date !== selectedDate);
    pushUndo();
    saveAttendanceRecords(updated);
    setAttendance(updated);
  };

  const toggleEmployeeCollapse = (empId: string) => {
    setCollapsedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const toggleAllCollapse = () => {
    if (collapsedEmployees.size === activeEmployees.length) {
      setCollapsedEmployees(new Set());
    } else {
      setCollapsedEmployees(new Set(activeEmployees.map(e => e.id)));
    }
  };

  const clearEmployeeAttendance = (employeeId: string) => {
    const updated = attendance.filter(a => !(a.employeeId === employeeId && a.date === selectedDate));
    pushUndo();
    saveAttendanceRecords(updated);
    setAttendance(updated);
  };

  const clearQuincena = () => {
    if (!confirm('¿Limpiar toda la quincena?')) return;
    const updated = attendance.filter(a => !quincenaDates.includes(a.date));
    pushUndo();
    saveAttendanceRecords(updated);
    setAttendance(updated);
  };

  const clearEmployeeQuincena = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!confirm(`¿Limpiar asistencia de ${emp?.name || 'este empleado'} en la quincena?`)) return;
    const updated = attendance.filter(a => !(a.employeeId === employeeId && quincenaDates.includes(a.date)));
    pushUndo();
    saveAttendanceRecords(updated);
    setAttendance(updated);
  };

  const setBulkAll = (status: Attendance['status']) => {
    const emp = (id: string) => employees.find(e => e.id === id);
    const updated = [...attendance];
    activeEmployees.forEach(employee => {
      quincenaDates.forEach(date => {
        const existing = updated.find(a => a.employeeId === employee.id && a.date === date);
        const defaults = getDefaultAmount(employee, status);
        const record: Attendance = {
          id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          employeeId: employee.id,
          date,
          checkIn: '',
          checkOut: '',
          status,
          amount: defaults.amount,
          hours: defaults.hours,
          notes: 'Masivo quincena',
        };
        if (existing) {
          const idx = updated.findIndex(a => a.id === existing.id);
          updated[idx] = record;
        } else {
          updated.push(record);
        }
      });
    });
    pushUndo();
    saveAttendanceRecords(updated);
    setAttendance(updated);
  };

  const applyQuincenaTemplate = (statuses: Attendance['status'][]) => {
    const emp = (id: string) => employees.find(e => e.id === id);
    const updated = [...attendance];
    activeEmployees.forEach(employee => {
      quincenaDates.forEach((date, i) => {
        const statusIdx = i < statuses.length ? i : statuses.length - 1;
        const status = statuses[statusIdx];
        const existing = updated.find(a => a.employeeId === employee.id && a.date === date);
        const defaults = getDefaultAmount(employee, status);
        const record: Attendance = {
          id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          employeeId: employee.id,
          date,
          checkIn: '',
          checkOut: '',
          status,
          amount: defaults.amount,
          hours: defaults.hours,
          notes: 'Plantilla quincena',
        };
        if (existing) {
          const idx = updated.findIndex(a => a.id === existing.id);
          updated[idx] = record;
        } else {
          updated.push(record);
        }
      });
    });
    pushUndo();
    saveAttendanceRecords(updated);
    setAttendance(updated);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(amount);

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getCellStatus = (empId: string, date: string): { status: string; holidayType?: string } => {
    const att = getAttendance(empId, date);
    return { status: att?.status || 'present', holidayType: att?.holidayType };
  };

  const getCellColor = (status: string): string => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    return opt ? `${opt.bgColor} ${opt.color}` : 'bg-gray-50 text-gray-400 hover:bg-gray-100';
  };

  const getCellLabel = (status: string): string => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    return opt?.label || '';
  };

  const getQuincenaTotals = (empId: string) => {
    const records = attendance.filter(a => a.employeeId === empId && quincenaDates.includes(a.date));
    let deductions = 0;
    let incomes = 0;
    records.forEach(r => {
      const amt = r.amount || 0;
      const overtimeAmt = r.overtimeAmount || 0;
      if (['absent', 'late', 'unpaid_leave'].includes(r.status)) deductions += amt;
      if (r.status === 'disability') {
        const emp = employees.find(e => e.id === empId);
        const dailySalary = emp ? emp.salary / 30 : 0;
        if (amt < dailySalary) {
          deductions += dailySalary - amt;
        }
      }
      if (overtimeAmt > 0) incomes += overtimeAmt;
      if (r.status === 'holiday') incomes += amt;
      if (r.status === 'vacation') incomes += amt;
    });
    return { deductions, incomes };
  };

  const applyHolidayDefaults = () => {
    const updated = [...attendance];
    let changed = false;
    activeEmployees.forEach(employee => {
      quincenaDates.forEach(date => {
        const holiday = getHoliday(date);
        if (!holiday) return;
        const existing = updated.find(a => a.employeeId === employee.id && a.date === date);
        if (existing && existing.status === 'holiday') return;
        const record: Attendance = {
          id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          employeeId: employee.id,
          date,
          checkIn: '',
          checkOut: '',
          status: 'holiday',
          amount: 0,
          hours: 0,
          holidayType: holiday.type,
          notes: '',
        };
        if (existing) {
          const idx = updated.findIndex(a => a.id === existing.id);
          updated[idx] = record;
        } else {
          updated.push(record);
        }
        changed = true;
      });
    });
    if (changed) {
      pushUndo();
      saveAttendanceRecords(updated);
      setAttendance(updated);
    }
  };

  const STATUS_MAP: Record<string, string> = {
    'presente': 'present', 'present': 'present',
    'ausente': 'absent', 'absent': 'absent',
    'tardanza': 'late', 'late': 'late', 'tard': 'late',
    'vacaciones': 'vacation', 'vacation': 'vacation', 'vac': 'vacation',
    'enfermedad': 'disability', 'enf': 'disability',
    'horas extras': 'overtime', 'overtime': 'overtime', 'he': 'overtime', 'hora extra': 'overtime',
    'permiso sin pago': 'unpaid_leave', 'permiso s/pago': 'unpaid_leave', 'unpaid leave': 'unpaid_leave', 'psp': 'unpaid_leave',
    'incapacidad': 'disability', 'disability': 'disability', 'incap': 'disability',
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;
      let rows: any[][] = [];
      if (file.name.endsWith('.csv')) {
        const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
        const lines = text.split('\n').filter(l => l.trim());
        rows = lines.map(line => {
          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const ch of line) {
            if (ch === '"') { inQuotes = !inQuotes; }
            else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
            else { current += ch; }
          }
          cols.push(current.trim());
          return cols;
        });
      } else {
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      }
      if (rows.length < 2) { alert('El archivo está vacío o no tiene datos.'); return; }
      const headers = rows[0].map((h: any) => String(h || '').toLowerCase().trim());
      const empNameIdx = headers.findIndex((h: string) => ['empleado', 'employee', 'nombre', 'name'].includes(h));
      const dateIdx = headers.findIndex((h: string) => ['fecha', 'date'].includes(h));
      const statusIdx = headers.findIndex((h: string) => ['estado', 'status', 'asistencia'].includes(h));
      const amountIdx = headers.findIndex((h: string) => ['monto', 'amount', 'importe'].includes(h));
      const hoursIdx = headers.findIndex((h: string) => ['horas', 'hours'].includes(h));
      if (empNameIdx === -1 || dateIdx === -1 || statusIdx === -1) {
        alert('El archivo debe tener columnas: Empleado, Fecha, Estado\nOpcional: Monto, Horas');
        return;
      }
      const preview: typeof uploadPreview = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[empNameIdx]) continue;
        const empName = String(row[empNameIdx] || '').trim();
        const dateRaw = String(row[dateIdx] || '').trim();
        const statusRaw = String(row[statusIdx] || '').toLowerCase().trim();
        const amountRaw = amountIdx >= 0 ? parseFloat(String(row[amountIdx] || '0')) : 0;
        const hoursRaw = hoursIdx >= 0 ? parseFloat(String(row[hoursIdx] || '0')) : 0;
        const matchedEmp = employees.find(e => e.name.toLowerCase() === empName.toLowerCase());
        const resolvedStatus = STATUS_MAP[statusRaw] || statusRaw;
        const validStatuses = ['present', 'absent', 'late', 'vacation', 'overtime', 'unpaid_leave', 'disability'];
        let dateStr = dateRaw;
        if (dateRaw.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const [m, d, y] = dateRaw.split('/');
          dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (dateRaw.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
          dateStr = dateRaw;
        } else if (dateRaw.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
          const [d, m, y] = dateRaw.split('-');
          dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        preview.push({
          empName,
          empId: matchedEmp?.id || '',
          date: dateStr,
          status: validStatuses.includes(resolvedStatus) ? resolvedStatus : '',
          amount: isNaN(amountRaw) ? 0 : amountRaw,
          hours: isNaN(hoursRaw) ? 0 : hoursRaw,
          error: !matchedEmp ? `Empleado "${empName}" no encontrado` : !validStatuses.includes(resolvedStatus) ? `Estado "${statusRaw}" no válido` : !dateStr.match(/^\d{4}-\d{2}-\d{2}$/) ? `Fecha "${dateRaw}" no válida` : undefined,
        });
      }
      setUploadPreview(preview);
      setShowUpload(true);
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const applyUpload = () => {
    const valid = uploadPreview.filter(r => !r.error && r.status);
    if (valid.length === 0) { alert('No hay registros válidos para importar.'); return; }
    const emp = (id: string) => employees.find(e => e.id === id);
    const updated = [...attendance];
    valid.forEach(row => {
      const existing = updated.find(a => a.employeeId === row.empId && a.date === row.date);
      const employee = emp(row.empId);
      const defaults = employee ? getDefaultAmount(employee, row.status) : { amount: 0, hours: 0 };
      const record: Attendance = {
        id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        employeeId: row.empId,
        date: row.date,
        checkIn: '',
        checkOut: '',
        status: row.status as Attendance['status'],
        amount: row.amount || defaults.amount,
        hours: row.hours || defaults.hours,
        notes: 'Importado desde archivo',
      };
      if (existing) {
        const idx = updated.findIndex(a => a.id === existing.id);
        updated[idx] = record;
      } else {
        updated.push(record);
      }
    });
    pushUndo();
    saveAttendanceRecords(updated);
    setAttendance(updated);
    setShowUpload(false);
    setUploadPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const headers = ['Empleado', 'Fecha', 'Estado', 'Monto', 'Horas'];
    const rows = [
      ['Juan Pérez', '2026-09-01', 'presente', '', ''],
      ['María López', '2026-09-01', 'tardanza', '', '1'],
      ['Carlos García', '2026-09-01', 'ausente', '', ''],
      ['Ana Martínez', '2026-09-01', 'horas extras', '', '4'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
    XLSX.writeFile(wb, 'plantilla_asistencia.xlsx');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Control de Asistencia</h1>
          <p className="text-gray-500">
            {viewMode === 'day' ? 'Registro diario de asistencia' : 'Vista quincena — 2 semanas completas'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <Calendar className="h-4 w-4 mr-1 inline" />
              Día
            </button>
            <button
              onClick={() => setViewMode('quincena')}
              className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'quincena' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <Layers className="h-4 w-4 mr-1 inline" />
              Quincena
            </button>
          </div>
          {undoHistory.length > 0 && (
            <Button variant="outline" onClick={undo} className="text-orange-600 hover:text-orange-700">
              <RotateCcw className="h-4 w-4 mr-2" />
              Deshacer ({undoHistory.length})
            </Button>
          )}
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Herramientas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Subir Archivo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" /> Descargar Plantilla
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowConfig(true)}>
                <Settings className="h-4 w-4 mr-2" /> Config Asistencia
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowHolidaysConfig(true)}>
                <Star className="h-4 w-4 mr-2" /> Feriados Nacionales
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowScheduleConfig(true)}>
                <CalendarOff className="h-4 w-4 mr-2" /> Horarios / Dias Libres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/hr/attendance/reports`)}>
                <BarChart3 className="h-4 w-4 mr-2" /> Reportes / Análisis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>

      {/* ===== DAILY VIEW ===== */}
      {viewMode === 'day' && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <label className="font-medium">Fecha:</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border rounded-md" />
                {attendance.some(a => a.date === selectedDate) && (
                  <Button variant="outline" onClick={clearAttendance} className="text-red-600 hover:text-red-700 ml-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <input type="text" placeholder="Buscar empleado..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 pl-9 text-sm" />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {departments.length > 0 && (
              <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="all">Todos los departamentos</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            )}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="all">Activos y suspendidos</option>
              <option value="active">Solo activos</option>
              <option value="suspended">Solo suspendidos</option>
              <option value="inactive">Inactivos</option>
              <option value="terminated">Terminados</option>
            </select>
            {(searchTerm || filterDepartment !== 'all' || filterStatus !== 'all') && (
              <button onClick={() => { setSearchTerm(''); setFilterDepartment('all'); setFilterStatus('all'); }}
                className="text-sm text-blue-600 underline">
                Limpiar filtros
              </button>
            )}
            <span className="text-sm text-gray-500">{filteredEmployees.length} de {employees.filter(e => filterStatus === 'all' ? true : e.status === filterStatus).length} empleados</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedStatFilter === 'present' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setSelectedStatFilter(selectedStatFilter === 'present' ? null : 'present')}>
              <CardContent className="pt-4 text-center"><CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" /><div className="text-xl font-bold text-green-600">{todayStats.present}</div><div className="text-xs text-gray-500">Presentes</div></CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedStatFilter === 'absent' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setSelectedStatFilter(selectedStatFilter === 'absent' ? null : 'absent')}>
              <CardContent className="pt-4 text-center"><XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" /><div className="text-xl font-bold text-red-600">{todayStats.absent}</div><div className="text-xs text-gray-500">Ausentes</div></CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedStatFilter === 'late' ? 'ring-2 ring-yellow-500' : ''}`}
              onClick={() => setSelectedStatFilter(selectedStatFilter === 'late' ? null : 'late')}>
              <CardContent className="pt-4 text-center"><Clock className="h-6 w-6 text-yellow-600 mx-auto mb-1" /><div className="text-xl font-bold text-yellow-600">{todayStats.late}</div><div className="text-xs text-gray-500">Tardanzas</div></CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedStatFilter === 'vacation' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setSelectedStatFilter(selectedStatFilter === 'vacation' ? null : 'vacation')}>
              <CardContent className="pt-4 text-center"><Plane className="h-6 w-6 text-blue-600 mx-auto mb-1" /><div className="text-xl font-bold text-blue-600">{todayStats.vacation}</div><div className="text-xs text-gray-500">Vacaciones</div></CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedStatFilter === 'overtime' ? 'ring-2 ring-orange-500' : ''}`}
              onClick={() => setSelectedStatFilter(selectedStatFilter === 'overtime' ? null : 'overtime')}>
              <CardContent className="pt-4 text-center"><TrendingUp className="h-6 w-6 text-orange-600 mx-auto mb-1" /><div className="text-xl font-bold text-orange-600">{todayStats.overtime}</div><div className="text-xs text-gray-500">Horas Extras</div></CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedStatFilter === 'unpaid_leave' ? 'ring-2 ring-gray-500' : ''}`}
              onClick={() => setSelectedStatFilter(selectedStatFilter === 'unpaid_leave' ? null : 'unpaid_leave')}>
              <CardContent className="pt-4 text-center"><FileText className="h-6 w-6 text-gray-600 mx-auto mb-1" /><div className="text-xl font-bold text-gray-600">{todayStats.unpaid_leave}</div><div className="text-xs text-gray-500">Permiso s/pago</div></CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedStatFilter === 'disability' ? 'ring-2 ring-pink-500' : ''}`}
              onClick={() => setSelectedStatFilter(selectedStatFilter === 'disability' ? null : 'disability')}>
              <CardContent className="pt-4 text-center"><DollarSign className="h-6 w-6 text-pink-600 mx-auto mb-1" /><div className="text-xl font-bold text-pink-600">{todayStats.disability}</div><div className="text-xs text-gray-500">Incapacidad</div></CardContent>
            </Card>
          </div>

          {selectedStatFilter && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <span className="text-sm text-blue-700 font-medium">
                Filtrado por: {STATUS_OPTIONS.find(o => o.value === selectedStatFilter)?.label || selectedStatFilter}
              </span>
              <button onClick={() => setSelectedStatFilter(null)} className="text-sm text-blue-600 underline">Mostrar todos</button>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Empleados — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredEmployees.map((emp) => {
                  const att = getAttendance(emp.id);
                  const currentStatus = att?.status || 'present';
                  const isInactiveOnDate = (emp.status === 'inactive' || emp.status === 'terminated') && emp.terminationDate && selectedDate >= emp.terminationDate;
                  if (selectedStatFilter === 'overtime') {
                    if (!hasOvertime) return null;
                  } else if (selectedStatFilter && currentStatus !== selectedStatFilter) return null;
                  const hasDeduction = ['absent', 'late', 'unpaid_leave'].includes(currentStatus) || (currentStatus === 'disability' && (att?.amount || 0) < (emp.salary / 30));
                  const hasOvertime = att?.overtimeHours && att.overtimeHours > 0;
                  const hasIncome = ['holiday', 'vacation'].includes(currentStatus) && (att?.amount || 0) > 0;
                  const deductionAmount = currentStatus === 'disability' ? (emp.salary / 30) - (att?.amount || 0) : att?.amount || 0;
                  return (
                    <div key={emp.id} className={`flex justify-between items-center px-3 py-4 my-2 border-b border-gray-200 last:border-b-0 bg-white rounded-lg shadow-sm ${isInactiveOnDate ? 'opacity-60' : ''}`}>
                      <div className="flex-1">
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-sm text-gray-500">
                          {emp.position || 'Sin puesto'} • {emp.department || 'Sin depto'}
                          {isInactiveOnDate && <span className="ml-2 text-red-500 font-medium">• Inactivo desde {emp.terminationDate}</span>}
                        </div>
                        {!isInactiveOnDate && att && (
                          <div className="text-xs mt-1 space-x-2">
                            {hasDeduction && <span className="text-red-600 font-medium">-{formatCurrency(deductionAmount)}</span>}
                            {hasOvertime && <span className="text-green-600 font-medium">+HE {formatCurrency(att.overtimeAmount || 0)} ({formatHours(att.overtimeHours || 0)})</span>}
                            {hasIncome && <span className="text-green-600 font-medium">+{formatCurrency(att.amount || 0)}</span>}
                            {(hasDeduction || hasOvertime || hasIncome) && (
                              <button onClick={() => { setEditingAmount({ empId: emp.id, status: att.status }); setTempAmount(String(att.amount || 0)); setTempHours(String(att.hours || '')); }} className="text-blue-500 hover:text-blue-700 underline">Editar</button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isInactiveOnDate ? (
                          <Badge className="bg-gray-200 text-gray-600">Inactivo</Badge>
                        ) : (
                          <>
                            <Badge className={getStatusColor(currentStatus)}>{getStatusLabel(currentStatus)}</Badge>
                            <div className="flex gap-1 flex-wrap justify-end items-center">
                              <Button size="sm" variant={currentStatus === 'present' ? 'default' : 'outline'} onClick={() => recordAttendance(emp.id, 'present')}><CheckCircle className="h-4 w-4" /></Button>
                              <Button size="sm" variant={currentStatus === 'absent' ? 'destructive' : 'outline'} onClick={() => recordAttendance(emp.id, 'absent')}><XCircle className="h-4 w-4" /></Button>
                              <Button size="sm" variant={currentStatus === 'late' ? 'default' : 'outline'} onClick={() => { setLatePrompt({ empId: emp.id, empName: emp.name, date: selectedDate }); if (att?.hours) { const h = Math.floor(att.hours); setLateHours(String(h)); setLateMinutes(String(Math.round((att.hours - h) * 60))); } else { setLateHours('1'); setLateMinutes('0'); } }} className={currentStatus === 'late' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}><Clock className="h-4 w-4" /></Button>
                              <Button size="sm" variant={currentStatus === 'vacation' ? 'default' : 'outline'} onClick={() => recordAttendance(emp.id, 'vacation')} className={currentStatus === 'vacation' ? 'bg-blue-500 hover:bg-blue-600' : ''}><Plane className="h-4 w-4" /></Button>
                              <Button size="sm" variant={hasOvertime ? 'default' : 'outline'} onClick={() => { setOvertimePrompt({ empId: emp.id, empName: emp.name, date: selectedDate }); setOvertimeHours('1'); setOvertimeMinutes('0'); }} className={hasOvertime ? 'bg-orange-500 hover:bg-orange-600' : ''}><TrendingUp className="h-4 w-4" /></Button>
                              {hasOvertime && <span className="text-orange-600 font-bold text-xs whitespace-nowrap">+{formatCurrency(att?.overtimeAmount || 0)} ({formatHours(att?.overtimeHours || 0)})</span>}
                              <Button size="sm" variant={currentStatus === 'unpaid_leave' ? 'default' : 'outline'} onClick={() => recordAttendance(emp.id, 'unpaid_leave')} className={currentStatus === 'unpaid_leave' ? 'bg-gray-500 hover:bg-gray-600' : ''}><FileText className="h-4 w-4" /></Button>
                              <Button size="sm" variant={currentStatus === 'disability' ? 'default' : 'outline'} onClick={() => setDisabilityPrompt({ empId: emp.id, empName: emp.name, date: selectedDate })} className={currentStatus === 'disability' ? 'bg-pink-500 hover:bg-pink-600' : ''}><DollarSign className="h-4 w-4" /></Button>
                              <Button size="sm" variant={currentStatus === 'holiday' ? 'default' : 'outline'} onClick={() => { setHolidayPrompt({ empId: emp.id, empName: emp.name, date: selectedDate }); }} className={currentStatus === 'holiday' ? 'bg-indigo-500 hover:bg-indigo-600' : ''}><Star className="h-4 w-4" /></Button>
                              <Button size="sm" variant={currentStatus === 'free_day' ? 'default' : 'outline'} onClick={() => recordAttendance(emp.id, 'free_day')} className={currentStatus === 'free_day' ? 'bg-teal-500 hover:bg-teal-600' : ''}><CalendarOff className="h-4 w-4" /></Button>
                              {att && <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => clearEmployeeAttendance(emp.id)}><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ===== QUINCENA VIEW ===== */}
      {viewMode === 'quincena' && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date(quincenaStartDate + 'T00:00:00');
                  d.setDate(d.getDate() - 14);
                  setQuincenaStartDate(d.toISOString().split('T')[0]);
                }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <div className="font-bold text-lg">
                    {new Date(quincenaStartDate + 'T12:00:00').toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}
                    {' — '}
                    {new Date(quincenaDates[13] + 'T12:00:00').toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-500">Quincena completa (14 días)</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date(quincenaStartDate + 'T00:00:00');
                  d.setDate(d.getDate() + 14);
                  setQuincenaStartDate(d.toISOString().split('T')[0]);
                }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="flex gap-1 ml-auto flex-wrap">
                  <select onChange={(e) => { if (e.target.value) setQuincenaStartDate(e.target.value); }} value={quincenaStartDate} className="px-2 py-1 border rounded text-sm">
                    <option value={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}>
                      1ra — {new Date().toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}
                    </option>
                    <option value={new Date(new Date().getFullYear(), new Date().getMonth(), 16).toISOString().split('T')[0]}>
                      2da — {new Date().toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}
                    </option>
                  </select>
                  <Button variant="outline" size="sm" onClick={() => setBulkAll('present')} className="text-green-600">Todos Presente</Button>
                  <Button variant="outline" size="sm" onClick={() => setBulkAll('absent')} className="text-red-600">Todos Ausente</Button>
                  <Button variant="outline" size="sm" onClick={applyHolidayDefaults} className="text-indigo-600">
                    <Star className="h-3 w-3 mr-1" /> Aplicar Feriados
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearQuincena} className="text-red-600">
                    <Trash2 className="h-3 w-3 mr-1" /> Limpiar
                  </Button>
                  <Button variant={collapsedEmployees.size === activeEmployees.length ? "default" : "outline"} size="sm" onClick={toggleAllCollapse} className={collapsedEmployees.size === activeEmployees.length ? "bg-blue-500 hover:bg-blue-600" : ""}>
                    <Layers className="h-3 w-3 mr-1" />
                    {collapsedEmployees.size === activeEmployees.length ? 'Expandir Todo' : 'Colapsar Todo'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            {STATUS_OPTIONS.map(opt => (
              <span key={opt.value} className={`px-2 py-0.5 rounded font-medium ${opt.bgColor} ${opt.color}`}>
                {opt.label} = {STATUS_OPTIONS.find(o => o.value === opt.value)?.label === opt.label ? getStatusLabel(opt.value) : ''}
                {getStatusLabel(opt.value)}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <input type="text" placeholder="Buscar empleado..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 pl-9 text-sm" />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {departments.length > 0 && (
              <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="all">Todos los departamentos</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            )}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="all">Activos y suspendidos</option>
              <option value="active">Solo activos</option>
              <option value="suspended">Solo suspendidos</option>
              <option value="inactive">Inactivos</option>
              <option value="terminated">Terminados</option>
            </select>
            {(searchTerm || filterDepartment !== 'all' || filterStatus !== 'all') && (
              <button onClick={() => { setSearchTerm(''); setFilterDepartment('all'); setFilterStatus('all'); }}
                className="text-sm text-blue-600 underline">
                Limpiar filtros
              </button>
            )}
            <span className="text-sm text-gray-500">{filteredEmployees.length} de {employees.filter(e => filterStatus === 'all' ? true : e.status === filterStatus).length} empleados</span>
          </div>

          {/* Quincena Grid */}
          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-2 border-b sticky left-0 bg-white z-10 min-w-[180px]">Empleado</th>
                    {quincenaDates.map((date, i) => {
                      const d = new Date(date + 'T00:00:00');
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isSelected = quincenaDates[i] === selectedDate;
                      return (
                        <th key={i} onClick={() => setSelectedDate(quincenaDates[i])} className={`text-center py-2 px-1 border-b cursor-pointer ${isSelected ? 'bg-blue-50 ring-2 ring-blue-400' : isWeekend ? 'bg-gray-50' : ''}`}>
                          <div className="font-medium">{d.toLocaleDateString('es-HN', { weekday: 'narrow' })}</div>
                          <div>{d.getDate()}</div>
                        </th>
                      );
                    })}
                    <th className="text-right py-2 px-2 border-b min-w-[80px]">Deducciones</th>
                    <th className="text-right py-2 px-2 border-b min-w-[80px]">Ingresos</th>
                    <th className="text-center py-2 px-2 border-b min-w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const totals = getQuincenaTotals(emp.id);
                    const isCollapsed = collapsedEmployees.has(emp.id);
                    const isInactiveEmployee = emp.status === 'inactive' || emp.status === 'terminated';
                    if (isCollapsed) {
                      return (
                        <tr key={emp.id} className="border-b-2 border-gray-300 hover:bg-gray-100 cursor-pointer" onClick={() => toggleEmployeeCollapse(emp.id)}>
                          <td className="py-2 px-2 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium text-sm">{emp.name}</div>
                                <div className="text-gray-500 text-xs">{emp.position || 'Sin puesto'}</div>
                                {isInactiveEmployee ? (
                                  <div className="text-red-400 text-xs flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" />Sin horario</div>
                                ) : (emp.scheduleEntry || emp.scheduleExit) && (
                                  <div className="text-gray-400 text-xs flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" />{emp.scheduleEntry} - {emp.scheduleExit}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td colSpan={14} className="text-center text-xs text-gray-500 py-2">
                            {totals.deductions > 0 && <span className="text-red-600 mr-3">Ded: {formatCurrency(totals.deductions)}</span>}
                            {totals.incomes > 0 && <span className="text-green-600">Ing: {formatCurrency(totals.incomes)}</span>}
                            {totals.deductions === 0 && totals.incomes === 0 && 'Sin registros'}
                          </td>
                          <td className="text-right py-2 px-2 text-red-600 font-medium text-sm">
                            {totals.deductions > 0 ? formatCurrency(totals.deductions) : '-'}
                          </td>
                          <td className="text-right py-2 px-2 text-green-600 font-medium text-sm">
                            {totals.incomes > 0 ? formatCurrency(totals.incomes) : '-'}
                          </td>
                          <td></td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={emp.id} className={`border-b-2 border-gray-300 hover:bg-gray-50 ${isInactiveEmployee ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-2 sticky left-0 bg-white z-10 border-r border-gray-200 cursor-pointer" onClick={() => toggleEmployeeCollapse(emp.id)}>
                          <div className="flex items-center gap-2">
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-sm">{emp.name}</div>
                              <div className="text-gray-500 text-xs">{emp.position || 'Sin puesto'} • {emp.department || 'Sin depto'}</div>
                              {isInactiveEmployee ? (
                                <div className="text-red-400 text-xs flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" />Sin horario</div>
                              ) : (emp.scheduleEntry || emp.scheduleExit) && (
                                <div className="text-gray-400 text-xs flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" />{emp.scheduleEntry} - {emp.scheduleExit}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {quincenaDates.map((date, i) => {
                          const cellInfo = getCellStatus(emp.id, date);
                          const status = cellInfo.status;
                          const isWeekend = new Date(date + 'T00:00:00').getDay() === 0 || new Date(date + 'T00:00:00').getDay() === 6;
                          const isSelected = date === selectedDate;
                          const isInactiveOnDate = isInactiveEmployee && emp.terminationDate && date >= emp.terminationDate;
                          return (
                            <td key={i} onClick={() => setSelectedDate(date)} className={`text-center py-1 px-0.5 cursor-pointer ${isSelected ? 'bg-blue-50 ring-2 ring-blue-400' : isWeekend ? 'bg-gray-50' : ''}`}>
                              {isInactiveOnDate ? (
                                <div className="text-[9px] text-gray-400 py-1">Inactivo</div>
                              ) : (
                              <div className="flex flex-col gap-0.5">
                                {STATUS_OPTIONS.map(opt => {
                                  const isActive = status === opt.value;
                                  const att = attendance.find(a => a.employeeId === emp.id && a.date === date);
                                  const hasOvertime = att?.overtimeHours && att.overtimeHours > 0;
                                  const isOvertimeBtn = opt.value === 'overtime';
                                  return (
                                    <button
                                      key={opt.value}
                                      onClick={() => {
                                        if (opt.value === 'late') {
                                          setLatePrompt({ empId: emp.id, empName: emp.name, date });
                                          setLateHours('1');
                                          setLateMinutes('0');
                                        } else if (opt.value === 'overtime') {
                                          setOvertimePrompt({ empId: emp.id, empName: emp.name, date });
                                          setOvertimeHours('1');
                                          setOvertimeMinutes('0');
                                        } else if (opt.value === 'holiday') {
                                          setHolidayPrompt({ empId: emp.id, empName: emp.name, date });
                                        } else if (opt.value === 'disability') {
                                          setDisabilityPrompt({ empId: emp.id, empName: emp.name, date });
                                        } else {
                                          recordAttendance(emp.id, opt.value, date);
                                        }
                                      }}
                                      className={`w-full h-6 rounded text-[10px] font-bold border transition-colors relative ${
                                        isOvertimeBtn && hasOvertime
                                          ? 'bg-orange-500 text-white border-orange-600'
                                          : isActive
                                            ? `${opt.bgColor.replace('hover:', '')} ${opt.color} border-current`
                                            : 'bg-white border-gray-200 hover:border-gray-400 text-gray-300'
                                      }`}
                                      title={`${emp.name} — ${opt.label} — ${date}${hasOvertime ? ` (${formatHours(att!.overtimeHours!)})` : ''}`}
                                    >
                                      {isOvertimeBtn && hasOvertime ? formatHours(att!.overtimeHours!) : opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-right py-1 px-2 text-red-600 font-medium">
                          {totals.deductions > 0 ? formatCurrency(totals.deductions) : '-'}
                        </td>
                        <td className="text-right py-1 px-2 text-green-600 font-medium">
                          {totals.incomes > 0 ? formatCurrency(totals.incomes) : '-'}
                        </td>
                        <td className="text-center py-1 px-2">
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 px-2" onClick={() => clearEmployeeQuincena(emp.id)}>
                            <Trash2 className="h-3 w-3 mr-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold">Configuración de Deducciones</h2>
                <p className="text-sm text-gray-500">Montos por defecto para cada tipo de asistencia</p>
              </div>
              <Button variant="outline" onClick={() => setShowConfig(false)}><X className="h-4 w-4 mr-2" /> Cerrar</Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-medium text-red-800 mb-3">Deducciones (descuentos al empleado)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Ausencia</label>
                    <select value={deductionConfig.absent.type} onChange={(e) => setDeductionConfig({ ...deductionConfig, absent: { ...deductionConfig.absent, type: e.target.value as any } })} className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="daily">Salario diario</option>
                      <option value="fixed">Monto fijo</option>
                    </select>
                    {deductionConfig.absent.type === 'fixed' && (
                      <input type="number" value={deductionConfig.absent.value} onChange={(e) => setDeductionConfig({ ...deductionConfig, absent: { ...deductionConfig.absent, value: parseFloat(e.target.value) || 0 } })} className="w-full mt-1 px-2 py-1 border rounded text-sm" placeholder="Monto" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Tardanza</label>
                    <select value={deductionConfig.late.type} onChange={(e) => setDeductionConfig({ ...deductionConfig, late: { ...deductionConfig.late, type: e.target.value as any } })} className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="hourly">Salario horario</option>
                      <option value="fixed">Monto fijo</option>
                    </select>
                    {deductionConfig.late.type === 'fixed' && (
                      <input type="number" value={deductionConfig.late.value} onChange={(e) => setDeductionConfig({ ...deductionConfig, late: { ...deductionConfig.late, value: parseFloat(e.target.value) || 0 } })} className="w-full mt-1 px-2 py-1 border rounded text-sm" placeholder="Monto" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Permiso sin pago</label>
                    <select value={deductionConfig.unpaid_leave.type} onChange={(e) => setDeductionConfig({ ...deductionConfig, unpaid_leave: { ...deductionConfig.unpaid_leave, type: e.target.value as any } })} className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="daily">Salario diario</option>
                      <option value="fixed">Monto fijo</option>
                    </select>
                    {deductionConfig.unpaid_leave.type === 'fixed' && (
                      <input type="number" value={deductionConfig.unpaid_leave.value} onChange={(e) => setDeductionConfig({ ...deductionConfig, unpaid_leave: { ...deductionConfig.unpaid_leave, value: parseFloat(e.target.value) || 0 } })} className="w-full mt-1 px-2 py-1 border rounded text-sm" placeholder="Monto" />
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800 mb-3">Ingresos (bonificaciones al empleado)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Horas Extras</label>
                    <select value={deductionConfig.overtime.type} onChange={(e) => setDeductionConfig({ ...deductionConfig, overtime: { ...deductionConfig.overtime, type: e.target.value as any } })} className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="hourly">Salario horario x1.5 (150%)</option>
                      <option value="hourly_200">Salario horario x2.0 (200%)</option>
                      <option value="fixed">Monto fijo por hora</option>
                    </select>
                    {deductionConfig.overtime.type === 'fixed' && (
                      <input type="number" value={deductionConfig.overtime.value} onChange={(e) => setDeductionConfig({ ...deductionConfig, overtime: { ...deductionConfig.overtime, value: parseFloat(e.target.value) || 0 } })} className="w-full mt-1 px-2 py-1 border rounded text-sm" placeholder="Monto/hora" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Vacaciones</label>
                    <select value={deductionConfig.vacation.type} onChange={(e) => setDeductionConfig({ ...deductionConfig, vacation: { ...deductionConfig.vacation, type: e.target.value as any } })} className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="paid">Pagadas (sin descuento)</option>
                      <option value="none">No aplica</option>
                    </select>
                  </div>
                </div>
              </div>
              <Button onClick={saveConfig} className="w-full"><Save className="h-4 w-4 mr-2" /> Guardar Configuración</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Amount Modal */}
      {editingAmount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold">Editar Monto</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingAmount(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-500">Monto (L.)</label>
                <input type="number" value={tempAmount} onChange={(e) => setTempAmount(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="text-sm text-gray-500">Horas</label>
                <input type="number" value={tempHours} onChange={(e) => setTempHours(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="Opcional" />
              </div>
              <Button onClick={() => {
                const att = attendance.find(a => a.employeeId === editingAmount.empId && a.date === selectedDate);
                if (att) {
                  updateAttendanceAmount(editingAmount.empId, editingAmount.status, parseFloat(tempAmount) || 0, tempHours ? parseFloat(tempHours) : undefined);
                }
              }} className="w-full"><Save className="h-4 w-4 mr-2" /> Guardar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Late Hours Prompt Modal */}
      {latePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold">Tardanza</h3>
              <Button variant="ghost" size="sm" onClick={() => setLatePrompt(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>{latePrompt.empName}</strong> — {latePrompt.date}
                </p>
                <label className="text-sm font-medium">Tiempo de tardanza</label>
                <div className="flex gap-3 mt-1">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Horas</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={lateHours}
                      onChange={(e) => setLateHours(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-lg text-center"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-end pb-1 text-lg font-bold text-gray-400">:</div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Minutos</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="5"
                      value={lateMinutes}
                      onChange={(e) => setLateMinutes(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-lg text-center"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Total: {lateHours || 0}h {lateMinutes || 0}min = {((parseInt(lateHours) || 0) + (parseInt(lateMinutes) || 0) / 60).toFixed(2)} horas
                </p>
              </div>
              <Button onClick={() => {
                const emp = employees.find(e => e.id === latePrompt.empId);
                const totalHours = (parseInt(lateHours) || 0) + (parseInt(lateMinutes) || 0) / 60;
                const dailySalary = emp ? emp.salary / 30 : 0;
                const hourlySalary = dailySalary / 8;
                const configAmount = deductionConfig.late.type === 'fixed' ? deductionConfig.late.value : hourlySalary;
                const amount = configAmount * totalHours;
                const existing = attendance.find(a => a.employeeId === latePrompt.empId && a.date === latePrompt.date);
                const record: Attendance = {
                  id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  employeeId: latePrompt.empId,
                  date: latePrompt.date,
                  checkIn: '',
                  checkOut: '',
                  status: 'late',
                  amount,
                  hours: totalHours,
                  notes: '',
                };
                const updated = existing
                  ? attendance.map(a => a.id === existing.id ? record : a)
                  : [...attendance, record];
                pushUndo();
                saveAttendanceRecords(updated);
                setAttendance(updated);
                setLatePrompt(null);
              }} className="w-full">
                <Save className="h-4 w-4 mr-2" /> Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Hours Prompt Modal */}
      {overtimePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold">Horas Extras</h3>
              <Button variant="ghost" size="sm" onClick={() => setOvertimePrompt(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>{overtimePrompt.empName}</strong> — {overtimePrompt.date}
                </p>
                <label className="text-sm font-medium">Tiempo de horas extras</label>
                <div className="flex gap-3 mt-1">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Horas</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-lg text-center"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-end pb-1 text-lg font-bold text-gray-400">:</div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Minutos</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="5"
                      value={overtimeMinutes}
                      onChange={(e) => setOvertimeMinutes(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-lg text-center"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Total: {overtimeHours || 0}h {overtimeMinutes || 0}min = {((parseInt(overtimeHours) || 0) + (parseInt(overtimeMinutes) || 0) / 60).toFixed(2)} horas
                </p>
              </div>
              <Button onClick={() => {
                const emp = employees.find(e => e.id === overtimePrompt.empId);
                const totalHours = (parseInt(overtimeHours) || 0) + (parseInt(overtimeMinutes) || 0) / 60;
                const baseSalary = emp ? emp.salary : 0;
                const hourlySalary = baseSalary / 240; // 30 días × 8 horas = 240 horas mensuales
                let configAmount: number;
                if (deductionConfig.overtime.type === 'fixed') {
                  configAmount = deductionConfig.overtime.value;
                } else if (deductionConfig.overtime.type === 'hourly_200') {
                  configAmount = hourlySalary * 2;
                } else {
                  configAmount = hourlySalary * 1.5;
                }
                const overtimeAmountCalc = configAmount * totalHours;
                const existing = attendance.find(a => a.employeeId === overtimePrompt.empId && a.date === overtimePrompt.date);
                const record: Attendance = {
                  id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  employeeId: overtimePrompt.empId,
                  date: overtimePrompt.date,
                  checkIn: existing?.checkIn || '',
                  checkOut: existing?.checkOut || '',
                  status: existing?.status || 'present',
                  amount: existing?.amount || 0,
                  hours: existing?.hours || 0,
                  overtimeHours: totalHours,
                  overtimeAmount: overtimeAmountCalc,
                  overtimeRate: deductionConfig.overtime.type === 'fixed' ? deductionConfig.overtime.value : deductionConfig.overtime.type === 'hourly_200' ? 2 : 1.5,
                  holidayType: existing?.holidayType,
                  notes: existing?.notes || '',
                };
                const updated = existing
                  ? attendance.map(a => a.id === existing.id ? record : a)
                  : [...attendance, record];
                pushUndo();
                saveAttendanceRecords(updated);
                setAttendance(updated);
                setOvertimePrompt(null);
              }} className="w-full">
                <Save className="h-4 w-4 mr-2" /> Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Disability Prompt Modal */}
      {disabilityPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold">Tipo de Incapacidad — {disabilityPrompt.date}</h3>
              <Button variant="ghost" size="sm" onClick={() => setDisabilityPrompt(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                <strong>{disabilityPrompt.empName}</strong>
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Seleccione el tipo de incapacidad:</label>
                {DISABILITY_TYPES.filter(dt => {
                  if (dt.isFemaleOnly) {
                    const emp = employees.find(e => e.id === disabilityPrompt.empId);
                    return emp?.gender === 'F';
                  }
                  return true;
                }).map(dt => {
                  const emp = employees.find(e => e.id === disabilityPrompt.empId);
                  const dailySalary = emp ? emp.salary / 30 : 0;
                  const hourlySalary = dailySalary / 8;
                  const isNone = dt.value === 'none';
                  const isMaternity = dt.value === 'maternity';
                  const disabilityHrs = isNone
                    ? (parseFloat(disabilityHours) || 0) + (parseFloat(disabilityMinutes) || 0) / 60
                    : 8;
                  const deductionAmount = isNone ? hourlySalary * disabilityHrs : 0;
                  const finalAmount = isMaternity ? dailySalary : isNone ? dailySalary - deductionAmount : dailySalary * dt.percentage / 100;
                  return (
                    <div key={dt.value} className={`border rounded-lg p-3 ${isMaternity ? 'border-pink-300 bg-pink-50' : ''}`}>
                      <button
                        onClick={() => {
                          if (isNone) {
                            const totalHrs = (parseFloat(disabilityHours) || 0) + (parseFloat(disabilityMinutes) || 0) / 60;
                            recordDisability(disabilityPrompt.empId, dt.value, undefined, totalHrs);
                          } else {
                            recordDisability(disabilityPrompt.empId, dt.value);
                          }
                        }}
                        className="w-full text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{dt.label}</span>
                          <span className={`text-sm font-bold ${isNone ? 'text-orange-600' : isMaternity ? 'text-pink-600' : 'text-green-600'}`}>
                            {isNone
                              ? `Descuento: -L ${deductionAmount.toFixed(2)} (${disabilityHrs}h)`
                              : isMaternity
                                ? `L ${finalAmount.toFixed(2)}/dia × 84 días`
                                : `L ${finalAmount.toFixed(2)}/dia`}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{dt.description}</div>
                        {isNone && (
                          <div className="text-xs text-orange-600 mt-1">
                            Salario diario: L {dailySalary.toFixed(2)} - Descuento: L {deductionAmount.toFixed(2)} = <strong>L {finalAmount.toFixed(2)}</strong>
                          </div>
                        )}
                        {isMaternity && (
                          <div className="text-xs text-pink-600 mt-1 font-medium">
                            Total: L {finalAmount.toFixed(2)} × 84 días = L {(finalAmount * 84).toFixed(2)}
                          </div>
                        )}
                      </button>
                      {isNone && (
                        <div className="mt-3 flex items-center gap-2">
                          <label className="text-xs text-gray-600">Horas:</label>
                          <select
                            value={disabilityHours}
                            onChange={(e) => setDisabilityHours(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            {Array.from({ length: 9 }, (_, i) => (
                              <option key={i} value={String(i)}>{i}h</option>
                            ))}
                          </select>
                          <label className="text-xs text-gray-600">Minutos:</label>
                          <select
                            value={disabilityMinutes}
                            onChange={(e) => setDisabilityMinutes(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={String(m)}>{m}m</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Prompt Modal */}
      {holidayPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold">Feriado — {holidayPrompt.date}</h3>
              <Button variant="ghost" size="sm" onClick={() => setHolidayPrompt(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                <strong>{holidayPrompt.empName}</strong>
              </p>
              {getHoliday(holidayPrompt.date) && (
                <p className="text-sm text-indigo-600 font-medium">
                  {getHoliday(holidayPrompt.date)?.name}
                </p>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de pago:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const emp = employees.find(e => e.id === holidayPrompt.empId);
                      const dailySalary = emp ? emp.salary / 30 : 0;
                      const amount = dailySalary * 2;
                      const existing = attendance.find(a => a.employeeId === holidayPrompt.empId && a.date === holidayPrompt.date);
                      const record: Attendance = {
                        id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        employeeId: holidayPrompt.empId,
                        date: holidayPrompt.date,
                        checkIn: '',
                        checkOut: '',
                        status: 'holiday',
                        amount,
                        hours: 8,
                        holidayType: 'doble',
                        notes: '',
                      };
                      const updated = existing
                        ? attendance.map(a => a.id === existing.id ? record : a)
                        : [...attendance, record];
                      pushUndo();
                      saveAttendanceRecords(updated);
                      setAttendance(updated);
                      setHolidayPrompt(null);
                    }}
                    className="p-3 border-2 rounded-lg text-center hover:border-green-500 transition-colors"
                  >
                    <div className="text-lg font-bold text-green-600">Doble</div>
                    <div className="text-xs text-gray-500">200%</div>
                  </button>
                  <button
                    onClick={() => {
                      const emp = employees.find(e => e.id === holidayPrompt.empId);
                      const dailySalary = emp ? emp.salary / 30 : 0;
                      const amount = dailySalary * 3;
                      const existing = attendance.find(a => a.employeeId === holidayPrompt.empId && a.date === holidayPrompt.date);
                      const record: Attendance = {
                        id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        employeeId: holidayPrompt.empId,
                        date: holidayPrompt.date,
                        checkIn: '',
                        checkOut: '',
                        status: 'holiday',
                        amount,
                        hours: 8,
                        holidayType: 'triple',
                        notes: '',
                      };
                      const updated = existing
                        ? attendance.map(a => a.id === existing.id ? record : a)
                        : [...attendance, record];
                      pushUndo();
                      saveAttendanceRecords(updated);
                      setAttendance(updated);
                      setHolidayPrompt(null);
                    }}
                    className="p-3 border-2 rounded-lg text-center hover:border-purple-500 transition-colors"
                  >
                    <div className="text-lg font-bold text-purple-600">Triple</div>
                    <div className="text-xs text-gray-500">300%</div>
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Si el empleado no trabaja, marcar como Permiso s/pago o Vacaciones
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holidays Config Modal */}
      {showHolidaysConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold">Configuración de Feriados Nacionales</h2>
                <p className="text-sm text-gray-500">Seleccionar pago doble o triple para empleados que trabajen</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowHolidaysConfig(false)}>
                  <X className="h-4 w-4 mr-2" /> Cerrar
                </Button>
                <Button onClick={saveHolidays}>
                  <Save className="h-4 w-4 mr-2" /> Guardar
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input type="date" id="newHolidayDate" className="px-3 py-2 border rounded-md" />
                <input type="text" id="newHolidayName" placeholder="Nombre del feriado" className="flex-1 px-3 py-2 border rounded-md" />
                <Button onClick={() => {
                  const dateInput = document.getElementById('newHolidayDate') as HTMLInputElement;
                  const nameInput = document.getElementById('newHolidayName') as HTMLInputElement;
                  addHoliday(dateInput.value, nameInput.value);
                  dateInput.value = '';
                  nameInput.value = '';
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {holidays.sort((a, b) => a.date.localeCompare(b.date)).map(holiday => (
                  <div key={holiday.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{holiday.name}</div>
                      <div className="text-sm text-gray-500">{holiday.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={holiday.type}
                        onChange={(e) => updateHolidayType(holiday.date, e.target.value as 'libre' | 'doble' | 'triple')}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="doble">Doble (200%)</option>
                        <option value="triple">Triple (300%)</option>
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => removeHoliday(holiday.date)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Config Modal */}
      {showScheduleConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold">Configuración de Horarios</h2>
                <p className="text-sm text-gray-500">Definir días libres por empleado</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowScheduleConfig(false)}>
                  <X className="h-4 w-4 mr-2" /> Cerrar
                </Button>
                <Button onClick={() => { saveSchedules(); autoMarkFreeDays(); }}>
                  <Save className="h-4 w-4 mr-2" /> Guardar y Aplicar
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <h3 className="font-medium text-teal-800 mb-3">Plantilla Rápida</h3>
                <p className="text-sm text-teal-700 mb-3">Aplicar a todos los empleados:</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { applyScheduleToAll([0]); setSelectedScheduleTemplate('lun-sab'); }}>
                    Lun-Sab (Dom libre)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { applyScheduleToAll([0, 6]); setSelectedScheduleTemplate('lun-vie'); }}>
                    Lun-Vie (Dom y Sab libre)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { applyScheduleToAll([3]); setSelectedScheduleTemplate('mirob-sab'); }}>
                    Mirob-Sab (Miércoles libre)
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Por Empleado:</h3>
                {activeEmployees.map(emp => {
                  const schedule = getSchedule(emp.id);
                  const freeDays = schedule?.freeDays || [];
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-sm text-gray-500">{emp.position || 'Sin puesto'} • {emp.department || 'Sin depto'}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {(emp.scheduleEntry || emp.scheduleExit) && (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{emp.scheduleEntry} - {emp.scheduleExit}</span>
                          )}
                          {emp.freeDays && emp.freeDays.length > 0 && (
                            <span className="flex items-center gap-1"><CalendarOff className="h-3 w-3" />Libre: {emp.freeDays.map((d: number) => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              const newFreeDays = freeDays.includes(i)
                                ? freeDays.filter(d => d !== i)
                                : [...freeDays, i];
                              applyScheduleToEmployee(emp.id, newFreeDays);
                            }}
                            className={`w-10 h-8 rounded text-xs font-bold border transition-colors ${
                              freeDays.includes(i)
                                ? 'bg-teal-100 text-teal-700 border-teal-300'
                                : 'bg-white border-gray-200 hover:border-gray-400 text-gray-600'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Preview Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold">Importar Asistencia</h2>
                <p className="text-sm text-gray-500">
                  {uploadPreview.filter(r => !r.error).length} registros válidos / {uploadPreview.length} totales
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowUpload(false); setUploadPreview([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button onClick={applyUpload} disabled={uploadPreview.filter(r => !r.error).length === 0}>
                  <Save className="h-4 w-4 mr-2" /> Aplicar ({uploadPreview.filter(r => !r.error).length})
                </Button>
              </div>
            </div>
            <div className="p-6">
              {uploadPreview.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay datos para mostrar</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Empleado</th>
                        <th className="text-left py-2">Fecha</th>
                        <th className="text-left py-2">Estado</th>
                        <th className="text-right py-2">Monto</th>
                        <th className="text-right py-2">Horas</th>
                        <th className="text-left py-2">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadPreview.map((row, i) => (
                        <tr key={i} className={`border-b ${row.error ? 'bg-red-50' : ''}`}>
                          <td className="py-2">{row.empName}</td>
                          <td className="py-2">{row.date}</td>
                          <td className="py-2">
                            {row.status ? (
                              <Badge className={getStatusColor(row.status)}>{getStatusLabel(row.status)}</Badge>
                            ) : (
                              <span className="text-red-500 text-xs">No válido</span>
                            )}
                          </td>
                          <td className="py-2 text-right">{row.amount > 0 ? formatCurrency(row.amount) : '-'}</td>
                          <td className="py-2 text-right">{row.hours > 0 ? row.hours : '-'}</td>
                          <td className="py-2">
                            {row.error ? (
                              <span className="text-red-500 text-xs">{row.error}</span>
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
