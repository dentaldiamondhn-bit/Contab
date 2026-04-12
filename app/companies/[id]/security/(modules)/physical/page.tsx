'use client';

import { use } from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import YearSelector from '../../components/YearSelector';
import { 
  Lock,
  Video,
  AlertTriangle,
  Trash2,
  CheckCircle
} from 'lucide-react';

interface PhysicalSecurityPageProps {
  params: Promise<{
    id: string;
  }>;
}

const allPhysicalSecurityItems = [
  {
    icon: Lock,
    title: 'Control de Acceso Inteligente',
    description: 'Cerraduras inteligentes con códigos temporales o tarjetas magnéticas',
    items: [
      'Evitar llaves tradicionales duplicables',
      'Programar horarios específicos por dentistas (ej: 2:00 PM a 10:00 PM)',
      'Códigos temporales que expiran automáticamente',
      'Registro de entradas y salidas en tiempo real'
    ],
    healthOnly: false
  },
  {
    icon: Video,
    title: 'Sistema de CCTV',
    description: 'Circuito cerrado en áreas comunes para seguridad',
    items: [
      'Cámaras en recepción y pasillos',
      'Esterilización bajo supervisión visual',
      'Puntos de entrada de cubículos (exterior)',
      'NUNCA dentro de cubículos (privacidad del paciente)',
      'Almacenamiento de grabaciones por 30 días'
    ],
    healthOnly: false
  },
  {
    icon: AlertTriangle,
    title: 'Protocolo de Bioseguridad',
    description: 'Manual estricto de desinfección entre turnos',
    items: [
      'Checklist de limpieza obligatorio entre citas',
      'Penalización contractual por entrega de espacio sucio',
      'Verificación visual por personal de limpieza',
      'Registro fotográfico de áreas desinfectadas',
      'Auditorías sorpresa semanales'
    ],
    healthOnly: true
  },
  {
    icon: Trash2,
    title: 'Manejo de RPBI',
    description: 'Residuos Peligrosos Biológicos e Infecciosos',
    items: [
      'Área segura bajo llave para almacenamiento',
      'Contenedores diferenciados por tipo de residuo',
      'Registro de generación y disposición',
      'Contrato con empresa recolectora autorizada',
      'Etiquetado claro con símbolos de riesgo biológico'
    ],
    healthOnly: true
  }
];

export default function PhysicalSecurityPage({ params }: PhysicalSecurityPageProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
  };
  
  // TODO: Aquí deberías obtener el tipo de empresa desde tu base de datos
  // Por ahora, vamos a simular que las empresas de salud tienen IDs que contienen "health" o "medical"
  // o puedes agregar un campo "type" a tu tabla de companies
  const isHealthCompany = companyId.includes('health') || companyId.includes('medical') || companyId.includes('dental');
  
  // Filtrar elementos según el tipo de empresa
  const physicalSecurityItems = allPhysicalSecurityItems.filter(item => 
    !item.healthOnly || isHealthCompany
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-600" />
            Seguridad Física y Bioseguridad - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {anioSeleccionado === '2026' 
              ? `Garantizar un entorno seguro para ${isHealthCompany ? 'profesionales de salud y pacientes' : 'empleados y clientes'}`
              : `Histórico de seguridad física del año ${anioSeleccionado}`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearSelector 
            onYearChange={handleAnioChange}
            selectedYear={anioSeleccionado}
            badgeText={anioSeleccionado === '2026' ? 'Año Actual' : `Histórico ${anioSeleccionado}`}
          />
          <Badge variant="default" className="bg-green-600">Activo</Badge>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {physicalSecurityItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Icon className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {item.items.map((subItem, subIndex) => (
                    <li key={subIndex} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{subItem}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert Card */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Recordatorio Importante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700 text-sm">
            Como arrendador, eres responsable de garantizar la seguridad del entorno. 
            Cualquier incidente por negligencia en estos protocolos puede resultar en 
            responsabilidad legal para Dental Diamond. Mantén registros actualizados de 
            todas las auditorías de seguridad.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
