'use client';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { 
  Shield, 
  Users, 
  Building2, 
  Key, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Search
} from 'lucide-react';

export default function SuperAdminResolver() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionStatus, setActionStatus] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleQuickAction = async (action: string) => {
    setActionStatus(null);
    try {
      let endpoint = '';
      let method = 'POST';
      let body = {};

      switch (action) {
        case 'resetUserPassword':
          endpoint = '/api/admin/users/reset-password';
          break;
        case 'activateTenant':
          endpoint = '/api/admin/tenants/activate';
          break;
        case 'syncRoles':
          endpoint = '/api/admin/sync-roles';
          break;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setActionStatus({ type: 'success', text: `Acción ${action} completada` });
      } else {
        setActionStatus({ type: 'error', text: `Error en ${action}` });
      }
    } catch (error) {
      setActionStatus({ type: 'error', text: 'Error de conexión' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold">Super Admin - Resolutor de Problemas</h1>
            <p className="text-gray-600">Acceso completo para resolver cualquier problema en cualquier tenant</p>
          </div>
        </div>

        {actionStatus && (
          <div className={`p-4 rounded-lg ${
            actionStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {actionStatus.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription>
                Acciones rápidas sobre usuarios de cualquier tenant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="ID o email del usuario"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button 
                className="w-full gap-2"
                onClick={() => handleQuickAction('resetUserPassword')}
              >
                <Key className="h-4 w-4" />
                Resetear Contraseña
              </Button>
              <Button 
                variant="outline" 
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sincronizar Roles
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                Gestión de Tenants
              </CardTitle>
              <CardDescription>
                Acciones sobre tenants y sus configuraciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="ID del tenant"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button 
                className="w-full gap-2"
                onClick={() => handleQuickAction('activateTenant')}
              >
                <CheckCircle className="h-4 w-4" />
                Activar/Desactivar Tenant
              </Button>
              <Button 
                variant="outline" 
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reconstruir Tenant
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-600" />
                Herramientas Avanzadas
              </CardTitle>
              <CardDescription>
                Acciones del sistema y diagnóstico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full gap-2"
                onClick={() => handleQuickAction('syncRoles')}
              >
                <RefreshCw className="h-4 w-4" />
                Sync Todos los Roles
              </Button>
              <Button 
                variant="outline" 
                className="w-full gap-2"
              >
                <Search className="h-4 w-4" />
                Buscar Usuario Global
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas de Emergencia</CardTitle>
            <CardDescription>
              Herramientas para resolver problemas críticos inmediatamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button className="gap-2 bg-orange-600 hover:bg-orange-700">
                <AlertTriangle className="h-4 w-4" />
                Desbloquear Usuario
              </Button>
              <Button className="gap-2" variant="outline">
                <RefreshCw className="h-4 w-4" />
                Forzar Sync Base de Datos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}