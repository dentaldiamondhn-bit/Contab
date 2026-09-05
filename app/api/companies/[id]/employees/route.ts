import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    firstName: 'Nombre', lastName: 'Apellido', identityNumber: 'Identidad',
    position: 'Puesto', department: 'Departamento', salary: 'Salario',
    startDate: 'Fecha de ingreso', status: 'Estado', phone: 'Teléfono',
    email: 'Email', address: 'Dirección', civilStatus: 'Estado civil',
    contractType: 'Tipo de contrato', supervisor: 'Supervisor',
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
    position: 'position', department: 'department', salary: 'base_salary',
    startDate: 'hire_date', status: 'status', phone: 'phone',
    email: 'email', address: 'address', civilStatus: 'civil_status',
    contractType: 'contract_type', supervisor: 'supervisor',
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
  if (oldSalary !== newSalary) {
    changes.push(`Salario: "${oldSalary}" → "${newSalary}"`);
  }
  return changes;
}

async function logHistory(employeeId: string, tenantId: string, action: string, description: string, changes: string[], performedBy?: string) {
  await supabase.from('employee_history').insert({
    employee_id: employeeId,
    tenant_id: tenantId,
    action,
    description,
    changes: changes.length > 0 ? changes : null,
    performed_by: performedBy || null
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('tenant_id', tenantId);

    const posMap: Record<string, string> = {};
    if (positions) {
      positions.forEach((p: any) => { posMap[p.id] = p.name; });
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
      position: posMap[emp.position_id] || emp.position_id || '',
      department: emp.department || '',
      salary: parseFloat(emp.base_salary) || 0,
      startDate: emp.hire_date || '',
      status: emp.status || 'active',
      phone: emp.phone || '',
      email: emp.email || '',
      address: emp.address || '',
      civilStatus: emp.civil_status || '',
      vacationDays: calcVacationDays(emp.hire_date),
      usedVacationDays: 0,
      contractType: emp.contract_type || 'indefinido',
      supervisor: emp.supervisor || '',
      schedule: emp.schedule || 'completa',
      scheduleHours: emp.schedule_hours || '08:00 - 17:00',
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
      const { data: hrDocs } = await supabase
        .from('employee_hr_documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('employee_id', emp.id);
      
      if (hrDocs) {
        emp.hrDocuments = hrDocs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          date: doc.date,
          file: doc.file,
          observations: doc.observations,
          uploadedBy: doc.uploaded_by,
          uploadedAt: doc.uploaded_at
        }));
      }

      const { data: history } = await supabase
        .from('employee_history')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('employee_id', emp.id)
        .order('created_at', { ascending: false });

      if (history) {
        emp.history = history.map((h: any) => ({
          id: h.id,
          action: h.action,
          description: h.description,
          changes: h.changes || [],
          performedBy: h.performed_by,
          date: h.created_at
        }));
      }
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

    let positionId = null;
    if (body.position) {
      const { data: pos } = await supabase
        .from('positions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', body.position)
        .single();
      positionId = pos?.id || null;
    }

    const { data, error } = await supabase
      .from('employees')
      .insert({
        tenant_id: tenantId,
        company_id: 'demo-company-id',
        employee_code: body.employeeId,
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
        schedule: body.schedule,
        schedule_hours: body.scheduleHours,
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
        suspension_performed_by: body.suspensionPerformedBy || null
      })
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

      await supabase.from('employee_hr_documents').insert(hrDocsInsert);
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

    let positionId = null;
    if (body.position) {
      const { data: pos } = await supabase
        .from('positions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', body.position)
        .single();
      positionId = pos?.id || null;
    }

    const { data: oldEmp } = await supabase
      .from('employees')
      .select('*')
      .eq('id', body.id)
      .single();

    const { error } = await supabase
      .from('employees')
      .update({
        employee_code: body.employeeId,
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
        schedule: body.schedule,
        schedule_hours: body.scheduleHours,
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
        updated_at: new Date().toISOString()
      })
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
          description = `Desactivado por ${body.terminationPerformedBy || 'N/A'}. Razón: ${body.terminationReason || 'N/A'}`;
        } else if (newStatus === 'suspended') {
          description = `Suspendido por ${body.suspensionPerformedBy || 'N/A'}. Razón: ${body.suspensionReason || 'N/A'}`;
        } else if (newStatus === 'active' && (prevStatus === 'terminated' || prevStatus === 'inactive')) {
          description = `Reactivado por ${body.reactivationPerformedBy || 'N/A'}. Razón: ${body.reactivationReason || 'N/A'}`;
        } else {
          description = `Estado cambiado de "${prevStatus}" a "${newStatus}"`;
        }
        await logHistory(body.id, tenantId, action, description, changes);
      } else if (changes.length > 0) {
        await logHistory(body.id, tenantId, 'update', `Datos actualizados por edición`, changes);
      }
    }

    await supabase
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

      await supabase.from('employee_hr_documents').insert(hrDocsInsert);
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

    await supabase
      .from('employee_history')
      .delete()
      .eq('employee_id', employeeId)
      .eq('tenant_id', tenantId);

    await supabase
      .from('employee_hr_documents')
      .delete()
      .eq('employee_id', employeeId)
      .eq('tenant_id', tenantId);

    const { error } = await supabase
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
