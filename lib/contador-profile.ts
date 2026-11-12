import { supabase } from '@/lib/supabase/standard-client';

export interface ContadorProfile {
  id: string;
  userId: string;
  numColegiacion: string;
  firmaUrl?: string;
  selloUrl?: string;
  cargo: string;
  telefonoProfesional?: string;
  nombreContador?: string;
  updatedAt: string;
  createdAt: string;
}

export async function getContadorProfile(userId?: string): Promise<ContadorProfile | null> {
  try {
    // Si no se proporciona userId, obtener el usuario autenticado
    let targetUserId = userId;
    
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      targetUserId = user.id;
    }

    const { data: profile, error } = await supabase
      .from('ContadorProfile')
      .select('*')
      .eq('userId', targetUserId)
      .single();

    if (error) {
      console.error('Error fetching contador profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error in getContadorProfile:', error);
    return null;
  }
}

export async function getCurrentUserContadorProfile(): Promise<ContadorProfile | null> {
  return getContadorProfile();
}

// Función para obtener el perfil del contador para uso en PDFs
export async function getContadorProfileForPDF(): Promise<ContadorProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('ContadorProfile')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (error) {
      console.error('Error fetching contador profile for PDF:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error in getContadorProfileForPDF:', error);
    return null;
  }
}

// Función para verificar si el usuario tiene perfil completo
export function isProfileComplete(profile: ContadorProfile | null): boolean {
  if (!profile) return false;
  
  return !!(
    profile.numColegiacion &&
    profile.firmaUrl &&
    profile.selloUrl &&
    profile.cargo
  );
}

// Función para obtener información formateada para PDF
export function getProfileForPDF(profile: ContadorProfile | null) {
  if (!profile) return null;
  
  return {
    numColegiacion: profile.numColegiacion,
    firmaUrl: profile.firmaUrl,
    selloUrl: profile.selloUrl,
    cargo: profile.cargo,
    nombreContador: profile.nombreContador || 'Contador Autorizado'
  };
}
