// HR Module TypeScript Types
// Diamond Accounting - Recursos Humanos
// Aligned with actual implementation across all HR pages

// ==================== SHARED TYPES ====================

export type EmployeeStatus = 'active' | 'inactive' | 'terminated' | 'suspended';

export type ContractType = 'indefinido' | 'determinado' | 'por obra' | 'prueba' | 'temporada';

export type ScheduleType = 'completa' | 'media' | 'personalizada';

export type Modality = 'presencial' | 'remoto' | 'híbrido';

export type PayrollFrequency = 'semanal' | 'quincenal' | 'mensual' | 'cada_2_semanas';

export type PaymentMethod = 'transferencia' | 'efectivo' | 'cheque' | 'deposito';

export type Currency = 'HNL' | 'USD';

export type QuincenaSelection = 'ambas' | '1ra' | '2da';

export type BonusPaymentType = 'proporcional' | 'unico';

export type PermissionStatus = 'pending' | 'approved' | 'rejected';

export type Gender = 'M' | 'F' | '';

export type CivilStatus = 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'unión libre';

// ==================== EMPLOYEES ====================

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  identityNumber: string;
  photo: string;
  cv: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  status: EmployeeStatus;
  phone: string;
  email: string;
  address: string;
  civilStatus: CivilStatus;
  gender: Gender;
  freeDays: number[];
  vacationDays: number;
  usedVacationDays: number;
  contractType: ContractType;
  supervisor: string;
  reportsTo: string | null;
  schedule: ScheduleType;
  scheduleEntry: string;
  scheduleExit: string;
  scheduleHours: string;
  modality: Modality;
  educationLevel: string;
  university: string;
  degree: string;
  graduationYear: string;
  languages: string;
  certifications: string;
  driverLicense: boolean;
  otherSkills: string;
  socialSecurityNumber: string;
  pensionFund: string;
  laborRiskInsurer: string;
  workPermitStatus: string;
  visaExpiry: string;
  docIdentity: string;
  docAddressProof: string;
  docContract: string;
  docNDA: string;
  docEducationCerts: string;
  docPreviousJobs: string;
  docMedicalCert: string;
  medicalRecord: MedicalRecord;
  terminationDate: string;
  terminationReason: string;
  terminationRequestedBy: string;
  terminationPerformedBy: string;
  rehireable: boolean;
  reactivationDate: string;
  reactivationReason: string;
  reactivationRequestedBy: string;
  reactivationPerformedBy: string;
  suspensionDate: string;
  suspensionReason: string;
  suspensionRequestedBy: string;
  suspensionPerformedBy: string;
  hrDocuments: HRDocument[];
  history: HistoryEntry[];
}

export interface MedicalRecord {
  bloodType: string;
  allergies: string;
  chronicDiseases: string;
  currentMedications: string;
  emergencyContact: string;
  emergencyPhone: string;
  insuranceProvider: string;
  insuranceNumber: string;
  lastCheckup: string;
  disabilities: string;
  height: string;
  weight: string;
  notes: string;
}

export interface HRDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  file: string;
  observations: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface HistoryEntry {
  id: string;
  action: string;
  description: string;
  changes: string[];
  performedBy: string;
  date: string;
}

// ==================== EMPLOYEE FORMS ====================

export interface NewEmployeeForm {
  firstName: string;
  lastName: string;
  identityNumber: string;
  photo: string;
  cv: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  phone: string;
  email: string;
  address: string;
  civilStatus: CivilStatus;
  vacationDays: number;
  contractType: ContractType;
  supervisor: string;
  reportsTo: string | null;
  schedule: ScheduleType;
  scheduleHours: string;
  scheduleEntry: string;
  scheduleExit: string;
  modality: Modality;
  educationLevel: string;
  university: string;
  degree: string;
  graduationYear: string;
  languages: string;
  certifications: string;
  driverLicense: boolean;
  otherSkills: string;
  socialSecurityNumber: string;
  pensionFund: string;
  laborRiskInsurer: string;
  workPermitStatus: string;
  visaExpiry: string;
  docIdentity: string;
  docAddressProof: string;
  docContract: string;
  docNDA: string;
  docEducationCerts: string;
  docPreviousJobs: string;
  docMedicalCert: string;
  hrDocuments: HRDocument[];
  medicalRecord: MedicalRecord;
}

