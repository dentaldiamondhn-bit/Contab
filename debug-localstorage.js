// Debug script to check localStorage data
// Run this in browser console on the tenant-admin settings page

console.log('🔍 Checking localStorage for fiscal info data...');

// Check if fiscalInfo exists in localStorage
const fiscalInfoData = localStorage.getItem('fiscalInfo');
console.log('📦 fiscalInfo from localStorage:', fiscalInfoData);

if (fiscalInfoData) {
  try {
    const parsed = JSON.parse(fiscalInfoData);
    console.log('✅ Parsed fiscal info:', parsed);
    
    // Check if all required fields exist
    const requiredFields = ['rtn', 'businessName', 'businessAddress', 'email', 'phone'];
    const missingFields = requiredFields.filter(field => !parsed[field]);
    
    if (missingFields.length > 0) {
      console.log('⚠️ Missing fields:', missingFields);
    } else {
      console.log('✅ All required fields present');
    }
  } catch (error) {
    console.error('❌ Error parsing fiscal info:', error);
  }
} else {
  console.log('❌ No fiscal info found in localStorage');
}

// Check other related localStorage items
const caiConfigs = localStorage.getItem('caiConfigs');
const taxConfig = localStorage.getItem('taxConfig');

console.log('📦 caiConfigs:', caiConfigs ? 'Found' : 'Not found');
console.log('📦 taxConfig:', taxConfig ? 'Found' : 'Not found');

// Show all localStorage items (be careful not to log sensitive data)
console.log('📋 All localStorage keys:', Object.keys(localStorage));

// Manually test setting fiscal info to see if form updates
console.log('🧪 Testing manual update...');
const testData = {
  rtn: '08011999123456',
  businessName: 'Empresa de Prueba S.A.',
  businessAddress: 'Calle Principal #123, Tegucigalpa, Honduras',
  email: 'contacto@empresaprueba.hn',
  phone: '+504 2234-5678'
};

console.log('💾 Setting test data:', testData);
localStorage.setItem('fiscalInfo', JSON.stringify(testData));
console.log('✅ Test data saved. Refresh the page to see if it loads.');
