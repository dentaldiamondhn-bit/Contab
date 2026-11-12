const { InvoiceGenerator } = require('./lib/billing/invoice-generator');

async function runMonthlyInvoiceGeneration() {
  console.log('🚀 Iniciando generación de facturas mensuales...');
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  
  try {
    const results = await InvoiceGenerator.generateMonthlyInvoices();
    
    console.log('\n✅ Proceso completado');
    console.log(`📊 Resultados:`);
    console.log(`   • Facturas generadas: ${results.success}`);
    console.log(`   • Errores: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Errores encontrados:');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (results.success > 0) {
      console.log('\n🎉 Facturas generadas exitosamente!');
    } else {
      console.log('\n😔 No se generaron facturas en esta ejecución.');
    }
    
  } catch (error) {
    console.error('❌ Error fatal en la generación de facturas:', error);
    process.exit(1);
  }
}

// Run the invoice generation
runMonthlyInvoiceGeneration();
