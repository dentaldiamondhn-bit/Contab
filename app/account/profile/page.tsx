'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Settings, 
  Shield, 
  Bell,
  Lock,
  Globe,
  CreditCard,
  LogOut,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  company: string;
  department: string;
  timezone: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
  two_factor_enabled: boolean;
  avatar_url: string;
  subscription_plan: string;
  api_access: boolean;
  is_active: boolean;
  email_verified: boolean;
  last_sign_in_at: string;
  created_at: string;
  updated_at: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogout = () => {
    router.push('/auth/login');
  };
  
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    department: '',
    timezone: 'America/Tegucigalpa',
    language: 'es',
    email_notifications: true,
    push_notifications: false
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Error al cargar perfil');
      }
      
      const data = await response.json();
      const user = data.user;
      
      setUserData(user);
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
        department: user.department || '',
        timezone: user.timezone || 'America/Tegucigalpa',
        language: user.language || 'es',
        email_notifications: user.email_notifications || false,
        push_notifications: user.push_notifications || false
      });
      
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      setMessage({ type: 'error', text: 'Error al cargar datos del perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar perfil');
      }

      const result = await response.json();
      console.log('Perfil actualizado:', result);
      
      // Recargar datos actualizados
      await loadUserProfile();
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });

    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al actualizar perfil' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (userData) {
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        company: userData.company || '',
        department: userData.department || '',
        timezone: userData.timezone || 'America/Tegucigalpa',
        language: userData.language || 'es',
        email_notifications: userData.email_notifications || false,
        push_notifications: userData.push_notifications || false
      });
    }
    setIsEditing(false);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No se pudo cargar el perfil</h3>
        <p className="text-gray-600">Intenta recargar la página</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurar Cuenta</h1>
          <p className="text-gray-600">Configuración de perfil y preferencias</p>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Editar Perfil
            </Button>
          )}
        </div>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Personal */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Tu información básica de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferencias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Preferencias
              </CardTitle>
              <CardDescription>
                Personaliza tu experiencia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <select
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    disabled={!isEditing}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="America/Tegucigalpa">America/Tegucigalpa</option>
                    <option value="America/Guatemala">America/Guatemala</option>
                    <option value="America/El_Salvador">America/El_Salvador</option>
                    <option value="America/Managua">America/Managua</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <select
                    id="language"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    disabled={!isEditing}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificaciones por Email</p>
                    <p className="text-sm text-gray-600">Recibe actualizaciones por correo</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.email_notifications}
                    onChange={(e) => setFormData({ ...formData, email_notifications: e.target.checked })}
                    disabled={!isEditing}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificaciones Push</p>
                    <p className="text-sm text-gray-600">Notificaciones en tiempo real</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.push_notifications}
                    onChange={(e) => setFormData({ ...formData, push_notifications: e.target.checked })}
                    disabled={!isEditing}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resumen del Usuario */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{userData.first_name} {userData.last_name}</p>
                  <p className="text-sm text-gray-600">{userData.role}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Miembro desde:</span>
                  <span>{new Date(userData.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Último login:</span>
                  <span>{userData.last_sign_in_at ? new Date(userData.last_sign_in_at).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {userData.subscription_plan}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="h-4 w-4 mr-2" />
                Facturación
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                API Access
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Notificaciones
              </Button>
              <SignOutButton>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </SignOutButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
