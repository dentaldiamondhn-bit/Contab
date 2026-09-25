/**
 * Script de backfill de company_id para tenants multi-empresa
 * 
 * Propósito: Completar el campo company_id en tablas de la migración 012
 * basándose en la relación tenant-empresa.
 * 
 * ADVERTENCIA: Este script está diseñado como DOCUMENTACIÓN/INSTRUCCIÓN.
 * NO debe ejecutarse directamente en producción sin revisión y adaptación.
 * Ver FASE 5 requirements antes de uso.
 */

// Tipo de imports típicos para scripts Node.js que interactúan con Supabase/Prisma
// const { createClient } = require('@supabase/supabase-js');
// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();
// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Lista de tablas y columnas afectadas por la migración 012 (se lee automáticamente)
// Consultar: scripts/migrations/012_ADD_COMPANY_ID_TO_MULTI_TENANT_TABLES.sql
//
// Tablas afectadas y columnas:
// 1. "Invoice" -> company_id
// 2. "Transaction" -> company_id
// 3. "JournalEntry" -> company_id
// 4. "Account" -> company_id
// 5. "InvoiceItem" -> company_id
// 6. "InvoicePayment" -> company_id
// 7. "InvoiceNote" -> company_id
// 8. "User" -> company_id
// 9. "BankAccount" -> company_id
// 10. "Product" -> company_id
// 11. "SalesConfig" -> company_id

/**
 * Obtiene las empresas asociadas a un tenant
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<Array<{id, name, tenant_id}>}> - Lista de empresas
 */
async function getCompaniesByTenant(tenantId) {
  // return await prisma.companies.findMany({
  //   where: { tenant_id: tenantId }
  // });
  // Placeholder para documentación
  return [];
}

/**
 * Verifica si un tenant tiene una sola empresa o varias
 * @param {string} tenantId - ID del tenant
 * @returns {Promise<'single' | 'multiple'>} - Tipo de configuración
 */
async function checkTenantCompanyCount(tenantId) {
  const companies = await getCompaniesByTenant(tenantId);
  return companies.length === 1 ? 'single' : 'multiple';
}

/**
 * Realiza el backfill de company_id para tables de la migración 012
 * cuando un tenant tiene UNA sola empresa.
 * 
 * Lógica:
 * - Si el tenant tiene 1 company: asignar company_id automáticamente
 *   usando la relación tenant_id → company_id de la tabla companies
 * - Si el tenant tiene MÁS de 1 company: NO asignar automáticamente,
 *   generar reporte de filas ambiguas para asignación manual
 * 
 * @param {Object} options - Opciones del script
 * @param {string} options.tenantId - ID del tenant (opcional, para procesar todos)
 * @param {boolean} options.force - Forzar procesamiento incluso con múltiples empresas
 * @returns {Promise<Object>} - Resultados del backfill
 */