export interface DeactivateForm {
  reason: string;
  requestedBy: string;
  performedBy: string;
  rehireable: boolean;
}

export interface SuspendForm {
  reason: string;
  requestedBy: string;
  performedBy: string;
}

export interface ReactivateForm {
  reason: string;
  requestedBy: string;
  performedBy: string;
}

// ==================== DEPARTMENTS ====================

export interface Department {
  id: string;
  name: string;
  description: string;
  manager: string;
  createdAt: string;
  parentId?: string;
}

// ==================== POSITIONS ====================

export interface Position {
  id: string;
  name: string;
  department: string;
  description: string;
  minSalary: number;
  maxSalary: number;
  parentId?: string;
}

// ==================== ATTENDANCE ====================

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'vacation'
  | 'overtime'
  | 'unpaid_leave'
  | 'disability'
  | 'holiday'
  | 'free_day';

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  amount?: number;
  hours?: number;
  overtimeHours?: number;
  overtimeAmount?: number;
  overtimeRate?: number;
  holidayType?: 'doble' | 'triple';
  notes?: string;
}

export interface Holiday {
  date: string;
  name: string;
  type: 'doble' | 'triple';
}

export interface WorkSchedule {
  employeeId: string;
  freeDays: number[];
}

export type DisabilityPaymentType = 'full' | 'ihss' | 'none' | 'maternity';

export interface DisabilityType {
  value: DisabilityPaymentType;
  label: string;
  percentage: number;
  description: string;
  isFemaleOnly?: boolean;
}

export interface AttendanceHolidayExtended {
  id: string;
  name: string;
  date: string;
  type: 'doble' | 'triple' | 'asueto';
}

export interface AttendanceConfig {
  id: string;
  absencePercent: number;
  tardinessPercent: number;
  incapacityPercent: number;
  hoursExtraMultiplier: number;
}

export interface DeductionConfig {
  absent: { type: 'fixed' | 'daily'; value: number };
  late: { type: 'fixed' | 'hourly'; value: number };
  vacation: { type: 'none' | 'paid'; value: number };
  unpaid_leave: { type: 'fixed' | 'daily'; value: number };
  disability: { type: 'none' | 'paid'; value: number };
  overtime: { type: 'hourly'; value: number };
}

export interface AttendanceScheduleRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  freeDays: number[];
  scheduleEntry: string;
  scheduleExit: string;
  scheduleHours: string;
}

// ==================== ATTENDANCE QUINCENA ====================

export interface AttendanceQuincenaRow {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  baseSalary: number;
  days: (AttendanceStatus | '')[];
  totalPresente: number;
  totalAusente: number;
  totalTardanza: number;
  totalHorasExtra: number;
  montoDeducciones: number;
  montoIngresos: number;
}

// ==================== ATTENDANCE REPORTS ====================

export interface AttendanceReportSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  tardinessDays: number;
  vacationDays: number;
  hoursExtra: number;
  holidays: number;
}

export interface DailyAttendanceTrend {
  date: string;
  presente: number;
  ausente: number;
  tardanza: number;
  otros: number;
}

export interface EmployeeAttendanceRanking {
  employeeId: string;
  employeeName: string;
  department: string;
  presentDays: number;
  absentDays: number;
  tardinessDays: number;
  score: number;
}

// ==================== PAYROLL ====================

