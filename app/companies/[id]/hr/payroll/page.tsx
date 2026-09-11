'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Download,
  DollarSign,
  Settings,
  Save,
  X,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  Lock,
  CheckCircle,
  Trash2,
  Pencil,
  Plus,
  RefreshCw
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  status: 'active' | 'inactive';
}

interface PayrollRecord {
  id: string;
  period: string;
  month: number;
  year: number;
  closedAt: string;
  closedBy: string;
  totalPeriodBase: number;
  totalBase: number;
  totalDeductions: number;
  totalIgssEmployer: number;
  totalNetPay: number;
  totalAttendanceDeductions: number;
  totalAttendanceIncomes: number;
  employeeCount: number;
  frequency: string;
  employees: {
    name: string;
    position: string;
    department: string;
    salary: number;
    periodSalary: number;
    igssEmployee: number;
    ihss: number;
    rap: number;
    totalDeductions: number;
    attendanceDeductionTotal: number;
    attendanceIncomeTotal: number;
    netPay: number;
  }[];
}

interface EmployeeDeduction {
  id: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  enabled: boolean;
  isStandard: boolean;
  paymentFrequency: 'mensual' | 'quincenal' | 'dividido';
  totalPayments: number;
  quincena: 'ambas' | '1ra' | '2da';
}

interface PayrollConfig {
  frequency: 'semanal' | 'quincenal' | 'mensual' | 'cada_2_semanas';
  paymentMethod: 'transferencia' | 'efectivo' | 'cheque' | 'deposito';
  currency: 'HNL' | 'USD';
  paymentDay: number;
  workingDaysPerPeriod: number;
  // Quincenal: dos días de pago en el mes
  quincenalDay1: number;
  quincenalDay2: number;
  // Cada 2 semanas: fecha de inicio desde la cual se cuentan las semanas
  biweeklyStartDay: number;
  biweeklyStartMonth: number;
  // Semanal: día de la semana de pago (0=dom, 1=lun, ..., 6=sáb)
  weeklyPayDay: number;
  igssEmployee: number;
  igssEmployer: number;
  igssQuincena: 'ambas' | '1ra' | '2da';
  ihss: number;
  ihssQuincena: 'ambas' | '1ra' | '2da';
  rap: number;
  rapQuincena: 'ambas' | '1ra' | '2da';
  applyAguinaldo: boolean;
  aguinaldoPercent: number;
  aguinaldoPaymentType: 'proporcional' | 'unico';
  aguinaldoPaymentMonth: number;
  applyVacationBonus: boolean;
  vacationBonusPercent: number;
  vacationBonusPaymentType: 'proporcional' | 'unico';
  vacationBonusPaymentMonth: number;
  applyBeneficio14: boolean;
  beneficio14Percent: number;
  beneficio14PaymentType: 'proporcional' | 'unico';
  beneficio14PaymentMonth: number;
  // Fechas de cierre (días antes de cada pago)
  docsDeadlineDaysBefore: number;
  attendanceDeadlineDaysBefore: number;
  overtimeDeadlineDaysBefore: number;
  bonusDeadlineDaysBefore: number;
  closingMonth: number;
  closingYear: number;
}

const DEFAULT_CONFIG: PayrollConfig = {
  frequency: 'mensual',
  paymentMethod: 'transferencia',
  currency: 'HNL',
  paymentDay: 30,
  workingDaysPerPeriod: 30,
  quincenalDay1: 15,
  quincenalDay2: 30,
  biweeklyStartDay: 1,
  biweeklyStartMonth: 1,
  weeklyPayDay: 5,
  igssEmployee: 1.0,
  igssEmployer: 2.4,
  igssQuincena: 'ambas',
  ihss: 2.5,
  ihssQuincena: 'ambas',
  rap: 0.5,
  rapQuincena: 'ambas',
  applyAguinaldo: true,
  aguinaldoPercent: 100,
  aguinaldoPaymentType: 'unico',
  aguinaldoPaymentMonth: 12,
  applyVacationBonus: true,
  vacationBonusPercent: 100,
  vacationBonusPaymentType: 'unico',
  vacationBonusPaymentMonth: 12,
  applyBeneficio14: true,
  beneficio14Percent: 100,
  beneficio14PaymentType: 'unico',
  beneficio14PaymentMonth: 7,
  docsDeadlineDaysBefore: 5,
  attendanceDeadlineDaysBefore: 3,
  overtimeDeadlineDaysBefore: 2,
  bonusDeadlineDaysBefore: 1,
  closingMonth: new Date().getMonth() + 1,
  closingYear: new Date().getFullYear(),
};

const FREQ_LABELS: Record<string, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  cada_2_semanas: 'Cada 2 semanas',
};

const METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia Bancaria',
  efectivo: 'Efectivo',
  cheque: 'Cheque',
  deposito: 'Depósito',
};

