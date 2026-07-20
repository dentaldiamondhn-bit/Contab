'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, 
  LayoutDashboard, 
  BookOpen, 
  Receipt, 
  Package, 
  Users2, 
  BarChart3, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  Loader2,
  Zap,
  ShieldCheck,
  CircleDollarSign
} from 'lucide-react';

const AVAILABLE_MODULES = [
  {
    id: 'ACCOUNTING',
    name: 'Contabilidad Central',
    description: 'Libro diario, balanza de comprobación y cierres anuales.',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'BILLING',
    name: 'Facturación y Ventas',
    description: 'Gestión de facturas SAR, suscripciones y gastos.',
    icon: Receipt,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'INVENTORY',
    name: 'Inventario',
    description: 'Control de productos, existencias y movimientos de stock.',
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    id: 'CONTACTS',
    name: 'Contactos',
    description: 'Directorio de clientes, proveedores y prospectos.',
    icon: Users2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'REPORTS',
    name: 'Reportes y Análisis',
    description: 'Informes financieros avanzados y cumplimiento SAR.',
    icon: BarChart3,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
];

const PLANS = [
  {
    id: 'BASIC',
    name: 'Plan Emprendedor',
    price: 450,
    description: 'Ideal para pequeños negocios y profesionales independientes.',
    features: ['Hasta 2 usuarios', 'Contabilidad básica', 'Reportes SAR estándar'],
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'PRO',
    name: 'Plan Empresarial',
    price: 950,
    description: 'Para empresas en crecimiento que necesitan control total.',
    features: ['Usuarios ilimitados', 'Inventario avanzado', 'Soporte prioritario'],
    icon: ShieldCheck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState(1); // 1: Info, 2: Modules, 3: Plans, 4: Confirm
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    rtn: '',
    address: '',
    activeModules: ['ACCOUNTING', 'REPORTS'] as string[], // Modulos por defecto
    planId: 'BASIC' as string,
  });

  const toggleModule = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      activeModules: prev.activeModules.includes(moduleId)
        ? prev.activeModules.filter(id => id !== moduleId)
        : [...prev.activeModules, moduleId]
    }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tenant/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        alert('Error al configurar la empresa. Por favor, intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error during onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Stepper Header */}
        <div className="flex justify-between items-center px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                step >= i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
              </div>
              {i < 4 && <div className={`w-12 h-1 mx-2 ${step > i ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <Card className="shadow-xl border-none">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold">
              {step === 1 && 'Configura tu Empresa'}
              {step === 2 && 'Personaliza tu Espacio'}
              {step === 3 && 'Selecciona un Plan'}
              {step === 4 && '¡Todo Listo!'}
            </CardTitle>
            <CardDescription className="text-lg">
              {step === 1 && 'Cuéntanos un poco sobre tu negocio para empezar.'}
              {step === 2 && 'Selecciona los módulos que necesitas activar ahora.'}
              {step === 3 && 'Elige la suscripción que mejor se adapte a tus necesidades.'}
              {step === 4 && 'Revisa tu configuración antes de entrar a Contab.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Paso 1: Información de Empresa */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input 
                    id="companyName" 
                    placeholder="Ej. Inversiones Reyes S. de R.L."
                    value={formData.companyName}
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rtn">RTN (Opcional)</Label>
                  <Input 
                    id="rtn" 
                    placeholder="0000-0000-000000"
                    value={formData.rtn}
                    onChange={e => setFormData({...formData, rtn: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input 
                    id="address" 
                    placeholder="Tegucigalpa, Honduras"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
            )}

            {/* Paso 2: Selector de Módulos */}
            {step === 2 && (
              <div className="grid gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-muted-foreground mb-2">
                  Puedes activar o desactivar estos módulos más tarde en la configuración.
                </p>
                {AVAILABLE_MODULES.map((module) => (
                  <div 
                    key={module.id}
                    onClick={() => toggleModule(module.id)}
                    className={`flex items-start space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.activeModules.includes(module.id) 
                        ? 'border-blue-600 bg-blue-50/30' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${module.bgColor} ${module.color}`}>
                      <module.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">{module.name}</h4>
                        <Checkbox 
                          checked={formData.activeModules.includes(module.id)}
                          onCheckedChange={() => toggleModule(module.id)}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paso 3: Selección de Plan */}
            {step === 3 && (
              <div className="grid gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {PLANS.map((plan) => (
                  <div 
                    key={plan.id}
                    onClick={() => setFormData({...formData, planId: plan.id})}
                    className={`flex items-start space-x-4 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.planId === plan.id 
                        ? 'border-blue-600 bg-blue-50/30' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`p-3 rounded-lg ${plan.bgColor} ${plan.color}`}>
                      <plan.icon className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xl text-gray-900">{plan.name}</h4>
                          <p className="text-sm text-gray-600">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-gray-900">L {plan.price}</span>
                          <p className="text-xs text-gray-500">/ mes</p>
                        </div>
                      </div>
                      <ul className="mt-4 space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-700">
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paso 4: Confirmación Final */}
            {step === 4 && (
              <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <LayoutDashboard className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-500">Resumen de cuenta</h4>
                  <p className="text-2xl font-bold text-gray-900">{formData.companyName}</p>
                  <p className="text-sm text-gray-600">{formData.rtn || 'Sin RTN registrado'}</p>
                </div>
                
                <div className="flex items-center justify-center gap-3 p-3 bg-gray-50 rounded-lg max-w-sm mx-auto">
                  <CircleDollarSign className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-700">
                    {PLANS.find(p => p.id === formData.planId)?.name}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="font-bold text-gray-900 text-lg">L {PLANS.find(p => p.id === formData.planId)?.price}</span>
                </div>

                <div className="pt-4">
                  <h4 className="font-medium text-gray-500 mb-3 text-sm">Módulos que activaremos para ti:</h4>
                  <div className="flex flex-wrap justify-center gap-2">
                    {formData.activeModules.map(modId => {
                      const mod = AVAILABLE_MODULES.find(m => m.id === modId);
                      return (
                        <span key={modId} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          {mod?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between pt-6 border-t mt-6">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Atrás
              </Button>
            ) : <div />}

            {step < 4 ? (
              <Button 
                onClick={handleNext} 
                disabled={step === 1 && !formData.companyName}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Siguiente <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 h-4" /> Configurando...
                  </>
                ) : (
                  <>
                    Comenzar ahora <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}