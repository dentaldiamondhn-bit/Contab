import webpush from 'web-push';
import { supabase } from './supabase-db';

// Configuración de llaves VAPID (Debes generarlas con npx web-push generate-vapid-keys)
webpush.setVapidDetails(
  'mailto:soporte@contab.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToTenantUsers(tenantId: string, payload: PushPayload) {
  console.log(`🚀 Iniciando envío de push para el tenant: ${tenantId}`);

  // 1. Obtener todas las suscripciones activas para este tenant
  const { data: subscriptions, error } = await supabase
    .from('PushSubscription')
    .select('subscription')
    .eq('tenantId', tenantId);

  if (error || !subscriptions) {
    console.error('❌ Error obteniendo suscripciones push:', error);
    return;
  }

  const notifications = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        sub.subscription as any,
        JSON.stringify(payload)
      );
    } catch (err: any) {
      // Si la suscripción ha expirado o es inválida, deberíamos borrarla
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log('🗑️ Eliminando suscripción push expirada');
        await supabase
          .from('PushSubscription')
          .delete()
          .match({ subscription: sub.subscription });
      }
    }
  });

  await Promise.allSettled(notifications);
  console.log(`✅ Proceso de notificaciones push finalizado para ${subscriptions.length} dispositivos`);
}