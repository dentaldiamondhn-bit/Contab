import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';


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
    reportsTo: 'reports_to',
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
    
    const [empResult, posResult, deptResult] = await Promise.all([
      getSupabaseServer().from('employees').select(selectCols).eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      getSupabaseServer().from('positions').select('id,name').eq('tenant_id', tenantId),
      getSupabaseServer().from('departments').select('id,name').eq('tenant_id', tenantId),
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

    if (!body.firstName || !body.lastName) {
      return NextResponse.json({ error: 'Nombre y apellido son requeridos' }, { status: 400 });
    }
    if (body.salary !== undefined && body.salary < 0) {
      return NextResponse.json({ error: 'El salario no puede ser negativo' }, { status: 400 });
    }

    let positionId = null;
    if (body.position) {
      let { data: pos } = await getSupabaseServer()
        .from('positions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', body.position)
        .single();
      if (!pos) {
        const { data: newPos } = await getSupabaseServer()
          .from('positions')
          .insert({ id: crypto.randomUUID(), name: body.position, tenant_id: tenantId, department: body.department || '' })
          .select('id')
          .single();
        pos = newPos;
      }
      positionId = pos?.id || null;
    }

    let employeeCode = body.employeeId;
    if (!employeeCode) {
      let attempts = 0;
      while (attempts < 10) {
        employeeCode = `EMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        const { data: existing } = await getSupabaseServer()
          .from('employees')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('employee_code', employeeCode)
          .maybeSingle();
        if (!existing) break;
        attempts++;
      }
    }

    const insertData: any = {
        tenant_id: tenantId,
        company_id: tenantId,
        employee_code: employeeCode,
        first_name: body.firstName,
        last_name: body.lastName,
        id_number: body.identityNumber,
        rtn: body.identityNumber,
        photo: body.photo,
        cv: body.cv,
        position_id: positionId,
        department: body.department || null,
        base_salary: body.salary || 0,
        hire_date: body.startDate || null,
        status: body.status || 'active',
        phone: body.phone,
        email: body.email,
        address: body.address,
        civil_status: body.civilStatus,
        contract_type: body.contractType,
        supervisor: body.supervisor,
        reports_to: body.reportsTo || null,
        schedule: body.schedule,
        schedule_entry: body.scheduleEntry || null,
        schedule_exit: body.scheduleExit || null,
        schedule_hours: (body.scheduleEntry && body.scheduleExit) ? `${body.scheduleEntry} - ${body.scheduleExit}` : body.scheduleHours || '08:00 - 17:00',
        modality: body.modality,
        education_level: body.educationLevel,
        university: body.university,
        degree: body.degree,
        graduation_year: body.graduationYear,
        languages: body.languages,
        certifications: body.certifications,
        driver_license: body.driverLicense || false,
        other_skills: body.otherSkills,
        social_security_number: body.socialSecurityNumber,
        pension_fund: body.pensionFund,
        labor_risk_insurer: body.laborRiskInsurer,
        work_permit_status: body.workPermitStatus,
        visa_expiry: body.visaExpiry || null,
        doc_identity: body.docIdentity,
        doc_address_proof: body.docAddressProof,
        doc_contract: body.docContract,
        doc_nda: body.docNDA,
        doc_education_certs: body.docEducationCerts,
        doc_previous_jobs: body.docPreviousJobs,
        doc_medical_cert: body.docMedicalCert,
        medical_record: body.medicalRecord || {},
        termination_date: body.terminationDate || null,
        termination_reason: body.terminationReason || null,
        termination_requested_by: body.terminationRequestedBy || null,
        termination_performed_by: body.terminationPerformedBy || null,
        rehireable: body.rehireable ?? true,
        reactivation_date: body.reactivationDate || null,
        reactivation_reason: body.reactivationReason || null,
        reactivation_requested_by: body.reactivationRequestedBy || null,
        reactivation_performed_by: body.reactivationPerformedBy || null,
        suspension_date: body.suspensionDate || null,
        suspension_reason: body.suspensionReason || null,
        suspension_requested_by: body.suspensionRequestedBy || null,
        suspension_performed_by: body.suspensionPerformedBy || null,
        gender: body.gender || null,
        free_days: body.freeDays || [],
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

    await logHistory(data.id, tenantId, 'creation', `Empleado ${body.firstName} ${body.lastName} creado`, [`Código: ${body.employeeId}`, `Puesto: ${body.position || 'N/A'}`, `Departamento: ${body.department || 'N/A'}`]);

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

    console.log('PUT employee:', body.id, 'hrDocs:', body.hrDocuments?.length || 0);

    let positionId = null;
    if (body.position) {
      let { data: pos } = await getSupabaseServer()
        .from('positions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', body.position)
        .single();
      if (!pos) {
        const { data: newPos } = await getSupabaseServer()
          .from('positions')
          .insert({ id: crypto.randomUUID(), name: body.position, tenant_id: tenantId, department: body.department || '' })
          .select('id')
          .single();
        pos = newPos;
      }
      positionId = pos?.id || null;
    }

    const { data: oldEmp } = await getSupabaseServer()
      .from('employees')
      .select('*')
      .eq('id', body.id)
      .single();

    const updateData: any = {
        employee_code: body.employeeId || oldEmp?.employee_code || `EMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        first_name: body.firstName,
        last_name: body.lastName,
        id_number: body.identityNumber,
        rtn: body.identityNumber,
        photo: body.photo,
        cv: body.cv,
        position_id: positionId,
        department: body.department || null,
        base_salary: body.salary || 0,
        hire_date: body.startDate || null,
        status: body.status,
        phone: body.phone,
        email: body.email,
        address: body.address,
        civil_status: body.civilStatus,
        contract_type: body.contractType,
        supervisor: body.supervisor,
        reports_to: body.reportsTo || null,
        schedule: body.schedule,
        schedule_entry: body.scheduleEntry || null,
        schedule_exit: body.scheduleExit || null,
        schedule_hours: (body.scheduleEntry && body.scheduleExit) ? `${body.scheduleEntry} - ${body.scheduleExit}` : body.scheduleHours || '08:00 - 17:00',
        modality: body.modality,
        education_level: body.educationLevel,
        university: body.university,
        degree: body.degree,
        graduation_year: body.graduationYear,
        languages: body.languages,
        certifications: body.certifications,
        driver_license: body.driverLicense,
        other_skills: body.otherSkills,
        social_security_number: body.socialSecurityNumber,
        pension_fund: body.pensionFund,
        labor_risk_insurer: body.laborRiskInsurer,
        work_permit_status: body.workPermitStatus,
        visa_expiry: body.visaExpiry || null,
        doc_identity: body.docIdentity,
        doc_address_proof: body.docAddressProof,
        doc_contract: body.docContract,
        doc_nda: body.docNDA,
        doc_education_certs: body.docEducationCerts,
        doc_previous_jobs: body.docPreviousJobs,
        doc_medical_cert: body.docMedicalCert,
        medical_record: body.medicalRecord || {},
        termination_date: body.terminationDate || null,
        termination_reason: body.terminationReason || null,
        termination_requested_by: body.terminationRequestedBy || null,
        termination_performed_by: body.terminationPerformedBy || null,
        rehireable: body.rehireable ?? true,
        reactivation_date: body.reactivationDate || null,
        reactivation_reason: body.reactivationReason || null,
        reactivation_requested_by: body.reactivationRequestedBy || null,
        reactivation_performed_by: body.reactivationPerformedBy || null,
        suspension_date: body.suspensionDate || null,
        suspension_reason: body.suspensionReason || null,
        suspension_requested_by: body.suspensionRequestedBy || null,
        suspension_performed_by: body.suspensionPerformedBy || null,
        gender: body.gender || null,
        free_days: body.freeDays || [],
        updated_at: new Date().toISOString()
      }

    const { error } = await getSupabaseServer()
      .from('employees')
      .update(updateData)
      .eq('id', body.id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Supabase update error:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
    }

    if (oldEmp) {
      const prevStatus = oldEmp.status || 'active';
      const newStatus = body.status;
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
          description = `Desactivado por ${body.terminationPerformedBy || 'N/A'}. Solicitado por: ${body.terminationRequestedBy || 'N/A'}. Razón: ${body.terminationReason || 'N/A'}`;
        } else if (newStatus === 'suspended') {
          description = `Suspendido por ${body.suspensionPerformedBy || 'N/A'}. Solicitado por: ${body.suspensionRequestedBy || 'N/A'}. Razón: ${body.suspensionReason || 'N/A'}`;
        } else if (newStatus === 'active' && (prevStatus === 'terminated' || prevStatus === 'inactive')) {
          description = `Reactivado por ${body.reactivationPerformedBy || 'N/A'}. Solicitado por: ${body.reactivationRequestedBy || 'N/A'}. Razón: ${body.reactivationReason || 'N/A'}`;
        } else {
          description = `Estado cambiado de "${prevStatus}" a "${newStatus}"`;
        }
        await logHistory(body.id, tenantId, action, description, changes);
      } else if (changes.length > 0) {
        await logHistory(body.id, tenantId, 'update', `Datos actualizados por edición`, changes);
      }
    }

    await getSupabaseServer()
      .from('employee_hr_documents')
      .delete()
      .eq('employee_id', body.id)
      .eq('tenant_id', tenantId);

    if (body.hrDocuments && body.hrDocuments.length > 0) {
      const hrDocsInsert = body.hrDocuments.map((doc: any) => ({
        id: doc.id,
        tenant_id: tenantId,
        employee_id: body.id,
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
