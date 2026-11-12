/**
 * Generador de Archivos Bancarios SEPA para Nómina
 * 
 * Formato SEPA Credit Transfer (SCT) - XML
 */

const fs = require('fs');
const path = require('path');

/**
 * Genera un archivo SEPA Credit Transfer (SCT)
 * @param {Array} payments - Array de objetos {creditorName, creditorIBAN, amount, purpose}
 * @param {Object} options - Opciones de configuración
 * @param {string} options.companyName - Nombre de la empresa
 * @param {string} options.companyIBAN - IBAN de la empresa
 * @param {string} options.companyBIC - BIC de la empresa
 * @param {string} options.outputPath - Ruta de salida del archivo
 */
function generateSepaFile(payments, options = {}) {
  const {
    companyName = 'Compañía Contab',
    companyIBAN = 'ES9121000418450200051332',
    companyBIC = 'BBVAESMMXXX',
    outputPath = 'sepa-payroll.xml'
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

// Datos de ejemplo para prueba
const samplePayments = [
  {
    creditorName: 'Juan Pérez',
    creditorIBAN: 'ES9121000418450200051332',
    creditorBIC: 'BBVAESMMXXX',
    amount: 2500,
    purpose: 'Nómina Octubre 2026'
  },
  {
    creditorName: 'María García',
    creditorIBAN: 'ES80235075140330023145',
    creditorBIC: 'BSCHESMMXXX',
    amount: 3200,
    purpose: 'Nómina Octubre 2026'
  }
];

// Generar archivo de prueba
console.log('=== Generador de Archivos Bancarios SEPA ===');
const outputPath = generateSepaFile(samplePayments, {
  companyName: 'Contab Soluciones SL',
  companyIBAN: 'ES9121000418450200051332',
  companyBIC: 'BBVAESMMXXX',
  outputPath: 'sepa-payroll-test.xml'
});

console.log('');
console.log('Archivo listo para importar en el banco.');
console.log(`Ruta: ${outputPath}`);