export interface PayrollConfig {
  frequency: PayrollFrequency;
  paymentMethod: PaymentMethod;
  currency: Currency;
  paymentDay: number;
  workingDaysPerPeriod: number;
  quincenalDay1: number;
  quincenalDay2: number;
  biweeklyStartDay: number;
  biweeklyStartMonth: number;
  weeklyPayDay: number;
  igssEmployee: number;
  igssEmployer: number;
  igssQuincena: QuincenaSelection;
  ihss: number;
  ihssQuincena: QuincenaSelection;
  rap: number;
  rapQuincena: QuincenaSelection;
  applyAguinaldo: boolean;
  aguinaldoPercent: number;
  aguinaldoPaymentType: BonusPaymentType;
  aguinaldoPaymentMonth: number;
  applyVacationBonus: boolean;
  vacationBonusPercent: number;
  vacationBonusPaymentType: BonusPaymentType;
  vacationBonusPaymentMonth: number;
  applyBeneficio14: boolean;
  beneficio14Percent: number;
  beneficio14PaymentType: BonusPaymentType;
  beneficio14PaymentMonth: number;
  docsDeadlineDaysBefore: number;
  attendanceDeadlineDaysBefore: number;
  overtimeDeadlineDaysBefore: number;
  bonusDeadlineDaysBefore: number;
  closingMonth: number;
  closingYear: number;
}

export interface PayrollEmployee {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  status: 'active' | 'inactive';
}

export interface EmployeeDeduction {
  id: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  enabled: boolean;
  isStandard: boolean;
  paymentFrequency: 'mensual' | 'quincenal' | 'dividido';
  totalPayments: number;
  quincena: QuincenaSelection;
}

export interface PayrollRecord {
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
  employees: PayrollRecordEmployee[];
}

export interface PayrollRecordEmployee {
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
}

export interface PayrollCalculation {
  periodSalary: number;
  igssEmployee: number;
  ihss: number;
  rap: number;
  customDeductions: number;
  customItems: { name: string; amount: number }[];
  attendanceDeductionTotal: number;
  attendanceIncomeTotal: number;
  attendanceItems: { name: string; amount: number }[];
  totalDeductions: number;
  netPay: number;
}

// ==================== PAYROLL CLOSED ====================

export interface PayrollClosed {
  id: string;
  period: string;
  frequency: PayrollFrequency;
  closedAt: string;
  closedBy: string;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeBreakdown: PayrollClosedEmployee[];
}

export interface PayrollClosedEmployee {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  baseSalary: number;
  periodSalary: number;
  grossSalary: number;
  igss: number;
  ihss: number;
  rap: number;
  deductions: number;
  customItems: CustomDeductionItem[];
  netSalary: number;
}

export interface CustomDeductionItem {
  name: string;
  amount: number;
}

// ==================== PAYROLL PAYSLIP ====================

export interface PayrollPayslip {
  companyName: string;
  companyRtn: string;
  employeeName: string;
  employeeId: string;
  identityNumber: string;
  department: string;
  position: string;
  period: string;
  frequency: PayrollFrequency;
  paymentDate: string;
  baseSalary: number;
  periodSalary: number;
  daysWorked: number;
  hoursWorked: number;
  grossSalary: number;
  igssDeduction: number;
  ihssDeduction: number;
  rapDeduction: number;
  isrDeduction: number;
  customDeductions: CustomDeductionItem[];
  totalDeductions: number;
  netSalary: number;
  notes: string;
}

// ==================== PERMISSIONS / VACATIONS ====================

export type IconName = 'Plane' | 'Heart' | 'Stethoscope' | 'BriefcaseBusiness' | 'Ban' | 'Star' | 'Zap' | 'Gift' | 'Home' | 'BookOpen' | 'Shield' | 'Coffee';

export interface PermissionTypeDef {
  id: string;
  label: string;
  icon: IconName;
  colorValue: string;
  annualDays: number;
  hasLimit: boolean;
  description: string;
  isDefault?: boolean;
}

export interface PermissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  typeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: PermissionStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface UsageRecord {
  annual: number;
  monthly: number;
  month: number;
  year: number;
}

export interface UsedDays {
  [empId: string]: { [typeId: string]: UsageRecord };
}

export type VacationTab = 'control' | 'solicitudes' | 'recuento';

// ==================== ORG CHART ====================

