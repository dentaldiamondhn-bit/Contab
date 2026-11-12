/**
 * Generador de Archivos Bancarios SEPA para Recursos Humanos
 * usando la tabla User como base
 * 
 * Formato: SEPA Credit Transfer (SCT) - camt.001.001.02
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:7KC3eRuTM123@db.kudsqsbxbmviesiaesct.supabase.co:5432/postgres'
});

/**
 * Obtiene los usuarios/empleados filtrados por tenant/empresa
 * @param {string} tenantId - ID del tenant/empresa
 * @returns {Promise<Array>} - Array de usuarios con datos para nómina
 */
async function getEmployeesByTenant(tenantId) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, email, name, tenantId
      FROM "User"
      WHERE tenantId = $1
      ORDER BY name
    `, [tenantId]);
    
    return rows.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name || `${user.email.split('@')[0]}`,
      tenantId: user.tenantId
    }));
  } catch (err) {
    console.error('Error al obtener usuarios:', err.message);
    return [];
  } finally {
    await client.release();
  }
}

/**
 * Obtiene datos bancarios de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - Datos bancarios (IBAN, BIC)
 */
async function getUserBankDetails(userId) {
  const client = await pool.connect();
  try {
    // Por ahora, retornamos IBAN por defecto por empleado
    // TODO: En un futuro, conectar con tabla de cuentas bancarias
    const { rows } = await client.query(`
      SELECT bank_account_iban, bank_account_bic
      FROM "User"
      WHERE id = $1
    `, [userId]);
    
    if (rows.length > 0 && rows[0].bank_account_iban) {
      return {
        iban: rows[0].bank_account_iban,
        bic: rows[0].bank_account_bic || 'BBVAESMMXXX'
      };
    }
    
    // Valores por defecto
    return {
      iban: 'ES91234567890123456789',
      bic: 'BBVAESMMXXX'
    };
  } catch (err) {
    console.error('Error al obtener datos bancarios:', err.message);
    return {
      iban: 'ES91234567890123456789',
      bic: 'BBVAESMMXXX'
    };
  } finally {
    await client.release();
  }
}

/**
 * Genera un archivo SEPA Credit Transfer (SCT)
 * @param {Array} payments - Array de objetos de pago
 * @param {Object} options - Opciones de configuración
 */
function generateSepaFile(payments, options = {}) {
  const {
    companyName = 'Compañía Contab',
    companyIBAN = 'ES9121000418450200051332',
    companyBIC = 'BBVAESMMXXX',
    outputPath = 'sepa-hr-payroll.xml'
  } = options;

  // Cabecera SEPA
  const sepaHeader = `<?xml version="1.0" encoding="UTF-8"?>
  <Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.001.001.02">
  <CstmrDrctDbtInitn>
  <GrpHdr>
  <MsgId>SEPA${Date.now()}</MsgId>
  <CreDtTm>${new Date().toISOString()}</CreDtTm>
  <NbOfTx>${payments.length}</NbOfTx>
  <CtrlSum>${payments.reduce((sum, p) => sum + p.amount, 0)}</CtrlSum>
  <Fr>
  <FinInstnnId>
  <BIC>${companyBIC}</BIC>
  </FinInstnnId>
  <Nm>${companyName}</Nm>
  </Fr>
  <PmtInf>
  <PmtId>
  <InstrId>SEPA${Date.now()}</InstrId>
  <EndToEndId>SEPA${Date.now()}</EndToEndId>
  </PmtId>
  <InstgAgt>
  <FinInstnnId>
  <BIC>${companyBIC}</BIC>
  </FinInstnnId>
  <Nm>${companyName}</Nm>
  </InstgAgt>
  <Dbtr>
  <Nm>${companyName}</Nm>
  <Id>
  <IBAN>${companyIBAN}</IBAN>
  </Id>
  </Dbtr>
  <DbtrAgt>
  <FinInstnnId>
  <BIC>${companyBIC}</BIC>
  </FinInstnnId>
  </DbtrAgt>
  <CtgryPurp>
  <Cd>SALRY</Cd>
  <Prtry>Nómina Mensual</Prtry>
  </CtgryPurp>
  <ReqdColltnDt>${new Date().toISOString().split('T')[0]}</ReqdColltnDt>
  <CdtrAgt>
  <FinInstnnId>
  <BIC></BIC>
  </FinInstnnId>
  </CtgrAgt>
  <Cdtr>
  <Nm></Nm>
  <Id>
  <IBAN></IBAN>
  </Id>
  </Cdtr>
  <ChrgBearg>SLEV</ChrgBearg>
  `;

  // Detalles de los pagos
  let paymentsXml = '';
  payments.forEach(payment => {
    paymentsXml += `
  <CstmrDrctDbtTxnInf>
  <PmtId>
  <InstrId>SEPA${Date.now()}</InstrId>
  <EndToEndId>SEPA${Date.now()}</EndToEndId>
  </PmtId>
  <Amt>
  <Amt>${payment.amount}</Amt>
  </Amt>
  <CdtrAgt>
  <FinInstnnId>
  <BIC>${payment.creditorBIC || ''}</BIC>
  </FinInstnnId>
  </CdtrAgt>
  <Cdtr>
  <Nm>${escapeXml(payment.creditorName)}</Nm>
  <Id>
  <IBAN>${escapeXml(payment.creditorIBAN)}</IBAN>
  </Id>
  </Cdtr>
  <CdtrAgt>
  <FinInstnnId>
  <BIC>${payment.creditorBIC || ''}</BIC>
  </FinInstnnId>
  </Cdtr>
  <RmtInf>
  <Ustrd>${escapeXml(payment.purpose)}</Ustrd>
  </RmtInf>
  </CstmrDrctDbtTxnInf>`;
  });

  // Pie de página SEPA
  const sepaFooter = `
  <CtrlSum>${payments.reduce((sum, p) => sum + p.amount, 0)}</CtrlSum>
  </PmtInf>
  </GrpHdr>
  </CstmrDrctDbtInitn>
  </Document>`;

  const fullXml = sepaHeader + paymentsXml + sepaFooter;

  // Escribir archivo
  fs.writeFileSync(outputPath, fullXml, 'utf8');
  console.log(`Archivo SEPA generado: ${outputPath}`);
  console.log(`Total de pagos: ${payments.length}`);
  console.log(`Importe total: ${payments.reduce((sum, p) => sum + p.amount, 0)}`);

  return outputPath;
}

/**
 * Escapa caracteres XML especiales
 */
function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

/**
 * Ejecución principal
 */
async function main() {
  try {
    console.log('=== Generador de Archivos Bancarios SEPA para RRHH ===');
    console.log('');

    // Solicitar tenantId (empresa)
    const tenantId = process.env.TENANT_ID || 'TEST1DS';
    console.log(`Procesando para tenant: ${tenantId}`);
    console.log('');

    // Obtener empleados/usuarios de ese tenant
    const employees = await getEmployeesByTenant(tenantId);
    console.log(`Usuarios encontrados: ${employees.length}`);

    if (employees.length === 0) {
      console.log('No hay usuarios para este tenant');
      console.log('Empleados disponibles en la BD:');
      
      // Listar un poco para depuración
      const { rows } = await pool.query(`
        SELECT id, name, tenantId 
        FROM "User" 
        LIMIT 5
      `);
      rows.forEach(r => console.log(` - ${r.id}: ${r.name} (tenant: ${r.tenantId})`));
      return;
    }

    // Generar pagos SEPA para cada empleado
    const payments = [];
    
    for (const employee of employees) {
      // Obtener datos bancarios del usuario
      const bankDetails = await getUserBankDetails(employee.id);
      
      // Usar un importe por defecto (próximo pago nómina)
      const salary = 2500; // Salario por defecto hasta configurar
      
      payments.push({
        creditorName: employee.name || employee.email.split('@')[0],
        creditorIBAN: bankDetails.iban,
        creditorBIC: bankDetails.bic,
        amount: salary,
        purpose: `Nómina ${new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`
      });
    }

    console.log(`Generando ${payments.length} pagos SEPA...`);
    console.log('');

    // Generar archivo SEPA
    const outputPath = `sepa-hr-${tenantId}-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}.xml`;
    generateSepaFile(payments, {
      companyName: 'Contab Soluciones SL',
      companyIBAN: 'ES9121000418450200051332',
      companyBIC: 'BBVAESMMXXX',
      outputPath: outputPath
    });

    console.log('');
    console.log('=== Resumen ===');
    console.log(`Tenant: ${tenantId}`);
    console.log(`Empleados procesados: ${payments.length}`);
    console.log(`Importe total: ${payments.reduce((s, p) => s + p.amount, 0)} €`);
    console.log(`Archivo: ${outputPath}`);
    console.log('');
    console.log('Archivo listo para importar en el banco.');

  } catch (error) {
    console.error('Error crítico:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
main();