'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  Users, 
  Stethoscope, 
  Briefcase, 
  Store, 
  Factory,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Calculator,
  Building,
  BookOpen,
  Image as ImageIcon,
  ShoppingCart,
  Landmark,
  ChevronRight,
  Upload,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  SkipForward
} from 'lucide-react';
import { saveOnboardingData } from '@/lib/actions/onboarding';

// Interfaces
interface UserMode {
  id: 'accountant' | 'business';
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface BusinessType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface CompanyData {
  name: string;
  rtn: string;
  address: string;
  contactPhone: string;
  email: string;
  industry: string;
  country: string;
  clientPhone: string;
  companyPhone: string;
}

interface AccountCatalog {
  code: string;
  name: string;
  type: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto';
  selected: boolean;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountNumberMasked: boolean;
  accountType: string;
  currency: string;
}

// Constants
const userModes: UserMode[] = [
  {
    id: 'accountant',
    name: 'Soy Contador',
    description: 'Administro contabilidad de múltiples empresas y clientes. Tengo acceso a todas las empresas desde un solo panel.',
    icon: <Users className="h-12 w-12" />
  },
  {
    id: 'business',
    name: 'Tengo una Empresa / Negocio',
    description: 'Soy dueño o administrador de un solo negocio. Necesito gestionar mi contabilidad empresarial.',
    icon: <Building2 className="h-12 w-12" />
  }
];

const businessTypes: BusinessType[] = [
  { id: 'clinica_dental', name: 'Clínica Dental', description: 'Consultorio odontológico con pacientes y facturación médica', icon: <Stethoscope className="h-8 w-8" /> },
  { id: 'consultorio_medico', name: 'Consultorio Médico', description: 'Centro de salud o consultorio privado', icon: <Stethoscope className="h-8 w-8" /> },
  { id: 'farmacia', name: 'Farmacia', description: 'Venta de medicamentos y productos farmacéuticos', icon: <Store className="h-8 w-8" /> },
  { id: 'tienda_comercio', name: 'Tienda / Comercio', description: 'Venta de productos al por menor o mayor', icon: <Store className="h-8 w-8" /> },
  { id: 'servicios_profesionales', name: 'Servicios Profesionales', description: 'Abogados, ingenieros, arquitectos, consultores', icon: <Briefcase className="h-8 w-8" /> },
  { id: 'manufactura', name: 'Manufactura / Producción', description: 'Fábrica o empresa de producción de bienes', icon: <Factory className="h-8 w-8" /> },
  { id: 'otro_negocio', name: 'Otro Tipo de Negocio', description: 'Cualquier otro tipo de empresa o emprendimiento', icon: <Building2 className="h-8 w-8" /> }
];

const defaultAccounts: AccountCatalog[] = [
  // Activos
  { code: '1.1.01', name: 'Caja General', type: 'activo', selected: true },
  { code: '1.1.02', name: 'Bancos', type: 'activo', selected: true },
  { code: '1.1.03', name: 'Inversiones Temporales', type: 'activo', selected: false },
  { code: '1.2.01', name: 'Clientes', type: 'activo', selected: true },
  { code: '1.2.02', name: 'Documentos por Cobrar', type: 'activo', selected: false },
  { code: '1.3.01', name: 'Inventario de Mercadería', type: 'activo', selected: true },
  { code: '1.4.01', name: 'Mobiliario y Equipo', type: 'activo', selected: true },
  { code: '1.4.02', name: 'Equipo de Computación', type: 'activo', selected: true },
  { code: '1.4.03', name: 'Vehículos', type: 'activo', selected: false },
  // Pasivos
  { code: '2.1.01', name: 'Proveedores', type: 'pasivo', selected: true },
  { code: '2.1.02', name: 'Documentos por Pagar', type: 'pasivo', selected: false },
  { code: '2.1.03', name: 'Préstamos Bancarios', type: 'pasivo', selected: false },
  { code: '2.2.01', name: 'Impuestos por Pagar', type: 'pasivo', selected: true },
  { code: '2.2.02', name: 'Sueldos por Pagar', type: 'pasivo', selected: true },
  // Patrimonio
  { code: '3.1.01', name: 'Capital Social', type: 'patrimonio', selected: true },
  { code: '3.1.02', name: 'Utilidades Retenidas', type: 'patrimonio', selected: false },
  // Ingresos
  { code: '4.1.01', name: 'Ventas de Mercadería', type: 'ingreso', selected: true },
  { code: '4.1.02', name: 'Servicios Prestados', type: 'ingreso', selected: true },
  { code: '4.1.03', name: 'Intereses Ganados', type: 'ingreso', selected: false },
  // Gastos
  { code: '5.1.01', name: 'Costo de Ventas', type: 'gasto', selected: true },
  { code: '5.2.01', name: 'Sueldos y Salarios', type: 'gasto', selected: true },
  { code: '5.2.02', name: 'Alquileres', type: 'gasto', selected: true },
  { code: '5.2.03', name: 'Servicios Públicos', type: 'gasto', selected: true },
  { code: '5.2.04', name: 'Depreciación', type: 'gasto', selected: false },
  { code: '5.3.01', name: 'Gastos de Ventas', type: 'gasto', selected: false },
  { code: '5.3.02', name: 'Gastos Administrativos', type: 'gasto', selected: false }
];

const wizardSteps = [
  { id: 1, name: 'Datos Empresa', icon: <Building className="h-5 w-5" /> },
  { id: 2, name: 'Catálogo Cuentas', icon: <BookOpen className="h-5 w-5" />, optional: true },
  { id: 3, name: 'Imagen', icon: <ImageIcon className="h-5 w-5" /> },
  { id: 4, name: 'Config. Ventas', icon: <ShoppingCart className="h-5 w-5" /> },
  { id: 5, name: 'Cuentas Banco', icon: <Landmark className="h-5 w-5" /> }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'accountant' | 'business' | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'mode-selection' | 'business-selection' | 'confirmation' | 'business-setup'>('mode-selection');
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '', rtn: '', address: '', contactPhone: '', email: '', industry: '',
    country: 'Honduras', clientPhone: '', companyPhone: ''
  });
  const [accounts, setAccounts] = useState<AccountCatalog[]>(defaultAccounts);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [salesConfig, setSalesConfig] = useState({
    caiEnabled: false,
    caiCode: '',
    caiType: 'auto_impresion' as 'auto_impresion' | 'imprenta',
    taxes: [{ rate: 15, type: 'ISV' }],
    invoicePrefix: '001-001-'
  });

  const addTax = () => {
    setSalesConfig({
      ...salesConfig,
      taxes: [...salesConfig.taxes, { rate: 0, type: 'ISV' }]
    });
  };

  const removeTax = (index: number) => {
    setSalesConfig({
      ...salesConfig,
      taxes: salesConfig.taxes.filter((_, i) => i !== index)
    });
  };

  const updateTax = (index: number, field: 'rate' | 'type', value: string | number) => {
    const newTaxes = [...salesConfig.taxes];
    newTaxes[index] = { ...newTaxes[index], [field]: value };
    setSalesConfig({ ...salesConfig, taxes: newTaxes });
  };
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [newBankAccount, setNewBankAccount] = useState({ bankName: '', accountNumber: '', accountType: '', currency: 'HNL' });
  const [hasAccountant, setHasAccountant] = useState<boolean | null>(null);

  // DEBUG: Disabled redirect for testing
  // useEffect(() => {
  //   const savedType = localStorage.getItem('businessType');
  //   const savedMode = localStorage.getItem('userMode');
  //   if (savedType && savedMode) {
  //     router.push('/dashboard');
  //   }
  // }, [router]);

  const handleSelectMode = (mode: 'accountant' | 'business') => {
    setSelectedMode(mode);
    if (mode === 'accountant') {
      setStep('confirmation');
    } else {
      setStep('business-selection');
    }
  };

  const handleSelectBusinessType = (typeId: string) => {
    setSelectedBusinessType(typeId);
    const selectedType = businessTypes.find(b => b.id === typeId);
    setCompanyData(prev => ({ ...prev, industry: selectedType?.name || '' }));
  };

  const startBusinessSetup = () => {
    setStep('business-setup');
    setWizardStep(1);
  };

  const handleContinueFromWizard = async () => {
    if (!selectedMode) return;
    setIsLoading(true);
    
    const businessTypeName = selectedBusinessType 
      ? businessTypes.find(b => b.id === selectedBusinessType)?.name 
      : 'Contador';
    
    // Save all data to localStorage
    localStorage.setItem('userMode', selectedMode);
    localStorage.setItem('businessType', selectedBusinessType || 'contador');
    localStorage.setItem('businessName', companyData.name || businessTypeName || '');
    localStorage.setItem('companyData', JSON.stringify(companyData));
    localStorage.setItem('accountCatalog', JSON.stringify(accounts.filter(a => a.selected)));
    localStorage.setItem('salesConfig', JSON.stringify(salesConfig));
    localStorage.setItem('bankAccounts', JSON.stringify(bankAccounts));
    
    // Save to database if business mode with data
    if (selectedMode === 'business' && companyData.name) {
      try {
        await saveOnboardingData({
          companyData,
          bankAccounts,
          salesConfig,
          businessType: selectedBusinessType || 'otro'
        });
      } catch (error) {
        console.error('Error saving to database:', error);
        // Continue even if database save fails - data is in localStorage
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (selectedMode === 'accountant') {
      router.push('/companies');
    } else {
      router.push('/dashboard');
    }
  };

  const handleAccountToggle = (index: number) => {
    const newAccounts = [...accounts];
    newAccounts[index].selected = !newAccounts[index].selected;
    setAccounts(newAccounts);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addBankAccount = () => {
    if (newBankAccount.bankName && newBankAccount.accountNumber) {
      setBankAccounts([...bankAccounts, { 
        ...newBankAccount, 
        id: Date.now().toString(),
        accountNumberMasked: true 
      }]);
      setNewBankAccount({ bankName: '', accountNumber: '', accountType: '', currency: 'HNL' });
    }
  };

  const toggleAccountVisibility = (id: string) => {
    setBankAccounts(bankAccounts.map(acc => 
      acc.id === id ? { ...acc, accountNumberMasked: !acc.accountNumberMasked } : acc
    ));
  };

  const maskAccountNumber = (number: string) => {
    if (number.length <= 4) return '****';
    return '****' + number.slice(-4);
  };

  const removeBankAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter(b => b.id !== id));
  };

  const selectedBusiness = selectedBusinessType 
    ? businessTypes.find(b => b.id === selectedBusinessType)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Contab</h1>
              <p className="text-sm text-gray-500">Sistema de Contabilidad Honduras</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {step === 'mode-selection' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Bienvenido a Contab!</h2>
              <p className="text-lg text-gray-600">Selecciona la opción que mejor describe tu perfil</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {userModes.map((mode) => (
                <Card key={mode.id} className={`cursor-pointer transition-all duration-200 hover:shadow-xl ${selectedMode === mode.id ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50' : 'hover:border-blue-300 hover:shadow-lg'}`} onClick={() => handleSelectMode(mode.id)}>
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`p-5 rounded-full ${selectedMode === mode.id ? 'bg-blue-600 text-white' : mode.id === 'accountant' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                        {mode.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{mode.name}</h3>
                        <p className="text-sm text-gray-500">{mode.description}</p>
                      </div>
                      {selectedMode === mode.id && <CheckCircle className="h-6 w-6 text-blue-600" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 'business-selection' && (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => { setStep('mode-selection'); setSelectedMode(null); }}>← Volver</Button>
              <h2 className="text-2xl font-bold text-gray-900">¿Qué tipo de negocio tienes?</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businessTypes.map((business) => (
                <Card key={business.id} className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedBusinessType === business.id ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50' : 'hover:border-blue-300'}`} onClick={() => handleSelectBusinessType(business.id)}>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-3 rounded-full ${selectedBusinessType === business.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{business.icon}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{business.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{business.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-center pt-8">
              <Button size="lg" className="gap-2 px-8" disabled={!selectedBusinessType || isLoading} onClick={startBusinessSetup}>
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'confirmation' && selectedMode === 'accountant' && (
          <div className="max-w-md mx-auto">
            <Card className="border-blue-200">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle>Confirmar Selección</CardTitle>
                <CardDescription>Has seleccionado:</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg text-gray-900">Soy Contador</h3>
                  <p className="text-sm text-gray-600 mt-1">Administrarás contabilidad de múltiples empresas</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-3 bg-purple-100 text-purple-800">Modo Contador</span>
                </div>
                <div className="space-y-3">
                  <Button className="w-full gap-2" onClick={handleContinueFromWizard} disabled={isLoading}>
                    {isLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Configurando...</> : <><CheckCircle className="h-4 w-4" />Confirmar y Continuar</>}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => { setStep('mode-selection'); setSelectedMode(null); }} disabled={isLoading}>Volver</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* BUSINESS SETUP WIZARD */}
        {step === 'business-setup' && (
          <div className="max-w-5xl mx-auto">
            {/* Progress Steps - Filter out step 2 if user has accountant */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {wizardSteps.filter(s => !(s.id === 2 && hasAccountant === true)).map((s, idx, arr) => (
                  <div key={s.id} className="flex items-center">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${wizardStep === s.id ? 'bg-blue-600 text-white' : wizardStep > s.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {wizardStep > s.id ? <CheckCircle className="h-5 w-5" /> : s.icon}
                      <span className="text-sm font-medium hidden sm:block">{s.name}</span>
                    </div>
                    {idx < arr.length - 1 && <ChevronRight className="h-5 w-5 text-gray-400 mx-2" />}
                  </div>
                ))}
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${(wizardStep / (hasAccountant === true ? 4 : 5)) * 100}%` }} />
              </div>
            </div>

            {/* STEP 1: Company Data */}
            {wizardStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building className="h-6 w-6" /> Datos de la Empresa</CardTitle>
                  <CardDescription>Ingresa la información básica de tu negocio</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                      <Input id="companyName" value={companyData.name} onChange={(e) => setCompanyData({...companyData, name: e.target.value})} placeholder="Ej: Empresa S.A." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rtn">RTN *</Label>
                      <Input id="rtn" value={companyData.rtn} onChange={(e) => setCompanyData({...companyData, rtn: e.target.value})} placeholder="08011999012345" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Textarea id="address" value={companyData.address} onChange={(e) => setCompanyData({...companyData, address: e.target.value})} placeholder="Dirección completa de la empresa" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">País *</Label>
                      <select 
                        id="country" 
                        className="w-full border rounded-lg px-3 py-2"
                        value={companyData.country} 
                        onChange={(e) => setCompanyData({...companyData, country: e.target.value})}
                      >
                        <option value="Honduras">Honduras</option>
                        <option value="Guatemala">Guatemala</option>
                        <option value="El Salvador">El Salvador</option>
                        <option value="Nicaragua">Nicaragua</option>
                        <option value="Costa Rica">Costa Rica</option>
                        <option value="Panamá">Panamá</option>
                        <option value="México">México</option>
                        <option value="Estados Unidos">Estados Unidos</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input id="email" type="email" value={companyData.email} onChange={(e) => setCompanyData({...companyData, email: e.target.value})} placeholder="contacto@empresa.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone">Teléfono del Cliente / Contacto</Label>
                      <Input id="clientPhone" value={companyData.clientPhone} onChange={(e) => setCompanyData({...companyData, clientPhone: e.target.value})} placeholder="+504 XXXX-XXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Teléfono de la Empresa</Label>
                      <Input id="companyPhone" value={companyData.companyPhone} onChange={(e) => setCompanyData({...companyData, companyPhone: e.target.value})} placeholder="+504 XXXX-XXXX" />
                    </div>
                  </div>
                  
                  {/* Accountant Question */}
                  <div className="mt-6 pt-6 border-t">
                    <Label className="text-base font-semibold mb-4 block">¿Quién lleva la contabilidad? *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${hasAccountant === false ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                        onClick={() => setHasAccountant(false)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${hasAccountant === false ? 'border-blue-600' : 'border-gray-400'}`}>
                            {hasAccountant === false && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Yo la llevo</p>
                            <p className="text-sm text-gray-500">Configuraré el catálogo de cuentas</p>
                          </div>
                        </div>
                      </div>
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${hasAccountant === true ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                        onClick={() => setHasAccountant(true)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${hasAccountant === true ? 'border-blue-600' : 'border-gray-400'}`}>
                            {hasAccountant === true && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Tengo contador</p>
                            <p className="text-sm text-gray-500">Mi contador configurará las cuentas</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 2: Account Catalog */}
            {wizardStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BookOpen className="h-6 w-6" /> Catálogo de Cuentas</CardTitle>
                  <CardDescription>Selecciona las cuentas contables que utilizará tu empresa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Código</th>
                          <th className="px-4 py-3 text-left font-medium">Nombre</th>
                          <th className="px-4 py-3 text-left font-medium">Tipo</th>
                          <th className="px-4 py-3 text-center font-medium">Seleccionar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {accounts.map((account, idx) => (
                          <tr key={account.code} className={account.selected ? 'bg-blue-50' : ''}>
                            <td className="px-4 py-2 font-mono">{account.code}</td>
                            <td className="px-4 py-2">{account.name}</td>
                            <td className="px-4 py-2 capitalize">{account.type}</td>
                            <td className="px-4 py-2 text-center">
                              <input type="checkbox" checked={account.selected} onChange={() => handleAccountToggle(idx)} className="h-4 w-4" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{accounts.filter(a => a.selected).length} cuentas seleccionadas</p>
                </CardContent>
              </Card>
            )}

            {/* STEP 3: Company Image */}
            {wizardStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ImageIcon className="h-6 w-6" /> Imagen de la Empresa</CardTitle>
                  <CardDescription>Sube el logo de tu empresa (opcional)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain rounded-lg" />
                      ) : (
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          <Upload className="h-4 w-4" /> Subir Logo
                        </div>
                        <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </Label>
                      {logoPreview && (
                        <Button variant="outline" onClick={() => setLogoPreview(null)}>Eliminar</Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Formatos: JPG, PNG, SVG. Máximo 2MB</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 4: Sales Configuration */}
            {wizardStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Configuración de Ventas</CardTitle>
                  <CardDescription>Configura los parámetros para facturación</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Habilitar CAI (Autorización de Impresión)</h4>
                      <p className="text-sm text-gray-500">Para facturación electrónica ante la SAR</p>
                    </div>
                    <input type="checkbox" checked={salesConfig.caiEnabled} onChange={(e) => setSalesConfig({...salesConfig, caiEnabled: e.target.checked})} className="h-5 w-5" />
                  </div>
                  
                  {salesConfig.caiEnabled && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div className="space-y-2">
                        <Label>Tipo de CAI *</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div 
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${salesConfig.caiType === 'auto_impresion' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                            onClick={() => setSalesConfig({...salesConfig, caiType: 'auto_impresion'})}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 mx-auto mb-2 flex items-center justify-center ${salesConfig.caiType === 'auto_impresion' ? 'border-blue-600' : 'border-gray-400'}`}>
                              {salesConfig.caiType === 'auto_impresion' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                            </div>
                            <p className="font-medium text-sm">Auto-impresión</p>
                            <p className="text-xs text-gray-500">Imprimo mis propias facturas</p>
                          </div>
                          <div 
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${salesConfig.caiType === 'imprenta' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                            onClick={() => setSalesConfig({...salesConfig, caiType: 'imprenta'})}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 mx-auto mb-2 flex items-center justify-center ${salesConfig.caiType === 'imprenta' ? 'border-blue-600' : 'border-gray-400'}`}>
                              {salesConfig.caiType === 'imprenta' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                            </div>
                            <p className="font-medium text-sm">Imprenta autorizada</p>
                            <p className="text-xs text-gray-500">Tercero imprime mis facturas</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Código CAI</Label>
                        <Input value={salesConfig.caiCode} onChange={(e) => setSalesConfig({...salesConfig, caiCode: e.target.value})} placeholder="XXXX-XXXX-XXXX-XXXX" />
                      </div>
                    </div>
                  )}

                  {/* Multiple Taxes Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Tasas de Impuesto</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addTax}>
                        <Plus className="h-4 w-4 mr-1" /> Agregar Impuesto
                      </Button>
                    </div>
                    
                    {salesConfig.taxes.map((tax, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                        <div className="col-span-4 space-y-2">
                          <Label className="text-sm">Tasa (%)</Label>
                          <Input 
                            type="number" 
                            value={tax.rate} 
                            onChange={(e) => updateTax(index, 'rate', Number(e.target.value))} 
                            placeholder="15" 
                          />
                        </div>
                        <div className="col-span-6 space-y-2">
                          <Label className="text-sm">Tipo de Impuesto</Label>
                          <select 
                            className="w-full border rounded-lg px-3 py-2"
                            value={tax.type} 
                            onChange={(e) => updateTax(index, 'type', e.target.value)}
                          >
                            <option value="ISV">ISV - Impuesto Sobre Ventas</option>
                            <option value="IT">IT - Impuesto Sobre Transferencia</option>
                            <option value="IVA">IVA - Impuesto al Valor Agregado</option>
                            <option value="ISR">ISR - Impuesto Sobre Renta</option>
                            <option value="Exento">Exento</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          {salesConfig.taxes.length > 1 && (
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeTax(index)}
                              className="text-red-600 hover:text-red-700 w-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Prefijo de Factura</Label>
                      <Input value={salesConfig.invoicePrefix} onChange={(e) => setSalesConfig({...salesConfig, invoicePrefix: e.target.value})} placeholder="001-001-" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 5: Bank Accounts */}
            {wizardStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Landmark className="h-6 w-6" /> Cuentas Bancarias</CardTitle>
                  <CardDescription>Agrega las cuentas bancarias de tu empresa (opcional). Los números se mostrarán enmascarados por seguridad.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input placeholder="Nombre del Banco" value={newBankAccount.bankName} onChange={(e) => setNewBankAccount({...newBankAccount, bankName: e.target.value})} />
                    <Input placeholder="Número de Cuenta" value={newBankAccount.accountNumber} onChange={(e) => setNewBankAccount({...newBankAccount, accountNumber: e.target.value})} />
                    <select className="border rounded-lg px-3 py-2" value={newBankAccount.accountType} onChange={(e) => setNewBankAccount({...newBankAccount, accountType: e.target.value})}>
                      <option value="">Tipo de Cuenta</option>
                      <option value="ahorro">Ahorro</option>
                      <option value="corriente">Corriente</option>
                      <option value="plazo_fijo">Plazo Fijo</option>
                    </select>
                    <select className="border rounded-lg px-3 py-2" value={newBankAccount.currency} onChange={(e) => setNewBankAccount({...newBankAccount, currency: e.target.value})}>
                      <option value="HNL">Lempiras (HNL)</option>
                      <option value="USD">Dólares (USD)</option>
                    </select>
                  </div>
                  <Button onClick={addBankAccount} disabled={!newBankAccount.bankName || !newBankAccount.accountNumber} className="w-full">
                    <Plus className="h-4 w-4 mr-2" /> Agregar Cuenta
                  </Button>

                  {bankAccounts.length > 0 && (
                    <div className="border rounded-lg overflow-hidden mt-4">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Banco</th>
                            <th className="px-4 py-2 text-left">Número de Cuenta</th>
                            <th className="px-4 py-2 text-left">Tipo</th>
                            <th className="px-4 py-2 text-left">Moneda</th>
                            <th className="px-4 py-2 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {bankAccounts.map((account) => (
                            <tr key={account.id}>
                              <td className="px-4 py-2">{account.bankName}</td>
                              <td className="px-4 py-2 font-mono">
                                {account.accountNumberMasked 
                                  ? maskAccountNumber(account.accountNumber)
                                  : account.accountNumber
                                }
                              </td>
                              <td className="px-4 py-2 capitalize">{account.accountType}</td>
                              <td className="px-4 py-2">{account.currency}</td>
                              <td className="px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => toggleAccountVisibility(account.id)}
                                    title={account.accountNumberMasked ? "Mostrar número" : "Ocultar número"}
                                  >
                                    {account.accountNumberMasked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => removeBankAccount(account.id)} className="text-red-600 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Skip option */}
                  <div className="flex items-center justify-center pt-4 border-t">
                    <Button 
                      variant="ghost" 
                      onClick={() => setWizardStep(6)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <SkipForward className="h-4 w-4 mr-2" /> Omitir este paso
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Wizard Navigation */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => {
                if (wizardStep > 1) {
                  // Skip back from step 3 to step 1 if user has accountant (skip step 2)
                  if (wizardStep === 3 && hasAccountant === true) {
                    setWizardStep(1);
                  } else {
                    setWizardStep(wizardStep - 1);
                  }
                } else {
                  setStep('business-selection');
                }
              }}>
                <ArrowLeft className="h-4 w-4 mr-2" /> {wizardStep > 1 ? 'Anterior' : 'Volver'}
              </Button>
              {wizardStep < (hasAccountant === true ? 4 : 5) ? (
                <Button 
                  onClick={() => {
                    // Skip step 2 (account catalog) if user has accountant
                    if (wizardStep === 1 && hasAccountant === true) {
                      setWizardStep(3);
                    } else {
                      setWizardStep(wizardStep + 1);
                    }
                  }}
                  disabled={wizardStep === 1 && hasAccountant === null}
                >
                  Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : wizardStep === (hasAccountant === true ? 4 : 5) ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleContinueFromWizard} disabled={isLoading}>
                    <SkipForward className="h-4 w-4 mr-2" /> Saltar y Finalizar
                  </Button>
                  <Button onClick={handleContinueFromWizard} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                    {isLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />Guardando...</> : <><CheckCircle className="h-4 w-4 mr-2" />Finalizar Configuración</>}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          Puedes cambiar esta configuración más tarde en los ajustes de tu cuenta
        </div>
      </div>
    </div>
  );
}
