/**
 * Servicio de Notificaciones por Correo
 */
import { renderModuleUpdateEmail } from '@/emails';
import { MODULE_NAMES as MODULES } from '@/lib/constants/modules';

const MODULE_NAMES: Record<string, string> = MODULES;

export async function sendModuleUpdateEmail(
  to: string, 
  businessName: string, 
  activeModuleIds: string[],
  dashboardUrl: string = 'https://contab.com/dashboard',
  planId: string = 'BASIC'
) { // Agrega adminEmail si quieres mostrar quién hizo el cambio
  console.log(`📧 Preparando notificación para ${to}...`);

  // Renderiza el componente de React Email a HTML
  const html = renderModuleUpdateEmail({
    businessName,
    activeModuleIds,
    dashboardUrl,
    planId,
    // adminEmail: 'email-del-admin-que-hizo-el-cambio' // Pasa el email del admin si lo tienes
  });

  // Simulación de envío (Aquí conectarías con Resend/SendGrid/Nodemailer)
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: 'Contab <soporte@tu-dominio.com>', to, subject: 'Cambios en tu suscripción', html });

  console.log('✅ Notificación simulada enviada exitosamente');
  
  return {
    success: true,
    sentTo: to,
    timestamp: new Date().toISOString()
  };
}
