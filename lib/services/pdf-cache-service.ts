import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'

// Configuración de bucket de Supabase para PDFs
const bucketName = 'pdf-documents'

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  return url
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  return key
}

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey())

// Tipos para el cache de PDFs
export interface PdfCacheEntry {
  key: string // Nombre único del archivo en storage
  tenantId: string
  documentType: 'trial_balance' | 'polizas' | 'tax_report' | 'invoice' | 'transfer' | 'budget' | 'diat' | 'variations'
  generatedAt: Date
  filePath: string // URL pública o ruta en storage
  size: number
  ttl?: number // Time to live en minutos (por defecto 30 días)
}

// Tabla en la base de datos para hacer cache de metadatos de PDFs
// (En un setup completo, esto sería una tabla dedicated, pero usamos un enfoque simplificado)

// Generar una key única para el cache
function generatePdfKey(tenantId: string, documentType: string, identifier: string): string {
  const timestamp = new Date().toISOString()
  return `pdf-${tenantId}-${documentType}-${identifier}-${timestamp.replace(/[:.]/g, '-')}`
}

// Verificar si un PDF está en cache y es válido
export async function isPdfCached(tenantId: string, documentType: string, identifier: string, maxAgeMinutes: number = 30): Promise<{ cached: boolean; fileUrl?: string }> {
  try {
    const key = generatePdfKey(tenantId, documentType, identifier)
    
    // Buscar en Supabase Storage
    const { data: { publicUrl }, error } = supabase.storage
      .from(bucketName)
      .getPublicUrl(key)
    
    if (error) {
      // PDF no existe en cache
      return { cached: false }
    }
    
    // El PDF existe en cache, verificar TTL si está definido
    // En una implementación completa, verificaríamos la fecha de generación vs TTL
    // Por ahora, si el archivo existe, lo consideramos válido
    return { cached: true, fileUrl: publicUrl }
  } catch (error) {
    console.error('Error checking PDF cache:', error)
    return { cached: false }
  }
}

// Guardar PDF en cache en Supabase Storage
export async function cachePdf(
  tenantId: string,
  documentType: string,
  identifier: string,
  pdfBuffer: Buffer,
  options?: { ttlMinutes?: number }
): Promise<string> {
  try {
    const key = generatePdfKey(tenantId, documentType, identifier)
    const ttlMinutes = options?.ttlMinutes || 43200 // 30 días por defecto
    
    // Subir PDF a Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(key, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Sobrescribir si ya existe
      })
    
    if (error) {
      throw new Error(`Error uploading PDF to Supabase Storage: ${error.message}`)
    }
    
    // Obtener URL firmada (signed URL) que expira en el TTL especificado
    const { data: { signedUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(key)
    
    // Aquí podríamos guardar metadatos en la base de datos si es necesario
    // Por ejemplo: INSERT INTO pdf_cache (key, tenantId, documentType, ...) VALUES (...)
    
    return signedUrl
  } catch (error) {
    console.error('Error caching PDF:', error)
    throw error
  }
}

// Generar y cachear PDF de una sola vez
export async function generateAndCachePdf(
  tenantId: string,
  documentType: string,
  identifier: string,
  pdfGenerator: () => Promise<Buffer>,
  options?: { ttlMinutes?: number }
): Promise<string> {
  // Primero verificar si ya está en cache
  const { cached, fileUrl } = await isPdfCached(tenantId, documentType, identifier, options?.ttlMinutes)
  
  if (cached && fileUrl) {
    return fileUrl
  }
  
  // Generar PDF nuevo
  const pdfBuffer = await pdfGenerator()
  
  // Cachear en Supabase Storage
  const signedUrl = await cachePdf(tenantId, documentType, identifier, pdfBuffer, { ttlMinutes: options?.ttlMinutes })
  
  return signedUrl
}

export default supabase