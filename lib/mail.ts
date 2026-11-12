/**
 * Servicio de Notificaciones por Correo
 */
import { MODULE_NAMES as MODULES } from '@/lib/constants/modules';

const MODULE_NAMES: Record<string, string> = MODULES;

export async function sendModuleUpdateEmail(
  to: string, 
  businessName: string, 
  activeModuleIds: string[],
  dashboardUrl: string = 'https://contab.com/dashboard',
  planId: string = 'BASIC'
) { 
  console.log(`📧 Preparando notificación para ${to}...`);

  // HTML simple en lugar de componente React Email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Cambios en tu suscripción</h2>
      <p>Hola <strong>${businessName}</strong>,</p>
      <p>Se han actualizado los módulos activos en tu cuenta.</p>
      <p><strong>Módulos activos:</strong> ${activeModuleIds.join(', ')}</p>
      <p><strong>Plan:</strong> ${planId}</p>
      <p><a href="${dashboardUrl}" style="color: #0066cc;">Ir al dashboard</a></p>
      <hr>
      <small>Contab - Sistema de Contabilidad Profesional</small>
    </div>
  `;

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