export default function PayrollPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<PayrollConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [editConfig, setEditConfig] = useState<PayrollConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [closedPayrolls, setClosedPayrolls] = useState<PayrollRecord[]>([]);
  const [employeeDeductions, setEmployeeDeductions] = useState<Record<string, EmployeeDeduction[]>>({});
  const [editingDeductions, setEditingDeductions] = useState<string | null>(null);
  const [editingDeductionId, setEditingDeductionId] = useState<string | null>(null);
  const [newDeduction, setNewDeduction] = useState({ name: '', type: 'fixed' as 'fixed' | 'percentage', value: 0, paymentFrequency: 'mensual' as 'mensual' | 'quincenal' | 'dividido', totalPayments: 1, quincena: 'ambas' as 'ambas' | '1ra' | '2da' });
  const [attendanceDeductions, setAttendanceDeductions] = useState<Record<string, { amount: number; type: 'deduction' | 'income'; label: string }[]>>({});
  const [closingPeriod, setClosingPeriod] = useState<'1ra' | '2da'>('1ra');
  const [closingWeek, setClosingWeek] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      loadEmployees(),
      loadConfig(),
      loadClosedPayrolls(),
      loadEmployeeDeductions(),
      loadAttendanceDeductions(),
    ]);
  }, [companyId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(
          data.map((e: any) => ({
            id: e.id,
            name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
            position: e.position || '',
            department: e.department || '',
            salary: e.salary || 0,
            startDate: e.startDate || '',
            status: e.status || 'active',
          }))
        );
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/payroll/config`);
      if (res.ok) {
        const parsed = await res.json();
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
        setEditConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (err) {
      console.error('Error loading payroll config:', err);
    }
  };

  const saveConfig = async () => {
    try {
      await fetch(`/api/companies/${companyId}/hr/payroll/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editConfig),
      });
    } catch (err) {
      console.error('Error saving payroll config:', err);
    }
    setConfig(editConfig);
    setShowConfig(false);
  };

  const loadClosedPayrolls = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/payroll/closed`);
      if (res.ok) {
        const data = await res.json();
        setClosedPayrolls(data);
      }
    } catch (err) {
      console.error('Error loading closed payrolls:', err);
    }
  };

  const loadEmployeeDeductions = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/payroll/deductions`);
      if (res.ok) {
        const data = await res.json();
        const grouped: Record<string, EmployeeDeduction[]> = {};
        data.forEach((d: any) => {
          if (!grouped[d.employeeId]) grouped[d.employeeId] = [];
          grouped[d.employeeId].push({
            id: d.id,
            name: d.name,
            type: d.type,
            value: d.value,
            enabled: d.enabled,
            isStandard: d.isStandard,
            paymentFrequency: d.paymentFrequency,
            totalPayments: d.totalPayments,
            quincena: d.quincena,
          });
        });
        setEmployeeDeductions(grouped);
      }
    } catch (err) {
      console.error('Error loading employee deductions:', err);
    }
  };

  const loadAttendanceDeductions = async () => {
    let records: { employeeId: string; status: string; amount?: number; overtimeAmount?: number; overtimeHours?: number; date: string; holidayType?: string }[];
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/attendance`);
      if (!res.ok) return;
      records = await res.json();
    } catch (err) {
      console.error('Error loading attendance:', err);
      return;
    }
    const now = new Date();
    const closingMonth = config.closingMonth - 1;
    const closingYear = config.closingYear;
    const monthlyRecords = records.filter(r => {
      const d = new Date(r.date + 'T12:00:00');
      return d.getMonth() === closingMonth && d.getFullYear() === closingYear;
    });
    const grouped: Record<string, { amount: number; type: 'deduction' | 'income'; label: string }[]> = {};
    monthlyRecords.forEach(r => {
      if (!grouped[r.employeeId]) grouped[r.employeeId] = [];
      const amt = r.amount || 0;
      if (['absent', 'late', 'unpaid_leave'].includes(r.status)) {
        if (amt > 0) grouped[r.employeeId].push({ amount: amt, type: 'deduction', label: r.status === 'absent' ? 'Inasistencia' : r.status === 'late' ? 'Retardo' : 'Permiso sin goce' });
      } else if (r.status === 'disability') {
        if (amt > 0) grouped[r.employeeId].push({ amount: amt, type: 'deduction', label: 'Incapacidad (descuento)' });
      } else if (r.status === 'overtime') {
        const otAmount = r.overtimeAmount || amt;
        if (otAmount > 0) grouped[r.employeeId].push({ amount: otAmount, type: 'income', label: `Horas Extra${r.overtimeHours ? ` (${r.overtimeHours}h)` : ''}` });
      } else if (r.status === 'holiday') {
        if (amt > 0) {
          const typeLabel = r.holidayType === 'doble' ? ' (Doble)' : r.holidayType === 'triple' ? ' (Triple)' : '';
          grouped[r.employeeId].push({ amount: amt, type: 'income', label: r.holidayType ? `Día Feriado${typeLabel}` : 'Día Asueto' });
        }
      } else if (r.status === 'vacation') {
        if (amt > 0) grouped[r.employeeId].push({ amount: amt, type: 'income', label: 'Vacaciones' });
      }
    });
    setAttendanceDeductions(grouped);
  };

  const saveEmployeeDeductions = async (empId: string, deductions: EmployeeDeduction[]) => {
    setEmployeeDeductions(prev => ({ ...prev, [empId]: deductions }));
    try {
      await fetch(`/api/companies/${companyId}/hr/payroll/deductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId, deductions }),
      });
    } catch (err) {
      console.error('Error saving employee deductions:', err);
    }
  };

  const getDeductionsForEmp = (empId: string): EmployeeDeduction[] => {
    return employeeDeductions[empId] || [];
  };

  const closePayroll = async () => {
    const now = new Date();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const record: PayrollRecord = {
      id: `payroll-${Date.now()}`,
      period: `${monthNames[config.closingMonth - 1]} ${config.closingYear}`,
      month: config.closingMonth,
      year: config.closingYear,
      closedAt: now.toISOString(),
      closedBy: 'Usuario Actual',
      totalPeriodBase,
      totalBase,
      totalDeductions,
      totalIgssEmployer,
      totalNetPay,
      totalAttendanceDeductions,
      totalAttendanceIncomes,
      employeeCount: activeEmployees.length,
      frequency: config.frequency,
      employees: activeEmployees.map(emp => {
        const calc = calculatePayroll(emp.salary, emp.id);
        return {
          name: emp.name,
          position: emp.position,
          department: emp.department,
          salary: emp.salary,
          periodSalary: calc.periodSalary,
          igssEmployee: calc.igssEmployee,
          ihss: calc.ihss,
          rap: calc.rap,
          totalDeductions: calc.totalDeductions,
          attendanceDeductionTotal: calc.attendanceDeductionTotal,
          attendanceIncomeTotal: calc.attendanceIncomeTotal,
          netPay: calc.netPay,
        };
      }),
    };
    const updated = [record, ...closedPayrolls];
    try {
      await fetch(`/api/companies/${companyId}/hr/payroll/closed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.error('Error closing payroll:', err);
    }

    // Generar asientos contables
    try {
      const acctRes = await fetch(`/api/companies/${companyId}/hr/accounting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: record.period,
          month: config.closingMonth,
          year: config.closingYear,
          frequency: config.frequency,
          totalPeriodBase: record.totalPeriodBase,
          totalIgssEmployer: record.totalIgssEmployer,
          totalIgssEmployee: activeEmployees.reduce((s, e) => s + calculatePayroll(e.salary, e.id).igssEmployee, 0),
          totalIhss: activeEmployees.reduce((s, e) => s + calculatePayroll(e.salary, e.id).ihss, 0),
          totalRap: activeEmployees.reduce((s, e) => s + calculatePayroll(e.salary, e.id).rap, 0),
          totalCustomDeductions: activeEmployees.reduce((s, e) => s + calculatePayroll(e.salary, e.id).customDeductions, 0),
          totalAttendanceDeductions: record.totalAttendanceDeductions,
          totalAttendanceIncomes: record.totalAttendanceIncomes,
          totalDeductions: record.totalDeductions,
          totalNetPay: record.totalNetPay,
          employees: record.employees,
        }),
      });
      if (acctRes.ok) {
        const acctData = await acctRes.json();
        console.log(`Asientos contables generados: ${acctData.transactionsCreated}`);
      } else {
        console.error('Error generando asientos contables:', await acctRes.text());
      }
    } catch (err) {
      console.error('Error llamando API de contabilidad:', err);
    }

    setClosedPayrolls(updated);
    alert(`Nómina de ${record.period} cerrada exitosamente.`);
  };

  const downloadClosedCSV = (record: PayrollRecord) => {
    let csv = 'Nombre,Cargo,Departamento,Salario Mensual,Salario Período,IGSS Empleado,IHSS,RAP,Deducciones Asistencia,Ingresos Asistencia,Total Deducciones,Neto\n';
    record.employees.forEach(emp => {
      csv += `"${emp.name}","${emp.position}","${emp.department}",${emp.salary},${emp.periodSalary.toFixed(2)},${emp.igssEmployee.toFixed(2)},${emp.ihss.toFixed(2)},${emp.rap.toFixed(2)},${(emp.attendanceDeductionTotal || 0).toFixed(2)},${(emp.attendanceIncomeTotal || 0).toFixed(2)},${emp.totalDeductions.toFixed(2)},${emp.netPay.toFixed(2)}\n`;
    });
    csv += `\nTOTAL,,,,${record.totalPeriodBase.toFixed(2)},${record.employees.reduce((s, e) => s + e.igssEmployee, 0).toFixed(2)},${record.employees.reduce((s, e) => s + e.ihss, 0).toFixed(2)},${record.employees.reduce((s, e) => s + e.rap, 0).toFixed(2)},${(record.totalAttendanceDeductions || 0).toFixed(2)},${(record.totalAttendanceIncomes || 0).toFixed(2)},${record.totalDeductions.toFixed(2)},${record.totalNetPay.toFixed(2)}\n`;
    csv += `\nIGSS Patronal (${config.igssEmployer}%),,,,${record.totalIgssEmployer.toFixed(2)}\n`;
    csv += `Costo Total Empresa,,,,${(record.totalPeriodBase + record.totalIgssEmployer).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomina_${record.period.replace(/\s+/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const deleteClosedPayroll = async (id: string) => {
    if (!confirm('¿Eliminar este registro de nómina cerrada?')) return;
    try {
      await fetch(`/api/companies/${companyId}/hr/payroll/closed/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting closed payroll:', err);
    }
    const updated = closedPayrolls.filter(p => p.id !== id);
    setClosedPayrolls(updated);
  };

  const activeEmployees = employees.filter(e => e.status === 'active');
  const totalPages = Math.ceil(activeEmployees.length / PAGE_SIZE);
  const paginatedEmployees = activeEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getPeriodSalary = (monthlySalary: number) => {
    if (config.frequency === 'quincenal' || config.frequency === 'cada_2_semanas') return monthlySalary / 2;
    if (config.frequency === 'semanal') return monthlySalary / 4;
    return monthlySalary;
  };

  const calculatePayroll = (salary: number, empId?: string) => {
    const periodSalary = getPeriodSalary(salary);
    let igssEmployee = periodSalary * (config.igssEmployee / 100);
    let ihss = periodSalary * (config.ihss / 100);
    let rap = periodSalary * (config.rap / 100);
    let customDeductions = 0;
    const customItems: { name: string; amount: number }[] = [];
    if (empId) {
      const empDeds = getDeductionsForEmp(empId).filter(d => d.enabled);
      const igssDed = empDeds.find(d => d.isStandard && d.id === 'igss');
      const ihssDed = empDeds.find(d => d.isStandard && d.id === 'ihss');
      const rapDed = empDeds.find(d => d.isStandard && d.id === 'rap');
      if (igssDed) igssEmployee = periodSalary * (igssDed.value / 100);
      if (ihssDed) ihss = periodSalary * (ihssDed.value / 100);
      if (rapDed) rap = periodSalary * (rapDed.value / 100);
      const igssQuincena = igssDed?.quincena || config.igssQuincena || 'ambas';
      const ihssQuincena = ihssDed?.quincena || config.ihssQuincena || 'ambas';
      const rapQuincena = rapDed?.quincena || config.rapQuincena || 'ambas';
      if (igssQuincena === 'ambas') igssEmployee = igssEmployee / 2;
      if (ihssQuincena === 'ambas') ihss = ihss / 2;
      if (rapQuincena === 'ambas') rap = rap / 2;
      empDeds.forEach(d => {
        if (!d.isStandard) {
          const totalAmount = d.type === 'fixed' ? d.value : salary * (d.value / 100);
          let amount = d.paymentFrequency === 'dividido' && d.totalPayments > 0 ? totalAmount / d.totalPayments : totalAmount;
          if (d.quincena === 'ambas') {
            amount = amount / 2;
          }
          customDeductions += amount;
          const freqLabel = d.paymentFrequency === 'mensual' ? 'Mensual' : d.paymentFrequency === 'quincenal' ? 'Quincenal' : `${d.totalPayments} pagos`;
          const quincenaLabel = d.quincena === '1ra' ? ' 1ra' : d.quincena === '2da' ? ' 2da' : '';
          customItems.push({ name: `${d.name} (${freqLabel}${quincenaLabel})`, amount });
        }
      });
    } else {
      if (config.igssQuincena === 'ambas') igssEmployee = igssEmployee / 2;
      if (config.ihssQuincena === 'ambas') ihss = ihss / 2;
      if (config.rapQuincena === 'ambas') rap = rap / 2;
    }
    let attendanceDeductionTotal = 0;
    let attendanceIncomeTotal = 0;
    const attendanceItems: { name: string; amount: number }[] = [];
    if (empId && attendanceDeductions[empId]) {
      attendanceDeductions[empId].forEach(item => {
        if (item.type === 'deduction') {
          attendanceDeductionTotal += item.amount;
          attendanceItems.push({ name: item.label || 'Deducción asistencia', amount: item.amount });
        } else {
          attendanceIncomeTotal += item.amount;
          attendanceItems.push({ name: item.label || 'Ingreso asistencia', amount: item.amount });
        }
      });
    }
    const totalDeductions = igssEmployee + ihss + rap + customDeductions + attendanceDeductionTotal;
    const netPay = periodSalary - totalDeductions + attendanceIncomeTotal;
    return { periodSalary, igssEmployee, ihss, rap, customDeductions, customItems, attendanceDeductionTotal, attendanceIncomeTotal, attendanceItems, totalDeductions, netPay };
  };

  const totalBase = activeEmployees.reduce((sum, e) => sum + e.salary, 0);
  const totalPeriodBase = activeEmployees.reduce((sum, e) => sum + getPeriodSalary(e.salary), 0);
  const totalIgssEmployer = totalPeriodBase * (config.igssEmployer / 100);
  const totalIgssEmployee = activeEmployees.reduce((sum, e) => sum + calculatePayroll(e.salary, e.id).igssEmployee, 0);
  const totalIhss = activeEmployees.reduce((sum, e) => sum + calculatePayroll(e.salary, e.id).ihss, 0);
  const totalRap = activeEmployees.reduce((sum, e) => sum + calculatePayroll(e.salary, e.id).rap, 0);
  const totalCustomDeductions = activeEmployees.reduce((sum, e) => sum + calculatePayroll(e.salary, e.id).customDeductions, 0);
  const totalAttendanceDeductions = activeEmployees.reduce((sum, e) => sum + calculatePayroll(e.salary, e.id).attendanceDeductionTotal, 0);
  const totalAttendanceIncomes = activeEmployees.reduce((sum, e) => sum + calculatePayroll(e.salary, e.id).attendanceIncomeTotal, 0);
  const totalDeductions = totalIgssEmployee + totalIhss + totalRap + totalCustomDeductions + totalAttendanceDeductions;
  const totalNetPay = totalPeriodBase - totalDeductions + totalAttendanceIncomes;

  const downloadCSV = () => {
    let csv = 'Nombre,Cargo,Departamento,Salario Mensual,Salario Período,IGSS Empleado,IHSS,RAP,Deducciones Asistencia,Ingresos Asistencia,Total Deducciones,Neto\n';
    activeEmployees.forEach(emp => {
      const calc = calculatePayroll(emp.salary, emp.id);
      csv += `"${emp.name}","${emp.position}","${emp.department || ''}",${emp.salary},${calc.periodSalary},${calc.igssEmployee.toFixed(2)},${calc.ihss.toFixed(2)},${calc.rap.toFixed(2)},${calc.attendanceDeductionTotal.toFixed(2)},${calc.attendanceIncomeTotal.toFixed(2)},${calc.totalDeductions.toFixed(2)},${calc.netPay.toFixed(2)}\n`;
    });
    csv += `\nTOTAL,,,,${totalPeriodBase.toFixed(2)},${totalIgssEmployee.toFixed(2)},${totalIhss.toFixed(2)},${totalRap.toFixed(2)},${totalDeductions.toFixed(2)},${totalNetPay.toFixed(2)}\n`;
    csv += `\nIGSS Patronal (${config.igssEmployer}%),,,,${totalIgssEmployer.toFixed(2)}\n`;
    csv += `Costo Total Empresa,,,,${(totalPeriodBase + totalIgssEmployer).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomina_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateVoucher = (emp: typeof activeEmployees[0]) => {
    const calc = calculatePayroll(emp.salary, emp.id);
    const customDeds = getDeductionsForEmp(emp.id).filter(d => d.enabled && !d.isStandard);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const periodLabel = `${monthNames[config.closingMonth - 1]} ${config.closingYear}`;

    const getPeriodDates = () => {
      const m = config.closingMonth - 1;
      const y = config.closingYear;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      if (config.frequency === 'quincenal') {
        if (closingPeriod === '1ra') {
          return { start: `01/${String(m + 1).padStart(2, '0')}/${y}`, end: `15/${String(m + 1).padStart(2, '0')}/${y}` };
        }
        return { start: `16/${String(m + 1).padStart(2, '0')}/${y}`, end: `${daysInMonth}/${String(m + 1).padStart(2, '0')}/${y}` };
      }
      if (config.frequency === 'cada_2_semanas') {
        const startDay = (closingWeek - 1) * 14 + 1;
        const endDay = Math.min(closingWeek * 14, daysInMonth);
        return { start: `${String(startDay).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`, end: `${endDay}/${String(m + 1).padStart(2, '0')}/${y}` };
      }
      if (config.frequency === 'semanal') {
        const startDay = (closingWeek - 1) * 7 + 1;
        const endDay = Math.min(closingWeek * 7, daysInMonth);
        return { start: `${String(startDay).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`, end: `${endDay}/${String(m + 1).padStart(2, '0')}/${y}` };
      }
      return { start: `01/${String(m + 1).padStart(2, '0')}/${y}`, end: `${daysInMonth}/${String(m + 1).padStart(2, '0')}/${y}` };
    };
    const periodDates = getPeriodDates();

    const attdDeds = (attendanceDeductions[emp.id] || []).filter(a => a.type === 'deduction');
    const attdIncs = (attendanceDeductions[emp.id] || []).filter(a => a.type === 'income');
    const dedList = getDeductionsForEmp(emp.id);
    const igssEnabled = dedList.find(d => d.id === 'igss')?.enabled !== false;
    const ihssEnabled = dedList.find(d => d.id === 'ihss')?.enabled !== false;
    const rapEnabled = dedList.find(d => d.id === 'rap')?.enabled !== false;
    const periodSalary = calc.periodSalary;
    const hoursPerDay = 8;
    const valuePerHour = emp.salary / (30 * hoursPerDay);
    const periodoPago = `${periodDates.start} al ${periodDates.end}`;
    const customNonStd = calc.customItems.filter(d => !d.name.includes('IGSS') && !d.name.includes('IHSS') && !d.name.includes('RAP'));

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voucher de Pago - ${emp.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 15px; color: #333; font-size: 11px; }
  .page { max-width: 900px; margin: 0 auto; border: 1px solid #999; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px; border-bottom: 2px solid #333; }
  .header-left { display: flex; gap: 12px; align-items: flex-start; }
  .logo-placeholder { width: 50px; height: 50px; background: #e74c3c; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
  .company-info { font-size: 10px; color: #555; line-height: 1.5; }
  .company-info strong { color: #333; font-size: 11px; }
  .emp-info { font-size: 10px; line-height: 1.6; text-align: right; }
  .emp-info .label { color: #555; display: inline-block; min-width: 90px; text-align: right; }
  .emp-info .value { font-weight: bold; color: #333; }
  .period-bar { background: #f0f0f0; padding: 6px 16px; font-size: 10px; color: #555; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; }
  .body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .col-left { border-right: 1px solid #ddd; padding: 12px 16px; }
  .col-right { padding: 12px 16px; }
  .section-title { font-size: 11px; font-weight: bold; color: #333; padding: 4px 8px; background: #e8e8e8; margin-bottom: 6px; border-left: 3px solid #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #f5f5f5; font-size: 10px; padding: 4px 6px; text-align: left; border-bottom: 1px solid #ccc; font-weight: bold; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 3px 6px; font-size: 10px; border-bottom: 1px solid #eee; }
  .amount { text-align: right; font-family: monospace; }
  .total-row { font-weight: bold; border-top: 1px solid #333; background: #f9f9f9; }
  .total-row td { padding: 5px 6px; border-bottom: 2px solid #333; }
  .net-summary { padding: 12px 16px; border-top: 2px solid #333; }
  .net-left { padding-right: 12px; }
  .net-right { padding-left: 12px; text-align: right; }
  .net-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
  .net-row.bold { font-weight: bold; font-size: 13px; border-top: 2px solid #333; padding-top: 6px; margin-top: 8px; }
  .bottom-section { padding: 12px 16px; border-top: 2px solid #333; display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .obs { font-size: 10px; color: #555; padding: 8px; border: 1px dashed #ccc; min-height: 30px; margin-top: 6px; }
  .signatures { display: flex; justify-content: space-around; padding: 20px 16px; border-top: 1px solid #ddd; }
  .sig { text-align: center; width: 40%; }
  .sig .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 10px; }
  .currency { font-family: 'Courier New', monospace; }
  @media print { body { padding: 0; } .page { border: none; } }
</style></head><body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="logo-placeholder">DA</div>
      <div class="company-info">
        <strong>Diamond Accounting</strong><br>
        ${emp.department || 'N/A'}<br>
        ${emp.position || 'N/A'}
      </div>
    </div>
    <div class="emp-info">
      <span class="label">Nombre completo:</span> <span class="value">${emp.name}</span><br>
      <span class="label">Fecha de ingreso:</span> <span class="value">${emp.startDate || 'N/A'}</span><br>
      <span class="label">Salario mensual base:</span> <span class="value currency">${formatCurrency(emp.salary)}</span><br>
      <span class="label">Salario Quincenal:</span> <span class="value currency">${formatCurrency(periodSalary)}</span><br>
      <span class="label">Valor/Hora:</span> <span class="value currency">${formatCurrency(valuePerHour)}</span>
    </div>
  </div>
  <div class="period-bar">
    <span>Periodo de pago: <strong>${periodoPago}</strong></span>
    <span>Frecuencia: <strong>${FREQ_LABELS[config.frequency] || config.frequency}</strong></span>
  </div>

  <div class="body">
    <div class="col-left">
      <div class="section-title">Salario Ordinario</div>
      <table>
        <tr><th>Descripción</th><th style="width:60px">Cantidad</th><th style="width:55px">Unidad</th><th style="width:70px">Monto</th></tr>
        <tr><td>Salario Regular</td><td class="amount">1</td><td>Periodo</td><td class="amount currency">${formatCurrency(periodSalary)}</td></tr>
        <tr class="total-row"><td colspan="3">Total Salario Ordinario</td><td class="amount currency">${formatCurrency(periodSalary)}</td></tr>
      </table>

      <div class="section-title">Deducciones del Empleado</div>
      <table>
        <tr><th>Descripción</th><th style="width:70px">Monto</th></tr>
        ${customNonStd.map(d => `<tr><td>${d.name}</td><td class="amount currency">${formatCurrency(d.amount)}</td></tr>`).join('\n        ')}
        ${attdDeds.map(item => `<tr><td>${item.label}</td><td class="amount currency">${formatCurrency(item.amount)}</td></tr>`).join('\n        ')}
        ${customNonStd.length === 0 && attdDeds.length === 0 ? '<tr><td style="color:#999; font-style:italic;">Sin deducciones adicionales</td><td class="amount">-</td></tr>' : ''}
        <tr class="total-row"><td>Total Deducciones</td><td class="amount currency">${formatCurrency(calc.totalDeductions - (igssEnabled ? calc.igssEmployee : 0) - (ihssEnabled ? calc.ihss : 0) - (rapEnabled ? calc.rap : 0))}</td></tr>
      </table>
    </div>

    <div class="col-right">
      <div class="section-title">Deducciones de Ley</div>
      <table>
        <tr><th>Descripción</th><th style="width:70px">Monto</th></tr>
        ${igssEnabled ? `<tr><td>Seguro Social IGSS (${config.igssEmployee}%)</td><td class="amount currency">${formatCurrency(calc.igssEmployee)}</td></tr>` : ''}
        ${ihssEnabled ? `<tr><td>IHSS Vivienda (${config.ihss}%)</td><td class="amount currency">${formatCurrency(calc.ihss)}</td></tr>` : ''}
        ${rapEnabled ? `<tr><td>RAP (${config.rap}%)</td><td class="amount currency">${formatCurrency(calc.rap)}</td></tr>` : ''}
        <tr class="total-row"><td>Total Deducciones Ley</td><td class="amount currency">${formatCurrency((igssEnabled ? calc.igssEmployee : 0) + (ihssEnabled ? calc.ihss : 0) + (rapEnabled ? calc.rap : 0))}</td></tr>
      </table>

      <div class="section-title">Bonificaciones e Ingresos</div>
      <table>
        <tr><th>Descripción</th><th style="width:70px">Monto</th></tr>
        ${attdIncs.map(item => `<tr><td>${item.label}</td><td class="amount currency">${formatCurrency(item.amount)}</td></tr>`).join('\n        ')}
        ${attdIncs.length === 0 ? '<tr><td style="color:#999; font-style:italic;">Sin bonificaciones</td><td class="amount">-</td></tr>' : ''}
      </table>
    </div>
  </div>

  <div class="net-summary">
    <div class="section-title">Resumen de Pago Neto</div>
    <div class="net-row"><span>Total devengado:</span><span class="currency">${formatCurrency(periodSalary + calc.attendanceIncomeTotal)}</span></div>
    <div class="net-row"><span>Total deducciones:</span><span class="currency">${formatCurrency(calc.totalDeductions)}</span></div>
    <div class="net-row bold"><span>Neto a pagar:</span><span class="currency" style="color:#006600; font-size:14px;">${formatCurrency(calc.netPay)}</span></div>
  </div>

  <div class="bottom-section">
    <div>
      <div class="section-title">Observaciones</div>
      <div class="obs">Salario bruto: ${formatCurrency(emp.salary)} | Horas/día: ${hoursPerDay} | Valor/hora: ${formatCurrency(valuePerHour)}</div>
    </div>
    <div></div>
  </div>

  <div class="signatures">
    <div class="sig"><div class="line">Firma del Empleado</div></div>
    <div class="sig"><div class="line">Firma del Empleador</div></div>
  </div>
</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const generateAllVouchers = () => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const periodLabel = `${monthNames[config.closingMonth - 1]} ${config.closingYear}`;

    const getPeriodDates = () => {
      const m = config.closingMonth - 1;
      const y = config.closingYear;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      if (config.frequency === 'quincenal') {
        if (closingPeriod === '1ra') {
          return { start: `01/${String(m + 1).padStart(2, '0')}/${y}`, end: `15/${String(m + 1).padStart(2, '0')}/${y}` };
        }
        return { start: `16/${String(m + 1).padStart(2, '0')}/${y}`, end: `${daysInMonth}/${String(m + 1).padStart(2, '0')}/${y}` };
      }
      if (config.frequency === 'cada_2_semanas') {
        const startDay = (closingWeek - 1) * 14 + 1;
        const endDay = Math.min(closingWeek * 14, daysInMonth);
        return { start: `${String(startDay).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`, end: `${endDay}/${String(m + 1).padStart(2, '0')}/${y}` };
      }
      if (config.frequency === 'semanal') {
        const startDay = (closingWeek - 1) * 7 + 1;
        const endDay = Math.min(closingWeek * 7, daysInMonth);
        return { start: `${String(startDay).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`, end: `${endDay}/${String(m + 1).padStart(2, '0')}/${y}` };
      }
      return { start: `01/${String(m + 1).padStart(2, '0')}/${y}`, end: `${daysInMonth}/${String(m + 1).padStart(2, '0')}/${y}` };
    };
    const periodDates = getPeriodDates();

    let allHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Todos los Vauchers - ${periodLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 15px; color: #333; font-size: 11px; }
  .page { max-width: 900px; margin: 0 auto; border: 1px solid #999; margin-bottom: 30px; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px; border-bottom: 2px solid #333; }
  .header-left { display: flex; gap: 12px; align-items: flex-start; }
  .logo-placeholder { width: 50px; height: 50px; background: #e74c3c; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
  .company-info { font-size: 10px; color: #555; line-height: 1.5; }
  .company-info strong { color: #333; font-size: 11px; }
  .emp-info { font-size: 10px; line-height: 1.6; text-align: right; }
  .emp-info .label { color: #555; display: inline-block; min-width: 90px; text-align: right; }
  .emp-info .value { font-weight: bold; color: #333; }
  .period-bar { background: #f0f0f0; padding: 6px 16px; font-size: 10px; color: #555; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; }
  .body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .col-left { border-right: 1px solid #ddd; padding: 12px 16px; }
  .col-right { padding: 12px 16px; }
  .section-title { font-size: 11px; font-weight: bold; color: #333; padding: 4px 8px; background: #e8e8e8; margin-bottom: 6px; border-left: 3px solid #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #f5f5f5; font-size: 10px; padding: 4px 6px; text-align: left; border-bottom: 1px solid #ccc; font-weight: bold; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 3px 6px; font-size: 10px; border-bottom: 1px solid #eee; }
  .amount { text-align: right; font-family: monospace; }
  .total-row { font-weight: bold; border-top: 1px solid #333; background: #f9f9f9; }
  .total-row td { padding: 5px 6px; border-bottom: 2px solid #333; }
  .net-summary { padding: 12px 16px; border-top: 2px solid #333; }
  .net-left { padding-right: 12px; }
  .net-right { padding-left: 12px; text-align: right; }
  .net-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
  .net-row.bold { font-weight: bold; font-size: 13px; border-top: 2px solid #333; padding-top: 6px; margin-top: 8px; }
  .bottom-section { padding: 12px 16px; border-top: 2px solid #333; display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .obs { font-size: 10px; color: #555; padding: 8px; border: 1px dashed #ccc; min-height: 30px; margin-top: 6px; }
  .signatures { display: flex; justify-content: space-around; padding: 20px 16px; border-top: 1px solid #ddd; }
  .sig { text-align: center; width: 40%; }
  .sig .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 10px; }
  .currency { font-family: 'Courier New', monospace; }
  @media print { body { padding: 0; } .page { border: none; margin-bottom: 0; } }
</style></head><body>`;

    activeEmployees.forEach(emp => {
      const calc = calculatePayroll(emp.salary, emp.id);
      const dedList = getDeductionsForEmp(emp.id);
      const igssEnabled = dedList.find(d => d.id === 'igss')?.enabled !== false;
      const ihssEnabled = dedList.find(d => d.id === 'ihss')?.enabled !== false;
      const rapEnabled = dedList.find(d => d.id === 'rap')?.enabled !== false;
      const attdDeds = (attendanceDeductions[emp.id] || []).filter(a => a.type === 'deduction');
      const attdIncs = (attendanceDeductions[emp.id] || []).filter(a => a.type === 'income');
      const periodSalary = calc.periodSalary;
      const hoursPerDay = 8;
      const valuePerHour = emp.salary / (30 * hoursPerDay);
      const periodoPago = `${periodDates.start} al ${periodDates.end}`;
      const customNonStd = calc.customItems.filter(d => !d.name.includes('IGSS') && !d.name.includes('IHSS') && !d.name.includes('RAP'));

      allHtml += `
<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="logo-placeholder">DA</div>
      <div class="company-info">
        <strong>Diamond Accounting</strong><br>
        ${emp.department || 'N/A'}<br>
        ${emp.position || 'N/A'}
      </div>
    </div>
    <div class="emp-info">
      <span class="label">Nombre completo:</span> <span class="value">${emp.name}</span><br>
      <span class="label">Fecha de ingreso:</span> <span class="value">${emp.startDate || 'N/A'}</span><br>
      <span class="label">Salario mensual base:</span> <span class="value currency">${formatCurrency(emp.salary)}</span><br>
      <span class="label">Salario Quincenal:</span> <span class="value currency">${formatCurrency(periodSalary)}</span><br>
      <span class="label">Valor/Hora:</span> <span class="value currency">${formatCurrency(valuePerHour)}</span>
    </div>
  </div>
  <div class="period-bar">
    <span>Periodo de pago: <strong>${periodoPago}</strong></span>
    <span>Frecuencia: <strong>${FREQ_LABELS[config.frequency] || config.frequency}</strong></span>
  </div>

  <div class="body">
    <div class="col-left">
      <div class="section-title">Salario Ordinario</div>
      <table>
        <tr><th>Descripción</th><th style="width:60px">Cantidad</th><th style="width:55px">Unidad</th><th style="width:70px">Monto</th></tr>
        <tr><td>Salario Regular</td><td class="amount">1</td><td>Periodo</td><td class="amount currency">${formatCurrency(periodSalary)}</td></tr>
        <tr class="total-row"><td colspan="3">Total Salario Ordinario</td><td class="amount currency">${formatCurrency(periodSalary)}</td></tr>
      </table>

      <div class="section-title">Deducciones del Empleado</div>
      <table>
        <tr><th>Descripción</th><th style="width:70px">Monto</th></tr>
        ${customNonStd.map(d => `<tr><td>${d.name}</td><td class="amount currency">${formatCurrency(d.amount)}</td></tr>`).join('\n        ')}
        ${attdDeds.map(item => `<tr><td>${item.label}</td><td class="amount currency">${formatCurrency(item.amount)}</td></tr>`).join('\n        ')}
        ${customNonStd.length === 0 && attdDeds.length === 0 ? '<tr><td style="color:#999; font-style:italic;">Sin deducciones adicionales</td><td class="amount">-</td></tr>' : ''}
        <tr class="total-row"><td>Total Deducciones</td><td class="amount currency">${formatCurrency(calc.totalDeductions - (igssEnabled ? calc.igssEmployee : 0) - (ihssEnabled ? calc.ihss : 0) - (rapEnabled ? calc.rap : 0))}</td></tr>
      </table>
    </div>

    <div class="col-right">
      <div class="section-title">Deducciones de Ley</div>
      <table>
        <tr><th>Descripción</th><th style="width:70px">Monto</th></tr>
        ${igssEnabled ? `<tr><td>Seguro Social IGSS (${config.igssEmployee}%)</td><td class="amount currency">${formatCurrency(calc.igssEmployee)}</td></tr>` : ''}
        ${ihssEnabled ? `<tr><td>IHSS Vivienda (${config.ihss}%)</td><td class="amount currency">${formatCurrency(calc.ihss)}</td></tr>` : ''}
        ${rapEnabled ? `<tr><td>RAP (${config.rap}%)</td><td class="amount currency">${formatCurrency(calc.rap)}</td></tr>` : ''}
        <tr class="total-row"><td>Total Deducciones Ley</td><td class="amount currency">${formatCurrency((igssEnabled ? calc.igssEmployee : 0) + (ihssEnabled ? calc.ihss : 0) + (rapEnabled ? calc.rap : 0))}</td></tr>
      </table>

      <div class="section-title">Bonificaciones e Ingresos</div>
      <table>
        <tr><th>Descripción</th><th style="width:70px">Monto</th></tr>
        ${attdIncs.map(item => `<tr><td>${item.label}</td><td class="amount currency">${formatCurrency(item.amount)}</td></tr>`).join('\n        ')}
        ${attdIncs.length === 0 ? '<tr><td style="color:#999; font-style:italic;">Sin bonificaciones</td><td class="amount">-</td></tr>' : ''}
      </table>
    </div>
  </div>

  <div class="net-summary">
    <div class="section-title">Resumen de Pago Neto</div>
    <div class="net-row"><span>Total devengado:</span><span class="currency">${formatCurrency(periodSalary + calc.attendanceIncomeTotal)}</span></div>
    <div class="net-row"><span>Total deducciones:</span><span class="currency">${formatCurrency(calc.totalDeductions)}</span></div>
    <div class="net-row bold"><span>Neto a pagar:</span><span class="currency" style="color:#006600; font-size:14px;">${formatCurrency(calc.netPay)}</span></div>
  </div>

  <div class="bottom-section">
    <div>
      <div class="section-title">Observaciones</div>
      <div class="obs">Salario bruto: ${formatCurrency(emp.salary)} | Horas/día: ${hoursPerDay} | Valor/hora: ${formatCurrency(valuePerHour)}</div>
    </div>
    <div></div>
  </div>

  <div class="signatures">
    <div class="sig"><div class="line">Firma del Empleado</div></div>
    <div class="sig"><div class="line">Firma del Empleador</div></div>
  </div>
</div>`;
    });

    allHtml += `</body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(allHtml);
      win.document.close();
    }
  };

  return (
    <div className="max-w-[1800px] mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Nómina</h1>
          <p className="text-gray-500">Cálculo de nómina y deducciones</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          {activeTab === 'current' && (
            <div className="relative" ref={menuRef}>
              <Button variant="outline" onClick={() => setShowMenu(!showMenu)}>
                <Settings className="h-4 w-4 mr-2" />
                Acciones
              </Button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg z-50 py-1">
                  <button onClick={() => { setEditConfig(config); setShowConfig(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-left">
                    <Settings className="h-4 w-4" /> Configurar
                  </button>
                  {(config.frequency === 'quincenal' || config.frequency === 'cada_2_semanas' || config.frequency === 'semanal') && (
                    <div className="px-4 py-2 border-t">
                      <span className="text-xs text-gray-500">Período:</span>
                      {config.frequency === 'quincenal' && (
                        <select value={closingPeriod} onChange={(e) => setClosingPeriod(e.target.value as '1ra' | '2da')} className="w-full mt-1 text-sm border rounded px-2 py-1">
                          <option value="1ra">1ra Quincena (1-15)</option>
                          <option value="2da">2da Quincena (16-fin)</option>
                        </select>
                      )}
                      {config.frequency === 'cada_2_semanas' && (
                        <select value={closingWeek} onChange={(e) => setClosingWeek(parseInt(e.target.value))} className="w-full mt-1 text-sm border rounded px-2 py-1">
                          <option value={1}>Semana 1 (1-14)</option>
                          <option value={2}>Semana 2 (15-28)</option>
                        </select>
                      )}
                      {config.frequency === 'semanal' && (
                        <select value={closingWeek} onChange={(e) => setClosingWeek(parseInt(e.target.value))} className="w-full mt-1 text-sm border rounded px-2 py-1">
                          <option value={1}>Semana 1 (1-7)</option>
                          <option value={2}>Semana 2 (8-14)</option>
                          <option value={3}>Semana 3 (15-21)</option>
                          <option value={4}>Semana 4 (22-fin)</option>
                        </select>
                      )}
                    </div>
                  )}
                  <div className="border-t" />
                  <button onClick={() => { downloadCSV(); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-left">
                    <Download className="h-4 w-4" /> Descargar CSV
                  </button>
                  <button onClick={() => { generateAllVouchers(); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-left">
                    <FileText className="h-4 w-4" /> Vauchers
                  </button>
                  <button onClick={() => { loadAttendanceDeductions(); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-left">
                    <RefreshCw className="h-4 w-4" /> Recargar Asistencia
                  </button>
                  <div className="border-t" />
                  <button onClick={() => { closePayroll(); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 text-red-600 text-left">
                    <Lock className="h-4 w-4" /> Cerrar Nómina
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deductions Modal */}
      {editingDeductions && (() => {
        const emp = activeEmployees.find(e => e.id === editingDeductions);
        if (!emp) return null;
        const dedList = getDeductionsForEmp(emp.id);
        const igssEnabled = dedList.find(d => d.id === 'igss')?.enabled !== false;
        const ihssEnabled = dedList.find(d => d.id === 'ihss')?.enabled !== false;
        const rapEnabled = dedList.find(d => d.id === 'rap')?.enabled !== false;
        const customDeds = dedList.filter(d => !d.isStandard);

        const toggleStandard = (id: string, name: string, isPercentage: boolean, defaultVal: number) => {
          setEmployeeDeductions(prev => {
            const current = prev[emp.id] || [];
            const existing = current.find(d => d.id === id);
            let updated: EmployeeDeduction[];
            if (existing) {
              updated = current.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d);
            } else {
              updated = [...current, { id, name, type: isPercentage ? 'percentage' : 'fixed', value: defaultVal, enabled: true, isStandard: true, paymentFrequency: 'quincenal', totalPayments: 1, quincena: 'ambas' }];
            }
            fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
            return { ...prev, [emp.id]: updated };
          });
        };

        const addCustomDeduction = () => {
          if (!newDeduction.name) return;
          setEmployeeDeductions(prev => {
            const current = prev[emp.id] || [];
            let updated: EmployeeDeduction[];
            if (editingDeductionId) {
              updated = current.map(d => d.id === editingDeductionId ? {
                ...d,
                name: newDeduction.name,
                type: newDeduction.type,
                value: newDeduction.value,
                paymentFrequency: newDeduction.paymentFrequency,
                totalPayments: newDeduction.paymentFrequency === 'dividido' ? newDeduction.totalPayments : 1,
                quincena: newDeduction.quincena,
              } : d);
            } else {
              const ded: EmployeeDeduction = {
                id: `custom-${Date.now()}`,
                name: newDeduction.name,
                type: newDeduction.type,
                value: newDeduction.value,
                enabled: true,
                isStandard: false,
                paymentFrequency: newDeduction.paymentFrequency,
                totalPayments: newDeduction.paymentFrequency === 'dividido' ? newDeduction.totalPayments : 1,
                quincena: newDeduction.quincena,
              };
              updated = [...current, ded];
            }
            fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
            return { ...prev, [emp.id]: updated };
          });
          setNewDeduction({ name: '', type: 'fixed', value: 0, paymentFrequency: 'mensual', totalPayments: 1, quincena: 'ambas' });
          setEditingDeductionId(null);
        };

        const removeDeduction = (id: string) => {
          setEmployeeDeductions(prev => {
            const current = prev[emp.id] || [];
            const updated = current.filter(d => d.id !== id);
            fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
            return { ...prev, [emp.id]: updated };
          });
        };

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-bold">Deducciones de {emp.name}</h2>
                  <p className="text-sm text-gray-500">Salario mensual: {formatCurrency(emp.salary)} | Período: {formatCurrency(getPeriodSalary(emp.salary))}</p>
                </div>
                <Button variant="outline" onClick={() => setEditingDeductions(null)}><X className="h-4 w-4 mr-2" /> Cerrar</Button>
              </div>
              <div className="p-6 space-y-6">
                {/* Standard Deductions */}
                <div>
                  <h3 className="font-medium mb-3">Deducciones Estándar (Ley)</h3>
                  <div className="space-y-2">
                    {(() => {
                      const igssDed = dedList.find(d => d.id === 'igss');
                      const ihssDed = dedList.find(d => d.id === 'ihss');
                      const rapDed = dedList.find(d => d.id === 'rap');
                      const igssFull = emp.salary * ((igssDed?.value ?? config.igssEmployee) / 100);
                      const ihssFull = emp.salary * ((ihssDed?.value ?? config.ihss) / 100);
                      const rapFull = emp.salary * ((rapDed?.value ?? config.rap) / 100);
                      const igssQuincena = igssDed?.quincena || config.igssQuincena || 'ambas';
                      const ihssQuincena = ihssDed?.quincena || config.ihssQuincena || 'ambas';
                      const rapQuincena = rapDed?.quincena || config.rapQuincena || 'ambas';
                      const igssAmt = igssEnabled && igssQuincena === 'ambas' ? igssFull / 2 : igssFull;
                      const ihssAmt = ihssEnabled && ihssQuincena === 'ambas' ? ihssFull / 2 : ihssFull;
                      const rapAmt = rapEnabled && rapQuincena === 'ambas' ? rapFull / 2 : rapFull;
                      return (
                        <>
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={igssEnabled} onChange={() => toggleStandard('igss', 'IGSS Empleado', true, config.igssEmployee)} className="h-4 w-4" />
                                <div>
                                  <div className="font-medium text-sm">IGSS Empleado</div>
                                  <div className="text-xs text-gray-500">{igssDed?.value ?? config.igssEmployee}% sobre salario</div>
                                </div>
                              </div>
                              <span className="text-sm font-medium text-red-600">-{formatCurrency(igssAmt)}</span>
                            </div>
                            {igssEnabled && (
                              <div className="mt-2 ml-7 space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-500">Porcentaje:</label>
                                  <input type="number" step={0.1} min={0} max={100} value={igssDed?.value ?? config.igssEmployee} onChange={(e) => {
                                    const newVal = parseFloat(e.target.value) || 0;
                                    setEmployeeDeductions(prev => {
                                      const current = prev[emp.id] || [];
                                      const updated = current.map(d => d.id === 'igss' ? { ...d, value: newVal } : d);
                                      fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
                                      return { ...prev, [emp.id]: updated };
                                    });
                                  }} className="w-20 px-2 py-1 border rounded text-xs" />
                                  <span className="text-xs text-gray-500">%</span>
                                </div>
                                <select value={igssDed?.quincena || config.igssQuincena || 'ambas'} onChange={(e) => {
                                  const newQuincena = e.target.value as 'ambas' | '1ra' | '2da';
                                  setEmployeeDeductions(prev => {
                                    const current = prev[emp.id] || [];
                                    const updated = current.map(d => d.id === 'igss' ? { ...d, quincena: newQuincena } : d);
                                    fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
                                    return { ...prev, [emp.id]: updated };
                                  });
                                }} className="px-2 py-1 border rounded text-xs">
                                  <option value="ambas">Ambas quincenas</option>
                                  <option value="1ra">Solo 1ra quincena</option>
                                  <option value="2da">Solo 2da quincena</option>
                                </select>
                              </div>
                            )}
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={ihssEnabled} onChange={() => toggleStandard('ihss', 'IHSS', true, config.ihss)} className="h-4 w-4" />
                                <div>
                                  <div className="font-medium text-sm">IHSS</div>
                                  <div className="text-xs text-gray-500">{ihssDed?.value ?? config.ihss}% sobre salario</div>
                                </div>
                              </div>
                              <span className="text-sm font-medium text-red-600">-{formatCurrency(ihssAmt)}</span>
                            </div>
                            {ihssEnabled && (
                              <div className="mt-2 ml-7 space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-500">Porcentaje:</label>
                                  <input type="number" step={0.1} min={0} max={100} value={ihssDed?.value ?? config.ihss} onChange={(e) => {
                                    const newVal = parseFloat(e.target.value) || 0;
                                    setEmployeeDeductions(prev => {
                                      const current = prev[emp.id] || [];
                                      const updated = current.map(d => d.id === 'ihss' ? { ...d, value: newVal } : d);
                                      fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
                                      return { ...prev, [emp.id]: updated };
                                    });
                                  }} className="w-20 px-2 py-1 border rounded text-xs" />
                                  <span className="text-xs text-gray-500">%</span>
                                </div>
                                <select value={ihssDed?.quincena || config.ihssQuincena || 'ambas'} onChange={(e) => {
                                  const newQuincena = e.target.value as 'ambas' | '1ra' | '2da';
                                  setEmployeeDeductions(prev => {
                                    const current = prev[emp.id] || [];
                                    const updated = current.map(d => d.id === 'ihss' ? { ...d, quincena: newQuincena } : d);
                                    fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
                                    return { ...prev, [emp.id]: updated };
                                  });
                                }} className="px-2 py-1 border rounded text-xs">
                                  <option value="ambas">Ambas quincenas</option>
                                  <option value="1ra">Solo 1ra quincena</option>
                                  <option value="2da">Solo 2da quincena</option>
                                </select>
                              </div>
                            )}
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={rapEnabled} onChange={() => toggleStandard('rap', 'RAP', true, config.rap)} className="h-4 w-4" />
                                <div>
                                  <div className="font-medium text-sm">RAP</div>
                                  <div className="text-xs text-gray-500">{rapDed?.value ?? config.rap}% sobre salario</div>
                                </div>
                              </div>
                              <span className="text-sm font-medium text-red-600">-{formatCurrency(rapAmt)}</span>
                            </div>
                            {rapEnabled && (
                              <div className="mt-2 ml-7 space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-500">Porcentaje:</label>
                                  <input type="number" step={0.1} min={0} max={100} value={rapDed?.value ?? config.rap} onChange={(e) => {
                                    const newVal = parseFloat(e.target.value) || 0;
                                    setEmployeeDeductions(prev => {
                                      const current = prev[emp.id] || [];
                                      const updated = current.map(d => d.id === 'rap' ? { ...d, value: newVal } : d);
                                      fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
                                      return { ...prev, [emp.id]: updated };
                                    });
                                  }} className="w-20 px-2 py-1 border rounded text-xs" />
                                  <span className="text-xs text-gray-500">%</span>
                                </div>
                                <select value={rapDed?.quincena || config.rapQuincena || 'ambas'} onChange={(e) => {
                                  const newQuincena = e.target.value as 'ambas' | '1ra' | '2da';
                                  setEmployeeDeductions(prev => {
                                    const current = prev[emp.id] || [];
                                    const updated = current.map(d => d.id === 'rap' ? { ...d, quincena: newQuincena } : d);
                                    fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
                                    return { ...prev, [emp.id]: updated };
                                  });
                                }} className="px-2 py-1 border rounded text-xs">
                                  <option value="ambas">Ambas quincenas</option>
                                  <option value="1ra">Solo 1ra quincena</option>
                                  <option value="2da">Solo 2da quincena</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Custom Deductions */}
                <div>
                  <h3 className="font-medium mb-3">Deducciones Adicionales</h3>
                  {customDeds.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {customDeds.map(d => {
                        const totalAmount = d.type === 'fixed' ? d.value : emp.salary * (d.value / 100);
                        let perPeriod = d.paymentFrequency === 'dividido' && d.totalPayments > 0 ? totalAmount / d.totalPayments : totalAmount;
                        if (d.quincena === 'ambas') perPeriod = perPeriod / 2;
                        const freqLabel = d.paymentFrequency === 'mensual' ? 'Mensual' : d.paymentFrequency === 'quincenal' ? 'Quincenal' : `${d.totalPayments} pagos`;
                        const quincenaLabel = d.quincena === '1ra' ? ' · 1ra quincena' : d.quincena === '2da' ? ' · 2da quincena' : d.quincena === 'ambas' ? ' · ambas quincenas' : '';
                        return (
                          <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={d.enabled} onChange={() => {
                                setEmployeeDeductions(prev => {
                                  const current = prev[emp.id] || [];
                                  const updated = current.map(x => x.id === d.id ? { ...x, enabled: !x.enabled } : x);
                                  fetch(`/api/companies/${companyId}/hr/payroll/deductions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: emp.id, deductions: updated }) }).catch(err => console.error('Error saving deductions:', err));
                                  return { ...prev, [emp.id]: updated };
                                });
                              }} className="h-4 w-4" />
                              <div>
                                <div className="font-medium text-sm">{d.name}</div>
                                <div className="text-xs text-gray-500">
                                  {d.type === 'fixed' ? `${formatCurrency(d.value)} fijo` : `${d.value}% del salario`} · {freqLabel}{quincenaLabel}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-red-600">-{formatCurrency(perPeriod)}/período</span>
                              <button onClick={() => {
                                setEditingDeductionId(d.id);
                                setNewDeduction({ name: d.name, type: d.type, value: d.value, paymentFrequency: d.paymentFrequency, totalPayments: d.totalPayments, quincena: d.quincena });
                              }} className="text-blue-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => removeDeduction(d.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">No hay deducciones adicionales</p>
                  )}

                  {/* Add new */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <input type="text" placeholder="Nombre (ej: Anticipo, Préstamo)" value={newDeduction.name} onChange={(e) => setNewDeduction({ ...newDeduction, name: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
                      <select value={newDeduction.type} onChange={(e) => setNewDeduction({ ...newDeduction, type: e.target.value as 'fixed' | 'percentage' })} className="px-3 py-2 border rounded-md text-sm">
                        <option value="fixed">Monto fijo (L.)</option>
                        <option value="percentage">Porcentaje (%)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <input type="number" placeholder={newDeduction.type === 'fixed' ? 'Monto total' : 'Porcentaje'} value={newDeduction.value || ''} onChange={(e) => setNewDeduction({ ...newDeduction, value: parseFloat(e.target.value) || 0 })} className="px-3 py-2 border rounded-md text-sm" />
                      <select value={newDeduction.paymentFrequency} onChange={(e) => setNewDeduction({ ...newDeduction, paymentFrequency: e.target.value as 'mensual' | 'quincenal' | 'dividido', totalPayments: e.target.value === 'dividido' ? newDeduction.totalPayments : 1 })} className="px-3 py-2 border rounded-md text-sm">
                        <option value="mensual">Mensual (cada mes)</option>
                        <option value="quincenal">Quincenal (cada pago)</option>
                        <option value="dividido">Dividido en pagos</option>
                      </select>
                    </div>
                    {newDeduction.paymentFrequency === 'dividido' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-gray-500">Número de pagos</label>
                          <input type="number" min={1} placeholder="Ej: 5" value={newDeduction.totalPayments || ''} onChange={(e) => setNewDeduction({ ...newDeduction, totalPayments: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border rounded-md text-sm" />
                        </div>
                        {newDeduction.value > 0 && newDeduction.totalPayments > 0 && (
                          <div className="flex items-end">
                            <div className="text-sm text-gray-600">
                              Cada pago: <span className="font-bold text-red-600">
                                {newDeduction.type === 'fixed'
                                  ? formatCurrency(newDeduction.value / newDeduction.totalPayments)
                                  : `${(newDeduction.value / newDeduction.totalPayments).toFixed(2)}%`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {(newDeduction.paymentFrequency === 'quincenal' || newDeduction.paymentFrequency === 'dividido') && (
                      <div className="mb-3">
                        <label className="text-xs text-gray-500">Aplicar en quincena</label>
                        <select value={newDeduction.quincena} onChange={(e) => setNewDeduction({ ...newDeduction, quincena: e.target.value as 'ambas' | '1ra' | '2da' })} className="w-full mt-1 px-3 py-2 border rounded-md text-sm">
                          <option value="ambas">Ambas quincenas</option>
                          <option value="1ra">Solo 1ra quincena</option>
                          <option value="2da">Solo 2da quincena</option>
                        </select>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={addCustomDeduction} disabled={!newDeduction.name || newDeduction.value <= 0} className="flex-1">
                        {editingDeductionId ? <><Save className="h-4 w-4 mr-2" /> Guardar Cambios</> : <><Plus className="h-4 w-4 mr-2" /> Agregar Deducción</>}
                      </Button>
                      {editingDeductionId && (
                        <Button variant="outline" onClick={() => { setEditingDeductionId(null); setNewDeduction({ name: '', type: 'fixed', value: 0, paymentFrequency: 'mensual', totalPayments: 1, quincena: 'ambas' }); }}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">Resumen de Deducciones</h4>
                  <div className="space-y-1 text-sm">
                    {igssEnabled && <div className="flex justify-between"><span>IGSS Empleado ({config.igssEmployee}%)</span><span className="text-red-600">-{formatCurrency(calculatePayroll(emp.salary, emp.id).igssEmployee)}</span></div>}
                    {ihssEnabled && <div className="flex justify-between"><span>IHSS ({config.ihss}%)</span><span className="text-red-600">-{formatCurrency(calculatePayroll(emp.salary, emp.id).ihss)}</span></div>}
                    {rapEnabled && <div className="flex justify-between"><span>RAP ({config.rap}%)</span><span className="text-red-600">-{formatCurrency(calculatePayroll(emp.salary, emp.id).rap)}</span></div>}
                    {customDeds.filter(d => d.enabled).map(d => {
                      const totalAmount = d.type === 'fixed' ? d.value : emp.salary * (d.value / 100);
                      let perPeriod = d.paymentFrequency === 'dividido' && d.totalPayments > 0 ? totalAmount / d.totalPayments : totalAmount;
                      if (d.quincena === 'ambas') perPeriod = perPeriod / 2;
                      const freqLabel = d.paymentFrequency === 'mensual' ? 'Mensual' : d.paymentFrequency === 'quincenal' ? 'Quincenal' : `${d.totalPayments} pagos`;
                      return (
                        <div key={d.id} className="flex justify-between">
                          <span>{d.name} ({freqLabel})</span>
                          <span className="text-red-600">-{formatCurrency(perPeriod)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between font-bold border-t pt-1 mt-1">
                      <span>Total Deducciones</span>
                      <span className="text-red-600">-{formatCurrency(calculatePayroll(emp.salary, emp.id).totalDeductions)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-600">
                      <span>Neto a Pagar</span>
                      <span>{formatCurrency(calculatePayroll(emp.salary, emp.id).netPay)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'current'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Nómina Actual
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle className="h-4 w-4 inline mr-2" />
            Nóminas Cerradas
            {closedPayrolls.length > 0 && (
              <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">{closedPayrolls.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-bold">Configuración de Nómina</h2>
              <div className="flex gap-2">
                <Button onClick={saveConfig}><Save className="h-4 w-4 mr-2" /> Guardar</Button>
                <Button variant="outline" onClick={() => setShowConfig(false)}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Frequency & Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Frecuencia de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <select
                      value={editConfig.frequency}
                      onChange={(e) => setEditConfig({ ...editConfig, frequency: e.target.value as PayrollConfig['frequency'] })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="semanal">Semanal</option>
                      <option value="cada_2_semanas">Cada 2 semanas</option>
                      <option value="quincenal">Quincenal (2 veces al mes)</option>
                      <option value="mensual">Mensual</option>
                    </select>

                    {/* Semanal: día de la semana */}
                    {editConfig.frequency === 'semanal' && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <label className="text-xs font-medium text-gray-600">Día de pago semanal</label>
                        <select
                          value={editConfig.weeklyPayDay}
                          onChange={(e) => setEditConfig({ ...editConfig, weeklyPayDay: parseInt(e.target.value) })}
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                        >
                          <option value={1}>Lunes</option>
                          <option value={2}>Martes</option>
                          <option value={3}>Miércoles</option>
                          <option value={4}>Jueves</option>
                          <option value={5}>Viernes</option>
                          <option value={6}>Sábado</option>
                        </select>
                      </div>
                    )}

                    {/* Cada 2 semanas: fecha de inicio */}
                    {editConfig.frequency === 'cada_2_semanas' && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <label className="text-xs font-medium text-gray-600">Fecha de inicio del ciclo</label>
                        <p className="text-xs text-gray-400 mb-2">Desde esta fecha se cuentan bloques de 2 semanas</p>
                        <div className="flex gap-2">
                          <div>
                            <label className="text-xs text-gray-500">Mes</label>
                            <select
                              value={editConfig.biweeklyStartMonth}
                              onChange={(e) => setEditConfig({ ...editConfig, biweeklyStartMonth: parseInt(e.target.value) })}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value={1}>Enero</option><option value={2}>Febrero</option><option value={3}>Marzo</option>
                              <option value={4}>Abril</option><option value={5}>Mayo</option><option value={6}>Junio</option>
                              <option value={7}>Julio</option><option value={8}>Agosto</option><option value={9}>Septiembre</option>
                              <option value={10}>Octubre</option><option value={11}>Noviembre</option><option value={12}>Diciembre</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Día</label>
                            <input
                              type="number"
                              value={editConfig.biweeklyStartDay}
                              onChange={(e) => setEditConfig({ ...editConfig, biweeklyStartDay: parseInt(e.target.value) || 1 })}
                              className="w-full px-2 py-1 border rounded text-sm"
                              min={1}
                              max={31}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Pagos: cada 14 días desde el {editConfig.biweeklyStartDay}/{editConfig.biweeklyStartMonth}</p>
                      </div>
                    )}

                    {/* Quincenal: dos días de pago */}
                    {editConfig.frequency === 'quincenal' && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <label className="text-xs font-medium text-gray-600">Días de pago quincenal</label>
                        <p className="text-xs text-gray-400 mb-2">Selecciona los 2 días del mes en que se paga</p>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Primer pago (día)</label>
                            <select
                              value={editConfig.quincenalDay1}
                              onChange={(e) => setEditConfig({ ...editConfig, quincenalDay1: parseInt(e.target.value) })}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              {Array.from({ length: 28 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Segundo pago (día)</label>
                            <select
                              value={editConfig.quincenalDay2}
                              onChange={(e) => setEditConfig({ ...editConfig, quincenalDay2: parseInt(e.target.value) })}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              {Array.from({ length: 28 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Pagos los días {editConfig.quincenalDay1} y {editConfig.quincenalDay2} de cada mes</p>
                      </div>
                    )}

                    {/* Mensual: día de pago */}
                    {editConfig.frequency === 'mensual' && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <label className="text-xs font-medium text-gray-600">Día de pago mensual</label>
                        <select
                          value={editConfig.paymentDay}
                          onChange={(e) => setEditConfig({ ...editConfig, paymentDay: parseInt(e.target.value) })}
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                        >
                          {Array.from({ length: 28 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Se paga el día {editConfig.paymentDay} de cada mes</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Método de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={editConfig.paymentMethod}
                      onChange={(e) => setEditConfig({ ...editConfig, paymentMethod: e.target.value as PayrollConfig['paymentMethod'] })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="cheque">Cheque</option>
                      <option value="deposito">Depósito</option>
                    </select>
                  </CardContent>
                </Card>
              </div>

              {/* Working Days & Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Días Laborales por Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <input
                      type="number"
                      value={editConfig.workingDaysPerPeriod}
                      onChange={(e) => setEditConfig({ ...editConfig, workingDaysPerPeriod: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-md"
                      min={1}
                      max={31}
                    />
                    <p className="text-xs text-gray-500 mt-1">Incluye todos los días en que los empleados trabajan (lun-dom, incluye sábados y domingos si aplica)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Moneda</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={editConfig.currency}
                      onChange={(e) => setEditConfig({ ...editConfig, currency: e.target.value as 'HNL' | 'USD' })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="HNL">Lempira (HNL)</option>
                      <option value="USD">Dólar (USD)</option>
                    </select>
                  </CardContent>
                </Card>
              </div>

              {/* Deduction Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Porcentajes de Deducción (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">IGSS Empleado</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editConfig.igssEmployee}
                            onChange={(e) => setEditConfig({ ...editConfig, igssEmployee: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border rounded text-sm"
                            step={0.1}
                            min={0}
                            max={100}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                        <select
                          value={editConfig.igssQuincena || 'ambas'}
                          onChange={(e) => setEditConfig({ ...editConfig, igssQuincena: e.target.value as 'ambas' | '1ra' | '2da' })}
                          className="w-full mt-1 px-2 py-1 border rounded text-xs"
                        >
                          <option value="ambas">Ambas quincenas</option>
                          <option value="1ra">Solo 1ra quincena</option>
                          <option value="2da">Solo 2da quincena</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">IGSS Patronal</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editConfig.igssEmployer}
                            onChange={(e) => setEditConfig({ ...editConfig, igssEmployer: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border rounded text-sm"
                            step={0.1}
                            min={0}
                            max={100}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">IHSS</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editConfig.ihss}
                            onChange={(e) => setEditConfig({ ...editConfig, ihss: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border rounded text-sm"
                            step={0.1}
                            min={0}
                            max={100}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                        <select
                          value={editConfig.ihssQuincena || 'ambas'}
                          onChange={(e) => setEditConfig({ ...editConfig, ihssQuincena: e.target.value as 'ambas' | '1ra' | '2da' })}
                          className="w-full mt-1 px-2 py-1 border rounded text-xs"
                        >
                          <option value="ambas">Ambas quincenas</option>
                          <option value="1ra">Solo 1ra quincena</option>
                          <option value="2da">Solo 2da quincena</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">RAP</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editConfig.rap}
                            onChange={(e) => setEditConfig({ ...editConfig, rap: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border rounded text-sm"
                            step={0.1}
                            min={0}
                            max={100}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                        <select
                          value={editConfig.rapQuincena || 'ambas'}
                          onChange={(e) => setEditConfig({ ...editConfig, rapQuincena: e.target.value as 'ambas' | '1ra' | '2da' })}
                          className="w-full mt-1 px-2 py-1 border rounded text-xs"
                        >
                          <option value="ambas">Ambas quincenas</option>
                          <option value="1ra">Solo 1ra quincena</option>
                          <option value="2da">Solo 2da quincena</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Benefits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Beneficios y Prestaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Aguinaldo */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm">13vo Mes (Aguinaldo)</div>
                          <div className="text-xs text-gray-500">Bono anual obligatorio según ley</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editConfig.applyAguinaldo}
                          onChange={(e) => setEditConfig({ ...editConfig, applyAguinaldo: e.target.checked })}
                          className="h-4 w-4"
                        />
                      </div>
                      {editConfig.applyAguinaldo && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 pt-2 border-t">
                          <div>
                            <label className="text-xs text-gray-500">Porcentaje del salario</label>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="number"
                                value={editConfig.aguinaldoPercent}
                                onChange={(e) => setEditConfig({ ...editConfig, aguinaldoPercent: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1 border rounded text-sm"
                                min={0}
                                max={100}
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Forma de pago</label>
                            <select
                              value={editConfig.aguinaldoPaymentType}
                              onChange={(e) => setEditConfig({ ...editConfig, aguinaldoPaymentType: e.target.value as 'proporcional' | 'unico' })}
                              className="w-full mt-1 px-2 py-1 border rounded text-sm"
                            >
                              <option value="unico">Pago único</option>
                              <option value="proporcional">Proporcional (en cada quincena)</option>
                            </select>
                          </div>
                          {editConfig.aguinaldoPaymentType === 'unico' && (
                            <div>
                              <label className="text-xs text-gray-500">Mes de pago</label>
                              <select
                                value={editConfig.aguinaldoPaymentMonth}
                                onChange={(e) => setEditConfig({ ...editConfig, aguinaldoPaymentMonth: parseInt(e.target.value) })}
                                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                              >
                                <option value={1}>Enero</option><option value={2}>Febrero</option><option value={3}>Marzo</option>
                                <option value={4}>Abril</option><option value={5}>Mayo</option><option value={6}>Junio</option>
                                <option value={7}>Julio</option><option value={8}>Agosto</option><option value={9}>Septiembre</option>
                                <option value={10}>Octubre</option><option value={11}>Noviembre</option><option value={12}>Diciembre</option>
                              </select>
                            </div>
                          )}
                          {editConfig.aguinaldoPaymentType === 'proporcional' && (
                            <div>
                              <label className="text-xs text-gray-500">Acumulado por período</label>
                              <p className="text-sm mt-1 text-gray-700">
                                {editConfig.frequency === 'semanal' && `~${(editConfig.aguinaldoPercent / 52).toFixed(2)}% por semana`}
                                {editConfig.frequency === 'cada_2_semanas' && `~${(editConfig.aguinaldoPercent / 26).toFixed(2)}% por quincena`}
                                {editConfig.frequency === 'quincenal' && `~${(editConfig.aguinaldoPercent / 24).toFixed(2)}% por quincena`}
                                {editConfig.frequency === 'mensual' && `~${(editConfig.aguinaldoPercent / 12).toFixed(2)}% por mes`}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bono 14 */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm">14vo Mes (Bono 14)</div>
                          <div className="text-xs text-gray-500">Mes catorceavo según ley</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editConfig.applyBeneficio14}
                          onChange={(e) => setEditConfig({ ...editConfig, applyBeneficio14: e.target.checked })}
                          className="h-4 w-4"
                        />
                      </div>
                      {editConfig.applyBeneficio14 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 pt-2 border-t">
                          <div>
                            <label className="text-xs text-gray-500">Porcentaje del salario</label>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="number"
                                value={editConfig.beneficio14Percent}
                                onChange={(e) => setEditConfig({ ...editConfig, beneficio14Percent: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1 border rounded text-sm"
                                min={0}
                                max={100}
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Forma de pago</label>
                            <select
                              value={editConfig.beneficio14PaymentType}
                              onChange={(e) => setEditConfig({ ...editConfig, beneficio14PaymentType: e.target.value as 'proporcional' | 'unico' })}
                              className="w-full mt-1 px-2 py-1 border rounded text-sm"
                            >
                              <option value="unico">Pago único</option>
                              <option value="proporcional">Proporcional (en cada quincena)</option>
                            </select>
                          </div>
                          {editConfig.beneficio14PaymentType === 'unico' && (
                            <div>
                              <label className="text-xs text-gray-500">Mes de pago</label>
                              <select
                                value={editConfig.beneficio14PaymentMonth}
                                onChange={(e) => setEditConfig({ ...editConfig, beneficio14PaymentMonth: parseInt(e.target.value) })}
                                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                              >
                                <option value={1}>Enero</option><option value={2}>Febrero</option><option value={3}>Marzo</option>
                                <option value={4}>Abril</option><option value={5}>Mayo</option><option value={6}>Junio</option>
                                <option value={7}>Julio</option><option value={8}>Agosto</option><option value={9}>Septiembre</option>
                                <option value={10}>Octubre</option><option value={11}>Noviembre</option><option value={12}>Diciembre</option>
                              </select>
                            </div>
                          )}
                          {editConfig.beneficio14PaymentType === 'proporcional' && (
                            <div>
                              <label className="text-xs text-gray-500">Acumulado por período</label>
                              <p className="text-sm mt-1 text-gray-700">
                                {editConfig.frequency === 'semanal' && `~${(editConfig.beneficio14Percent / 52).toFixed(2)}% por semana`}
                                {editConfig.frequency === 'cada_2_semanas' && `~${(editConfig.beneficio14Percent / 26).toFixed(2)}% por quincena`}
                                {editConfig.frequency === 'quincenal' && `~${(editConfig.beneficio14Percent / 24).toFixed(2)}% por quincena`}
                                {editConfig.frequency === 'mensual' && `~${(editConfig.beneficio14Percent / 12).toFixed(2)}% por mes`}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Prima Vacacional */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm">Prima Vacacional</div>
                          <div className="text-xs text-gray-500">Sobre bono vacacional</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editConfig.applyVacationBonus}
                          onChange={(e) => setEditConfig({ ...editConfig, applyVacationBonus: e.target.checked })}
                          className="h-4 w-4"
                        />
                      </div>
                      {editConfig.applyVacationBonus && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 pt-2 border-t">
                          <div>
                            <label className="text-xs text-gray-500">Porcentaje del salario</label>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="number"
                                value={editConfig.vacationBonusPercent}
                                onChange={(e) => setEditConfig({ ...editConfig, vacationBonusPercent: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1 border rounded text-sm"
                                min={0}
                                max={100}
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Forma de pago</label>
                            <select
                              value={editConfig.vacationBonusPaymentType}
                              onChange={(e) => setEditConfig({ ...editConfig, vacationBonusPaymentType: e.target.value as 'proporcional' | 'unico' })}
                              className="w-full mt-1 px-2 py-1 border rounded text-sm"
                            >
                              <option value="unico">Pago único</option>
                              <option value="proporcional">Proporcional (en cada quincena)</option>
                            </select>
                          </div>
                          {editConfig.vacationBonusPaymentType === 'unico' && (
                            <div>
                              <label className="text-xs text-gray-500">Mes de pago</label>
                              <select
                                value={editConfig.vacationBonusPaymentMonth}
                                onChange={(e) => setEditConfig({ ...editConfig, vacationBonusPaymentMonth: parseInt(e.target.value) })}
                                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                              >
                                <option value={1}>Enero</option><option value={2}>Febrero</option><option value={3}>Marzo</option>
                                <option value={4}>Abril</option><option value={5}>Mayo</option><option value={6}>Junio</option>
                                <option value={7}>Julio</option><option value={8}>Agosto</option><option value={9}>Septiembre</option>
                                <option value={10}>Octubre</option><option value={11}>Noviembre</option><option value={12}>Diciembre</option>
                              </select>
                            </div>
                          )}
                          {editConfig.vacationBonusPaymentType === 'proporcional' && (
                            <div>
                              <label className="text-xs text-gray-500">Acumulado por período</label>
                              <p className="text-sm mt-1 text-gray-700">
                                {editConfig.frequency === 'semanal' && `~${(editConfig.vacationBonusPercent / 52).toFixed(2)}% por semana`}
                                {editConfig.frequency === 'cada_2_semanas' && `~${(editConfig.vacationBonusPercent / 26).toFixed(2)}% por quincena`}
                                {editConfig.frequency === 'quincenal' && `~${(editConfig.vacationBonusPercent / 24).toFixed(2)}% por quincena`}
                                {editConfig.frequency === 'mensual' && `~${(editConfig.vacationBonusPercent / 12).toFixed(2)}% por mes`}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Closing Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fechas de Cierre de Nómina
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-4">Todas las fechas se calculan como <strong>días antes de cada pago</strong>, adaptándose a la frecuencia seleccionada.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <label className="text-xs font-medium text-gray-600">Documentación</label>
                      <p className="text-xs text-gray-400 mb-2">Recibos, facturas y documentos</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editConfig.docsDeadlineDaysBefore}
                          onChange={(e) => setEditConfig({ ...editConfig, docsDeadlineDaysBefore: parseInt(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          min={0}
                          max={30}
                        />
                        <span className="text-xs text-gray-500">días antes del pago</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <label className="text-xs font-medium text-gray-600">Asistencia</label>
                      <p className="text-xs text-gray-400 mb-2">Regularizar marcaciones y faltas</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editConfig.attendanceDeadlineDaysBefore}
                          onChange={(e) => setEditConfig({ ...editConfig, attendanceDeadlineDaysBefore: parseInt(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          min={0}
                          max={30}
                        />
                        <span className="text-xs text-gray-500">días antes del pago</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <label className="text-xs font-medium text-gray-600">Horas Extras</label>
                      <p className="text-xs text-gray-400 mb-2">Reportar horas extras del período</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editConfig.overtimeDeadlineDaysBefore}
                          onChange={(e) => setEditConfig({ ...editConfig, overtimeDeadlineDaysBefore: parseInt(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          min={0}
                          max={30}
                        />
                        <span className="text-xs text-gray-500">días antes del pago</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <label className="text-xs font-medium text-gray-600">Bonificaciones</label>
                      <p className="text-xs text-gray-400 mb-2">Solicitar bonos y comisiones</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editConfig.bonusDeadlineDaysBefore}
                          onChange={(e) => setEditConfig({ ...editConfig, bonusDeadlineDaysBefore: parseInt(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          min={0}
                          max={30}
                        />
                        <span className="text-xs text-gray-500">días antes del pago</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Period Status */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Período de Nómina Actual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Mes</label>
                      <select
                        value={editConfig.closingMonth}
                        onChange={(e) => setEditConfig({ ...editConfig, closingMonth: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value={1}>Enero</option>
                        <option value={2}>Febrero</option>
                        <option value={3}>Marzo</option>
                        <option value={4}>Abril</option>
                        <option value={5}>Mayo</option>
                        <option value={6}>Junio</option>
                        <option value={7}>Julio</option>
                        <option value={8}>Agosto</option>
                        <option value={9}>Septiembre</option>
                        <option value={10}>Octubre</option>
                        <option value={11}>Noviembre</option>
                        <option value={12}>Diciembre</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Año</label>
                      <input
                        type="number"
                        value={editConfig.closingYear}
                        onChange={(e) => setEditConfig({ ...editConfig, closingYear: parseInt(e.target.value) || new Date().getFullYear() })}
                        className="w-full px-3 py-2 border rounded-md"
                        min={2020}
                        max={2030}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full p-3 bg-blue-50 rounded-lg text-center">
                        <div className="text-xs text-blue-600 font-medium">
                          {editConfig.frequency === 'semanal' && `Pago semanal cada ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][editConfig.weeklyPayDay]}`}
                          {editConfig.frequency === 'cada_2_semanas' && `Pago cada 2 semanas desde el ${editConfig.biweeklyStartDay}/${editConfig.biweeklyStartMonth}`}
                          {editConfig.frequency === 'quincenal' && `Pagos los días ${editConfig.quincenalDay1} y ${editConfig.quincenalDay2}`}
                          {editConfig.frequency === 'mensual' && `Pago mensual día ${editConfig.paymentDay}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          <div>Docs: {editConfig.docsDeadlineDaysBefore} días antes del pago</div>
                          <div>Asistencia: {editConfig.attendanceDeadlineDaysBefore} días antes</div>
                          <div>Extras: {editConfig.overtimeDeadlineDaysBefore} días antes</div>
                          <div>Bonos: {editConfig.bonusDeadlineDaysBefore} días antes</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'current' && (
      <>
      {/* Current Config Summary */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">Frecuencia:</span>
                <Badge variant="default">{FREQ_LABELS[config.frequency]}</Badge>
                {config.frequency === 'quincenal' && (
                  <span className="text-gray-500 text-xs">• Días {config.quincenalDay1} y {config.quincenalDay2}</span>
                )}
                {config.frequency === 'semanal' && (
                  <span className="text-gray-500 text-xs">• {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][config.weeklyPayDay]}</span>
                )}
                {config.frequency === 'cada_2_semanas' && (
                  <span className="text-gray-500 text-xs">• Desde {config.biweeklyStartDay}/{config.biweeklyStartMonth}</span>
                )}
                {config.frequency === 'mensual' && (
                  <span className="text-gray-500 text-xs">• Día {config.paymentDay}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">Pago:</span>
                <Badge variant="default">{METHOD_LABELS[config.paymentMethod]}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">IGSS: {config.igssEmployee}%{config.igssQuincena !== 'ambas' ? ` (${config.igssQuincena})` : ''}</span>
                <span className="text-gray-500">IHSS: {config.ihss}%{config.ihssQuincena !== 'ambas' ? ` (${config.ihssQuincena})` : ''}</span>
                <span className="text-gray-500">RAP: {config.rap}%{config.rapQuincena !== 'ambas' ? ` (${config.rapQuincena})` : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">Cierre: {editConfig.docsDeadlineDaysBefore}/{editConfig.attendanceDeadlineDaysBefore}/{editConfig.overtimeDeadlineDaysBefore}/{editConfig.bonusDeadlineDaysBefore} días antes del pago</span>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setEditConfig(config); setShowConfig(true); }}>
              <Settings className="h-3 w-3 mr-1" /> Editar Config
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalPeriodBase)}</div>
              <div className="text-sm text-gray-500">Salarios Brutos ({FREQ_LABELS[config.frequency]})</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</div>
              <div className="text-sm text-gray-500">Total Deducciones</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalAttendanceDeductions)}</div>
              <div className="text-sm text-gray-500">Deducciones Asistencia</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAttendanceIncomes)}</div>
              <div className="text-sm text-gray-500">Ingresos Asistencia</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalNetPay)}</div>
              <div className="text-sm text-gray-500">Total Neto a Pagar</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Nómina</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Empleado</th>
                  <th className="text-left py-2">Cargo</th>
                  <th className="text-left py-2">Departamento</th>
                  <th className="text-right py-2">Salario Período</th>
                  <th className="text-right py-2">IGSS ({config.igssEmployee}%)</th>
                  <th className="text-right py-2">IHSS ({config.ihss}%)</th>
                  <th className="text-right py-2">RAP ({config.rap}%)</th>
                  <th className="text-right py-2 text-orange-600">Asistencia</th>
                  <th className="text-right py-2 text-green-600">Horas Extra</th>
                  <th className="text-right py-2">Deducciones</th>
                  <th className="text-right py-2">Neto</th>
                  <th className="text-center py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map(emp => {
                  const calc = calculatePayroll(emp.salary, emp.id);
                  const empDeds = getDeductionsForEmp(emp.id).filter(d => d.enabled && !d.isStandard);
                  return (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{emp.name}</td>
                      <td className="py-2 text-gray-500">{emp.position}</td>
                      <td className="py-2 text-gray-500">{emp.department || 'N/A'}</td>
                      <td className="py-2 text-right">{formatCurrency(calc.periodSalary)}</td>
                      <td className="py-2 text-right text-red-600">-{formatCurrency(calc.igssEmployee)}</td>
                      <td className="py-2 text-right text-red-600">-{formatCurrency(calc.ihss)}</td>
                      <td className="py-2 text-right text-red-600">-{formatCurrency(calc.rap)}</td>
                      <td className="py-2 text-right text-orange-600">
                        {calc.attendanceDeductionTotal > 0 ? (
                          <div>
                            <div>-{formatCurrency(calc.attendanceDeductionTotal)}</div>
                            {attendanceDeductions[emp.id]?.filter(a => a.type === 'deduction').slice(0, 3).map((item, idx) => (
                              <div key={idx} className="text-xs text-orange-400">• {item.label}</div>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-2 text-right text-green-600">
                        {calc.attendanceIncomeTotal > 0 ? (
                          <div>
                            <div>+{formatCurrency(calc.attendanceIncomeTotal)}</div>
                            {attendanceDeductions[emp.id]?.filter(a => a.type === 'income').slice(0, 3).map((item, idx) => (
                              <div key={idx} className="text-xs text-green-400">• {item.label}</div>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-2 text-right text-red-600 font-medium">-{formatCurrency(calc.totalDeductions)}</td>
                      <td className="py-2 text-right text-green-600 font-bold">{formatCurrency(calc.netPay)}</td>
                      <td className="py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="outline" size="sm" onClick={() => setEditingDeductions(emp.id)}>
                            <Pencil className="h-3 w-3 mr-1" />
                            Deducciones{empDeds.length > 0 && <span className="ml-1 bg-red-100 text-red-700 px-1.5 rounded-full text-xs">{empDeds.length}</span>}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => generateVoucher(emp)}>
                            <FileText className="h-3 w-3 mr-1" />
                            Voucher
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-gray-500">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, activeEmployees.length)} de {activeEmployees.length} empleados
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>«</Button>
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((p, i, arr) => (
                    <span key={p} className="flex items-center">
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-400 px-1">…</span>}
                      <Button variant={p === currentPage ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(p)} className="min-w-[32px]">{p}</Button>
                    </span>
                  ))}
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</Button>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>»</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {closedPayrolls.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700">No hay nóminas cerradas</h3>
                <p className="text-sm text-gray-500 mt-1">Las nóminas que cierres aparecerán aquí</p>
              </CardContent>
            </Card>
          ) : (
            closedPayrolls.map(record => (
              <Card key={record.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Lock className="h-4 w-4 text-green-600" />
                        {record.period}
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Cerrada</span>
                      </h3>
                      <p className="text-sm text-gray-500">
                        Cerrada el {new Date(record.closedAt).toLocaleDateString('es-HN')} por {record.closedBy}
                      </p>
                      <p className="text-sm text-gray-500">
                        Frecuencia: {record.frequency} | Empleados: {record.employeeCount}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => downloadClosedCSV(record)}>
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteClosedPayroll(record.id)} className="text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-gray-500">Salario Período Total</p>
                      <p className="font-bold">{formatCurrency(record.totalPeriodBase || record.totalBase)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Deducciones</p>
                      <p className="font-bold text-red-600">-{formatCurrency(record.totalDeductions)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">IGSS Patronal</p>
                      <p className="font-bold">{formatCurrency(record.totalIgssEmployer)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Neto a Pagar</p>
                      <p className="font-bold text-green-600">{formatCurrency(record.totalNetPay)}</p>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="text-sm text-blue-600 cursor-pointer hover:underline">Ver detalle de empleados</summary>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1">Nombre</th>
                            <th className="text-left py-1">Cargo</th>
                            <th className="text-right py-1">Salario Período</th>
                            <th className="text-right py-1">IGSS</th>
                            <th className="text-right py-1">IHSS</th>
                            <th className="text-right py-1">RAP</th>
                            <th className="text-right py-1">Deducciones</th>
                            <th className="text-right py-1">Neto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.employees.map((emp, i) => (
                            <tr key={i} className="border-b">
                              <td className="py-1">{emp.name}</td>
                              <td className="py-1">{emp.position}</td>
                              <td className="text-right py-1">{formatCurrency(emp.periodSalary || emp.salary)}</td>
                              <td className="text-right py-1">{formatCurrency(emp.igssEmployee)}</td>
                              <td className="text-right py-1">{formatCurrency(emp.ihss)}</td>
                              <td className="text-right py-1">{formatCurrency(emp.rap)}</td>
                              <td className="text-right py-1 text-red-600">{formatCurrency(emp.totalDeductions)}</td>
                              <td className="text-right py-1 text-green-600">{formatCurrency(emp.netPay)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
