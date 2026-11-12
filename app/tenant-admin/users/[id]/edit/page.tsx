"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Shield,
  Mail,
  User,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save
} from "lucide-react";

export default function EditTenantUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "USER",
    isActive: true
  });

  // Obtener el ID del usuario de los params usando React.use()
  const { id: userId } = use(params);

  // Verificar rol y redirigir si no es admin de tenant
  useEffect(() => {
    if (user) {
      const userRole = user.publicMetadata?.role;
      
      // Permitir acceso a ADMIN, MANAGER, y SUPER_ADMIN
      if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole as string)) {
        router.replace('/dashboard');
      }
    }
  }, [user, router]);

  // Cargar datos del usuario
  useEffect(() => {
    if (userId && currentTenant) {
      fetchUser();
    }
  }, [userId, currentTenant]);

  const fetchUser = async () => {
    if (!userId || !currentTenant) return;
    
    try {
      setUserLoading(true);
      const response = await fetch(`/api/tenant/users?tenantId=${currentTenant.id}`);
      
      if (response.ok) {
        const data = await response.json();
        const user = data.users.find((u: any) => u.id === userId);
        
        if (user) {
          setTargetUser(user);
          setFormData({
            email: user.email,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            role: user.role,
            isActive: user.isActive
          });
        } else {
          setError("Usuario no encontrado");
        }
      } else {
        setError("Error al cargar el usuario");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    } finally {
      setUserLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTenant || !targetUser) {
      setError("No hay tenant o usuario seleccionado");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/tenant/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUser.id,
          action: 'update_user',
          userData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role,
            isActive: formData.isActive
          }
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Actualizar los datos locales
        setTargetUser(prev => ({
          ...prev,
          ...formData
        }));
      } else {
        setError(data.error || "Error al actualizar el usuario");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se verifica el rol
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Usuario no encontrado...</p>
        </div>
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">No hay tenant seleccionado</p>
        </div>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuario...</p>
        </div>
      </div>
    );
  }

  if (!targetUser && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Usuario no encontrado</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Usuario Actualizado Exitosamente</CardTitle>
            <CardDescription>
              Los cambios han sido guardados correctamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Resumen del Usuario:</h4>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Nombre:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Rol:</strong> {formData.role}</p>
                <p><strong>Estado:</strong> {formData.isActive ? 'Activo' : 'Inactivo'}</p>
                <p><strong>Tenant:</strong> {currentTenant.businessName}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => router.push('/tenant-admin/users')}>
                Volver a Usuarios
              </Button>
              <Button variant="outline" onClick={() => setSuccess(false)}>
                Continuar Editando
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/tenant-admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Usuario</h1>
          <p className="text-gray-600">
            Modificar usuario de <span className="font-medium">{currentTenant.businessName}</span>
          </p>
        </div>
      </div>

      {/* Tenant Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-cyan-600" />
            <div>
              <p className="font-medium">{currentTenant.businessName}</p>
              <p className="text-sm text-gray-500">RTN: {currentTenant.businessRTN}</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              Tenant Activo
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Form */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Usuario
          </CardTitle>
          <CardDescription>
            Modifica los datos del usuario. Los cambios se sincronizarán con Clerk si es necesario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (readonly) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                readOnly
                className="bg-gray-100"
                placeholder="usuario@ejemplo.com"
              />
              <p className="text-xs text-gray-500">El email no se puede modificar</p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Juan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Pérez"
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Rol
              </Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuario</SelectItem>
                  <SelectItem value="VIEWER">Visor</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
              />
              <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Usuario activo
              </Label>
            </div>

            {/* Info Card */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-cyan-600 mt-0.5" />
                <div className="text-sm text-cyan-800">
                  <p className="font-medium mb-1">Información importante:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>El email no se puede modificar</li>
                    <li>El rol determina los permisos del usuario en el sistema</li>
                    <li>Los usuarios inactivos no podrán acceder al sistema</li>
                    <li>Los cambios se aplicarán inmediatamente</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando Cambios...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/tenant-admin/users')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
