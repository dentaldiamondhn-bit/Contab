'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Search,
  Upload,
  Download,
  Filter,
  X,
  Save,
  Plus,
  FileText,
  Eye
} from 'lucide-react';

interface Employee {
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
  status: 'active' | 'inactive' | 'terminated' | 'suspended';
  phone: string;
  email: string;
  address: string;
  civilStatus: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'unión libre';
  vacationDays: number;
  usedVacationDays: number;
  // Contrato y trabajo
  contractType: 'indefinido' | 'determinado' | 'por obra' | 'prueba' | 'temporada';
  supervisor: string;
  schedule: 'completa' | 'media' | 'personalizada';
  scheduleHours: string;
  modality: 'presencial' | 'remoto' | 'híbrido';
  // Académico
  educationLevel: 'basico' | 'medio' | 'universitario' | 'tecnico' | 'maestria' | 'doctorado';
  university: string;
  degree: string;
  graduationYear: string;
  // Habilidades
  languages: string;
  certifications: string;
  driverLicense: boolean;
  otherSkills: string;
  // Seguridad Social
  socialSecurityNumber: string;
  pensionFund: string;
  laborRiskInsurer: string;
  // Permisos
  workPermitStatus: string;
  visaExpiry: string;
  // Documentos
  docIdentity: string;
  docAddressProof: string;
  docContract: string;
  docNDA: string;
  docEducationCerts: string;
  docPreviousJobs: string;
  docMedicalCert: string;
  // Documentos de RRHH
  hrDocuments: HRDocument[];
  // Ficha médica
  medicalRecord: MedicalRecord;
  // Terminación
  terminationDate: string;
  terminationReason: string;
  terminationRequestedBy: string;
  terminationPerformedBy: string;
  rehireable: boolean;
  // Reactivación
  reactivationDate: string;
  reactivationReason: string;
  reactivationRequestedBy: string;
  reactivationPerformedBy: string;
  // Suspensión
  suspensionDate: string;
  suspensionReason: string;
  suspensionRequestedBy: string;
  suspensionPerformedBy: string;
}

interface MedicalRecord {
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

interface HRDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  file: string;
  observations: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
  manager: string;
}

interface Position {
  id: string;
  name: string;
  department: string;
  description: string;
  minSalary: number;
  maxSalary: number;
}

