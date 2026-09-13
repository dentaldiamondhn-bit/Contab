import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { employeeCreateSchema, employeeUpdateSchema } from '@/lib/validations/hr';


function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    firstName: 'Nombre', lastName: 'Apellido', identityNumber: 'Identidad',
    position: 'Puesto', department: 'Departamento', salary: 'Salario',
    startDate: 'Fecha de ingreso', status: 'Estado', phone: 'Teléfono',
    email: 'Email', address: 'Dirección', civilStatus: 'Estado civil',
    contractType: 'Tipo de contrato',     supervisor: 'Supervisor', reportsTo: 'Jefe Directo',
    schedule: 'Horario', modality: 'Modalidad', educationLevel: 'Nivel educativo',
    university: 'Universidad', degree: 'Título', languages: 'Idiomas',
    certifications: 'Certificaciones', otherSkills: 'Otras habilidades',
    docIdentity: 'Doc. Identidad', docContract: 'Doc. Contrato',
    photo: 'Foto', cv: 'CV'
  };
  return labels[key] || key;
}

function detectChanges(oldEmp: any, newBody: any): string[] {
  const changes: string[] = [];
  const fieldMap: Record<string, string> = {
    firstName: 'first_name', lastName: 'last_name', identityNumber: 'id_number',
    position: 'position', department: 'department',
    startDate: 'hire_date', phone: 'phone',
    email: 'email', address: 'address', civilStatus: 'civil_status',
    contractType: 'contract_type', supervisor: 'supervisor',
    reportsTo: 'reports_to', role: 'role',
    schedule: 'schedule', modality: 'modality', educationLevel: 'education_level',
    university: 'university', degree: 'degree', languages: 'languages',
    certifications: 'certifications', otherSkills: 'other_skills'
  };
  for (const [frontendKey, dbKey] of Object.entries(fieldMap)) {
    const oldVal = String(oldEmp[dbKey] || '');
    const newVal = String(newBody[frontendKey] || '');
    if (oldVal !== newVal && (oldVal || newVal)) {
      changes.push(`${fieldLabel(frontendKey)}: "${oldVal || 'vacío'}" → "${newVal || 'vacío'}"`);
    }
  }
  if (String(oldEmp.status || '') !== String(newBody.status || '')) {
    changes.push(`Estado: "${oldEmp.status}" → "${newBody.status}"`);
  }
  const oldSalary = parseFloat(oldEmp.base_salary) || 0;
  const newSalary = newBody.salary || 0;
  if (oldSalary !== newSalary && (oldSalary || newSalary)) {
    changes.push(`Salario: "${oldSalary}" → "${newSalary}"`);
  }
  return changes;
}

