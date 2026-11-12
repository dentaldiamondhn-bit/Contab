// Script to populate localStorage with test data for tenant-admin settings
// Run this in browser console on http://localhost:3000

const mockFiscalInfo = {
  rtn: '08011999123456',
  businessName: 'Empresa de Prueba S.A.',
  businessAddress: 'Calle Principal #123, Tegucigalpa, Honduras',
  email: 'contacto@empresaprueba.hn',
  phone: '+504 2234-5678'
};

const mockCaiConfigs = [
  {
    id: 'test-1',
    cai: '1234567890123456789012345678901234567',
    economicActivity: 'Servicios Profesionales',
    rangeStart: 1,
    rangeEnd: 1000,
    currentNumber: 1,
    taxRate: 15,
    establishmentCode: '001',
    pointOfSaleCode: '001',
    expiryDate: '2024-12-31',
    isActive: true
  }
];

const mockTaxConfig = {
  isv15Enabled: true,
  isv18Enabled: true,
  defaultTaxRate: 15,
  customTaxes: [
    {
      id: '1',
      name: 'Impuesto Municipal',
      rate: 2,
      description: 'Impuesto municipal aplicable'
    }
  ]
};

// Save to localStorage
localStorage.setItem('fiscalInfo', JSON.stringify(mockFiscalInfo));
localStorage.setItem('caiConfigs', JSON.stringify(mockCaiConfigs));
localStorage.setItem('taxConfig', JSON.stringify(mockTaxConfig));

console.log('✅ Mock data saved to localStorage');
console.log('📋 Fiscal Info:', mockFiscalInfo);
console.log('📋 CAI Configs:', mockCaiConfigs);
console.log('📋 Tax Config:', mockTaxConfig);

// Reload the page to see the data
window.location.href = '/tenant-admin/settings';
