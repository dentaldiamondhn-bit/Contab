"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTenant } from "@/lib/contexts/TenantContext";
import { 
  UserPlus, 
  ArrowLeft, 
  Shield,
  Mail,
  User,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function SimpleCreateUserPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    role: "USER"
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateSecurePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTenant) {
      setError("No hay tenant seleccionado");
      return;
    }

    // Validaciones
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Por favor completa todos los campos requeridos");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("El email no es válido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/tenant/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          role: formData.role,
          tenantId: currentTenant.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Reset form
        setFormData({
          email: "",
          firstName: "",
          lastName: "",
          password: "",
          confirmPassword: "",
          role: "USER"
        });
      } else {
        setError(data.error || "Error al crear el usuario");
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

  if (success) {
    return (
      <div className="space-y-6 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Usuario Creado Exitosamente</h2>
            <p className="text-gray-600 mb-6">
              El usuario ha sido creado en el sistema y en Clerk
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-green-800 mb-2">Resumen del Usuario:</h4>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Nombre:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Rol:</strong> {formData.role}</p>
                <p><strong>Tenant:</strong> {currentTenant.businessName}</p>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/tenant-admin/users')}
                className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                Ver Lista de Usuarios
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    email: "",
                    firstName: "",
                    lastName: "",
                    password: "",
                    confirmPassword: "",
                    role: "USER"
                  });
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Crear Otro Usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/tenant-admin/users')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crear Nuevo Usuario</h1>
          <p className="text-gray-600">
            Agregar usuario a <span className="font-medium">{currentTenant.businessName}</span>
          </p>
        </div>
      </div>

      {/* Tenant Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3">
          <Building className="h-5 w-5 text-cyan-600" />
          <div>
            <p className="font-medium">{currentTenant.businessName}</p>
            <p className="text-sm text-gray-500">RTN: {currentTenant.businessRTN}</p>
          </div>
          <span className="ml-auto px-3 py-1 border border-gray-300 rounded-lg text-sm">
            Límite: {currentTenant.maxUsers || 'N/A'} usuarios
          </span>
        </div>
      </div>

      {/* Create User Form */}
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Información del Usuario
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              El usuario será creado tanto en el sistema local como en Clerk para autenticación
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="usuario@ejemplo.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Juan"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Pérez"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Rol *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="USER">Usuario</option>
                <option value="VIEWER">Visor</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Contraseña *
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    password: generateSecurePassword(),
                    confirmPassword: generateSecurePassword()
                  }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Generar
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Repite la contraseña"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Info Card */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-cyan-600 mt-0.5" />
                <div className="text-sm text-cyan-800">
                  <p className="font-medium mb-1">Información importante:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>El usuario será creado en Clerk para autenticación</li>
                    <li>Podrá acceder al sistema con su email y contraseña</li>
                    <li>El rol determinará sus permisos en el sistema</li>
                    <li>El usuario quedará asociado a este tenant</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Creando Usuario...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2 inline-block" />
                    Crear Usuario
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push('/tenant-admin/users')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
