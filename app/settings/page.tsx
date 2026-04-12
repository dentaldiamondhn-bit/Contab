'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, User, FileImage, Stamp } from 'lucide-react';
import { supabase } from '@/lib/supabase/standard-client';

interface ContadorProfile {
  id: string;
  userId: string;
  numColegiacion: string;
  firmaUrl?: string;
  selloUrl?: string;
  cargo: string;
  telefonoProfesional?: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ContadorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'firma' | 'sello' | null>(null);
  const [formData, setFormData] = useState({
    numColegiacion: '',
    cargo: 'Contador General',
    telefonoProfesional: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('ContadorProfile')
        .select('*')
        .eq('userId', user.id)
        .single();

      if (profile) {
        setProfile(profile);
        setFormData({
          numColegiacion: profile.numColegiacion,
          cargo: profile.cargo,
          telefonoProfesional: profile.telefonoProfesional || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'firma' | 'sello') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Usuario no autenticado');
        return;
      }

      setUploading(type);

      // Validar tipo de archivo
      if (!file.type.includes('image/')) {
        alert('Solo se permiten archivos de imagen');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo no puede superar 5MB');
        return;
      }

      // Subir a Supabase Storage
      const fileName = `${user.id}/${type}-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contador-profiles')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('contador-profiles')
        .getPublicUrl(fileName);

      // Actualizar perfil en la base de datos
      const updateData = type === 'firma' 
        ? { firmaUrl: publicUrl }
        : { selloUrl: publicUrl };

      const { error: updateError } = await supabase
        .from('ContadorProfile')
        .upsert({
          userId: user.id,
          ...updateData,
          updatedAt: new Date().toISOString()
        }, {
          onConflict: 'userId'
        });

      if (updateError) {
        throw updateError;
      }

      alert(`${type === 'firma' ? 'Firma' : 'Sello'} subido correctamente`);
      await loadProfile(); // Recargar perfil

    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Error al subir ${type === 'firma' ? 'la firma' : 'el sello'}`);
    } finally {
      setUploading(null);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Usuario no autenticado');
        return;
      }

      const { error } = await supabase
        .from('ContadorProfile')
        .upsert({
          userId: user.id,
          numColegiacion: formData.numColegiacion,
          cargo: formData.cargo,
          telefonoProfesional: formData.telefonoProfesional,
          updatedAt: new Date().toISOString()
        }, {
          onConflict: 'userId'
        });

      if (error) throw error;

      alert('Perfil actualizado correctamente');
      await loadProfile();

    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error al actualizar el perfil');
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
      <div className="flex items-center gap-3">
        <User className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Ajustes de Perfil</h1>
          <p className="text-muted-foreground">
            Configura tu información profesional y sube tu firma y sello digital
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información Profesional */}
        <Card>
          <CardHeader>
            <CardTitle>Información Profesional</CardTitle>
            <CardDescription>
              Datos de tu colegiación y contacto profesional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <Label htmlFor="numColegiacion">Número de Colegiación</Label>
                <Input
                  id="numColegiacion"
                  placeholder="Ej: CAH-12345"
                  value={formData.numColegiacion}
                  onChange={(e) => setFormData(prev => ({ ...prev, numColegiacion: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="telefonoProfesional">Teléfono Profesional</Label>
                <Input
                  id="telefonoProfesional"
                  placeholder="+504 1234-5678"
                  value={formData.telefonoProfesional}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefonoProfesional: e.target.value }))}
                />
              </div>

              <Button type="submit" className="w-full">
                Guardar Información
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Firma Digital */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              Firma Digital
            </CardTitle>
            <CardDescription>
              Sube tu firma profesional (PNG con fondo transparente)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.firmaUrl && (
              <div className="border rounded-lg p-4">
                <img 
                  src={profile.firmaUrl} 
                  alt="Firma profesional" 
                  className="max-h-32 mx-auto"
                />
                <Badge variant="outline" className="mt-2 w-full justify-center">
                  Firma actual
                </Badge>
              </div>
            )}
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                accept="image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'firma');
                }}
                className="hidden"
                id="firma-upload"
              />
              <label htmlFor="firma-upload" className="cursor-pointer">
                <div className="text-sm text-gray-600">
                  {uploading === 'firma' ? 'Subiendo...' : 'Click para subir o arrastra aquí'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  PNG, máximo 5MB
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Sello Profesional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stamp className="h-5 w-5" />
              Sello Profesional
            </CardTitle>
            <CardDescription>
              Sube tu sello profesional (PNG)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.selloUrl && (
              <div className="border rounded-lg p-4">
                <img 
                  src={profile.selloUrl} 
                  alt="Sello profesional" 
                  className="max-h-32 mx-auto"
                />
                <Badge variant="outline" className="mt-2 w-full justify-center">
                  Sello actual
                </Badge>
              </div>
            )}
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                accept="image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'sello');
                }}
                className="hidden"
                id="sello-upload"
              />
              <label htmlFor="sello-upload" className="cursor-pointer">
                <div className="text-sm text-gray-600">
                  {uploading === 'sello' ? 'Subiendo...' : 'Click para subir o arrastra aquí'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  PNG, máximo 5MB
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
