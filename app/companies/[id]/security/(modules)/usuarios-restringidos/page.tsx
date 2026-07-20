'use client';

import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import YearSelector from '../../components/YearSelector';
import { 
  Users,
  Shield,
  Ban,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Key,
  Timer,
  CalendarDays,
  FileText
} from 'lucide-react';
import { useState } from 'react';

interface UsuariosRestringidosPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface UsuarioRestringido {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: 'activo' | 'suspendido' | 'bloqueado';
  motivo: string;
  fechaSuspension: string;
  usuarioQueSuspendio: string;
  tiempoRestante?: string;
  intentosFallidos: number;
}

const datosUsuarios: Record<string, UsuarioRestringido[]> = {
  '2026': [
    { 
      id: '1', 
      nombre: 'Juan Pérez', 
      email: 'juan@diamond.com', 
      rol: 'Recepción', 
      estado: 'suspendido', 
      motivo: 'Múltiples intentos fallidos de acceso', 
      fechaSuspension: '2026-04-08',
      usuarioQueSuspendio: 'admin@diamond.com',
      tiempoRestante: '5 días',
      intentosFallidos: 5
    },
    { 
      id: '2', 
      nombre: 'María Gómez', 
      email: 'maria@diamond.com', 
      rol: 'Auxiliar', 
      estado: 'bloqueado', 
      motivo: 'Acceso fuera de horario laboral', 
      fechaSuspension: '2026-04-05',
      usuarioQueSuspendio: 'admin@diamond.com',
      intentosFallidos: 3
    },
  ]
};

export default function UsuariosRestringidosPage({ params }: UsuariosRestringidosPageProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [usuarios, setUsuarios] = useState<UsuarioRestringido[]>(datosUsuarios['2026'] || []);

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
    setUsuarios(datosUsuarios[anio as keyof typeof datosUsuarios] || []);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-600';
      case 'suspendido': return 'bg-yellow-600';
      case 'bloqueado': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'activo': return <CheckCircle className="h-4 w-4" />;
      case 'suspendido': return <Timer className="h-4 w-4" />;
      case 'bloqueado': return <Ban className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            Usuarios con Acceso Restringido - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Gestión y monitoreo de usuarios con restricciones de acceso al sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearSelector 
            onYearChange={handleAnioChange}
            selectedYear={anioSeleccionado}
            badgeText="Usuarios Restringidos"
          />
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Restricción
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{usuarios.length}</p>
            <p className="text-xs text-gray-600">Total Restringidos</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Timer className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {usuarios.filter(u => u.estado === 'suspendido').length}
            </p>
            <p className="text-xs text-gray-600">Suspendidos</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {usuarios.filter(u => u.estado === 'bloqueado').length}
            </p>
            <p className="text-xs text-gray-600">Bloqueados</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {usuarios.reduce((acc, u) => acc + u.intentosFallidos, 0)}
            </p>
            <p className="text-xs text-gray-600">Intentos Fallidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuarios Restringidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-600" />
            Lista de Usuarios con Acceso Restringido
          </CardTitle>
          <CardDescription>
            Usuarios que tienen limitaciones o prohibiciones de acceso al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsuarios.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No hay usuarios restringidos</p>
              <p className="text-sm text-gray-500 mt-1">
                Todos los usuarios tienen acceso normal al sistema
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsuarios.map((usuario) => (
                <div key={usuario.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{usuario.nombre}</h3>
                          <p className="text-sm text-gray-500">{usuario.email}</p>
                        </div>
                        <Badge className={`${getEstadoColor(usuario.estado)} text-white ml-auto`}>
                          <span className="flex items-center gap-1">
                            {getEstadoIcon(usuario.estado)}
                            {usuario.estado}
                          </span>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-500">Rol</p>
                          <p className="font-medium">{usuario.rol}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Motivo de Restricción</p>
                          <p className="font-medium">{usuario.motivo}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Fecha de Suspensión</p>
                          <p className="font-medium">{usuario.fechaSuspension}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>Suspendido por: {usuario.usuarioQueSuspendio}</span>
                        {usuario.tiempoRestante && (
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            Tiempo restante: {usuario.tiempoRestante}
                          </span>
                        )}
                        <span>Intentos fallidos: {usuario.intentosFallidos}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Habilitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración de Restricciones */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-purple-600" />
            Configuración de Restricciones de Acceso
          </CardTitle>
          <CardDescription>
            Parámetros para la gestión automática de accesos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4 text-purple-600" />
                  <p className="font-medium">Intentos Fallidos Máximos</p>
                </div>
                <p className="text-sm text-gray-600">
                  5 intentos fallidos consecutivos = suspensión temporal (24 horas)
                </p>
                <Badge className="mt-2 bg-purple-600">Configurado</Badge>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <p className="font-medium">Horario Laboral</p>
                </div>
                <p className="text-sm text-gray-600">
                  Lunes a Viernes: 8:00 AM - 6:00 PM
                </p>
                <Badge className="mt-2 bg-purple-600">Activo</Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-purple-600" />
                  <p className="font-medium">Alertas de Seguridad</p>
                </div>
                <p className="text-sm text-gray-600">
                  Notificación automática al admin por intentos fallidos
                </p>
                <Badge className="mt-2 bg-purple-600">Habilitado</Badge>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <p className="font-medium">Bitácora de Acciones</p>
                </div>
                <p className="text-sm text-gray-600">
                  Registro completo de habilitaciones y suspensiones
                </p>
                <Badge className="mt-2 bg-purple-600">Disponible</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}