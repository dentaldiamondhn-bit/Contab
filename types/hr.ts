// HR Module TypeScript Types
// Diamond Accounting - Recursos Humanos

// ==================== EMPLOYEES ====================

export type EmployeeStatus = 'active' | 'inactive' | 'terminated' | 'suspended';

export type ContractType = 'indefinido' | 'determinado' | 'por obra' | 'prueba' | 'temporada';

export type ScheduleType = 'completa' | 'media' | 'personalizada';

export type Modality = 'presencial' | 'remoto' | 'híbrido';

export type WorkPermitStatus = 'nacional' | 'residencia_permanente' | 'residencia_temporal' | 'permiso_trabajo' | '';

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
  civilStatus: string;
  gender: string | null;
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
  workPermitStatus: WorkPermitStatus;
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
  hrDocuments: HrDocument[];
  history: EmployeeHistory[];
}

export interface MedicalRecord {
  bloodType?: string;
  allergies?: string;
  conditions?: string;
  medications?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
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
  | 'presente'
  | 'ausente'
  | 'tardanza'
  | 'vacaciones'
  | 'horas_extra'
  | 'permiso_sin_sueldo'
  | 'incapacidad'
  | 'feriado'
  | 'dia_libre';

export type IncapacityType = '100_patrono' | 'ihss' | 'sin_pago' | 'maternidad';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: AttendanceStatus;
  amount: number;
  hoursExtra: number;
  holidayPayType: 'doble' | 'triple' | null;
  incapacityType: IncapacityType | null;
  notes: string;
}

export interface AttendanceHoliday {
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

export interface AttendanceSchedule {
  id: string;
  employeeId: string;
  employeeName: string;
  freeDays: number[];
  scheduleEntry: string;
  scheduleExit: string;
  scheduleHours: string;
}

// ==================== PAYROLL ====================

export type PayrollFrequency = 'semanal' | 'quincenal' | 'mensual' | 'cada_2_semanas';

export type PaymentMethod = 'transferencia' | 'efectivo' | 'cheque' | 'deposito';

export interface PayrollConfig {
  id: string;
  frequency: PayrollFrequency;
  igssEmployeePercent: number;
  igssEmployerPercent: number;
  ihssPercent: number;
  rapPercent: number;
  currentQuincena: '1ra' | '2da' | 'ambas';
  aguinaldo: boolean;
  bono14: boolean;
  paymentMethod: PaymentMethod;
  deadlineDocuments: string;
  deadlineAttendance: string;
  deadlineHoursExtra: string;
  deadlineBonus: string;
}

export interface PayrollDeduction {
  id: string;
  employeeId: string;
  employeeName: string;
  igssOverride: number | null;
  ihssOverride: number | null;
  rapOverride: number | null;
  igssEnabled: boolean;
  ihssEnabled: boolean;
  rapEnabled: boolean;
  customDeductions: CustomDeduction[];
}

export interface CustomDeduction {
  name: string;
  amount: number;
  isPercent: boolean;
  frequency: PayrollFrequency;
  quincena: '1ra' | '2da' | 'ambas';
}

export interface PayrollClosed {
  id: string;
  period: string;
  frequency: PayrollFrequency;
  closedAt: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employees: PayrollClosedEmployee[];
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

// ==================== PERMISSIONS / VACATIONS ====================

export type PermissionStatus = 'pendiente' | 'aprobado' | 'rechazado';

export type PermissionCategory = 'vacaciones' | 'personal' | 'enfermedad' | 'especial' | 'sin_sueldo';

export interface PermissionType {
  id: string;
  name: string;
  category: PermissionCategory;
  icon: string;
  color: string;
  maxDays: number;
  isPaid: boolean;
}

export interface PermissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  typeId: string;
  typeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: PermissionStatus;
  approvedBy: string;
  approvedAt: string;
  notes: string;
}

export interface PermissionUsed {
  id: string;
  employeeId: string;
  employeeName: string;
  typeId: string;
  typeName: string;
  year: number;
  month: number;
  daysUsed: number;
}

// ==================== EMPLOYEE HISTORY ====================

export interface EmployeeHistory {
  id: string;
  employeeId: string;
  action: string;
  description: string;
  changes: string[];
  performedBy: string;
  createdAt: string;
}

// ==================== EMPLOYEE HR DOCUMENTS ====================

export interface HrDocument {
  id: string;
  employeeId: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
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

// ==================== EMPLOYEE CSV IMPORT ====================

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

// ==================== PAYROLL CALCULATION ====================

export interface PayrollCalculation {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  contractType: ContractType;
  baseSalary: number;
  periodSalary: number;
  daysWorked: number;
  hoursWorked: number;
  overtimeHours: number;
  grossSalary: number;
  igss: number;
  igssEmployer: number;
  ihss: number;
  rap: number;
  isr: number;
  absenceDeduction: number;
  tardinessDeduction: number;
  customItems: CustomDeductionItem[];
  totalDeductions: number;
  netSalary: number;
  employerCost: number;
}

// ==================== EMPLOYEE SEARCH FILTERS ====================

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

// ==================== PAYROLL CLOSED HISTORY ====================

export interface PayrollClosedHistory {
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
