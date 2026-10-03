import { Resend } from 'resend';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  /** True cuando no hay proveedor configurado (no se intentó enviar). */
  notConfigured?: boolean;
}

function fromAddress(): string {
  // "Facturacion <facturacion@tu-dominio.com>" o solo la dirección.
  return process.env.EMAIL_FROM || 'Facturación <onboarding@resend.dev>';
}

/**
 * Indica si hay un proveedor de correo utilizable. Permite que la UI muestre un
 * aviso claro en vez de un error generico al intentar enviar.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Envia un correo con adjuntos via Resend.
 *
 * No lanza excepciones: devuelve un resultado con `success: false` para que los
 * route handlers puedan responder con un 502 y un mensaje util.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  // Destinatario primero: es un error del llamador, no de la configuración.
  const to = String(params.to || '').trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { success: false, error: `Destinatario invalido: "${to}"` };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      notConfigured: true,
      error:
        'El envio de correo no esta configurado. Define RESEND_API_KEY en .env.local y EMAIL_FROM con el remitente verificado en Resend.',
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      attachments: params.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
      })),
    });

    if (error) {
      return { success: false, error: error.message || 'Resend rechazo el envio' };
    }
    return { success: true, id: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al enviar el correo';
    return { success: false, error: message };
  }
}
