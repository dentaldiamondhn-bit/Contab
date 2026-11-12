// Script to test if logo endpoint is working
// Run this in browser console on tenant-admin settings page

console.log('🧪 Testing logo endpoint...');

// Test 1: Check if endpoint exists
async function testEndpointExists() {
  try {
    console.log('🔍 Testing if /api/billing/logo exists...');
    
    const response = await fetch('/api/billing/logo', {
      method: 'GET'
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', [...response.headers.entries()]);
    
    if (response.status === 404) {
      console.log('❌ Endpoint not found (404)');
      console.log('💡 This means the route.ts file is not being recognized by Next.js');
      console.log('🔧 Possible solutions:');
      console.log('   1. Restart the development server completely');
      console.log('   2. Check if route.ts file exists and is correctly named');
      console.log('   3. Clear Next.js cache: rm -rf .next');
      console.log('   4. Check for syntax errors in route.ts');
      
    } else if (response.status === 401) {
      console.log('🔐 Endpoint exists but requires authentication (401)');
      console.log('✅ This is expected behavior for unauthenticated requests');
      
    } else {
      console.log('✅ Endpoint exists and responded with status:', response.status);
      const data = await response.json();
      console.log('📊 Response data:', data);
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error);
  }
}

// Test 2: Check if we can access other billing endpoints
async function testOtherEndpoints() {
  console.log('🔍 Testing other billing endpoints...');
  
  const endpoints = [
    '/api/billing/invoices',
    '/api/billing/fiscal-info',
    '/api/billing/customers'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'GET' });
      console.log(`📡 ${endpoint}: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: Error - ${error.message}`);
    }
  }
}

// Test 3: Try to upload a simple test logo
async function testLogoUpload() {
  console.log('📤 Testing logo upload...');
  
  // Create a simple test image
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#007bff';
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('TEST', 25, 55);
  
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (blob) {
        const formData = new FormData();
        formData.append('logo', blob, 'test-logo.png');
        
        try {
          const response = await fetch('/api/billing/logo', {
            method: 'POST',
            body: formData
          });
          
          console.log('📡 Upload response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Upload successful:', data);
          } else {
            console.log('❌ Upload failed with status:', response.status);
            const errorText = await response.text();
            console.log('📄 Error response:', errorText);
          }
          
        } catch (error) {
          console.error('❌ Upload error:', error);
        }
      }
      resolve();
    }, 'image/png');
  });
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting endpoint tests...');
  
  await testEndpointExists();
  console.log('\n');
  await testOtherEndpoints();
  console.log('\n');
  await testLogoUpload();
  
  console.log('\n🏁 Tests completed');
}

// Execute tests
runAllTests();