function ModalTabs({ emp, isEditing, updateField, showUploadMessage }: { emp: any; isEditing: boolean; updateField: (field: string, value: any) => void; showUploadMessage: (msg: string) => void }) {
  const [activeTab, setActiveTab] = useState('personal');
  const tabs = [
    { id: 'personal', label: 'Personal' },
    { id: 'trabajo', label: 'Trabajo' },
    { id: 'academico', label: 'Académico' },
    { id: 'habilidades', label: 'Habilidades' },
    { id: 'medico', label: 'Ficha Médica' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'rrhh', label: 'Doc. RRHH' }
  ];

  const addHRDocument = () => {
    const newDoc: HRDocument = {
      id: `hrdoc-${Date.now()}`,
      name: '',
      type: 'amonestacion',
      date: new Date().toISOString().split('T')[0],
      file: '',
      observations: '',
      uploadedBy: 'Usuario Actual',
      uploadedAt: new Date().toISOString()
    };
    updateField('hrDocuments', [...(emp.hrDocuments || []), newDoc]);
  };

  const updateHRDoc = (index: number, field: string, value: any) => {
    const updated = [...emp.hrDocuments];
    updated[index] = { ...updated[index], [field]: value };
    updateField('hrDocuments', updated);
  };

  const removeHRDoc = (index: number) => {
    updateField('hrDocuments', emp.hrDocuments.filter((_: any, i: number) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(amount);
  };

  return (
    <>
      {/* Tab Navigation */}
      <div className="border-b px-6 flex gap-1 overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6 overflow-y-auto flex-1">
        {/* Personal Tab */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {isEditing ? (
              <>
                <div><label className="text-gray-500">Identidad:</label><input type="text" value={emp.identityNumber || ''} onChange={(e) => updateField('identityNumber', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Estado Civil:</label><select value={emp.civilStatus || ''} onChange={(e) => updateField('civilStatus', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded"><option value="soltero">Soltero</option><option value="casado">Casado</option><option value="divorciado">Divorciado</option><option value="viudo">Viudo</option><option value="unión libre">Unión Libre</option></select></div>
                <div><label className="text-gray-500">Teléfono:</label><input type="text" value={emp.phone || ''} onChange={(e) => updateField('phone', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Email:</label><input type="email" value={emp.email || ''} onChange={(e) => updateField('email', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div className="col-span-2"><label className="text-gray-500">Dirección:</label><input type="text" value={emp.address || ''} onChange={(e) => updateField('address', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">No. Seguridad Social:</label><input type="text" value={emp.socialSecurityNumber || ''} onChange={(e) => updateField('socialSecurityNumber', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Fondo de Pensiones:</label><input type="text" value={emp.pensionFund || ''} onChange={(e) => updateField('pensionFund', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Aseg. Riesgos:</label><input type="text" value={emp.laborRiskInsurer || ''} onChange={(e) => updateField('laborRiskInsurer', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
              </>
            ) : (
              <>
                <div><span className="text-gray-500">Identidad:</span><p className="font-medium">{emp.identityNumber || '-'}</p></div>
                <div><span className="text-gray-500">Estado Civil:</span><p className="font-medium capitalize">{emp.civilStatus || '-'}</p></div>
                <div><span className="text-gray-500">Teléfono:</span><p className="font-medium">{emp.phone || '-'}</p></div>
                <div><span className="text-gray-500">Email:</span><p className="font-medium">{emp.email || '-'}</p></div>
                <div className="col-span-2"><span className="text-gray-500">Dirección:</span><p className="font-medium">{emp.address || '-'}</p></div>
                <div><span className="text-gray-500">No. Seguridad Social:</span><p className="font-medium">{emp.socialSecurityNumber || '-'}</p></div>
                <div><span className="text-gray-500">Fondo de Pensiones:</span><p className="font-medium">{emp.pensionFund || '-'}</p></div>
                <div><span className="text-gray-500">Aseg. Riesgos:</span><p className="font-medium">{emp.laborRiskInsurer || '-'}</p></div>
              </>
            )}
          </div>
        )}

        {/* Trabajo Tab */}
        {activeTab === 'trabajo' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">No. Empleado:</span><p className="font-mono font-bold text-blue-600">{emp.employeeId}</p></div>
            {isEditing ? (
              <>
                <div><label className="text-gray-500">Contrato:</label><select value={emp.contractType || ''} onChange={(e) => updateField('contractType', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded"><option value="indefinido">Indefinido</option><option value="determinado">Determinado</option><option value="por obra">Por Obra</option><option value="prueba">Prueba</option><option value="temporada">Temporada</option></select></div>
                <div><label className="text-gray-500">Jefe Directo:</label><input type="text" value={emp.supervisor || ''} onChange={(e) => updateField('supervisor', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Salario:</label><input type="number" value={emp.salary || 0} onChange={(e) => updateField('salary', parseFloat(e.target.value) || 0)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Fecha Ingreso:</label><input type="date" value={emp.startDate || ''} onChange={(e) => updateField('startDate', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Jornada:</label><select value={emp.schedule || ''} onChange={(e) => updateField('schedule', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded"><option value="completa">Completa</option><option value="media">Media</option><option value="personalizada">Personalizada</option></select></div>
                <div><label className="text-gray-500">Horario:</label><input type="text" value={emp.scheduleHours || ''} onChange={(e) => updateField('scheduleHours', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Modalidad:</label><select value={emp.modality || ''} onChange={(e) => updateField('modality', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded"><option value="presencial">Presencial</option><option value="remoto">Remoto</option><option value="híbrido">Híbrido</option></select></div>
                <div><label className="text-gray-500">Estatus Legal:</label><select value={emp.workPermitStatus || ''} onChange={(e) => updateField('workPermitStatus', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded"><option value="">No aplica</option><option value="nacional">Nacional</option><option value="residencia_permanente">Residencia Permanente</option><option value="residencia_temporal">Residencia Temporal</option><option value="permiso_trabajo">Permiso de Trabajo</option></select></div>
                <div><label className="text-gray-500">Vigencia Visa:</label><input type="date" value={emp.visaExpiry || ''} onChange={(e) => updateField('visaExpiry', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
              </>
            ) : (
              <>
                <div><span className="text-gray-500">Tipo de Contrato:</span><p className="font-medium capitalize">{emp.contractType || '-'}</p></div>
                <div><span className="text-gray-500">Jefe Directo:</span><p className="font-medium">{emp.supervisor || '-'}</p></div>
                <div><span className="text-gray-500">Salario:</span><p className="font-medium">{formatCurrency(emp.salary)}</p></div>
                <div><span className="text-gray-500">Fecha de Ingreso:</span><p className="font-medium">{emp.startDate || '-'}</p></div>
                <div><span className="text-gray-500">Jornada:</span><p className="font-medium capitalize">{emp.schedule || '-'}</p></div>
                <div><span className="text-gray-500">Horario:</span><p className="font-medium">{emp.scheduleHours || '-'}</p></div>
                <div><span className="text-gray-500">Modalidad:</span><p className="font-medium capitalize">{emp.modality || '-'}</p></div>
                <div><span className="text-gray-500">Estatus Legal:</span><p className="font-medium">{emp.workPermitStatus || 'No aplica'}</p></div>
                <div><span className="text-gray-500">Vigencia Visa:</span><p className="font-medium">{emp.visaExpiry || '-'}</p></div>
              </>
            )}
            <div><span className="text-gray-500">Antigüedad:</span><p className="font-medium">{Math.floor((new Date().getTime() - new Date(emp.startDate || '').getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años</p></div>
            <div><span className="text-gray-500">Vacaciones:</span><p className="font-medium">{Math.floor((new Date().getTime() - new Date(emp.startDate || '').getTime()) / (365.25 * 24 * 60 * 60 * 1000)) < 1 ? 0 : Math.floor((new Date().getTime() - new Date(emp.startDate || '').getTime()) / (365.25 * 24 * 60 * 60 * 1000)) === 1 ? 10 : Math.floor((new Date().getTime() - new Date(emp.startDate || '').getTime()) / (365.25 * 24 * 60 * 60 * 1000)) === 2 ? 12 : Math.min(20, 14 + Math.max(0, Math.floor((new Date().getTime() - new Date(emp.startDate || '').getTime()) / (365.25 * 24 * 60 * 60 * 1000)) - 3))} días</p></div>
          </div>
        )}

        {/* Académico Tab */}
        {activeTab === 'academico' && (
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
            {isEditing ? (
              <>
                <div><label className="text-gray-500">Nivel:</label><select value={emp.educationLevel || ''} onChange={(e) => updateField('educationLevel', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded"><option value="basico">Básico</option><option value="medio">Medio</option><option value="tecnico">Técnico</option><option value="universitario">Universitario</option><option value="maestria">Maestría</option><option value="doctorado">Doctorado</option></select></div>
                <div><label className="text-gray-500">Institución:</label><input type="text" value={emp.university || ''} onChange={(e) => updateField('university', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Título:</label><input type="text" value={emp.degree || ''} onChange={(e) => updateField('degree', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div><label className="text-gray-500">Año Graduación:</label><input type="text" value={emp.graduationYear || ''} onChange={(e) => updateField('graduationYear', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
              </>
            ) : (
              <>
                <div><span className="text-gray-500">Nivel:</span><p className="font-medium capitalize">{emp.educationLevel || '-'}</p></div>
                <div><span className="text-gray-500">Institución:</span><p className="font-medium">{emp.university || '-'}</p></div>
                <div><span className="text-gray-500">Título:</span><p className="font-medium">{emp.degree || '-'}</p></div>
                <div><span className="text-gray-500">Año Graduación:</span><p className="font-medium">{emp.graduationYear || '-'}</p></div>
              </>
            )}
          </div>
        )}

        {/* Habilidades Tab */}
        {activeTab === 'habilidades' && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {isEditing ? (
              <>
                <div className="col-span-2"><label className="text-gray-500">Idiomas:</label><input type="text" value={emp.languages || ''} onChange={(e) => updateField('languages', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div className="col-span-2"><label className="text-gray-500">Certificaciones:</label><input type="text" value={emp.certifications || ''} onChange={(e) => updateField('certifications', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                <div className="flex items-center gap-2"><label className="text-gray-500">Licencia Conducir:</label><input type="checkbox" checked={emp.driverLicense || false} onChange={(e) => updateField('driverLicense', e.target.checked)} className="h-4 w-4" /></div>
                <div className="col-span-2"><label className="text-gray-500">Otras Habilidades:</label><input type="text" value={emp.otherSkills || ''} onChange={(e) => updateField('otherSkills', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
              </>
            ) : (
              <>
                <div className="col-span-2"><span className="text-gray-500">Idiomas:</span><p className="font-medium">{emp.languages || '-'}</p></div>
                <div className="col-span-2"><span className="text-gray-500">Certificaciones:</span><p className="font-medium">{emp.certifications || '-'}</p></div>
                <div><span className="text-gray-500">Licencia Conducir:</span><p className="font-medium">{emp.driverLicense ? 'Sí' : 'No'}</p></div>
                <div className="col-span-2"><span className="text-gray-500">Otras Habilidades:</span><p className="font-medium">{emp.otherSkills || '-'}</p></div>
              </>
            )}
          </div>
        )}

        {/* Ficha Médica Tab */}
        {activeTab === 'medico' && (() => {
          const med = emp.medicalRecord || {};
          const updateMed = (field: string, value: any) => {
            updateField('medicalRecord', { ...med, [field]: value });
          };
          return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {isEditing ? (
                <>
                  <div><label className="text-gray-500">Tipo de Sangre:</label><select value={med.bloodType || ''} onChange={(e) => updateMed('bloodType', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded"><option value="">Seleccionar</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option></select></div>
                  <div><label className="text-gray-500">Altura (cm):</label><input type="text" value={med.height || ''} onChange={(e) => updateMed('height', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" placeholder="Ej: 175" /></div>
                  <div><label className="text-gray-500">Peso (kg):</label><input type="text" value={med.weight || ''} onChange={(e) => updateMed('weight', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" placeholder="Ej: 70" /></div>
                  <div><label className="text-gray-500">Último Examen Médico:</label><input type="date" value={med.lastCheckup || ''} onChange={(e) => updateMed('lastCheckup', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" /></div>
                </>
              ) : (
                <>
                  <div><span className="text-gray-500">Tipo de Sangre:</span><p className="font-medium">{med.bloodType || '-'}</p></div>
                  <div><span className="text-gray-500">Altura:</span><p className="font-medium">{med.height ? `${med.height} cm` : '-'}</p></div>
                  <div><span className="text-gray-500">Peso:</span><p className="font-medium">{med.weight ? `${med.weight} kg` : '-'}</p></div>
                  <div><span className="text-gray-500">Último Examen Médico:</span><p className="font-medium">{med.lastCheckup || '-'}</p></div>
                </>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">Condiciones de Salud</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {isEditing ? (
                  <>
                    <div><label className="text-gray-500">Alergias:</label><textarea value={med.allergies || ''} onChange={(e) => updateMed('allergies', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" rows={2} placeholder="描述 las alergias conocidas..." /></div>
                    <div><label className="text-gray-500">Enfermedades Crónicas:</label><textarea value={med.chronicDiseases || ''} onChange={(e) => updateMed('chronicDiseases', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" rows={2} placeholder="描述 las enfermedades crónicas..." /></div>
                    <div><label className="text-gray-500">Medicamentos Actuales:</label><textarea value={med.currentMedications || ''} onChange={(e) => updateMed('currentMedications', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" rows={2} placeholder="描述 los medicamentos que toma..." /></div>
                    <div><label className="text-gray-500">Discapacidades:</label><textarea value={med.disabilities || ''} onChange={(e) => updateMed('disabilities', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" rows={2} placeholder="描述 discapacidades si aplica..." /></div>
                  </>
                ) : (
                  <>
                    <div><span className="text-gray-500">Alergias:</span><p className="font-medium">{med.allergies || 'Ninguna conocida'}</p></div>
                    <div><span className="text-gray-500">Enfermedades Crónicas:</span><p className="font-medium">{med.chronicDiseases || 'Ninguna'}</p></div>
                    <div><span className="text-gray-500">Medicamentos Actuales:</span><p className="font-medium">{med.currentMedications || 'Ninguno'}</p></div>
                    <div><span className="text-gray-500">Discapacidades:</span><p className="font-medium">{med.disabilities || 'Ninguna'}</p></div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">Contacto de Emergencia</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {isEditing ? (
                  <>
                    <div><label className="text-gray-500">Nombre:</label><input type="text" value={med.emergencyContact || ''} onChange={(e) => updateMed('emergencyContact', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" placeholder="Nombre del contacto" /></div>
                    <div><label className="text-gray-500">Teléfono:</label><input type="text" value={med.emergencyPhone || ''} onChange={(e) => updateMed('emergencyPhone', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" placeholder="9999-8888" /></div>
                  </>
                ) : (
                  <>
                    <div><span className="text-gray-500">Nombre:</span><p className="font-medium">{med.emergencyContact || '-'}</p></div>
                    <div><span className="text-gray-500">Teléfono:</span><p className="font-medium">{med.emergencyPhone || '-'}</p></div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">Seguro Médico</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {isEditing ? (
                  <>
                    <div><label className="text-gray-500">Proveedor de Seguro:</label><input type="text" value={med.insuranceProvider || ''} onChange={(e) => updateMed('insuranceProvider', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" placeholder="Ej: IHSS, Sanitas" /></div>
                    <div><label className="text-gray-500">No. Póliza:</label><input type="text" value={med.insuranceNumber || ''} onChange={(e) => updateMed('insuranceNumber', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" placeholder="Número de póliza" /></div>
                  </>
                ) : (
                  <>
                    <div><span className="text-gray-500">Proveedor de Seguro:</span><p className="font-medium">{med.insuranceProvider || '-'}</p></div>
                    <div><span className="text-gray-500">No. Póliza:</span><p className="font-medium">{med.insuranceNumber || '-'}</p></div>
                  </>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">Notas Médicas</h4>
                <textarea value={med.notes || ''} onChange={(e) => updateMed('notes', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" rows={3} placeholder="Notas adicionales del expediente médico..." />
              </div>
            )}
            {!isEditing && med.notes && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">Notas Médicas</h4>
                <p className="text-sm">{med.notes}</p>
              </div>
            )}
          </div>
          );
        })()}

        {/* Documentos Tab */}
        {activeTab === 'documentos' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'CV', field: 'cv', value: emp.cv },
              { label: 'Identidad', field: 'docIdentity', value: emp.docIdentity },
              { label: 'Comprobante Domicilio', field: 'docAddressProof', value: emp.docAddressProof },
              { label: 'Contrato', field: 'docContract', value: emp.docContract },
              { label: 'NDA', field: 'docNDA', value: emp.docNDA },
              { label: 'Cert. Estudios', field: 'docEducationCerts', value: emp.docEducationCerts },
              { label: 'Cert. Empleos', field: 'docPreviousJobs', value: emp.docPreviousJobs },
              { label: 'Cert. Médico', field: 'docMedicalCert', value: emp.docMedicalCert }
            ].map((doc, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm ${doc.value ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                <span className={`text-xs ${doc.value ? 'text-green-600' : 'text-gray-400'}`}>{doc.label}</span>
                <p className={`font-medium ${doc.value ? 'text-green-800' : 'text-gray-400'}`}>
                  {doc.value ? 'Cargado' : 'Sin archivo'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {doc.value && (
                    <a
                      href={doc.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs"
                    >
                      <Eye className="h-3 w-3" />
                      Ver
                    </a>
                  )}
                  {isEditing && doc.value && (
                    <button onClick={() => updateField(doc.field, '')} className="text-xs text-red-500">Eliminar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RRHH Documents Tab */}
        {activeTab === 'rrhh' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">{(emp.hrDocuments || []).length} documento{(emp.hrDocuments || []).length !== 1 ? 's' : ''}</p>
              <Button size="sm" onClick={addHRDocument}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Documento
              </Button>
            </div>
            
            {(emp.hrDocuments || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay documentos de RRHH</p>
                <p className="text-sm">Haz clic en "Agregar Documento" para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(emp.hrDocuments || []).map((doc: HRDocument, index: number) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Tipo</label>
                        <select
                          value={doc.type}
                          onChange={(e) => updateHRDoc(index, 'type', e.target.value)}
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                        >
                          <option value="amonestacion">Amonestación</option>
                          <option value="autorizacion_vacaciones">Autorización Vacaciones</option>
                          <option value="contrato">Contrato</option>
                          <option value="acuerdo_confidencialidad">Acuerdo Confidencialidad</option>
                          <option value="permiso">Permiso</option>
                          <option value="constancia">Constancia</option>
                          <option value="referencia_laboral">Referencia Laboral</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Nombre</label>
                        <input
                          type="text"
                          value={doc.name}
                          onChange={(e) => updateHRDoc(index, 'name', e.target.value)}
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                          placeholder="Nombre del documento"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Fecha</label>
                        <input
                          type="date"
                          value={doc.date}
                          onChange={(e) => updateHRDoc(index, 'date', e.target.value)}
                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        {doc.file ? (
                          <div className="flex items-center gap-1 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Archivo</span>
                            <a
                              href={doc.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 text-xs ml-1"
                            >
                              Ver
                            </a>
                            <button onClick={() => updateHRDoc(index, 'file', '')} className="text-red-500 text-xs ml-1">Quitar</button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <div className="px-3 py-1 border border-dashed border-gray-300 rounded text-xs text-gray-600 hover:border-blue-400">
                              <Upload className="h-3 w-3 inline mr-1" />
                              Subir
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const fileName = file.name.replace(/\.[^/.]+$/, '');
                                  updateHRDoc(index, 'name', fileName);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    updateHRDoc(index, 'file', reader.result as string);
                                    showUploadMessage(`"${file.name}" subido correctamente`);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeHRDoc(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="text-xs text-gray-500">Observaciones</label>
                      <input
                        type="text"
                        value={doc.observations}
                        onChange={(e) => updateHRDoc(index, 'observations', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded text-sm"
                        placeholder="Notas adicionales..."
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span>Subido por: <span className="text-gray-600">{doc.uploadedBy || 'Desconocido'}</span></span>
                      <span>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString('es-HN') : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function EmployeesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<Employee | null>(null);
  const [deactivateForm, setDeactivateForm] = useState({
    reason: '',
    requestedBy: '',
    performedBy: '',
    rehireable: true
  });
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivatingEmployee, setReactivatingEmployee] = useState<Employee | null>(null);
  const [reactivateForm, setReactivateForm] = useState({
    reason: '',
    requestedBy: '',
    performedBy: ''
  });
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendingEmployee, setSuspendingEmployee] = useState<Employee | null>(null);
  const [suspendForm, setSuspendForm] = useState({
    reason: '',
    requestedBy: '',
    performedBy: ''
  });
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    identityNumber: '',
    photo: '',
    cv: '',
    position: '',
    department: '',
    salary: 0,
    startDate: '',
    phone: '',
    email: '',
    address: '',
    civilStatus: 'soltero' as const,
    vacationDays: 15,
    contractType: 'indefinido' as const,
    supervisor: '',
    schedule: 'completa' as const,
    scheduleHours: '08:00 - 17:00',
    modality: 'presencial' as const,
    educationLevel: 'universitario' as const,
    university: '',
    degree: '',
    graduationYear: '',
    languages: '',
    certifications: '',
    driverLicense: false,
    otherSkills: '',
    socialSecurityNumber: '',
    pensionFund: '',
    laborRiskInsurer: '',
    workPermitStatus: '',
    visaExpiry: '',
    docIdentity: '',
    docAddressProof: '',
    docContract: '',
    docNDA: '',
    docEducationCerts: '',
    docPreviousJobs: '',
    docMedicalCert: '',
    hrDocuments: [],
    medicalRecord: {
      bloodType: '',
      allergies: '',
      chronicDiseases: '',
      currentMedications: '',
      emergencyContact: '',
      emergencyPhone: '',
      insuranceProvider: '',
      insuranceNumber: '',
      lastCheckup: '',
      disabilities: '',
      height: '',
      weight: '',
      notes: ''
    }
  });

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    const deptKey = `departments_${companyId}`;
    const posKey = `positions_${companyId}`;
    const savedDept = localStorage.getItem(deptKey);
    const savedPos = localStorage.getItem(posKey);
    if (savedDept) setDepartments(JSON.parse(savedDept));
    if (savedPos) setPositions(JSON.parse(savedPos));

    try {
      const res = await fetch(`/api/companies/${companyId}/employees`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setEmployees(data);
        } else {
          // Fallback to localStorage if no employees in DB
          const empKey = `employees_${companyId}`;
          const savedEmp = localStorage.getItem(empKey);
          if (savedEmp) {
            const localEmps = JSON.parse(savedEmp);
            setEmployees(localEmps);
            // Migrate to Supabase
            for (const emp of localEmps) {
              await fetch(`/api/companies/${companyId}/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emp)
              });
            }
            await loadData();
          }
        }
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      // Fallback to localStorage on error
      const empKey = `employees_${companyId}`;
      const savedEmp = localStorage.getItem(empKey);
      if (savedEmp) setEmployees(JSON.parse(savedEmp));
    }
  };

  const saveEmployees = async (data: Employee[]) => {
    setEmployees(data);
  };

  const saveEmployeeToAPI = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emp)
      });
      if (res.ok) {
        await loadData();
        showUploadMessage('Empleado guardado correctamente');
      }
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const updateEmployeeToAPI = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emp)
      });
      if (res.ok) {
        await loadData();
        showUploadMessage('Empleado actualizado correctamente');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
    }
  };

  const deleteEmployeeFromAPI = async (employeeId: string) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees?employeeId=${employeeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        alert('La foto no debe superar 500KB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee({ ...newEmployee, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) {
        alert('El CV no debe superar 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee({ ...newEmployee, cv: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const showUploadMessage = (message: string) => {
    setUploadMessage(message);
    setTimeout(() => setUploadMessage(''), 3000);
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5000000) {
        alert('El archivo no debe superar 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee({ ...newEmployee, [field]: reader.result as string });
        showUploadMessage(`"${file.name}" subido correctamente`);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateEmployeeId = () => {
    const empCount = employees.length + 1;
    const prefix = companyId.substring(0, 4).toUpperCase();
    const number = String(empCount).padStart(4, '0');
    return `${prefix}-${number}`;
  };

  const addEmployee = async () => {
    const emp: Employee = {
      id: `emp-${Date.now()}`,
      employeeId: generateEmployeeId(),
      ...newEmployee,
      vacationDays: calculateVacationDays(newEmployee.startDate),
      status: 'active',
      usedVacationDays: 0
    };
    await saveEmployeeToAPI(emp);
    setNewEmployee({ firstName: '', lastName: '', identityNumber: '', photo: '', cv: '', position: '', department: '', salary: 0, startDate: '', phone: '', email: '', address: '', civilStatus: 'soltero', vacationDays: 0, contractType: 'indefinido', supervisor: '', schedule: 'completa', scheduleHours: '08:00 - 17:00', modality: 'presencial', educationLevel: 'universitario', university: '', degree: '', graduationYear: '', languages: '', certifications: '', driverLicense: false, otherSkills: '', socialSecurityNumber: '', pensionFund: '', laborRiskInsurer: '', workPermitStatus: '', visaExpiry: '', docIdentity: '', docAddressProof: '', docContract: '', docNDA: '', docEducationCerts: '', docPreviousJobs: '', docMedicalCert: '', hrDocuments: [], medicalRecord: { bloodType: '', allergies: '', chronicDiseases: '', currentMedications: '', emergencyContact: '', emergencyPhone: '', insuranceProvider: '', insuranceNumber: '', lastCheckup: '', disabilities: '', height: '', weight: '', notes: '' } });
    setShowAddEmployee(false);
  };

  const removeEmployee = async (id: string) => {
    if (confirm('¿Eliminar este empleado?')) {
      await deleteEmployeeFromAPI(id);
    }
  };

  const updateEmployee = async () => {
    if (!editingEmployee) return;
    await updateEmployeeToAPI(editingEmployee);
    setSelectedEmployee(editingEmployee);
    setEditingEmployee(null);
  };

  const toggleEmployeeStatus = async (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (emp) {
      if (emp.status === 'active') {
        setDeactivatingEmployee(emp);
        setDeactivateForm({ reason: '', requestedBy: '', performedBy: '', rehireable: true });
        setShowDeactivateModal(true);
      } else {
        setReactivatingEmployee(emp);
        setReactivateForm({ reason: '', requestedBy: '', performedBy: '' });
        setShowReactivateModal(true);
      }
    }
  };

  const openSuspendModal = (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setSuspendingEmployee(emp);
      setSuspendForm({ reason: '', requestedBy: '', performedBy: '' });
      setShowSuspendModal(true);
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivatingEmployee) return;
    const updatedEmp = {
      ...deactivatingEmployee,
      status: 'terminated',
      terminationDate: new Date().toISOString().split('T')[0],
      terminationReason: deactivateForm.reason,
      terminationRequestedBy: deactivateForm.requestedBy,
      terminationPerformedBy: deactivateForm.performedBy,
      rehireable: deactivateForm.rehireable
    };
    await updateEmployeeToAPI(updatedEmp);
    setShowDeactivateModal(false);
    setDeactivatingEmployee(null);
  };

  const confirmReactivation = async () => {
    if (!reactivatingEmployee) return;
    const updatedEmp = {
      ...reactivatingEmployee,
      status: 'active',
      reactivationDate: new Date().toISOString().split('T')[0],
      reactivationReason: reactivateForm.reason,
      reactivationRequestedBy: reactivateForm.requestedBy,
      reactivationPerformedBy: reactivateForm.performedBy
    };
    await updateEmployeeToAPI(updatedEmp);
    setShowReactivateModal(false);
    setReactivatingEmployee(null);
  };

  const confirmSuspension = async () => {
    if (!suspendingEmployee) return;
    const updatedEmp = {
      ...suspendingEmployee,
      status: 'suspended',
      suspensionDate: new Date().toISOString().split('T')[0],
      suspensionReason: suspendForm.reason,
      suspensionRequestedBy: suspendForm.requestedBy,
      suspensionPerformedBy: suspendForm.performedBy
    };
    await updateEmployeeToAPI(updatedEmp);
    setShowSuspendModal(false);
    setSuspendingEmployee(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateVacationDays = (startDate: string): number => {
    if (!startDate) return 15;
    const start = new Date(startDate);
    const now = new Date();
    const yearsDiff = now.getFullYear() - start.getFullYear();
    const monthsDiff = now.getMonth() - start.getMonth();
    const totalYears = yearsDiff + (monthsDiff < 0 ? -1 : 0);
    
    if (totalYears < 1) return 0;
    if (totalYears === 1) return 10;
    if (totalYears === 2) return 12;
    if (totalYears === 3) return 14;
    // 4+ años: 14 + 1 por cada año adicional, máximo 20
    return Math.min(20, 14 + (totalYears - 3));
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchTerm === '' || 
      (`${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.identityNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = filterDepartment === '' || emp.department === filterDepartment;
    const matchesPos = filterPosition === '' || emp.position === filterPosition;
    const matchesStatus = filterStatus === '' || emp.status === filterStatus;
    const matchesContract = filterContract === '' || emp.contractType === filterContract;
    
    return matchesSearch && matchesDept && matchesPos && matchesStatus && matchesContract;
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('El archivo debe tener al menos un encabezado y una fila de datos');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const preview: any[] = [];

      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        preview.push(row);
      }

      setUploadPreview(preview);
    };
    reader.readAsText(file);
  };

  const confirmUpload = () => {
    const newEmployees = uploadPreview.map(row => ({
      id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: row.name || row.nombre || '',
      position: row.position || row.cargo || row.puesto || '',
      department: row.department || row.departamento || '',
      salary: parseFloat(row.salary || row.salario || '0') || 0,
      startDate: row.startdate || row.fecha_ingreso || row.fecha || '',
      status: 'active' as const,
      phone: row.phone || row.telefono || '',
      email: row.email || row.correo || '',
      vacationDays: parseInt(row.vacationdays || row.dias_vacaciones || '15') || 15,
      usedVacationDays: 0
    })).filter(emp => emp.name);

    saveEmployees([...employees, ...newEmployees]);
    setUploadPreview([]);
    setShowUpload(false);
    alert(`${newEmployees.length} empleados importados correctamente`);
  };

  const downloadTemplate = () => {
    const csv = 'name,position,department,salary,startDate,phone,email,vacationDays\nJuan Pérez,Doctor,Medicina,15000,2024-01-15,9999-8888,juan@email.com,15\nMaría López,Enfermera,Enfermería,12000,2024-02-01,8888-7777,maria@email.com,15';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_empleados.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Upload Notification */}
      {uploadMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>{uploadMessage}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
          <p className="text-gray-500">{employees.length} empleados registrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/hr`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Template
          </Button>
          <Button variant="outline" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Subir Archivo
          </Button>
          <Button onClick={() => setShowAddEmployee(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar Empleado
          </Button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Importar Empleados desde Archivo CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Formato del archivo CSV:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>name</strong> o <strong>nombre</strong>: Nombre completo del empleado</li>
                <li>• <strong>position</strong> o <strong>cargo</strong>: Cargo o puesto</li>
                <li>• <strong>department</strong> o <strong>departamento</strong>: Departamento</li>
                <li>• <strong>salary</strong> o <strong>salario</strong>: Salario mensual</li>
                <li>• <strong>startDate</strong> o <strong>fecha</strong>: Fecha de ingreso</li>
                <li>• <strong>phone</strong> o <strong>telefono</strong>: Teléfono</li>
                <li>• <strong>email</strong> o <strong>correo</strong>: Correo electrónico</li>
                <li>• <strong>vacationDays</strong> o <strong>dias_vacaciones</strong>: Días de vacaciones</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <Button variant="outline" onClick={() => { setShowUpload(false); setUploadPreview([]); }}>
                Cancelar
              </Button>
            </div>

            {uploadPreview.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Vista previa ({uploadPreview.length} empleados):</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2 px-3">Nombre</th>
                        <th className="text-left py-2 px-3">Cargo</th>
                        <th className="text-left py-2 px-3">Departamento</th>
                        <th className="text-right py-2 px-3">Salario</th>
                        <th className="text-left py-2 px-3">Fecha</th>
                        <th className="text-left py-2 px-3">Teléfono</th>
                        <th className="text-left py-2 px-3">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadPreview.map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="py-2 px-3">{row.name || row.nombre}</td>
                          <td className="py-2 px-3">{row.position || row.cargo || row.puesto}</td>
                          <td className="py-2 px-3">{row.department || row.departamento}</td>
                          <td className="py-2 px-3 text-right">{row.salary || row.salario}</td>
                          <td className="py-2 px-3">{row.startdate || row.fecha_ingreso || row.fecha}</td>
                          <td className="py-2 px-3">{row.phone || row.telefono}</td>
                          <td className="py-2 px-3">{row.email || row.correo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={confirmUpload}>
                    Confirmar Importación ({uploadPreview.length} empleados)
                  </Button>
                  <Button variant="outline" onClick={() => setUploadPreview([])}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, identidad, No. empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros {(filterDepartment || filterPosition || filterStatus || filterContract) ? '(activos)' : ''}
            </Button>
            {(filterDepartment || filterPosition || filterStatus || filterContract) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterDepartment(''); setFilterPosition(''); setFilterStatus(''); setFilterContract(''); }}>
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t">
              <div>
                <label className="text-xs font-medium text-gray-600">Departamento</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Todos</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Cargo</label>
                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Todos</option>
                  {positions
                    .filter(p => !filterDepartment || p.department === filterDepartment)
                    .map((pos) => (
                      <option key={pos.id} value={pos.name}>{pos.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tipo de contrato</label>
                <select
                  value={filterContract}
                  onChange={(e) => setFilterContract(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Todos</option>
                  <option value="indefinido">Indefinido</option>
                  <option value="determinado">Determinado</option>
                  <option value="por obra">Por Obra</option>
                  <option value="prueba">Prueba</option>
                  <option value="temporada">Temporada</option>
                </select>
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            {filteredEmployees.length} empleado{filteredEmployees.length !== 1 ? 's' : ''} encontrado{filteredEmployees.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Add Employee Form */}
      {showAddEmployee && (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle>Nuevo Empleado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="text-sm font-medium text-gray-600">No. Empleado (generado automáticamente)</label>
              <div className="text-lg font-bold text-blue-600">{generateEmployeeId()}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Nombres *</label>
                <input
                  type="text"
                  value={newEmployee.firstName}
                  onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: Juan Carlos"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apellidos *</label>
                <input
                  type="text"
                  value={newEmployee.lastName}
                  onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: Pérez López"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">No. Identidad *</label>
                <input
                  type="text"
                  value={newEmployee.identityNumber}
                  onChange={(e) => setNewEmployee({ ...newEmployee, identityNumber: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: 0801-1990-12345"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Foto del empleado</label>
                <div className="mt-1 flex items-center gap-4">
                  {newEmployee.photo ? (
                    <div className="relative">
                      <img 
                        src={newEmployee.photo} 
                        alt="Preview" 
                        className="w-20 h-20 object-cover rounded-full border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setNewEmployee({ ...newEmployee, photo: '' })}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400">
                        <UserPlus className="h-8 w-8 text-gray-400" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="text-xs text-gray-500">
                    <p>Formato: JPG, PNG</p>
                    <p>Tamaño máximo: 500KB</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Estado Civil *</label>
                <select
                  value={newEmployee.civilStatus}
                  onChange={(e) => setNewEmployee({ ...newEmployee, civilStatus: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="soltero">Soltero/a</option>
                  <option value="casado">Casado/a</option>
                  <option value="divorciado">Divorciado/a</option>
                  <option value="viudo">Viudo/a</option>
                  <option value="unión libre">Unión Libre</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Departamento *</label>
                <select
                  value={newEmployee.department}
                  onChange={(e) => {
                    const deptName = e.target.value;
                    const dept = departments.find(d => d.name === deptName);
                    setNewEmployee({ ...newEmployee, department: deptName, position: '', supervisor: dept?.manager || '' });
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar departamento...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Cargo *</label>
                <select
                  value={newEmployee.position}
                  onChange={(e) => {
                    const posName = e.target.value;
                    const pos = positions.find(p => p.name === posName && p.department === newEmployee.department);
                    setNewEmployee({ 
                      ...newEmployee, 
                      position: posName,
                      salary: pos ? pos.minSalary || pos.maxSalary || 0 : newEmployee.salary
                    });
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar puesto...</option>
                  {positions
                    .filter(p => !newEmployee.department || p.department === newEmployee.department)
                    .map((pos) => (
                      <option key={pos.id} value={pos.name}>
                        {pos.name} {pos.minSalary > 0 || pos.maxSalary > 0 ? `(${pos.minSalary > 0 ? formatCurrency(pos.minSalary) : '?'} - ${pos.maxSalary > 0 ? formatCurrency(pos.maxSalary) : '?'})` : ''}
                      </option>
                    ))}
                </select>
                {newEmployee.department && positions.filter(p => p.department === newEmployee.department).length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">No hay puestos para este departamento</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Salario mensual (L.) *</label>
                <input
                  type="number"
                  value={newEmployee.salary}
                  onChange={(e) => setNewEmployee({ ...newEmployee, salary: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de ingreso *</label>
                <input
                  type="date"
                  value={newEmployee.startDate}
                  onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Días de vacaciones</label>
                <div className="w-full mt-1 px-3 py-2 border rounded-md bg-gray-50 text-gray-600">
                  Se calcula automáticamente por antigüedad
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="text-sm font-medium">Dirección exacta</label>
                <input
                  type="text"
                  value={newEmployee.address}
                  onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Ej: Col. Kennedy, Calle 12, Casa #456"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Teléfono</label>
                <input
                  type="text"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="9999-8888"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            {/* Contrato y Trabajo */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Contrato y Trabajo</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo de contrato *</label>
                  <select
                    value={newEmployee.contractType}
                    onChange={(e) => setNewEmployee({ ...newEmployee, contractType: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="indefinido">Indefinido</option>
                    <option value="determinado">Determinado</option>
                    <option value="por obra">Por Obra</option>
                    <option value="prueba">Período de Prueba</option>
                    <option value="temporada">Temporada</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Jefe Directo</label>
                  <input
                    type="text"
                    value={newEmployee.supervisor}
                    onChange={(e) => setNewEmployee({ ...newEmployee, supervisor: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Se asigna según departamento"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Jornada *</label>
                  <select
                    value={newEmployee.schedule}
                    onChange={(e) => setNewEmployee({ ...newEmployee, schedule: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="completa">Tiempo Completo</option>
                    <option value="media">Medio Tiempo</option>
                    <option value="personalizada">Personalizada</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Horario</label>
                  <input
                    type="text"
                    value={newEmployee.scheduleHours}
                    onChange={(e) => setNewEmployee({ ...newEmployee, scheduleHours: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="08:00 - 17:00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Modalidad *</label>
                  <select
                    value={newEmployee.modality}
                    onChange={(e) => setNewEmployee({ ...newEmployee, modality: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="remoto">Remoto</option>
                    <option value="híbrido">Híbrido</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Nivel Académico */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Nivel Académico</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Nivel de escolaridad</label>
                  <select
                    value={newEmployee.educationLevel}
                    onChange={(e) => setNewEmployee({ ...newEmployee, educationLevel: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="basico">Básico</option>
                    <option value="medio">Medio</option>
                    <option value="tecnico">Técnico</option>
                    <option value="universitario">Universitario</option>
                    <option value="maestria">Maestría</option>
                    <option value="doctorado">Doctorado</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Institución de egreso</label>
                  <input
                    type="text"
                    value={newEmployee.university}
                    onChange={(e) => setNewEmployee({ ...newEmployee, university: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: Universidad Nacional"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Título / Carrera</label>
                  <input
                    type="text"
                    value={newEmployee.degree}
                    onChange={(e) => setNewEmployee({ ...newEmployee, degree: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: Ingeniero en Sistemas"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Año de graduación</label>
                  <input
                    type="text"
                    value={newEmployee.graduationYear}
                    onChange={(e) => setNewEmployee({ ...newEmployee, graduationYear: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: 2020"
                  />
                </div>
              </div>
            </div>

            {/* Habilidades */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Habilidades y Competencias</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Idiomas</label>
                  <input
                    type="text"
                    value={newEmployee.languages}
                    onChange={(e) => setNewEmployee({ ...newEmployee, languages: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: Español (nativo), Inglés (avanzado)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Certificaciones profesionales</label>
                  <input
                    type="text"
                    value={newEmployee.certifications}
                    onChange={(e) => setNewEmployee({ ...newEmployee, certifications: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: PMP, CPA, Scrum Master"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Otras habilidades</label>
                  <input
                    type="text"
                    value={newEmployee.otherSkills}
                    onChange={(e) => setNewEmployee({ ...newEmployee, otherSkills: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: Manejo de Excel, Trabajo en equipo"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Licencia de conducir</label>
                  <input
                    type="checkbox"
                    checked={newEmployee.driverLicense}
                    onChange={(e) => setNewEmployee({ ...newEmployee, driverLicense: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            </div>

            {/* Seguridad Social */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Seguridad Social y Legal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">No. Seguridad Social (IHSS)</label>
                  <input
                    type="text"
                    value={newEmployee.socialSecurityNumber}
                    onChange={(e) => setNewEmployee({ ...newEmployee, socialSecurityNumber: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Número de afiliación"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Fondo de pensiones</label>
                  <input
                    type="text"
                    value={newEmployee.pensionFund}
                    onChange={(e) => setNewEmployee({ ...newEmployee, pensionFund: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: RAP, AHPRONAFI"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Aseguradora de riesgos laborales</label>
                  <input
                    type="text"
                    value={newEmployee.laborRiskInsurer}
                    onChange={(e) => setNewEmployee({ ...newEmployee, laborRiskInsurer: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ej: ARL Confederación"
                  />
                </div>
              </div>
            </div>

            {/* Permisos y Visas */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Permisos y Visas (Empleados Extranjeros)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Estatus legal de trabajo</label>
                  <select
                    value={newEmployee.workPermitStatus}
                    onChange={(e) => setNewEmployee({ ...newEmployee, workPermitStatus: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="">No aplica</option>
                    <option value="nacional">Nacional</option>
                    <option value="residencia_permanente">Residencia Permanente</option>
                    <option value="residencia_temporal">Residencia Temporal</option>
                    <option value="permiso_trabajo">Permiso de Trabajo</option>
                    <option value="asilo">Asilo Político</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Vigencia de visa</label>
                  <input
                    type="date"
                    value={newEmployee.visaExpiry}
                    onChange={(e) => setNewEmployee({ ...newEmployee, visaExpiry: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* CV */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Curriculum Vitae</h3>
              <div>
                <label className="text-sm font-medium">Archivo CV (PDF)</label>
                <div className="mt-1 flex items-center gap-4">
                  {newEmployee.cv ? (
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-green-700">CV cargado</span>
                      <button
                        type="button"
                        onClick={() => setNewEmployee({ ...newEmployee, cv: '' })}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                        <Upload className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">Seleccionar archivo PDF</span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleCVUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <span className="text-xs text-gray-500">Máximo 2MB</span>
                </div>
              </div>
            </div>

            {/* Documentos Adjuntos */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-700 mb-3">Documentos Adjuntos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Copia de documento de identidad */}
                <div>
                  <label className="text-sm font-medium">Copia de documento de identidad</label>
                  <div className="mt-1">
                    {newEmployee.docIdentity ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docIdentity: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docIdentity')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Comprobante de domicilio */}
                <div>
                  <label className="text-sm font-medium">Comprobante de domicilio</label>
                  <div className="mt-1">
                    {newEmployee.docAddressProof ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docAddressProof: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docAddressProof')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Contrato de trabajo firmado */}
                <div>
                  <label className="text-sm font-medium">Contrato de trabajo firmado</label>
                  <div className="mt-1">
                    {newEmployee.docContract ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docContract: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docContract')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Acuerdo de confidencialidad/NDA */}
                <div>
                  <label className="text-sm font-medium">Acuerdo de confidencialidad / NDA</label>
                  <div className="mt-1">
                    {newEmployee.docNDA ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docNDA: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docNDA')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Certificados de estudios */}
                <div>
                  <label className="text-sm font-medium">Certificados de estudios</label>
                  <div className="mt-1">
                    {newEmployee.docEducationCerts ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docEducationCerts: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docEducationCerts')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Certificados de empleos anteriores */}
                <div>
                  <label className="text-sm font-medium">Certificados de empleos anteriores</label>
                  <div className="mt-1">
                    {newEmployee.docPreviousJobs ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docPreviousJobs: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docPreviousJobs')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Certificados médicos ocupacionales */}
                <div>
                  <label className="text-sm font-medium">Certificados médicos ocupacionales de ingreso</label>
                  <div className="mt-1">
                    {newEmployee.docMedicalCert ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Documento cargado</span>
                        <button
                          type="button"
                          onClick={() => setNewEmployee({ ...newEmployee, docMedicalCert: '' })}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Subir archivo</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocUpload(e, 'docMedicalCert')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={addEmployee}>Guardar</Button>
              <Button variant="outline" onClick={() => setShowAddEmployee(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees List */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No hay empleados registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEmployees.map((emp) => (
            <Card key={emp.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    {emp.photo ? (
                      <img 
                        src={emp.photo} 
                        alt={`${emp.firstName} ${emp.lastName}`}
                        className="w-16 h-16 object-cover rounded-full border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                        <span className="text-xl font-medium text-gray-400">
                          {(emp.firstName || emp.name || '').charAt(0)}{(emp.lastName || '').charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{emp.employeeId}</span>
                        <h3 className="font-medium">{emp.firstName || emp.name} {emp.lastName || ''}</h3>
                        <Badge variant={emp.status === 'active' ? 'default' : emp.status === 'terminated' ? 'destructive' : emp.status === 'suspended' ? 'outline' : 'secondary'}>
                          {emp.status === 'active' ? 'Activo' : emp.status === 'terminated' ? 'Terminado' : emp.status === 'suspended' ? 'Suspendido' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{emp.position} • {emp.department}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        {emp.identityNumber && <span>Identidad: {emp.identityNumber}</span>}
                        <span>Salario: {formatCurrency(emp.salary)}</span>
                        <span>Ingreso: {emp.startDate || '-'}</span>
                        {emp.phone && <span>Tel: {emp.phone}</span>}
                        {emp.email && <span>Email: {emp.email}</span>}
                        {emp.address && <span>Dirección: {emp.address}</span>}
                        {emp.civilStatus && <span>Estado civil: {emp.civilStatus}</span>}
                        <span>Antigüedad: {Math.floor((new Date().getTime() - new Date(emp.startDate || '').getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años</span>
                        <span>Vacaciones: {calculateVacationDays(emp.startDate)} días</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      Ver
                    </Button>
                    {emp.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => toggleEmployeeStatus(emp.id)}
                        >
                          Desactivar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-600 border-amber-300 hover:bg-amber-50"
                          onClick={() => openSuspendModal(emp.id)}
                        >
                          Suspender
                        </Button>
                      </>
                    )}
                    {emp.status === 'suspended' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => toggleEmployeeStatus(emp.id)}
                        >
                          Reactivar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => toggleEmployeeStatus(emp.id)}
                        >
                          Desactivar
                        </Button>
                      </>
                    )}
                    {(emp.status === 'terminated' || emp.status === 'inactive') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => toggleEmployeeStatus(emp.id)}
                      >
                        Reactivar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeEmployee(emp.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Deactivation Modal */}
      {showDeactivateModal && deactivatingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold text-red-600">Desactivar Empleado</h2>
              <p className="text-sm text-gray-500 mt-1">
                {deactivatingEmployee.firstName} {deactivatingEmployee.lastName} ({deactivatingEmployee.employeeId})
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón de desactivación *</label>
                <textarea
                  value={deactivateForm.reason}
                  onChange={(e) => setDeactivateForm({ ...deactivateForm, reason: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describa la razón de la desactivación..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solicitado por *</label>
                  <input
                    type="text"
                    value={deactivateForm.requestedBy}
                    onChange={(e) => setDeactivateForm({ ...deactivateForm, requestedBy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre de quien solicita"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Realizado por *</label>
                  <input
                    type="text"
                    value={deactivateForm.performedBy}
                    onChange={(e) => setDeactivateForm({ ...deactivateForm, performedBy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre de quien realiza"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="rehireable"
                  checked={deactivateForm.rehireable}
                  onChange={(e) => setDeactivateForm({ ...deactivateForm, rehireable: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="rehireable" className="text-sm font-medium text-gray-700">El empleado es recontratable</label>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowDeactivateModal(false); setDeactivatingEmployee(null); }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeactivation}
                disabled={!deactivateForm.reason || !deactivateForm.requestedBy || !deactivateForm.performedBy}
              >
                Desactivar Empleado
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Reactivation Modal */}
      {showReactivateModal && reactivatingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold text-green-600">Reactivar Empleado</h2>
              <p className="text-sm text-gray-500 mt-1">
                {reactivatingEmployee.firstName} {reactivatingEmployee.lastName} ({reactivatingEmployee.employeeId})
              </p>
              {reactivatingEmployee.terminationReason && (
                <p className="text-xs text-gray-400 mt-1">
                  Última razón de salida: {reactivatingEmployee.terminationReason}
                </p>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-sm text-green-700">
                  Fecha de reactivación: <strong>{new Date().toLocaleDateString('es-HN')}</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón de reactivación *</label>
                <textarea
                  value={reactivateForm.reason}
                  onChange={(e) => setReactivateForm({ ...reactivateForm, reason: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Describa la razón de la reactivación..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solicitado por *</label>
                  <input
                    type="text"
                    value={reactivateForm.requestedBy}
                    onChange={(e) => setReactivateForm({ ...reactivateForm, requestedBy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Nombre de quien solicita"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reactivado por *</label>
                  <input
                    type="text"
                    value={reactivateForm.performedBy}
                    onChange={(e) => setReactivateForm({ ...reactivateForm, performedBy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Nombre de quien reactiva"
                  />
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowReactivateModal(false); setReactivatingEmployee(null); }}>
                Cancelar
              </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={confirmReactivation}
                disabled={!reactivateForm.reason || !reactivateForm.requestedBy || !reactivateForm.performedBy}
              >
                Reactivar Empleado
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Suspension Modal */}
      {showSuspendModal && suspendingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold text-amber-600">Suspender Empleado</h2>
              <p className="text-sm text-gray-500 mt-1">
                {suspendingEmployee.firstName} {suspendingEmployee.lastName} ({suspendingEmployee.employeeId})
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-sm text-amber-700">
                  Fecha de suspensión: <strong>{new Date().toLocaleDateString('es-HN')}</strong>
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  El empleado será marcado como suspendido hasta nueva decisión.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón de suspensión *</label>
                <textarea
                  value={suspendForm.reason}
                  onChange={(e) => setSuspendForm({ ...suspendForm, reason: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows={3}
                  placeholder="Describa la razón de la suspensión..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solicitado por *</label>
                  <input
                    type="text"
                    value={suspendForm.requestedBy}
                    onChange={(e) => setSuspendForm({ ...suspendForm, requestedBy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Nombre de quien solicita"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Realizado por *</label>
                  <input
                    type="text"
                    value={suspendForm.performedBy}
                    onChange={(e) => setSuspendForm({ ...suspendForm, performedBy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Nombre de quien realiza"
                  />
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowSuspendModal(false); setSuspendingEmployee(null); }}>
                Cancelar
              </Button>
              <Button
                variant="default"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={confirmSuspension}
                disabled={!suspendForm.reason || !suspendForm.requestedBy || !suspendForm.performedBy}
              >
                Suspender Empleado
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Employee Detail Modal */}
      {(selectedEmployee || editingEmployee) && (() => {
        const emp = editingEmployee || selectedEmployee!;
        const isEditing = !!editingEmployee;
        const updateField = (field: string, value: any) => {
          setEditingEmployee({ ...emp, [field]: value });
        };
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="border-b px-6 py-4 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-4">
                {emp.photo ? (
                  <img src={emp.photo} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-400">
                      {(emp.firstName || '').charAt(0)}{(emp.lastName || '').charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold">{emp.firstName} {emp.lastName}</h2>
                  <p className="text-sm text-gray-500">{emp.employeeId} • {emp.position} • {emp.department}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={updateEmployee}><Save className="h-4 w-4 mr-2" />Guardar</Button>
                    <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancelar</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { setEditingEmployee({ ...emp }); setSelectedEmployee(null); }}>
                      <Edit className="h-4 w-4 mr-2" />Editar
                    </Button>
                    <Button variant="ghost" onClick={() => setSelectedEmployee(null)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <ModalTabs emp={emp} isEditing={isEditing} updateField={updateField} showUploadMessage={showUploadMessage} />
          </div>
        </div>
        );
      })()}
    </div>
  );
}