export interface OrgChartNode {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  department: string;
  photo: string;
  reportsTo: string | null;
  children: OrgChartNode[];
}

// ==================== CSV IMPORT ====================

export interface CsvImportRow {
  tipo: 'departamento' | 'puesto';
  nombre: string;
  descripcion: string;
  departamento: string;
  gerente: string;
  salario_minimo: string;
  salario_maximo: string;
  departamento_padre: string;
  puesto_padre: string;
}

export interface EmployeeCsvRow {
  employeeid: string;
  nombre: string;
  apellido: string;
  identidad: string;
  sexo: string;
  departamento: string;
  cargo: string;
  salary: string;
  fecha_ingreso: string;
  tipo_contrato: string;
  telefono: string;
  email: string;
  direccion: string;
  estado_civil: string;
  jornada: string;
  hora_entrada: string;
  hora_salida: string;
  modalidad: string;
  nivel_educacion: string;
  universidad: string;
  carrera: string;
  anio_graduacion: string;
  idiomas: string;
  certificaciones: string;
  otras_habilidades: string;
  licencia: string;
  no_igss: string;
  afp: string;
  aseguradora: string;
  supervisor: string;
}

// ==================== EMPLOYEE SEARCH ====================

export interface EmployeeSearchFilters {
  search: string;
  department: string;
  position: string;
  status: EmployeeStatus | '';
  contractType: ContractType | '';
  gender: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface EmployeeSearchResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== HR DASHBOARD ====================

export interface HrDashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  terminatedEmployees: number;
  suspendedEmployees: number;
  monthlyPayroll: number;
  totalDeductions: number;
  pendingRequests: number;
  departmentsCount: number;
  positionsCount: number;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// ==================== PIP (PLANES DE MEJORAMIENTO) ====================

export type PipPlanStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'extended';
export type PipGoalStatus = 'pending' | 'in_progress' | 'met' | 'not_met' | 'exceeded';

export interface PipGoal {
  id?: string;
  pipPlanId: string;
  title: string;
  description: string;
  metric: string;
  targetValue: number;
  currentValue: number;
  unit: 'porcentaje' | 'dias' | 'horas' | 'unidades' | 'calificacion';
  dueDate: string;
  status: PipGoalStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PipEvaluation {
  id?: string;
  pipPlanId: string;
  goalId?: string;
  evaluationDate: string;
  score: number;
  progressPct: number;
  comments: string;
  evaluator: string;
  attendanceSummary?: {
    presentDays: number;
    absentDays: number;
    lateDays: number;
    overtimeHours: number;
  };
  createdAt?: string;
}

export interface PipEvidence {
  id?: string;
  pipPlanId: string;
  goalId?: string;
  evaluationId?: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  uploadedBy: string;
  notes?: string;
  createdAt?: string;
}

export interface PipAttendanceMetric {
  id?: string;
  pipPlanId: string;
  periodStart: string;
  periodEnd: string;
  totalWorkDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  overtimeHours: number;
  disabilityDays: number;
  vacationDays: number;
  absenceRate: number;
  tardinessRate: number;
  attendanceScore: number;
  createdAt?: string;
}

export interface PipPlan {
  id?: string;
  tenantId: string;
  employeeId: string;
  title: string;
  description: string;
  status: PipPlanStatus;
  startDate: string;
  endDate: string;
  originalEndDate?: string;
  createdBy: string;
  reviewedBy?: string;
  goals?: PipGoal[];
  evaluations?: PipEvaluation[];
  evidence?: PipEvidence[];
  attendanceMetrics?: PipAttendanceMetric[];
  employee?: Employee;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewPipPlanForm {
  employeeId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goals: Omit<PipGoal, 'id' | 'pipPlanId' | 'createdAt' | 'updatedAt'>[];
}

export interface PipDashboardSummary {
  totalPlans: number;
  activePlans: number;
  draftPlans: number;
  completedPlans: number;
  cancelledPlans: number;
  expiringThisWeek: number;
  averageProgress: number;
  plansAtRisk: number;
}
