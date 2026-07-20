// Script to test logo persistence in database
// Run this after executing the migration and uploading a logo

console.log('🧪 Testing logo persistence in database...');

// Step 1: Check if logo is saved in localStorage
const savedLogo = localStorage.getItem('companyLogo');
const savedLogoName = localStorage.getItem('companyLogoName');

console.log('📦 Logo in localStorage:', !!savedLogo);
console.log('📝 Logo name in localStorage:', savedLogoName);

// Step 2: Test API endpoint to retrieve logo from database
async function testLogoFromDatabase() {
  try {
    console.log('🌐 Testing GET /api/billing/logo...');
    
    const response = await fetch('/api/billing/logo');
    const data = await response.json();
    
    console.log('📡 API Response:', data);
    
    if (data.success && data.logoUrl) {
      console.log('✅ Logo successfully retrieved from database');
      console.log('🔍 File name:', data.fileName);
      console.log('🔍 File size:', data.fileSize);
      console.log('🔍 File type:', data.fileType);
      console.log('🔍 Updated at:', data.updatedAt);
      
      // Verify the logo URL is valid
      const img = new Image();
      img.onload = () => {
        console.log('✅ Logo URL is valid and image loads correctly');
        console.log('📐 Image dimensions:', img.width, 'x', img.height);
      };
      img.onerror = () => {
        console.log('❌ Logo URL is invalid or image failed to load');
      };
      img.src = data.logoUrl;
      
    } else if (data.success && !data.logoUrl) {
      console.log('⚠️ No logo found in database for this tenant');
      console.log('💡 This is expected if you haven\'t uploaded a logo yet');
    } else {
      console.log('❌ Error retrieving logo from database:', data.error || data.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing logo API:', error);
  }
}

// Step 3: Test uploading a new logo to database
async function testLogoUpload() {
  console.log('📤 Testing logo upload to database...');
  
  // Create a test image
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  // Draw a test logo
  ctx.fillStyle = '#007bff';
  ctx.fillRect(0, 0, 200, 100);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('TEST', 70, 60);
  
  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (blob) {
        const formData = new FormData();
        formData.append('logo', blob, 'test-database-logo.png');
        
        try {
          const response = await fetch('/api/billing/logo', {
            method: 'POST',
            body: formData
          });
          
          const data = await response.json();
          console.log('📡 Upload API Response:', data);
          
          if (data.success) {
            console.log('✅ Logo successfully uploaded to database');
            console.log('🔍 Record ID:', data.recordId);
            console.log('🔍 File name:', data.fileName);
            console.log('🔍 File size:', data.fileSize);
            
            // Test retrieval immediately after upload
            setTimeout(() => {
              console.log('🔄 Testing retrieval after upload...');
              testLogoFromDatabase();
            }, 1000);
            
          } else {
            console.log('❌ Error uploading logo:', data.error);
          }
          
        } catch (error) {
          console.error('❌ Error uploading logo:', error);
        }
      }
      resolve();
    }, 'image/png');
  });
}

// Step 4: Run the tests
async function runTests() {
  console.log('🚀 Starting logo persistence tests...');
  
  // Test retrieval first
  await testLogoFromDatabase();
  
  // Wait a bit then test upload
  setTimeout(async () => {
    await testLogoUpload();
  }, 2000);
}

// Execute tests
runTests();
