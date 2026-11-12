/**
 * Servicio de Notificaciones por Correo
 */
import { MODULE_NAMES as MODULES } from '@/lib/constants/modules';

const MODULE_NAMES: Record<string, string> = MODULES;

export async function sendModuleUpdateEmail(
  to: string, 
  businessName: string, 
  activeModuleIds: string[]
) {
  console.log(`📧 Preparando notificación para ${to}...`);

  const moduleListHtml = activeModuleIds.length > 0
    ? `<ul>${activeModuleIds.map(id => `<li>${MODULE_NAMES[id] || id}</li>`).join('')}</ul>`
    : '<p><em>Ningún módulo activo actualmente.</em></p>';

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #2563eb;">Actualización de Suscripción</h2>
      <p>Estimado/a Administrador/a de <strong>${businessName}</strong>,</p>
      <p>Te informamos que un administrador del sistema ha actualizado la configuración de tus módulos en <strong>Contab</strong>.</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 16px;">Módulos habilitados ahora:</h3>
        ${moduleListHtml}
      </div>
      <p>Si tienes alguna duda sobre estos cambios, por favor contacta a nuestro equipo de soporte.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666; text-align: center;">
        Este es un correo automático, por favor no respondas a este mensaje.
      </p>
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