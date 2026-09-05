import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      hrDocuments: []
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
        rehireable: body.rehireable ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
    }
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
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

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
