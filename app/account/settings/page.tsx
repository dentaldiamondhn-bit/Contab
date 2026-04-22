'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase/standard-client';
import { SignOutButton } from '@clerk/nextjs';
import { 
  User, 
  Settings, 
  Mail, 
  Lock, 
  Save,
  Shield,
  Bell,
  Palette,
  Globe,
  LogOut,
  Camera,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
}

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }

      // Obtener perfil del usuario
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email || '',
        first_name: profile?.first_name || user.user_metadata?.first_name || '',
        last_name: profile?.last_name || user.user_metadata?.last_name || '',
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      };

      setProfile(userProfile);
      setFormData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        email: userProfile.email || ''
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Error al cargar el perfil del usuario');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Actualizar metadata del usuario en auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          full_name: `${formData.first_name} ${formData.last_name}`.trim()
        }
      });

      if (authError) throw authError;

      // Actualizar perfil en tabla users (si existe)
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          full_name: `${formData.first_name} ${formData.last_name}`.trim(),
          email: formData.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError) throw profileError;

      setSuccess('Perfil actualizado correctamente');
      await loadUserProfile();
    } catch (error: any) {
      setError(error.message || 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    try {
      setSaving(true);
      setError(null);

      if (passwordData.new_password !== passwordData.confirm_password) {
        setError('Las contraseñas nuevas no coinciden');
        setSaving(false);
        return;
      }

      if (passwordData.new_password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) throw error;

      setSuccess('Contraseña actualizada correctamente');
      setShowPasswordForm(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error: any) {
      setError(error.message || 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    // Clerk SignOutButton will handle the actual logout
    // The redirect will be handled by the afterSignOutUrl configuration
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen no puede superar 2MB');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Subir a Supabase Storage
      const fileName = `avatars/${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Actualizar avatar del usuario
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setSuccess('Avatar actualizado correctamente');
      await loadUserProfile();
    } catch (error: any) {
      setError(error.message || 'Error al subir avatar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurar Cuenta</h1>
          <p className="text-muted-foreground">
            Gestiona tu perfil y preferencias de usuario
          </p>
        </div>
        
        <SignOutButton>
          <Button variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </SignOutButton>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Perfil
            </CardTitle>
            <CardDescription>
              Actualiza tu información personal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 cursor-pointer hover:bg-blue-700">
                  <Camera className="h-3 w-3 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <p className="font-medium">{profile?.full_name || 'Usuario'}</p>
                <p className="text-sm text-gray-500">{profile?.email}</p>
                <Badge variant="outline" className="mt-1">
                  {profile?.last_sign_in_at 
                    ? `Último acceso: ${new Date(profile.last_sign_in_at).toLocaleDateString()}`
                    : 'Primer acceso'
                  }
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <Button onClick={saveProfile} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Gestiona tu contraseña y seguridad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showPasswordForm ? (
              <Button 
                variant="outline" 
                onClick={() => setShowPasswordForm(true)}
                className="w-full"
              >
                <Lock className="h-4 w-4 mr-2" />
                Cambiar Contraseña
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new_password">Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                      placeholder="Repite la nueva contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({
                        current_password: '',
                        new_password: '',
                        confirm_password: ''
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={changePassword} 
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Autenticación de Dos Factores</p>
                  <p className="text-sm text-gray-500">Aumenta la seguridad de tu cuenta</p>
                </div>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Preferencias
            </CardTitle>
            <CardDescription>
              Personaliza tu experiencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Modo Oscuro</p>
                <p className="text-sm text-gray-500">Reduce el cansancio visual</p>
              </div>
              <Button variant="outline" size="sm">
                <Palette className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Idioma</p>
                <p className="text-sm text-gray-500">Idioma de la interfaz</p>
              </div>
              <select className="px-3 py-2 border rounded-md">
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Zona Horaria</p>
                <p className="text-sm text-gray-500">Configuración de tiempo</p>
              </div>
              <select className="px-3 py-2 border rounded-md">
                <option value="America/Tegucigalpa">Hora Honduras</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura tus alertas y notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                <input
                  type="checkbox"
                  defaultChecked={true}
                />
                Notificaciones por correo electrónico
              </Label>
              <p className="text-sm text-gray-500 ml-6">
                Recibe alertas importantes en tu correo
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                <input
                  type="checkbox"
                  defaultChecked={true}
                />
                Alertas de vencimiento
              </Label>
              <p className="text-sm text-gray-500 ml-6">
                Notificaciones sobre CAIs por vencer
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                <input
                  type="checkbox"
                  defaultChecked={false}
                />
                Resumen semanal
              </Label>
              <p className="text-sm text-gray-500 ml-6">
                Resumen de actividad semanal
              </p>
            </div>

            <Button variant="outline" className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              Configurar Notificaciones
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
