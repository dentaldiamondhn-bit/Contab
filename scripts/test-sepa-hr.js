/**
 * Test script para generador SEPA con tabla User
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:7KC3eRuTM123@db.kudsqsbxbmviesiaesct.supabase.co:5432/postgres'
};

async function test() {
  // Usar tenant TEST1DS (el tenant de prueba)
  const tenantId = 'TEST1DS';
  
  console.log('=== Test: Generador SEPA con Tabla User ===');
  console.log(`Tenant: ${tenantId}`);
  console.log('');
  
  // 1. Obtener usuarios de ese tenant
  const { rows: users } = await pool.query(`
    SELECT id, email, name, tenantId
    FROM "User"
    WHERE tenantId = $1
    ORDER BY name
  `, [tenantId]);
  
  console.log(`Usuarios encontrados: ${users.length}`);
  console.log('');
  
  // Mostrar los usuarios
  users.forEach((u, i) => {
    console.log(`${i + 1}. ID: ${u.id}`);
    console.log(`   Nombre: ${u.name || 'Sin nombre'}`);
    console.log(`   Email: ${u.email}`);
    console.log(`   Tenant: ${u.tenantId}`);
    console.log('');
  });
  
  // 2. Si hay usuarios, generar pagos SEPA
  if (users.length > 0) {
    const payments = [];
    
    for (const user of users) {
      // Datos bancarios por defecto
      const iban = 'ES91234567890123456789';
      const bic = 'BBVAESMMXXX';
      const salary = 2500;
      
      payments.push({
        creditorName: user.name || user.email.split('@')[0],
        creditorIBAN: iban,
        creditorBIC: bic,
        amount: salary,
        purpose: 'Nómina ' + new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })
      });
    }
    
    console.log('=== Generando archivo SEPA ===');
    console.log(`Empleados: ${payments.length}`);
    console.log(`Importe total: ${payments.reduce((s, p) => s + p.amount, 0)} €`);
    console.log('');
    
    // Generar el archivo SEPA manualmente para ver el formato
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
    <BIC>BBVAESMMXXX</BIC>
    </FinInstnnId>
    <Nm>Contab Soluciones SL</Nm>
    </Fr>
    <PmtInf>
    <PmtId>
    <InstrId>SEPA${Date.now()}</InstrId>
    <EndToEndId>SEPA${Date.now()}</EndToEndId>
    </PmtId>
    <InstgAgt>
    <FinInstnnId>
    <BIC>BBVAESMMXXX</BIC>
    </FinInstnnId>
    <Nm>Contab Soluciones SL</Nm>
    </InstgAgt>
    <Dbtr>
    <Nm>Contab Soluciones SL</Nm>
    <Id>
    <IBAN>ES9121000418450200051332</IBAN>
    </Id>
    </Dbtr>
    <DbtrAgt>
    <FinInstnnId>
    <BIC>BBVAESMMXXX</BIC>
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
  <BIC>${payment.creditorBIC}</BIC>
  </FinInstnnId>
  </CdtrAgt>
  <Cdtr>
  <Nm>${payment.creditorName}</Nm>
  <Id>
  <IBAN>${payment.creditorIBAN}</IBAN>
  </Id>
  </Cdtr>
  <CdtrAgt>
  <FinInstnnId>
  <BIC>${payment.creditorBIC}</BIC>
  </FinInstnnId>
  </Cdtr>
  <RmtInf>
  <Ustrd>${payment.purpose}</Ustrd>
  </RmtInf>
  </CstmrDrctDbtTxnInf>`;
    });
    
    const sepaFooter = `
  <CtrlSum>${payments.reduce((sum, p) => sum + p.amount, 0)}</CtrlSum>
  </PmtInf>
  </GrpHdr>
  </CstmrDrctDbtInitn>
  </Document>`;
    
    const fullXml = sepaHeader + paymentsXml + sepaFooter;
    
    // Escribir archivo
    const outputPath = `sepa-hr-test-${tenantId}.xml`;
    const fs = require('fs');
    fs.writeFileSync(outputPath, fullXml, 'utf8');
    
    console.log(`Archivo SEPA generado: ${outputPath}`);
    console.log(`Tamaño: ${fs.statSync(outputPath).size} bytes`);
    console.log('');
    console.log('=== Estructura XML (primeros 500 caracteres) ===');
    console.log(fullXml.substring(0, 500));
    console.log('');
    console.log('=== Test completado exitosamente ===');
  } else {
    console.log('No hay usuarios para este tenant, no se genera archivo');
  }
}

test().catch(err => console.error('Error:', err));