async function logHistory(employeeId: string, tenantId: string, action: string, description: string, changes: string[], performedBy?: string) {
  try {
    await getSupabaseServer().from('employee_history').insert({
      employee_id: employeeId,
      tenant_id: tenantId,
      action,
      description,
      changes: changes.length > 0 ? changes : null,
      performed_by: performedBy || null
    });
  } catch {}
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const fields = searchParams.get('fields');
    
    const selectCols = fields ? fields : '*';
    
    const [empResult, posResult, deptResult, scheduleResult] = await Promise.all([
      getSupabaseServer().from('employees').select(selectCols).eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      getSupabaseServer().from('positions').select('id,name').eq('tenant_id', tenantId),
      getSupabaseServer().from('departments').select('id,name').eq('tenant_id', tenantId),
      getSupabaseServer().from('work_schedules').select('id,name').eq('tenant_id', tenantId),
    ]);

    if (empResult.error) throw empResult.error;

    const data = empResult.data;

    const posMap: Record<string, string> = {};
    if (posResult.data) {
      posResult.data.forEach((p: any) => { posMap[p.id] = p.name; });
    }

    const deptMap: Record<string, string> = {};
    if (deptResult.data) {
      deptResult.data.forEach((d: any) => { deptMap[d.id] = d.name; });
    }

    const scheduleMap: Record<string, string> = {};
    if (scheduleResult.data) {
      scheduleResult.data.forEach((s: any) => { scheduleMap[s.id] = s.name; });
    }

    const calcVacationDays = (hireDate: string) => {
      if (!hireDate) return 0;
      const totalYears = Math.floor((new Date().getTime() - new Date(hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (totalYears < 1) return 0;
      if (totalYears === 1) return 10;
      if (totalYears === 2) return 12;
      if (totalYears === 3) return 14;
      return Math.min(20, 14 + (totalYears - 3));
    };

    const employees = data.map((emp: any) => ({
      id: emp.id,
      employeeId: emp.employee_code || emp.employee_id || '',
      firstName: emp.first_name || '',
      lastName: emp.last_name || '',
      identityNumber: emp.identity_number || emp.id_number || '',
      photo: emp.photo || '',
      cv: emp.cv || '',
      position: posMap[emp.position_id] || (emp.position_id && emp.position_id.length > 10 ? '' : emp.position_id || ''),
      department: deptMap[emp.department] || emp.department || '',
      salary: parseFloat(emp.base_salary) || 0,
      startDate: emp.hire_date || '',
      status: emp.status || 'active',
      phone: emp.phone || '',
      email: emp.email || '',
      address: emp.address || '',
      civilStatus: emp.civil_status || '',
      gender: emp.gender || null,
      freeDays: emp.free_days || [],
      vacationDays: calcVacationDays(emp.hire_date),
      usedVacationDays: 0,
      contractType: emp.contract_type || 'indefinido',
      supervisor: emp.supervisor || '',
      reportsTo: emp.reports_to || null,
      role: emp.role || 'empleado',
      workScheduleId: emp.work_schedule_id || null,
      workScheduleName: scheduleMap[emp.work_schedule_id] || '',
      schedule: emp.schedule || 'completa',
      scheduleEntry: emp.schedule_entry || '',
      scheduleExit: emp.schedule_exit || '',
      scheduleHours: (emp.schedule_entry && emp.schedule_exit) ? `${emp.schedule_entry} - ${emp.schedule_exit}` : emp.schedule_hours || '08:00 - 17:00',
      modality: emp.modality || 'presencial',
      educationLevel: emp.education_level || '',
      university: emp.university || '',
      degree: emp.degree || '',
      graduationYear: emp.graduation_year || '',
      languages: emp.languages || '',
      certifications: emp.certifications || '',
      driverLicense: emp.driver_license || false,
      otherSkills: emp.other_skills || '',
      socialSecurityNumber: emp.social_security_number || '',
      pensionFund: emp.pension_fund || '',
      laborRiskInsurer: emp.labor_risk_insurer || '',
      workPermitStatus: emp.work_permit_status || '',
      visaExpiry: emp.visa_expiry || '',
      docIdentity: emp.doc_identity || '',
      docAddressProof: emp.doc_address_proof || '',
      docContract: emp.doc_contract || '',
      docNDA: emp.doc_nda || '',
      docEducationCerts: emp.doc_education_certs || '',
      docPreviousJobs: emp.doc_previous_jobs || '',
      docMedicalCert: emp.doc_medical_cert || '',
      medicalRecord: typeof emp.medical_record === 'string' ? JSON.parse(emp.medical_record || '{}') : (emp.medical_record || {}),
      terminationDate: emp.termination_date || '',
      terminationReason: emp.termination_reason || '',
      terminationRequestedBy: emp.termination_requested_by || '',
      terminationPerformedBy: emp.termination_performed_by || '',
      rehireable: emp.rehireable ?? true,
      reactivationDate: emp.reactivation_date || '',
      reactivationReason: emp.reactivation_reason || '',
      reactivationRequestedBy: emp.reactivation_requested_by || '',
      reactivationPerformedBy: emp.reactivation_performed_by || '',
      suspensionDate: emp.suspension_date || '',
      suspensionReason: emp.suspension_reason || '',
      suspensionRequestedBy: emp.suspension_requested_by || '',
      suspensionPerformedBy: emp.suspension_performed_by || '',
      hrDocuments: [],
      history: []
    }));

    for (let emp of employees) {
      emp.hrDocuments = [];
      emp.history = [];
    }

    const [hrDocsResult, historyResult] = await Promise.all([
      getSupabaseServer().from('employee_hr_documents').select('*').eq('tenant_id', tenantId),
      getSupabaseServer().from('employee_history').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    ]);

    const hrDocsByEmp: Record<string, any[]> = {};
    if (hrDocsResult.data) {
      hrDocsResult.data.forEach((doc: any) => {
        if (!hrDocsByEmp[doc.employee_id]) hrDocsByEmp[doc.employee_id] = [];
        hrDocsByEmp[doc.employee_id].push({
          id: doc.id, name: doc.name, type: doc.type, date: doc.date,
          file: doc.file, observations: doc.observations,
          uploadedBy: doc.uploaded_by, uploadedAt: doc.uploaded_at,
        });
      });
    }

    const historyByEmp: Record<string, any[]> = {};
    if (historyResult.data) {
      historyResult.data.forEach((h: any) => {
        if (!historyByEmp[h.employee_id]) historyByEmp[h.employee_id] = [];
        historyByEmp[h.employee_id].push({
          id: h.id, action: h.action, description: h.description,
          changes: h.changes || [], performedBy: h.performed_by, date: h.created_at,
        });
      });
    }

    for (let emp of employees) {
      emp.hrDocuments = hrDocsByEmp[emp.id] || [];
      emp.history = historyByEmp[emp.id] || [];
    }

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Error fetching employees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    const body = await request.json();

    const parsed = employeeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message, details: parsed.error.issues }, { status: 400 });
    }

    if (parsed.data.identityNumber) {
      const { data: dupIdentity } = await getSupabaseServer()
        .from('employees')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('id_number', parsed.data.identityNumber)
        .maybeSingle();
      if (dupIdentity) {
        return NextResponse.json({ error: 'Ya existe un empleado con ese número de identidad' }, { status: 409 });
      }
    }

    if (parsed.data.email) {
      const { data: dupEmail } = await getSupabaseServer()
        .from('employees')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', parsed.data.email)
        .maybeSingle();
      if (dupEmail) {
        return NextResponse.json({ error: 'Ya existe un empleado con ese email' }, { status: 409 });
      }
    }

    let positionId = null;
    if (parsed.data.position) {
      let { data: pos } = await getSupabaseServer()
        .from('positions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', parsed.data.position)
        .single();
      if (!pos) {
        const { data: newPos } = await getSupabaseServer()
          .from('positions')
          .insert({ id: crypto.randomUUID(), name: parsed.data.position, tenant_id: tenantId, department: parsed.data.department || '' })
          .select('id')
          .single();
        pos = newPos;
      }
      positionId = pos?.id || null;
    }

    let employeeCode = parsed.data.employeeId;
    if (!employeeCode) {
      const seqPrefix = `EMP-${new Date().getFullYear()}`;
      const { data: lastEmp } = await getSupabaseServer()
        .from('employees')
        .select('employee_code')
        .eq('tenant_id', tenantId)
        .like('employee_code', `${seqPrefix}-%`)
        .order('employee_code', { ascending: false })
        .limit(1)
        .maybeSingle();
      let seq = 1;
      if (lastEmp?.employee_code) {
        const parts = lastEmp.employee_code.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) seq = lastNum + 1;
      }
      employeeCode = `${seqPrefix}-${String(seq).padStart(4, '0')}`;
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await getSupabaseServer()
          .from('employees')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('employee_code', employeeCode)
          .maybeSingle();
        if (!existing) break;
        seq++;
        employeeCode = `${seqPrefix}-${String(seq).padStart(4, '0')}`;
        attempts++;
      }
    }

    const d = parsed.data;
    const insertData: any = {
        tenant_id: tenantId,
        company_id: tenantId,
        employee_code: employeeCode,
        first_name: d.firstName,
        last_name: d.lastName,
        id_number: d.identityNumber,
        rtn: d.identityNumber,
        photo: d.photo,
        cv: d.cv,
        position_id: positionId,
        department: d.department || null,
        base_salary: d.salary || 0,
        hire_date: d.startDate || null,
        status: d.status || 'active',
        phone: d.phone,
        email: d.email,
        address: d.address,
        civil_status: d.civilStatus,
        contract_type: d.contractType,
        supervisor: d.supervisor,
        reports_to: d.reportsTo || null,
        role: d.role || 'empleado',
        schedule: d.schedule,
        schedule_entry: d.scheduleEntry || null,
        schedule_exit: d.scheduleExit || null,
        schedule_hours: (d.scheduleEntry && d.scheduleExit) ? `${d.scheduleEntry} - ${d.scheduleExit}` : '08:00 - 17:00',
        modality: d.modality,
        education_level: d.educationLevel,
        university: d.university,
        degree: d.degree,
        graduation_year: d.graduationYear,
        languages: d.languages,
        certifications: d.certifications,
        driver_license: false,
        other_skills: d.otherSkills,
        social_security_number: '',
        pension_fund: '',
        labor_risk_insurer: '',
        work_permit_status: '',
        visa_expiry: null,
        doc_identity: '',
        doc_address_proof: '',
        doc_contract: '',
        doc_nda: '',
        doc_education_certs: '',
        doc_previous_jobs: '',
        doc_medical_cert: '',
        medical_record: {},
        gender: d.gender || null,
        free_days: [],
      }

    const { data, error } = await getSupabaseServer()
      .from('employees')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
    }

    await logHistory(data.id, tenantId, 'creation', `Empleado ${d.firstName} ${d.lastName} creado`, [`Código: ${employeeCode}`, `Puesto: ${d.position || 'N/A'}`, `Departamento: ${d.department || 'N/A'}`]);

    if (body.hrDocuments && body.hrDocuments.length > 0) {
      const hrDocsInsert = body.hrDocuments.map((doc: any) => ({
        id: doc.id,
        tenant_id: tenantId,
        employee_id: data.id,
        name: doc.name,
        type: doc.type,
        date: doc.date,
        file: doc.file,
        observations: doc.observations,
        uploaded_by: doc.uploadedBy,
        uploaded_at: doc.uploadedAt
      }));

      const { error: hrError } = await getSupabaseServer().from('employee_hr_documents').insert(hrDocsInsert);
      if (hrError) {
        console.error('HR documents insert error (POST):', JSON.stringify(hrError));
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: error.message || 'Error creating employee', stack: error.stack }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    const body = await request.json();

    const parsed = employeeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message, details: parsed.error.issues }, { status: 400 });
    }

    const d = parsed.data;

    if (d.identityNumber) {
      const { data: dupIdentity } = await getSupabaseServer()
        .from('employees')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('id_number', d.identityNumber)
        .neq('id', d.id)
        .maybeSingle();
      if (dupIdentity) {
        return NextResponse.json({ error: 'Ya existe otro empleado con ese número de identidad' }, { status: 409 });
      }
    }

    if (d.email) {
      const { data: dupEmail } = await getSupabaseServer()
        .from('employees')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', d.email)
        .neq('id', d.id)
        .maybeSingle();
      if (dupEmail) {
        return NextResponse.json({ error: 'Ya existe otro empleado con ese email' }, { status: 409 });
      }
    }

    let positionId = null;
    if (d.position) {
      let { data: pos } = await getSupabaseServer()
        .from('positions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', d.position)
        .single();
      if (!pos) {
        const { data: newPos } = await getSupabaseServer()
          .from('positions')
          .insert({ id: crypto.randomUUID(), name: d.position, tenant_id: tenantId, department: d.department || '' })
          .select('id')
          .single();
        pos = newPos;
      }
      positionId = pos?.id || null;
    }

    const { data: oldEmp } = await getSupabaseServer()
      .from('employees')
      .select('*')
      .eq('id', d.id)
      .single();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (d.employeeId !== undefined) updateData.employee_code = d.employeeId;
    else if (oldEmp?.employee_code) updateData.employee_code = oldEmp.employee_code;
    if (d.firstName !== undefined) updateData.first_name = d.firstName;
    if (d.lastName !== undefined) updateData.last_name = d.lastName;
    if (d.identityNumber !== undefined) { updateData.id_number = d.identityNumber; updateData.rtn = d.identityNumber; }
    if (d.photo !== undefined) updateData.photo = d.photo;
    if (d.cv !== undefined) updateData.cv = d.cv;
    if (positionId !== null) updateData.position_id = positionId;
    if (d.department !== undefined) updateData.department = d.department || null;
    if (d.salary !== undefined) updateData.base_salary = d.salary || 0;
    if (d.startDate !== undefined) updateData.hire_date = d.startDate || null;
    if (d.status !== undefined) updateData.status = d.status;
    if (d.phone !== undefined) updateData.phone = d.phone;
    if (d.email !== undefined) updateData.email = d.email;
    if (d.address !== undefined) updateData.address = d.address;
    if (d.civilStatus !== undefined) updateData.civil_status = d.civilStatus;
    if (d.contractType !== undefined) updateData.contract_type = d.contractType;
    if (d.supervisor !== undefined) updateData.supervisor = d.supervisor;
    if (d.reportsTo !== undefined) updateData.reports_to = d.reportsTo || null;
    if (d.role !== undefined) updateData.role = d.role || 'empleado';
    if (d.schedule !== undefined) updateData.schedule = d.schedule;
    if (d.scheduleEntry !== undefined) updateData.schedule_entry = d.scheduleEntry || null;
    if (d.scheduleExit !== undefined) updateData.schedule_exit = d.scheduleExit || null;
    if (d.scheduleEntry !== undefined && d.scheduleExit !== undefined) {
      updateData.schedule_hours = (d.scheduleEntry && d.scheduleExit) ? `${d.scheduleEntry} - ${d.scheduleExit}` : '08:00 - 17:00';
    }
    if (d.modality !== undefined) updateData.modality = d.modality;
    if (d.educationLevel !== undefined) updateData.education_level = d.educationLevel;
    if (d.university !== undefined) updateData.university = d.university;
    if (d.degree !== undefined) updateData.degree = d.degree;
    if (d.graduationYear !== undefined) updateData.graduation_year = d.graduationYear;
    if (d.languages !== undefined) updateData.languages = d.languages;
    if (d.certifications !== undefined) updateData.certifications = d.certifications;
    if (d.otherSkills !== undefined) updateData.other_skills = d.otherSkills;
    if (d.gender !== undefined) updateData.gender = d.gender || null;
    if (d.workScheduleId !== undefined) updateData.work_schedule_id = d.workScheduleId || null;

    const { error } = await getSupabaseServer()
      .from('employees')
      .update(updateData)
      .eq('id', d.id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Supabase update error:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
    }

    if (oldEmp) {
      const prevStatus = oldEmp.status || 'active';
      const newStatus = d.status;
      const changes = detectChanges(oldEmp, body);

      if (prevStatus !== newStatus) {
        const actionMap: Record<string, string> = {
          'terminated': 'deactivation',
          'suspended': 'suspension',
          'active': 'reactivation'
        };
        const action = actionMap[newStatus] || 'update';
        let description = '';
        if (newStatus === 'terminated') {
          description = `Desactivado por ${d.supervisor || 'N/A'}. Razón: ${body.terminationReason || 'N/A'}`;
        } else if (newStatus === 'suspended') {
          description = `Suspendido por ${d.supervisor || 'N/A'}. Razón: ${body.suspensionReason || 'N/A'}`;
        } else if (newStatus === 'active' && (prevStatus === 'terminated' || prevStatus === 'inactive')) {
          description = `Reactivado por ${d.supervisor || 'N/A'}. Razón: ${body.reactivationReason || 'N/A'}`;
        } else {
          description = `Estado cambiado de "${prevStatus}" a "${newStatus}"`;
        }
        await logHistory(d.id, tenantId, action, description, changes);
      } else if (changes.length > 0) {
        await logHistory(d.id, tenantId, 'update', `Datos actualizados por edición`, changes);
      }
    }

    await getSupabaseServer()
      .from('employee_hr_documents')
      .delete()
      .eq('employee_id', d.id)
      .eq('tenant_id', tenantId);

    if (body.hrDocuments && body.hrDocuments.length > 0) {
      const hrDocsInsert = body.hrDocuments.map((doc: any) => ({
        id: doc.id,
        tenant_id: tenantId,
        employee_id: d.id,
        name: doc.name,
        type: doc.type,
        date: doc.date,
        file: doc.file,
        observations: doc.observations,
        uploaded_by: doc.uploadedBy,
        uploaded_at: doc.uploadedAt
      }));

      const { error: hrError } = await getSupabaseServer().from('employee_hr_documents').insert(hrDocsInsert);
      if (hrError) {
        console.error('HR documents insert error:', JSON.stringify(hrError));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Error updating employee' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    await getSupabaseServer()
      .from('employee_history')
      .delete()
      .eq('employee_id', employeeId)
      .eq('tenant_id', tenantId);

    await getSupabaseServer()
      .from('employee_hr_documents')
      .delete()
      .eq('employee_id', employeeId)
      .eq('tenant_id', tenantId);

    const { error } = await getSupabaseServer()
      .from('employees')
      .delete()
      .eq('id', employeeId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Error deleting employee' }, { status: 500 });
  }
}
