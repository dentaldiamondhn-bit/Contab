import { db } from '@/lib/db';
import { processAuditOutbox } from '@/lib/services/audit-service';

/**
 * Script para procesar el outbox de auditoría
 * Este script debe ejecutarse como un job background (cron job, worker, etc.)
 * 
 * Ejemplo de uso:
 *   node scripts/process-audit-outbox.js
 * 
 * En producción, esto se ejecutaría periódicamente mediante:
 * - Cron job en el servidor
 * - Cola de trabajo (Bull, RabbitMQ, etc.)
 * - Serverless function programable
 */

async function processOutbox() {
  console.log('Starting audit outbox processing...');
  
  try {
    const { processed, failed } = await processAuditOutbox(db, 100);
    
    console.log(`Outbox processing complete:`);
    console.log(`  - Processed: ${processed}`);
    console.log(`  - Failed: ${failed}`);
    
    if (failed > 0) {
      console.error(`${failed} audit outbox entries failed to process`);
      process.exit(1);
    }
    
    console.log('Audit outbox processing finished successfully');
  } catch (error) {
    console.error('Error processing audit outbox:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  processOutbox();
}

export { processOutbox };