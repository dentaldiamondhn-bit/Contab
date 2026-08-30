'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  SkipForward,
  CreditCard,
  Wallet,
  FileText,
  Check
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

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  maxUsers: number;
  features: string[];
  isActive: boolean;
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
  { id: 2, name: 'Seleccionar Plan', icon: <Calculator className="h-5 w-5" /> },
  { id: 3, name: 'Catálogo Cuentas', icon: <BookOpen className="h-5 w-5" />, optional: true },
  { id: 4, name: 'Imagen', icon: <ImageIcon className="h-5 w-5" /> },
  { id: 5, name: 'Config. Ventas', icon: <ShoppingCart className="h-5 w-5" /> },
  { id: 6, name: 'Términos', icon: <FileText className="h-5 w-5" /> },
  { id: 7, name: 'Método de Pago', icon: <CreditCard className="h-5 w-5" /> }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.username || '');
  const [selectedMode, setSelectedMode] = useState<'accountant' | 'business' | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'mode-selection' | 'business-selection' | 'confirmation' | 'business-setup'>('mode-selection');
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [personalData, setPersonalData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<Plan[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalConfirmEmail, setPaypalConfirmEmail] = useState('');
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: ''
  });
  const [isGooglePayModalOpen, setIsGooglePayModalOpen] = useState(false);
  const [googlePayEmail, setGooglePayEmail] = useState('');
  const [googlePayConfirmEmail, setGooglePayConfirmEmail] = useState('');
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [stripeEmail, setStripeEmail] = useState('');
  const [stripeConfirmEmail, setStripeConfirmEmail] = useState('');

  // Fetch plans from API - maneja respuesta HTML si no hay sesión
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/admin/plans-public');
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || !contentType.includes('application/json')) {
          // No bloquear onboarding si planes no cargan (ej: HTML de login)
          console.warn('Plans fetch no es JSON, usando lista vacía:', response.status);
          setPlans([]);
          return;
        }
        const data = await response.json();
        setPlans(data.plans || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
        setPlans([]);
      }
    };
    
    fetchPlans();
  }, []);

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

  const handleTogglePlan = (plan: Plan) => {
    setSelectedPlans(prev => {
      const exists = prev.find(p => p.id === plan.id);
      if (exists) {
        return prev.filter(p => p.id !== plan.id);
      }
      return [...prev, plan];
    });
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
    localStorage.setItem('personalData', JSON.stringify(personalData));
    localStorage.setItem('businessType', selectedBusinessType || 'contador');
    localStorage.setItem('businessName', companyData.name || businessTypeName || '');
    localStorage.setItem('companyData', JSON.stringify(companyData));
    localStorage.setItem('accountCatalog', JSON.stringify(accounts.filter(a => a.selected)));
    localStorage.setItem('salesConfig', JSON.stringify(salesConfig));
    localStorage.setItem('bankAccounts', JSON.stringify(bankAccounts));
    localStorage.setItem('selectedPaymentMethod', selectedPaymentMethod);
    localStorage.setItem('acceptedTerms', JSON.stringify(acceptedTerms));
    
    // Save to database if business mode with data
    if (selectedMode === 'business' && companyData.name) {
      try {
        console.log('🔄 Iniciando guardado en base de datos...');
        console.log('📊 Datos a guardar:', {
          companyName: companyData.name,
          businessType: selectedBusinessType,
          selectedPlans: selectedPlans.map(p => p.name),
          bankAccountsCount: bankAccounts.length
        });
        
        const result = await saveOnboardingData({
          companyData,
          bankAccounts,
          salesConfig,
          businessType: selectedBusinessType || 'otro',
          selectedPlans,
          selectedPaymentMethod
        });
        
        if (result.success) {
          console.log('✅ Datos guardados exitosamente en la base de datos');
          console.log('📊 Tenant ID:', result.tenantId);
          console.log('📊 Company ID:', result.companyId);
          
          // If Stripe is selected, redirect to Stripe checkout
          if (selectedPaymentMethod === 'stripe' && selectedPlans.length > 0) {
            const totalAmount = selectedPlans.reduce((sum, p) => sum + (p.total || 0), 0);
            const primaryPlan = selectedPlans[0];
            
            try {
              const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  planName: selectedPlans.length > 1 
                    ? `${primaryPlan.name} + ${selectedPlans.length - 1} más`
                    : primaryPlan.name,
                  planPrice: totalAmount,
                  customerEmail: companyData.email,
                  tenantId: result.tenantId
                })
              });
              
              const { url } = await response.json();
              if (url) {
                window.location.href = url;
                return;
              }
            } catch (stripeError) {
              console.error('Error creating Stripe session:', stripeError);
            }
          }
        } else {
          console.log('⚠️ Onboarding completado con errores:', result.error);
          console.log('🔄 Continuando al dashboard de todas formas...');
        }
      } catch (error) {
        console.error('❌ Error saving to database:', error);
        // Continue even if database save fails - data is in localStorage
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Redirigir al dashboard de tenant-admin después del onboarding
    // Los usuarios que crean un tenant son administradores de su propio tenant
    router.push('/tenant-admin/dashboard');
  };

  const handleAccountToggle = (index: number) => {
    const newAccounts = [...accounts];
    newAccounts[index].selected = !newAccounts[index].selected;
    setAccounts(newAccounts);
  };

  const handleSelectAllAccounts = () => {
    const newAccounts = accounts.map(account => ({ ...account, selected: true }));
    setAccounts(newAccounts);
  };

  const handleDeselectAllAccounts = () => {
    const newAccounts = accounts.map(account => ({ ...account, selected: false }));
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-cyan-700 border-b border-cyan-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-50 p-1.5 rounded-lg shadow-sm border border-cyan-200">
              <img src="/logo.png" alt="Diamond Accounting" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Diamond Accounting</h1>
              <p className="text-sm text-cyan-200">Sistema de Contabilidad Honduras</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {step === 'mode-selection' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Bienvenido{displayName ? `, ${displayName}` : ''} a Diamond Accounting!</h2>
              <p className="text-lg text-gray-600">Selecciona la opción que mejor describe tu perfil</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {userModes.map((mode) => (
                <Card key={mode.id} className={`cursor-pointer transition-all duration-200 hover:shadow-xl ${selectedMode === mode.id ? 'ring-2 ring-cyan-600 border-cyan-600 bg-cyan-50' : 'hover:border-blue-300 hover:shadow-lg'}`} onClick={() => handleSelectMode(mode.id)}>
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`p-5 rounded-full ${selectedMode === mode.id ? 'bg-cyan-600 text-white' : mode.id === 'accountant' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                        {mode.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{mode.name}</h3>
                        <p className="text-sm text-gray-500">{mode.description}</p>
                      </div>
                      {selectedMode === mode.id && <CheckCircle className="h-6 w-6 text-cyan-600" />}
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
                <Card key={business.id} className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedBusinessType === business.id ? 'ring-2 ring-cyan-600 border-cyan-600 bg-cyan-50' : 'hover:border-blue-300'}`} onClick={() => handleSelectBusinessType(business.id)}>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-3 rounded-full ${selectedBusinessType === business.id ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{business.icon}</div>
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
            <Card className="border-cyan-200">
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
            {/* Progress Steps - Filter out Catálogo Cuentas if user has accountant */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {wizardSteps.filter(s => !(s.id === 3 && hasAccountant === true)).map((s, idx, arr) => (
                  <div key={s.id} className="flex items-center">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${wizardStep === s.id ? 'bg-cyan-600 text-white' : wizardStep > s.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {wizardStep > s.id ? <CheckCircle className="h-5 w-5" /> : s.icon}
                      <span className="text-sm font-medium hidden sm:block">{s.name}</span>
                    </div>
                    {idx < arr.length - 1 && <ChevronRight className="h-5 w-5 text-gray-400 mx-2" />}
                  </div>
                ))}
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-cyan-600 rounded-full transition-all" style={{ width: `${(wizardStep / (hasAccountant === true ? 6 : 7)) * 100}%` }} />
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
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${hasAccountant === false ? 'border-cyan-600 bg-cyan-50' : 'border-gray-200 hover:border-blue-300'}`}
                        onClick={() => setHasAccountant(false)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${hasAccountant === false ? 'border-cyan-600' : 'border-gray-400'}`}>
                            {hasAccountant === false && <div className="w-2.5 h-2.5 bg-cyan-600 rounded-full" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Yo la llevo</p>
                            <p className="text-sm text-gray-500">Configuraré el catálogo de cuentas</p>
                          </div>
                        </div>
                      </div>
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${hasAccountant === true ? 'border-cyan-600 bg-cyan-50' : 'border-gray-200 hover:border-blue-300'}`}
                        onClick={() => setHasAccountant(true)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${hasAccountant === true ? 'border-cyan-600' : 'border-gray-400'}`}>
                            {hasAccountant === true && <div className="w-2.5 h-2.5 bg-cyan-600 rounded-full" />}
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

            {/* STEP 2: Plan Selection */}
            {wizardStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calculator className="h-6 w-6" /> Seleccionar Plan</CardTitle>
                  <CardDescription>Elige los planes que mejor se adapten a las necesidades de tu negocio</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {plans.map((plan) => {
                      const isSelected = selectedPlans.some(p => p.id === plan.id);
                      return (
                        <div
                          key={plan.id}
                          className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
                            isSelected
                              ? 'border-cyan-600 bg-cyan-50 shadow-lg'
                              : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                          }`}
                          onClick={() => handleTogglePlan(plan)}
                        >
                          <div className="absolute top-2 right-2">
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'border-cyan-600 bg-cyan-600' : 'border-gray-300'
                            }`}>
                              {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                            </div>
                          </div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">
                                L {plan.total?.toLocaleString()}
                                <span className="text-sm text-gray-500 font-normal">/mes</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                L {plan.unitPrice?.toLocaleString()} + L {plan.taxAmount?.toLocaleString()} ISV
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-medium">Usuarios:</span>
                              <span className="bg-gray-100 px-2 py-1 rounded">{plan.maxUsers}</span>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Características:</p>
                              <ul className="space-y-1">
                                {plan.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedPlans.length > 0 && (
                    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-cyan-100 rounded-lg">
                          <Calculator className="h-6 w-6 text-cyan-700" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Resumen de Factura</h4>
                          <p className="text-xs text-gray-500">Costo mensual de tus planes seleccionados</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {selectedPlans.map((plan) => (
                          <div key={plan.id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{plan.name}</span>
                            <span className="font-medium text-gray-900">L {plan.total?.toLocaleString()}</span>
                          </div>
                        ))}
                        
                        <div className="border-t border-cyan-200 pt-3 mt-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-gray-900">L {selectedPlans.reduce((sum, p) => sum + (p.subtotal || 0), 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm mt-1">
                            <span className="text-gray-600">ISV (15%)</span>
                            <span className="text-gray-900">L {selectedPlans.reduce((sum, p) => sum + (p.taxAmount || 0), 0).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="border-t border-cyan-300 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">Total a Pagar</span>
                            <span className="text-2xl font-bold text-cyan-700">
                              L {selectedPlans.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                              <span className="text-sm font-normal text-gray-500">/mes</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 3: Account Catalog */}
            {wizardStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BookOpen className="h-6 w-6" /> Catálogo de Cuentas</CardTitle>
                  <CardDescription>Selecciona las cuentas contables que utilizará tu empresa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{accounts.filter(a => a.selected).length}</span> de {accounts.length} cuentas seleccionadas
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSelectAllAccounts}
                        disabled={accounts.every(a => a.selected)}
                        className="text-xs"
                      >
                        Seleccionar Todas
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDeselectAllAccounts}
                        disabled={!accounts.some(a => a.selected)}
                        className="text-xs"
                      >
                        Deseleccionar Todas
                      </Button>
                    </div>
                  </div>
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
                          <tr key={account.code} className={account.selected ? 'bg-cyan-50' : ''}>
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
                </CardContent>
              </Card>
            )}

            {/* STEP 4: Company Image */}
            {wizardStep === 4 && (
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
                        <div className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
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

            {/* STEP 5: Sales Configuration */}
            {wizardStep === 5 && (
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
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${salesConfig.caiType === 'auto_impresion' ? 'border-cyan-600 bg-cyan-50' : 'border-gray-200 hover:border-blue-300'}`}
                            onClick={() => setSalesConfig({...salesConfig, caiType: 'auto_impresion'})}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 mx-auto mb-2 flex items-center justify-center ${salesConfig.caiType === 'auto_impresion' ? 'border-cyan-600' : 'border-gray-400'}`}>
                              {salesConfig.caiType === 'auto_impresion' && <div className="w-2 h-2 bg-cyan-600 rounded-full" />}
                            </div>
                            <p className="font-medium text-sm">Auto-impresión</p>
                            <p className="text-xs text-gray-500">Imprimo mis propias facturas</p>
                          </div>
                          <div 
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${salesConfig.caiType === 'imprenta' ? 'border-cyan-600 bg-cyan-50' : 'border-gray-200 hover:border-blue-300'}`}
                            onClick={() => setSalesConfig({...salesConfig, caiType: 'imprenta'})}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 mx-auto mb-2 flex items-center justify-center ${salesConfig.caiType === 'imprenta' ? 'border-cyan-600' : 'border-gray-400'}`}>
                              {salesConfig.caiType === 'imprenta' && <div className="w-2 h-2 bg-cyan-600 rounded-full" />}
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

            {/* STEP 6: Terms and Conditions */}
            {wizardStep === 6 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-6 w-6" /> Términos y Condiciones</CardTitle>
                  <CardDescription>Lee y acepta los términos de servicio de Diamond Accounting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border rounded-lg p-6 max-h-96 overflow-y-auto bg-gray-50">
                    <div className="space-y-4 text-sm text-gray-700">
                      <h3 className="font-bold text-lg text-gray-900">Términos y Condiciones de Uso</h3>
                      <p className="text-gray-500 text-xs">Última actualización: 28 de agosto de 2026</p>
                      
                      <p>Bienvenido a Diamond Accounting. Al utilizar nuestro servicio de software de contabilidad en la nube ("Servicio"), usted acepta los siguientes términos y condiciones.</p>
                      
                      <h4 className="font-semibold text-gray-900">1. Descripción del Servicio</h4>
                      <p>Diamond Accounting es una plataforma de contabilidad en la nube que ofrece gestión de facturación electrónica, control de inventario, reportes contables, chat de soporte y configuración de impuestos.</p>
                      
                      <h4 className="font-semibold text-gray-900">2. Suscripción y Pagos</h4>
                      <p>El uso del Servicio requiere una suscripción activa. Los precios están en Lempiras (HNL). El pago se procesa mensualmente de forma automática. Los pagos a través de Stripe, PayPal o Google Pay están sujetos a los términos de dichos proveedores.</p>
                      
                      <h4 className="font-semibold text-gray-900">3. Datos y Privacidad</h4>
                      <p>Usted mantiene la propiedad de sus datos. Utilizamos sus datos únicamente para proporcionar y mejorar el Servicio. Sus datos se almacenan en servidores seguros de Supabase (AWS). Puede exportar sus datos en cualquier momento.</p>
                      
                      <h4 className="font-semibold text-gray-900">4. Uso Aceptable</h4>
                      <p>Está prohibido utilizar el Servicio para actividades ilegales, violar leyes fiscales, acceder no autorizado a sistemas, interferir con el funcionamiento del Servicio o enviar contenido malicioso.</p>
                      
                      <h4 className="font-semibold text-gray-900">5. Limitación de Responsabilidad</h4>
                      <p>El Servicio se proporciona "tal cual". Diamond Accounting no brinda asesoría legal, fiscal o contable. Usted es responsable de cumplir con todas las regulaciones aplicables a su negocio.</p>
                      
                      <h4 className="font-semibold text-gray-900">6. Cancelación</h4>
                      <p>Puede cancelar su suscripción en cualquier momento. La cancelación será efectiva al final del período de facturación actual. Podrá exportar sus datos dentro de 30 días después de la terminación.</p>
                      
                      <p className="text-xs text-gray-500 mt-4">Para más detalles, consulta nuestros <a href="/terms" target="_blank" className="text-cyan-600 hover:underline">Términos y Condiciones completos</a>.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 border-2 rounded-lg bg-white cursor-pointer hover:bg-gray-50 transition-all" onClick={() => setAcceptedTerms(!acceptedTerms)}>
                    <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${acceptedTerms ? 'border-cyan-600 bg-cyan-600' : 'border-gray-300'}`}>
                      {acceptedTerms && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">He leído y acepto los Términos y Condiciones y la Política de Privacidad</p>
                      <p className="text-sm text-gray-500 mt-1">Debes aceptar los términos para continuar con la configuración de tu cuenta.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 7: Payment Method */}
            {wizardStep === 7 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CreditCard className="h-6 w-6" /> Método de Pago</CardTitle>
                  <CardDescription>Selecciona cómo deseas pagar el servicio de Diamond Accounting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Summary */}
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Resumen de tu Suscripción</h4>
                    <div className="space-y-3">
                      {selectedPlans.map((plan) => (
                        <div key={plan.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{plan.name}</span>
                          <span className="font-medium text-gray-900">L {plan.total?.toLocaleString()}/mes</span>
                        </div>
                      ))}
                      <div className="border-t border-cyan-200 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">Total Mensual</span>
                          <span className="text-2xl font-bold text-cyan-700">
                            L {selectedPlans.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}/mes
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Options */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Opciones de Pago</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pago con Tarjeta */}
                      <div 
                        className={`border-2 rounded-lg p-5 cursor-pointer transition-all ${
                          selectedPaymentMethod === 'card' 
                            ? 'border-cyan-600 bg-cyan-50' 
                            : 'border-gray-200 hover:border-cyan-300'
                        }`}
                        onClick={() => {
                          setSelectedPaymentMethod('card');
                          setIsCardModalOpen(true);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${selectedPaymentMethod === 'card' ? 'bg-cyan-100' : 'bg-gray-100'}`}>
                            <CreditCard className={`h-6 w-6 ${selectedPaymentMethod === 'card' ? 'text-cyan-700' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-900">Tarjeta de Crédito/Débito</h5>
                            <p className="text-sm text-gray-600 mt-1">Paga con tu tarjeta de forma segura</p>
                            <div className="mt-3">
                              {cardData.cardNumber ? (
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                    •••• •••• •••• {cardData.cardNumber.slice(-4)}
                                  </span>
                                  <span className="text-xs text-green-600">✓ Configurado</span>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  <div className="px-3 py-1 bg-gray-100 rounded text-xs font-medium">VISA</div>
                                  <div className="px-3 py-1 bg-gray-100 rounded text-xs font-medium">Mastercard</div>
                                  <div className="px-3 py-1 bg-gray-100 rounded text-xs font-medium">Amex</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedPaymentMethod === 'card' ? 'border-cyan-600 bg-cyan-600' : 'border-gray-300'
                          }`}>
                            {selectedPaymentMethod === 'card' && <Check className="h-4 w-4 text-white" />}
                          </div>
                        </div>
                      </div>

                      {/* PayPal */}
                      <div 
                        className={`border-2 rounded-lg p-5 cursor-pointer transition-all ${
                          selectedPaymentMethod === 'paypal' 
                            ? 'border-cyan-600 bg-cyan-50' 
                            : 'border-gray-200 hover:border-cyan-300'
                        }`}
                        onClick={() => {
                          setSelectedPaymentMethod('paypal');
                          setIsPayPalModalOpen(true);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${selectedPaymentMethod === 'paypal' ? 'bg-cyan-100' : 'bg-gray-100'}`}>
                            <Wallet className={`h-6 w-6 ${selectedPaymentMethod === 'paypal' ? 'text-cyan-700' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-900">PayPal</h5>
                            <p className="text-sm text-gray-600 mt-1">Paga de forma segura con tu cuenta PayPal</p>
                            <div className="mt-3">
                              {paypalEmail ? (
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">{paypalEmail}</span>
                                  <span className="text-xs text-green-600">✓ Configurado</span>
                                </div>
                              ) : (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">PayPal</span>
                              )}
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedPaymentMethod === 'paypal' ? 'border-cyan-600 bg-cyan-600' : 'border-gray-300'
                          }`}>
                            {selectedPaymentMethod === 'paypal' && <Check className="h-4 w-4 text-white" />}
                          </div>
                        </div>
                      </div>

                      {/* Google Pay */}
                      <div 
                        className={`border-2 rounded-lg p-5 cursor-pointer transition-all ${
                          selectedPaymentMethod === 'googlepay' 
                            ? 'border-cyan-600 bg-cyan-50' 
                            : 'border-gray-200 hover:border-cyan-300'
                        }`}
                        onClick={() => {
                          setSelectedPaymentMethod('googlepay');
                          setIsGooglePayModalOpen(true);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${selectedPaymentMethod === 'googlepay' ? 'bg-cyan-100' : 'bg-gray-100'}`}>
                            <svg className={`h-6 w-6 ${selectedPaymentMethod === 'googlepay' ? 'text-cyan-700' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-900">Google Pay</h5>
                            <p className="text-sm text-gray-600 mt-1">Paga rápido con tu cuenta de Google</p>
                            <div className="mt-3">
                              {googlePayEmail ? (
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">{googlePayEmail}</span>
                                  <span className="text-xs text-green-600">✓ Configurado</span>
                                </div>
                              ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">Google Pay</span>
                              )}
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedPaymentMethod === 'googlepay' ? 'border-cyan-600 bg-cyan-600' : 'border-gray-300'
                          }`}>
                            {selectedPaymentMethod === 'googlepay' && <Check className="h-4 w-4 text-white" />}
                          </div>
                        </div>
                      </div>

                      {/* Stripe */}
                      <div 
                        className={`border-2 rounded-lg p-5 cursor-pointer transition-all ${
                          selectedPaymentMethod === 'stripe' 
                            ? 'border-cyan-600 bg-cyan-50' 
                            : 'border-gray-200 hover:border-cyan-300'
                        }`}
                        onClick={() => {
                          setSelectedPaymentMethod('stripe');
                          setIsStripeModalOpen(true);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${selectedPaymentMethod === 'stripe' ? 'bg-cyan-100' : 'bg-gray-100'}`}>
                            <svg className={`h-6 w-6 ${selectedPaymentMethod === 'stripe' ? 'text-cyan-700' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19L3.36 21.8C5.578 22.926 8.621 24 12.165 24c2.631 0 4.809-.649 6.306-1.878 1.635-1.341 2.461-3.291 2.461-5.659 0-4.173-2.508-5.855-6.956-7.313z"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-900">Stripe</h5>
                            <p className="text-sm text-gray-600 mt-1">Plataforma de pagos seguros</p>
                            <div className="mt-3">
                              {stripeEmail ? (
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">{stripeEmail}</span>
                                  <span className="text-xs text-green-600">✓ Configurado</span>
                                </div>
                              ) : (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">Stripe</span>
                              )}
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedPaymentMethod === 'stripe' ? 'border-cyan-600 bg-cyan-600' : 'border-gray-300'
                          }`}>
                            {selectedPaymentMethod === 'stripe' && <Check className="h-4 w-4 text-white" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing Info */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-900">Información de Facturación</p>
                        <p className="mt-1">Recibirás tu factura mensual por correo electrónico. Los pagos se procesan el día 1 de cada mes.</p>
                        <p className="mt-1">Para cambios o cancelaciones, contáctanos al <span className="font-medium">+504 2234-5678</span></p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Wizard Navigation */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => {
                if (wizardStep > 1) {
                  // Skip back from Imagen to Plan if user has accountant (skip Catálogo)
                   if (wizardStep === 4 && hasAccountant === true) {
                    setWizardStep(2);
                  } else {
                    setWizardStep(wizardStep - 1);
                  }
                } else {
                  setStep('business-selection');
                }
              }}>
                <ArrowLeft className="h-4 w-4 mr-2" /> {wizardStep > 1 ? 'Anterior' : 'Volver'}
              </Button>
              {wizardStep < (hasAccountant === true ? 6 : 7) ? (
                <Button 
                  onClick={() => {
                    // Skip Catálogo if user has accountant
                    if (wizardStep === 2 && hasAccountant === true) {
                      setWizardStep(4);
                    } else {
                      setWizardStep(wizardStep + 1);
                    }
                  }}
                  disabled={
                    (wizardStep === 1 && hasAccountant === null) || 
                    (wizardStep === 2 && selectedPlans.length === 0) || 
                    (wizardStep === 6 && !acceptedTerms)
                  }
                >
                  Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : wizardStep === (hasAccountant === true ? 6 : 7) ? (
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

      {/* PayPal Modal */}
      <Dialog open={isPayPalModalOpen} onOpenChange={setIsPayPalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-blue-600" />
              Configurar Cuenta PayPal
            </DialogTitle>
            <DialogDescription>
              Ingresa tu correo electrónico de PayPal para recibir pagos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="paypal-email">Correo electrónico de PayPal</Label>
              <Input 
                id="paypal-email"
                type="email"
                placeholder="tu@email.com" 
                value={paypalEmail} 
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paypal-confirm-email">Confirmar correo electrónico</Label>
              <Input 
                id="paypal-confirm-email"
                type="email"
                placeholder="tu@email.com" 
                value={paypalConfirmEmail} 
                onChange={(e) => setPaypalConfirmEmail(e.target.value)}
              />
            </div>

            {paypalEmail && paypalConfirmEmail && paypalEmail !== paypalConfirmEmail && (
              <p className="text-sm text-red-600">Los correos electrónicos no coinciden</p>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Wallet className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">¿Cómo funciona?</p>
                  <p className="mt-1">Recibirás un enlace de pago por correo electrónico cada mes. Podrás pagar con tu saldo PayPal o con tarjeta de crédito/débito asociada a tu cuenta.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPayPalModalOpen(false);
                if (!paypalEmail) {
                  setSelectedPaymentMethod('card');
                }
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (paypalEmail && paypalConfirmEmail && paypalEmail === paypalConfirmEmail) {
                  setIsPayPalModalOpen(false);
                }
              }}
              disabled={!paypalEmail || !paypalConfirmEmail || paypalEmail !== paypalConfirmEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Guardar Cuenta PayPal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Modal */}
      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-cyan-600" />
              Configurar Tarjeta de Pago
            </DialogTitle>
            <DialogDescription>
              Ingresa los datos de tu tarjeta de crédito o débito
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Número de Tarjeta</Label>
              <Input 
                id="card-number"
                type="text"
                placeholder="1234 5678 9012 3456" 
                value={cardData.cardNumber} 
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                  const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
                  setCardData({...cardData, cardNumber: formatted});
                }}
                maxLength={19}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="card-holder">Nombre del Titular</Label>
              <Input 
                id="card-holder"
                type="text"
                placeholder="Como aparece en la tarjeta" 
                value={cardData.cardHolder} 
                onChange={(e) => setCardData({...cardData, cardHolder: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry-date">Fecha de Vencimiento</Label>
                <Input 
                  id="expiry-date"
                  type="text"
                  placeholder="MM/AA" 
                  value={cardData.expiryDate} 
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    if (value.length > 2) {
                      value = value.slice(0, 2) + '/' + value.slice(2);
                    }
                    setCardData({...cardData, expiryDate: value});
                  }}
                  maxLength={5}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input 
                  id="cvv"
                  type="text"
                  placeholder="123" 
                  value={cardData.cvv} 
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCardData({...cardData, cvv: value});
                  }}
                  maxLength={4}
                />
              </div>
            </div>
            
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-cyan-600 mt-0.5" />
                <div className="text-sm text-cyan-800">
                  <p className="font-medium">Pago Seguro</p>
                  <p className="mt-1">Tu información de tarjeta está protegida con encriptación de 256 bits. No almacenamos el número completo de tu tarjeta.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCardModalOpen(false);
                if (!cardData.cardNumber) {
                  setSelectedPaymentMethod('card');
                }
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (cardData.cardNumber && cardData.cardHolder && cardData.expiryDate && cardData.cvv) {
                  setIsCardModalOpen(false);
                }
              }}
              disabled={!cardData.cardNumber || !cardData.cardHolder || !cardData.expiryDate || !cardData.cvv}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Guardar Tarjeta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Pay Modal */}
      <Dialog open={isGooglePayModalOpen} onOpenChange={setIsGooglePayModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
              </svg>
              Configurar Google Pay
            </DialogTitle>
            <DialogDescription>
              Ingresa tu correo electrónico de Google para pagar con Google Pay
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="googlepay-email">Correo electrónico de Google</Label>
              <Input 
                id="googlepay-email"
                type="email"
                placeholder="tu@gmail.com" 
                value={googlePayEmail} 
                onChange={(e) => setGooglePayEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="googlepay-confirm-email">Confirmar correo electrónico</Label>
              <Input 
                id="googlepay-confirm-email"
                type="email"
                placeholder="tu@gmail.com" 
                value={googlePayConfirmEmail} 
                onChange={(e) => setGooglePayConfirmEmail(e.target.value)}
              />
            </div>

            {googlePayEmail && googlePayConfirmEmail && googlePayEmail !== googlePayConfirmEmail && (
              <p className="text-sm text-red-600">Los correos electrónicos no coinciden</p>
            )}
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-gray-600 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
                </svg>
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900">¿Cómo funciona Google Pay?</p>
                  <p className="mt-1">Recibirás una notificación en tu dispositivo para aprobar el pago. Podrás pagar con cualquier tarjeta guardada en tu cuenta de Google.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsGooglePayModalOpen(false);
                if (!googlePayEmail) {
                  setSelectedPaymentMethod('card');
                }
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (googlePayEmail && googlePayConfirmEmail && googlePayEmail === googlePayConfirmEmail) {
                  setIsGooglePayModalOpen(false);
                }
              }}
              disabled={!googlePayEmail || !googlePayConfirmEmail || googlePayEmail !== googlePayConfirmEmail}
              className="bg-gray-800 hover:bg-gray-900"
            >
              Guardar Google Pay
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Modal */}
      <Dialog open={isStripeModalOpen} onOpenChange={setIsStripeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="h-6 w-6 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19L3.36 21.8C5.578 22.926 8.621 24 12.165 24c2.631 0 4.809-.649 6.306-1.878 1.635-1.341 2.461-3.291 2.461-5.659 0-4.173-2.508-5.855-6.956-7.313z"/>
              </svg>
              Configurar Stripe
            </DialogTitle>
            <DialogDescription>
              Ingresa tu correo electrónico para crear una cuenta de Stripe
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="stripe-email">Correo electrónico</Label>
              <Input 
                id="stripe-email"
                type="email"
                placeholder="tu@empresa.com" 
                value={stripeEmail} 
                onChange={(e) => setStripeEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stripe-confirm-email">Confirmar correo electrónico</Label>
              <Input 
                id="stripe-confirm-email"
                type="email"
                placeholder="tu@empresa.com" 
                value={stripeConfirmEmail} 
                onChange={(e) => setStripeConfirmEmail(e.target.value)}
              />
            </div>

            {stripeEmail && stripeConfirmEmail && stripeEmail !== stripeConfirmEmail && (
              <p className="text-sm text-red-600">Los correos electrónicos no coinciden</p>
            )}
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-purple-600 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19L3.36 21.8C5.578 22.926 8.621 24 12.165 24c2.631 0 4.809-.649 6.306-1.878 1.635-1.341 2.461-3.291 2.461-5.659 0-4.173-2.508-5.855-6.956-7.313z"/>
                </svg>
                <div className="text-sm text-purple-800">
                  <p className="font-medium">¿Cómo funciona Stripe?</p>
                  <p className="mt-1">Stripe procesará todos tus pagos de forma segura. Acepta tarjetas de crédito, débito, y otros métodos de pago locales.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsStripeModalOpen(false);
                if (!stripeEmail) {
                  setSelectedPaymentMethod('card');
                }
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (stripeEmail && stripeConfirmEmail && stripeEmail === stripeConfirmEmail) {
                  setIsStripeModalOpen(false);
                }
              }}
              disabled={!stripeEmail || !stripeConfirmEmail || stripeEmail !== stripeConfirmEmail}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Guardar Stripe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
