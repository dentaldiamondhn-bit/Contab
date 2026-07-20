// Script para probar directamente el POST de facturas
const testInvoiceCreation = async () => {
    try {
        console.log('🚀 Iniciando prueba directa de API POST...');
        
        const invoiceData = {
            tenantId: 'DENTALWD',
            invoiceType: 'CUSTOMER',
            customerName: 'Cliente de Prueba Directa',
            customerRTN: '08011999123456',
            customerEmail: 'test@directo.com',
            customerAddress: 'Dirección de prueba',
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date().toISOString().split('T')[0],
            notes: 'Factura de prueba directa desde script',
            subtotal: 1000,
            tax: 150,
            total: 1150,
            items: [{
                description: 'Servicio de prueba',
                quantity: 1,
                unitPrice: 1000,
                total: 1000
            }]
        };

        console.log('📦 Datos a enviar:', JSON.stringify(invoiceData, null, 2));

        const response = await fetch('http://localhost:3000/api/admin/billing/invoices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoiceData)
        });

        console.log('📊 Status de respuesta:', response.status);
        console.log('📋 Headers de respuesta:', Object.fromEntries(response.headers.entries()));

        const responseData = await response.json();
        console.log('✅ Respuesta del API:', JSON.stringify(responseData, null, 2));

        if (response.ok) {
            console.log('🎉 Factura creada exitosamente!');
            
            // Esperar un momento y verificar si aparece en GET
            setTimeout(async () => {
                console.log('🔍 Verificando si la factura aparece en GET...');
                const getResponse = await fetch('http://localhost:3000/api/admin/billing/invoices?tenantId=DENTALWD&type=CUSTOMER');
                const getData = await getResponse.json();
                console.log('📊 Resultado GET:', JSON.stringify(getData, null, 2));
            }, 2000);
        } else {
            console.log('❌ Error en la creación de factura');
        }

    } catch (error) {
        console.error('💥 Error en la prueba:', error);
    }
};

// Ejecutar la prueba
testInvoiceCreation();
