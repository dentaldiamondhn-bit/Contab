// Utilidades para manejo de fechas con timezone de Honduras

export const HONDURAS_TIMEZONE = 'America/Tegucigalpa';

/**
 * Convierte una fecha string a objeto Date manejando UTC correctamente
 * @param date - Fecha en formato string o Date
 * @returns objeto Date
 */
function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  
  if (typeof date === 'string') {
    // Si ya es YYYY-MM-DD, crear fecha sin conversión de timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    // Para otros formatos, usar constructor normal
    return new Date(date);
  }
  
  return date;
}

/**
 * Formatea una fecha para inputs de tipo date (YYYY-MM-DD)
 * @param date - Fecha en formato string o Date
 * @returns string en formato YYYY-MM-DD
 */
export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const dateObj = parseDate(date);
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  
  // Para inputs de tipo date, necesitamos el formato YYYY-MM-DD sin conversión de timezone
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha para mostrar en español (Honduras)
 * @param date - Fecha en formato string o Date
 * @returns string en formato local (ej: "7 abr 2026")
 */
export function formatDateForDisplay(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const dateObj = parseDate(date);
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('es-HN', {
    timeZone: HONDURAS_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Formatea un rango de fechas para mostrar
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin (opcional)
 * @returns string formateado
 */
export function formatDateRange(startDate: string | Date | null | undefined, endDate?: string | Date | null | undefined): string {
  const start = formatDateForDisplay(startDate);
  if (!start) return '';
  
  if (!endDate) return start;
  
  const end = formatDateForDisplay(endDate);
  return end ? `${start} - ${end}` : start;
}

/**
 * Verifica si una fecha ha expirado
 * @param endDate - Fecha de finalización
 * @returns boolean
 */
export function isDateExpired(endDate: string | Date | null | undefined): boolean {
  if (!endDate) return false;
  
  const dateObj = parseDate(endDate);
  if (!dateObj || isNaN(dateObj.getTime())) return false;
  
  // Obtener fecha actual
  const now = new Date();
  
  // Comparar sin considerar horas (solo fecha)
  const endWithoutTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const nowWithoutTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return endWithoutTime < nowWithoutTime;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD para inputs
 * @returns string en formato YYYY-MM-DD
 */
export function getCurrentDateForInput(): string {
  return formatDateForInput(new Date());
}

/**
 * Convierte fecha de input a formato ISO para base de datos
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns string en formato ISO o null
 */
export function inputDateToISO(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  
  const date = new Date(dateString + 'T00:00:00');
  
  if (isNaN(date.getTime())) return null;
  
  return date.toISOString();
}