async function backfillCompanyId({ tenantId, force }) {
  console.log('🔄 Iniciando backfill de company_id...\n');

  const companies = await getCompaniesByTenant(tenantId);
  const companyCount = companies.length;

  if (companyCount === 0) {
    console.log('⚠️ No se encontraron empresas para este tenant. Verificar configuración.');
    return { status: 'no_companies', affectedRows: 0 };
  }

  if (companyCount === 1 && !force) {
    // CASO 1: Tenant con UNA sola empresa - Asignar company_id automáticamente
    const company = companies[0];
    const companyId = company.id;

    console.log(`✅ Tenant con 1 empresa detectada: ${company.name} (${companyId})`);
    console.log('📋 Actualizando company_id en tablas de la migración 012...\n');

    // Tablas y columnas de la migración 012 (consultar 012_ADD_COMPANY_ID_TO_MULTI_TENANT_TABLES.sql)
    const tables = [
      { table: '"Invoice"', column: 'company_id', tenantColumn: 'tenantId' },
      { table: '"Transaction"', column: 'company_id', tenantColumn: 'tenantid' },
      { table: '"JournalEntry"', column: 'company_id', tenantColumn: 'tenantId' },
      { table: '"Account"', column: 'company_id', tenantColumn: 'tenantId' },
      { table: '"InvoiceItem"', column: 'company_id' },
      { table: '"InvoicePayment"', column: 'company_id' },
      { table: '"InvoiceNote"', column: 'company_id' },
      { table: '"User"', column: 'company_id', tenantColumn: 'tenantid' },
      { table: '"BankAccount"', column: 'company_id', tenantColumn: 'tenantid' },
      { table: '"Product"', column: 'company_id', tenantColumn: 'tenant_id' },
      { table: '"SalesConfig"', column: 'company_id', tenantColumn: 'tenant_id' }
    ];

    let totalAffected = 0;

    for (const { table, column, tenantColumn } of tables) {
      // Ejemplo de update SQL (adaptar según BD real):
      // UPDATE ${table} SET ${column} = ${companyId}
      // WHERE ${tenantColumn} = ${tenantCompany.tenant_id}
      //   AND ${column} IS NULL;

      // En ejecución real usaríamos supabase o prisma:
      // const { error } = await supabase
      //   .from(table.replace('"', '').replace('"', ''))
      //   .update({ [column]: companyId })
      //   .eq(tenantColumn, tenantId)
      //   .is([column]: null);

      // Por ahora, documentamos qué se haría:
      const affected = 0; // COUNT real en ejecución
      totalAffected += affected;

      console.log(`  📊 ${table}: ${affected} filas actualizadas con company_id = ${companyId}`);
    }

    console.log(`\n✅ Backfill completado. Total de filas afectadas: ${totalAffected}`);
    return { status: 'single_company_success', affectedRows: totalAffected };

  } else if (companyCount > 1 && !force) {
    // CASO 2: Tenant con MÁS DE UNA empresa - NO asignar automáticamente
    console.log(`⚠️ Tenant con ${companyCount} empresas detectado(s)`);
    console.log('🚫 No se asignará company_id automáticamente (quedará NULL)`);
    console.log('📝 Generando reporte de filas ambiguas para asignación manual...\n');

    // Generar reporte de filas que necesitan asignación manual
    // Esto identifica todas las filas con company_id IS NULL en las tables de la migración 012
    const tables = [
      { table: '"Invoice"', column: 'company_id', tenantColumn: 'tenantId' },
      { table: '"Transaction"', column: 'company_id', tenantColumn: 'tenantid' },
      { table: '"JournalEntry"', column: 'company_id', tenantColumn: 'tenantId' },
      { table: '"Account"', column: 'company_id', tenantColumn: 'tenantId' },
      { table: '"InvoiceItem"', column: 'company_id' },
      { table: '"InvoicePayment"', column: 'company_id' },
      { table: '"InvoiceNote"', column: 'company_id' },
      { table: '"User"', column: 'company_id', tenantColumn: 'tenantid' },
      { table: '"BankAccount"', column: 'company_id', tenantColumn: 'tenantid' },
      { table: '"Product"', column: 'company_id', tenantColumn: 'tenant_id' },
      { table: '"SalesConfig"', column: 'company_id', tenantColumn: 'tenant_id' }
    ];

    console.log('📊 Reporte de filas ambiguas (company_id IS NULL) por tabla:\n');

    for (const { table, column } of tables) {
      // const { count, error } = await supabase
      //   .from(table.replace('"', '').replace('"', ''))
      //   .select(column, { count: 'exact', headless: true })
      //   .is(column, null);

      // Por documentación:
      const nullCount = 0; // COUNT real en ejecución
      if (nullCount > 0) {
        console.log(`  ${table}: ${nullCount} filas con company_id IS NULL`);
      }
    }

    console.log('\n🔍 Para asignación manual, revisar cada fila y asignar el company_id');
    console   `   correspondiente según el contexto de negocio de cada empresa.`);

    return {
      status: 'multiple_companies_no_autofill',
      companyCount,
      ambiguousRowsReport: 'generated',
      message: 'No se asignó company_id automáticamente. Ver reporte anterior para asignación manual.'
    };

  } else {
    // CASO 3: force = true (caso especial)
    console.log('⚡ Modo force activado - procederá con el backfill a pesar de múltiples empresas');
    // Lógica similar al caso 1 pero con bandera force
    return { status: 'force_mode', message: 'Force mode activated' };
  }
}

// Módulo de exportación para uso como instrucción/documentation
// Cuando se ejecuta como script: node scripts/backfill-company-id.js
// Cuando se usa como módulo: import { backfillCompanyId } from './backfill-company-id'

// Punto de entrada si se ejecuta directamente
// En FASE 5: SOLO CREACIÓN, NO EJECUTAR
// Este script sirve como documentación de la lógica de backfill

// Estructura esperada de uso:
//
// // Ejemplo de cómo se integraría con Supabase/Prisma real:
// const result = await backfillCompanyId({
//   tenantId: 'tenant_abc123',
//   force: false  // importante: dejar false para respetar la lógica de single/multiple
// });
//
// console.log(result);

/*
 * LIMITACIONES Y NOTAS IMPORTANTES (comentarios para desarrolladores):
 * 
 * 1. Este script NO ejecuta queries reales contra la base de datos.
 *    Es un esquema de documentación de la lógica de backfill.
 * 
 * 2. Para tenants con MÁS DE UNA company, el company_id se deja intencionalmente
    NULL para evitar asignaciones automáticas incorrectas. La asignación debe
    hacerse manualmente por un administrador basándose en el contexto de negocio.
 * 
 * 3. La lista de tables proviene de la migración 012_ADD_COMPANY_ID_TO_MULTI_TENANT_TABLES.sql.
    Si se añaden nuevas tables, actualizar este script y la migración correspondiente.
 * 
 * 4. La relación tenant_id ↔ company_id se establece a través de la tabla companies,
    donde cada empresa tiene un tenant_id único.
 * 
 * 5. Para tenants single-company, el comportamiento debe ser idéntico al actual
    (empresa-scope con un solo tenant => company_id se asigna automáticamente).
 * 
 * 6. Este script debe leerse junto con la migración 012 para entender el esquema
    completo de columns y constraints añadidos.
 */

// End of script - FASE 5: Script de backfill company_id (documentación/instrucción)
// No ejecutar directamente. Usar como referencia de lógica para implementaciones reales.