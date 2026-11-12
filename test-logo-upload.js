// Script to test logo upload functionality
// Run this in browser console on tenant-admin settings page

console.log('🧪 Testing logo upload functionality...');

// Step 1: Check if logo upload button exists
const logoInput = document.querySelector('input[type="file"][accept="image/*"]');
const uploadButton = document.querySelector('button:has(.Upload)') || document.querySelector('button[onclick*="logo"]');

console.log('📋 Logo input found:', !!logoInput);
console.log('📋 Upload button found:', !!uploadButton);

if (logoInput) {
  // Step 2: Create a test image file (1x1 pixel PNG)
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#007bff';
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('LOGO', 25, 55);

  canvas.toBlob((blob) => {
    if (blob) {
      const file = new File([blob], 'test-logo.png', { type: 'image/png' });
      
      // Step 3: Create a FileList with our test file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      logoInput.files = dataTransfer.files;

      // Step 4: Trigger the change event
      const event = new Event('change', { bubbles: true });
      logoInput.dispatchEvent(event);

      console.log('✅ Test logo file created and upload triggered');
      console.log('📁 File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
    }
  }, 'image/png');
} else {
  console.log('❌ Logo input not found. Check if you are on the tenant-admin settings page.');
}

// Step 5: Check localStorage after a delay
setTimeout(() => {
  const savedLogo = localStorage.getItem('companyLogo');
  const savedLogoName = localStorage.getItem('companyLogoName');
  
  console.log('📦 Saved logo in localStorage:', !!savedLogo);
  console.log('📝 Saved logo name:', savedLogoName);
  
  if (savedLogo) {
    console.log('✅ Logo successfully saved to localStorage');
    console.log('🔍 Logo data URL length:', savedLogo.length);
    
    // Show the logo in console as a preview
    const img = new Image();
    img.onload = () => {
      console.log('🖼️ Logo preview loaded successfully');
      console.log('📐 Image dimensions:', img.width, 'x', img.height);
    };
    img.src = savedLogo;
  } else {
    console.log('❌ Logo not found in localStorage after upload attempt');
  }
}, 3000);

// Step 6: Check if logo preview is shown in the UI
setTimeout(() => {
  const logoPreview = document.querySelector('img[src^="data:image"]');
  if (logoPreview) {
    console.log('✅ Logo preview is visible in the UI');
    console.log('🖼️ Preview element:', logoPreview);
  } else {
    console.log('❌ Logo preview not found in UI');
  }
}, 4000);
