import { z } from "zod";

// ── Departments ──────────────────────────────────────────────
export const departmentCreateSchema = z.object({
  name: z.string().min(1, "El nombre del departamento es requerido").max(100),
  description: z.string().max(500).optional().default(""),
  manager: z.string().max(100).optional().default(""),
  parentId: z.string().uuid().nullable().optional(),
});

export const departmentUpdateSchema = z.object({
  id: z.string().uuid("ID de departamento inválido"),
  name: z.string().min(1, "El nombre del departamento es requerido").max(100).optional(),
  description: z.string().max(500).optional(),
  manager: z.string().max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

// ── Positions ────────────────────────────────────────────────
export const positionCreateSchema = z
  .object({
    name: z.string().min(1, "El nombre del cargo es requerido").max(100),
    department: z.string().max(100).optional().default(""),
    description: z.string().max(500).optional().default(""),
    minSalary: z.number().min(0, "El salario mínimo no puede ser negativo").optional().default(0),
    maxSalary: z.number().min(0, "El salario máximo no puede ser negativo").optional().default(0),
    parentId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => data.maxSalary === 0 || data.minSalary === 0 || data.maxSalary >= data.minSalary, {
    message: "El salario máximo no puede ser menor al salario mínimo",
    path: ["maxSalary"],
  });

export const positionUpdateSchema = z.object({
  id: z.string().uuid("ID de cargo inválido"),
  name: z.string().min(1, "El nombre del cargo es requerido").max(100).optional(),
  department: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  minSalary: z.number().min(0).optional(),
  maxSalary: z.number().min(0).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

// ── Employees ────────────────────────────────────────────────
export const employeeCreateSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido").max(100),
  lastName: z.string().min(1, "El apellido es requerido").max(100),
  identityNumber: z.string().min(1, "El número de identidad es requerido").max(30),
  employeeId: z.string().max(30).optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).nullable().optional(),
  salary: z.number().min(0, "El salario no puede ser negativo").optional().default(0),
  startDate: z.string().optional(),
  status: z.enum(["active", "inactive", "terminated", "suspended"]).optional().default("active"),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email inválido").max(150).optional().or(z.literal("")),
  address: z.string().max(300).optional(),
  civilStatus: z.string().max(30).optional(),
  gender: z.string().max(20).nullable().optional(),
  contractType: z.string().max(30).optional(),
  supervisor: z.string().max(100).optional(),
  reportsTo: z.string().uuid().nullable().optional(),
  schedule: z.string().max(30).optional(),
  scheduleEntry: z.string().max(10).nullable().optional(),
  scheduleExit: z.string().max(10).nullable().optional(),
  modality: z.string().max(30).optional(),
  educationLevel: z.string().max(50).optional(),
  university: z.string().max(150).optional(),
  degree: z.string().max(150).optional(),
  graduationYear: z.string().max(10).optional(),
  languages: z.string().max(300).optional(),
  certifications: z.string().max(500).optional(),
  otherSkills: z.string().max(500).optional(),
  photo: z.string().max(500).optional(),
  cv: z.string().max(500).optional(),
  workScheduleId: z.string().uuid().nullable().optional(),
});

export const employeeUpdateSchema = employeeCreateSchema
  .extend({
    id: z.string().uuid("ID de empleado inválido"),
  })
  .partial()
  .required({ id: true });

// ── Payroll ──────────────────────────────────────────────────
export const payrollUploadSchema = z.object({
  employee_id: z.string().uuid("ID de empleado inválido"),
  closing_month: z.number().int().min(1).max(12, "Mes inválido"),
  closing_year: z.number().int().min(2020).max(2100),
  items: z.array(z.object({
    type: z.string().min(1),
    description: z.string().optional(),
    amount: z.number(),
  })).min(1, "Debe incluir al menos un concepto de nómina"),
});

export const payrollClosedSchema = z.object({
  period: z.string().min(1, "El período es requerido"),
  month: z.number().int().min(1).max(12, "Mes inválido"),
  year: z.number().int().min(2020).max(2100),
  frequency: z.string().min(1, "La frecuencia es requerida"),
});

// ── Attendance ───────────────────────────────────────────────
export const attendanceRecordSchema = z.object({
  employee_id: z.string().uuid(),
  date: z.string().min(1, "La fecha es requerida"),
  status: z.enum(["present", "absent", "late", "vacation", "sick", "permission"]),
  check_in: z.string().nullable().optional(),
  check_out: z.string().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const attendanceBulkSchema = z.object({
  records: z.array(attendanceRecordSchema).min(1, "Debe incluir al menos un registro"),
});

// ── Permissions ──────────────────────────────────────────────
export const permissionRequestSchema = z.object({
  employee_id: z.string().uuid("ID de empleado inválido"),
  type_id: z.string().uuid("ID de tipo de permiso inválido"),
  start_date: z.string().min(1, "La fecha de inicio es requerida"),
  end_date: z.string().min(1, "La fecha de fin es requerida"),
  reason: z.string().max(500).optional(),
}).refine((data) => data.end_date >= data.start_date, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio",
  path: ["end_date"],
});

// ── Attendance Report ────────────────────────────────────────
export const attendanceReportSchema = z.object({
  start: z.string().min(1, "La fecha de inicio es requerida"),
  end: z.string().min(1, "La fecha de fin es requerida"),
  department: z.string().optional(),
}).refine((data) => data.end >= data.start, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio",
  path: ["end"],
});

// ── Inferred types ───────────────────────────────────────────
export type DepartmentCreate = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdate = z.infer<typeof departmentUpdateSchema>;
export type PositionCreate = z.infer<typeof positionCreateSchema>;
export type PositionUpdate = z.infer<typeof positionUpdateSchema>;
export type EmployeeCreate = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;
export type PayrollUpload = z.infer<typeof payrollUploadSchema>;
export type PayrollClosed = z.infer<typeof payrollClosedSchema>;
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type PermissionRequest = z.infer<typeof permissionRequestSchema>;
