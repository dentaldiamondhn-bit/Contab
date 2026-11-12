'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CreditCard, Wallet, Check, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const paymentMethods: PaymentMethod[] = [
  { id: 'card', name: 'Tarjeta de Crédito/Débito', description: 'Paga con tu tarjeta de forma segura', icon: <CreditCard className="h-6 w-6" /> },
  { id: 'paypal', name: 'PayPal', description: 'Paga de forma segura con tu cuenta PayPal', icon: <Wallet className="h-6 w-6" /> },
  { id: 'googlepay', name: 'Google Pay', description: 'Paga rápido con tu cuenta de Google', icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg> },
  { id: 'stripe', name: 'Stripe', description: 'Plataforma de pagos seguros', icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19L3.36 21.8C5.578 22.926 8.621 24 12.165 24c2.631 0 4.809-.649 6.306-1.878 1.635-1.341 2.461-3.291 2.461-5.659 0-4.173-2.508-5.855-6.956-7.313z"/></svg> },
];

export default function BillingPaymentMethodPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [currentMethod, setCurrentMethod] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales de autenticación como en onboarding
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardData, setCardData] = useState({ cardNumber: '', cardHolder: '', expiryDate: '', cvv: '' });
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalConfirmEmail, setPaypalConfirmEmail] = useState('');
  const [isGooglePayModalOpen, setIsGooglePayModalOpen] = useState(false);
  const [googlePayEmail, setGooglePayEmail] = useState('');
  const [googlePayConfirmEmail, setGooglePayConfirmEmail] = useState('');
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [stripeEmail, setStripeEmail] = useState('');
  const [stripeConfirmEmail, setStripeConfirmEmail] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('selectedPaymentMethod') || localStorage.getItem('paymentMethod');
    const savedCard = localStorage.getItem('cardData');
    const savedPaypal = localStorage.getItem('paypalEmail');
    const savedGoogle = localStorage.getItem('googlePayEmail');
    const savedStripe = localStorage.getItem('stripeEmail');
    if (savedCard) try { setCardData(JSON.parse(savedCard)); } catch {}
    if (savedPaypal) setPaypalEmail(savedPaypal);
    if (savedGoogle) setGooglePayEmail(savedGoogle);
    if (savedStripe) setStripeEmail(savedStripe);

    if (saved) {
      setCurrentMethod(saved);
      setSelectedMethod(saved);
    } else {
      fetch('/api/tenant/my-tenant')
        .then(r => r.json())
        .then(d => {
          const m = d.tenant?.paymentMethod || d.tenant?.subscriptionPlan;
          if (m) { setCurrentMethod(m); setSelectedMethod(m); }
        })
        .catch(() => {});
    }
  }, []);

  const handleSelectMethod = (id: string) => {
    setSelectedMethod(id);
    // Autenticar como en onboarding: abrir modal correspondiente
    if (id === 'card') setIsCardModalOpen(true);
    else if (id === 'paypal') setIsPayPalModalOpen(true);
    else if (id === 'googlepay') setIsGooglePayModalOpen(true);
    else if (id === 'stripe') setIsStripeModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedMethod) {
      setMessage({ type: 'error', text: 'Selecciona un método de pago' });
      return;
    }
    // Validar que el método seleccionado esté autenticado
    if (selectedMethod === 'card' && !cardData.cardNumber) {
      setMessage({ type: 'error', text: 'Debes configurar tu tarjeta primero' });
      setIsCardModalOpen(true);
      return;
    }
    if (selectedMethod === 'paypal' && !paypalEmail) {
      setMessage({ type: 'error', text: 'Debes configurar tu cuenta PayPal' });
      setIsPayPalModalOpen(true);
      return;
    }
    if (selectedMethod === 'googlepay' && !googlePayEmail) {
      setMessage({ type: 'error', text: 'Debes configurar tu cuenta Google Pay' });
      setIsGooglePayModalOpen(true);
      return;
    }
    if (selectedMethod === 'stripe' && !stripeEmail) {
      setMessage({ type: 'error', text: 'Debes configurar tu cuenta Stripe' });
      setIsStripeModalOpen(true);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      localStorage.setItem('selectedPaymentMethod', selectedMethod);
      localStorage.setItem('paymentMethod', selectedMethod);
      localStorage.setItem('cardData', JSON.stringify(cardData));
      if (paypalEmail) localStorage.setItem('paypalEmail', paypalEmail);
      if (googlePayEmail) localStorage.setItem('googlePayEmail', googlePayEmail);
      if (stripeEmail) localStorage.setItem('stripeEmail', stripeEmail);
      try {
        await fetch('/api/tenant/my-tenant', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod: selectedMethod }),
        });
      } catch {}
      setCurrentMethod(selectedMethod);
      setMessage({ type: 'success', text: 'Método de pago actualizado correctamente' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al actualizar método de pago' });
    } finally {
      setSaving(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'method' | 'history'>('method');
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      const fetchPayments = async () => {
        setLoadingPayments(true);
        try {
          // Intentar primero endpoint de usuario, fallback a admin
          let res = await fetch('/api/billing/invoices?limit=100');
          let contentType = res.headers.get('content-type') || '';
          if (!res.ok || !contentType.includes('application/json')) {
            res = await fetch('/api/admin/billing/invoices?type=SUBSCRIPTION&limit=100');
            contentType = res.headers.get('content-type') || '';
            if (!res.ok || !contentType.includes('application/json')) {
              setPayments([]);
              return;
            }
          }
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.invoices || data.data || []);
          setPayments(list);
        } catch {
          setPayments([]);
        } finally {
          setLoadingPayments(false);
        }
      };
      fetchPayments();
    }
  }, [activeTab]);

  const getMethodLabel = (pm: string) => {
    const m = paymentMethods.find(x => x.id === pm);
    return m ? m.name : pm || '—';
  };
  const getMethodIcon = (pm: string) => {
    const m = paymentMethods.find(x => x.id === pm);
    return m ? m.icon : <CreditCard className="h-4 w-4" />;
  };

  const current = paymentMethods.find(m => m.id === currentMethod);

  // Datos para tarjeta membresía estilo imagen
  const [membershipPlan, setMembershipPlan] = useState<any>(null);
  const [memberSince, setMemberSince] = useState<string>('');
  const [extraMembers, setExtraMembers] = useState<number>(0);
  const [nextPayment, setNextPayment] = useState<string>('');

  useEffect(() => {
    // Cargar plan y fechas para tarjeta membresía
    let hasPlanFromStorage = false;
    try {
      const raw = localStorage.getItem('selectedPlans');
      if (raw) {
        const plans = JSON.parse(raw);
        if (Array.isArray(plans) && plans.length > 0) { setMembershipPlan(plans[0]); hasPlanFromStorage = true; }
      }
    } catch {}
    // Intentar desde tenant (para plan y fechas)
    fetch('/api/tenant/my-tenant').then(r=>r.json()).then(d=>{
      const t = d.tenant;
      if (t?.created_at || t?.createdAt) {
        const d2 = new Date(t.created_at || t.createdAt);
        setMemberSince(d2.toLocaleDateString('es-HN', { month: 'long', year: 'numeric' }));
        const next = new Date(d2);
        next.setMonth(next.getMonth()+1); next.setDate(21);
        setNextPayment(next.toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' }));
      }
      if (t?.maxUsers) setExtraMembers(Math.max(0, (t.maxUsers || 1) - 1));
      // Si no había plan en localStorage, usar el del tenant
      if (!hasPlanFromStorage && t?.subscriptionPlan) {
        // subscriptionPlan es string (nombre) - buscar su total en Plan table via API
        fetch('/api/admin/plans-public').then(r=>r.json()).then(pd=>{
          const found = (pd.plans || []).find((p:any) => p.name === t.subscriptionPlan || p.code === t.subscriptionPlan);
          if (found) setMembershipPlan(found);
          else setMembershipPlan({ name: t.subscriptionPlan, total: 0, price: 0 } as any);
        }).catch(()=>{ if (!hasPlanFromStorage) setMembershipPlan({ name: t.subscriptionPlan, total: 0 } as any); });
      }
    }).catch(()=>{});
    // Fallback si no hay tenant date, usar hoy
    if (!memberSince) {
      const now = new Date();
      setMemberSince(now.toLocaleDateString('es-HN', { month: 'long', year: 'numeric' }));
      const next = new Date(); next.setMonth(next.getMonth()+1); next.setDate(21);
      setNextPayment(next.toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' }));
    }
    if (!nextPayment) {
      const next = new Date(); next.setMonth(next.getMonth()+1); next.setDate(21);
      setNextPayment(next.toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' }));
    }
  }, []);

  // Actualizar extraMembers desde plan si no vino de tenant
  useEffect(() => {
    if (membershipPlan && extraMembers === 0 && membershipPlan.maxUsers) {
      setExtraMembers(Math.max(0, (membershipPlan.maxUsers || 1) - 1));
    }
  }, [membershipPlan, extraMembers]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/account/profile')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver al Perfil
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Método de Pago de Suscripción</h1>
          <p className="text-gray-600">Actualiza cómo pagas tu suscripción a Diamond Accounting</p>
        </div>
      </div>

      {/* Pestanas */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('method')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'method' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Método de Pago
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Pagos Realizados
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {activeTab === 'method' && (
        <>
          {/* Tarjeta Membresía estilo imagen */}
          <Card className="overflow-hidden p-0 border shadow-sm">
            <div className="bg-gradient-to-r from-indigo-700 to-purple-600 text-white px-6 py-3 text-sm font-semibold">
              Miembro desde {memberSince || 'septiembre 2022'}
            </div>
            <CardContent className="p-6 space-y-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{membershipPlan?.name || 'Plan Estándar'}</h3>
                <p className="text-sm text-gray-500">Con {extraMembers} miembro{extraMembers !== 1 ? 's' : ''} extra</p>
              </div>
              <div>
                <p className="text-gray-700">Próximo pago: {nextPayment || '21 de septiembre de 2026'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Método Actual */}
          <Card className="border-cyan-200 bg-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-cyan-600" />Método Actual</CardTitle>
              <CardDescription>Este es el método con el que se cobra tu suscripción</CardDescription>
            </CardHeader>
            <CardContent>
              {current ? (
                <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                  <div className="p-3 bg-cyan-100 rounded-lg text-cyan-700">{current.icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{current.name}</p>
                    <p className="text-sm text-gray-600">{current.description}</p>
                    {current.id === 'card' && cardData.cardNumber && <p className="text-xs text-green-600 mt-1">•••• •••• •••• {cardData.cardNumber.slice(-4)} ✓</p>}
                    {current.id === 'paypal' && paypalEmail && <p className="text-xs text-green-600 mt-1">{paypalEmail} ✓</p>}
                    {current.id === 'googlepay' && googlePayEmail && <p className="text-xs text-green-600 mt-1">{googlePayEmail} ✓</p>}
                    {current.id === 'stripe' && stripeEmail && <p className="text-xs text-green-600 mt-1">{stripeEmail} ✓</p>}
                  </div>
                  <Badge className="bg-green-100 text-green-800">Activo</Badge>
                </div>
              ) : (
                <p className="text-sm text-gray-600 p-4 bg-white rounded-lg border">No tienes método de pago configurado. Selecciona uno abajo.</p>
              )}
            </CardContent>
          </Card>

          {/* Otras Opciones */}
          <Card>
            <CardHeader>
              <CardTitle>Otras opciones disponibles</CardTitle>
              <CardDescription>Elige el método que prefieras y autentícate como en el onboarding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((m) => {
                  const isSelected = selectedMethod === m.id;
                  const isCurrent = currentMethod === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectMethod(m.id)}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${isSelected ? 'border-cyan-600 bg-cyan-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${isSelected ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{m.icon}</div>
                        <div>
                          <p className="font-medium text-gray-900">{m.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{m.description}</p>
                        </div>
                        {isCurrent && <Badge variant="outline" className="text-xs">Actual</Badge>}
                        {isSelected && !isCurrent && <Badge className="bg-cyan-600 text-white text-xs">Seleccionado</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => router.push('/account/profile')}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving || !selectedMethod || selectedMethod === currentMethod} className="bg-cyan-600 hover:bg-cyan-700">
                  {saving ? 'Guardando...' : 'Guardar Método de Pago'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Pagos Realizados</CardTitle>
            <CardDescription>Historial de pagos y método utilizado</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <div className="text-center py-8 text-gray-500">Cargando pagos...</div>
            ) : payments.length === 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1000px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium min-w-[170px]">Fecha</th>
                        <th className="px-6 py-3 text-left font-medium min-w-[200px]">Concepto</th>
                        <th className="px-6 py-3 text-right font-medium min-w-[140px]">Monto a Cobrar</th>
                        <th className="px-6 py-3 text-center font-medium min-w-[140px]">Método</th>
                        <th className="px-6 py-3 text-center font-medium min-w-[120px]">Estado</th>
                        <th className="px-6 py-3 text-center font-medium min-w-[120px]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr className="hover:bg-gray-50 bg-cyan-50/30">
                        <td className="px-6 py-3 whitespace-nowrap">{nextPayment || new Date().toLocaleDateString('es-HN')}</td>
                        <td className="px-6 py-3 font-medium">{membershipPlan?.name || 'Plan Actual'} <span className="ml-2 text-xs px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full">Ciclo actual</span></td>
                        <td className="px-6 py-3 text-right font-bold text-cyan-700 whitespace-nowrap">L {(membershipPlan?.total ?? membershipPlan?.price ?? 0).toLocaleString()}</td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-gray-100 border whitespace-nowrap">
                            <span className="flex items-center gap-1">{getMethodIcon(currentMethod || '')} {getMethodLabel(currentMethod || '')}</span>
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Button variant="outline" size="sm" disabled className="h-8 px-3 opacity-50 cursor-not-allowed">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Ver Factura
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 text-center">Ciclo que está ahorita - próximo cobro con el método actual</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium min-w-[170px]">Fecha</th>
                      <th className="px-6 py-3 text-left font-medium min-w-[200px]">Concepto</th>
                      <th className="px-6 py-3 text-right font-medium min-w-[140px]">Monto a Cobrar</th>
                      <th className="px-6 py-3 text-center font-medium min-w-[140px]">Método</th>
                      <th className="px-6 py-3 text-center font-medium min-w-[120px]">Estado</th>
                      <th className="px-6 py-3 text-center font-medium min-w-[120px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((p: any) => {
                      const montoCobrar = p.total ?? p.amount ?? p.subtotal ?? 0;
                      return (
                      <tr key={p.id || p.invoiceNumber} className="hover:bg-gray-50">
                        <td className="px-6 py-3 whitespace-nowrap">{p.date ? new Date(p.date).toLocaleDateString('es-HN') : p.issueDate ? new Date(p.issueDate).toLocaleDateString('es-HN') : '-'}</td>
                        <td className="px-6 py-3">{p.customerName || p.description || p.planName || 'Suscripción'}</td>
                        <td className="px-6 py-3 text-right font-bold text-cyan-700 whitespace-nowrap">L {montoCobrar.toLocaleString()}</td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-gray-100 border whitespace-nowrap">
                            <span className="flex items-center gap-1">{getMethodIcon(p.payment_method || p.paymentMethod || p.method || '')} {getMethodLabel(p.payment_method || p.paymentMethod || p.method || '')}</span>
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Badge className={p.status === 'PAID' || p.status === 'PAGADA' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{p.status || 'Pagado'}</Badge>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Button variant="outline" size="sm" onClick={() => {
                            const id = p.id || p.invoiceNumber;
                            if (id) router.push(`/billing/${id}`);
                            else window.print();
                          }} className="h-8 px-3">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Ver Factura
                          </Button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modales de autenticación - iguales a onboarding */}
      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-6 w-6 text-cyan-600" />Configurar Tarjeta</DialogTitle>
            <DialogDescription>Ingresa los datos de tu tarjeta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Número de Tarjeta</Label>
              <Input type="text" placeholder="1234 5678 9012 3456" value={cardData.cardNumber} onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0,16);
                const f = v.replace(/(\d{4})/g, '$1 ').trim();
                setCardData({...cardData, cardNumber: f});
              }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Titular</Label>
                <Input placeholder="Juan Pérez" value={cardData.cardHolder} onChange={(e) => setCardData({...cardData, cardHolder: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>CVV</Label>
                <Input placeholder="123" value={cardData.cvv} onChange={(e) => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0,3)})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vencimiento MM/AA</Label>
              <Input placeholder="12/30" value={cardData.expiryDate} onChange={(e) => setCardData({...cardData, expiryDate: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsCardModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsCardModalOpen(false)} disabled={!cardData.cardNumber || !cardData.cardHolder || !cardData.cvv} className="bg-cyan-600 hover:bg-cyan-700">Guardar Tarjeta</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPayPalModalOpen} onOpenChange={setIsPayPalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="h-6 w-6 text-blue-600" />Conectar PayPal</DialogTitle>
            <DialogDescription>Conecta tu cuenta PayPal de forma segura o ingresa tu correo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'sb') === 'sb' ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <p className="font-medium">PayPal en modo demo</p>
                <p className="mt-1">Configura tus credenciales reales en <code>.env</code> <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> desde <a href="https://developer.paypal.com" target="_blank" className="underline">developer.paypal.com</a> para habilitar el botón real. Por ahora ingresa tu correo PayPal abajo.</p>
              </div>
            ) : (
              <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'sb', currency: 'USD', intent: 'capture' }}>
                <PayPalButtons
                  style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'paypal' }}
                  createOrder={async () => {
                    const res = await fetch('/api/paypal/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: '1.00', currency: 'USD' }) });
                    const data = await res.json();
                    if (data.mock) {
                      setPaypalEmail(paypalEmail || 'demo@paypal.com');
                      localStorage.setItem('paypalEmail', paypalEmail || 'demo@paypal.com');
                      setIsPayPalModalOpen(false);
                      setMessage({ type: 'success', text: 'PayPal conectado en modo demo' });
                      throw new Error('mock');
                    }
                    return data.id;
                  }}
                  onApprove={async (data) => {
                    try {
                      const res = await fetch('/api/paypal/capture-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: data.orderID }) });
                      const capture = await res.json();
                      // PayPal retorna payer.email_address en sandbox/live
                      const payerEmailFromPayPal = capture?.payer?.email_address || capture?.payment_source?.paypal?.email_address || capture?.payer?.email || null;
                      const payerName = capture?.payer?.name ? `${capture.payer.name.given_name || ''} ${capture.payer.name.surname || ''}`.trim() : '';
                      if (payerEmailFromPayPal) {
                        setPaypalEmail(payerEmailFromPayPal);
                        setPaypalConfirmEmail(payerEmailFromPayPal);
                        localStorage.setItem('paypalEmail', payerEmailFromPayPal);
                        localStorage.setItem('paypalPayerName', payerName);
                        setIsPayPalModalOpen(false);
                        setMessage({ type: 'success', text: `PayPal verificado: ${payerEmailFromPayPal}${payerName ? ` (${payerName})` : ''} - cuenta válida` });
                      } else {
                        // Fallback si PayPal no retorna email (mock)
                        const fallback = paypalEmail || 'conectado@paypal.com';
                        setPaypalEmail(fallback);
                        localStorage.setItem('paypalEmail', fallback);
                        setIsPayPalModalOpen(false);
                        setMessage({ type: 'success', text: `PayPal conectado: ${fallback}` });
                      }
                    } catch (e) {
                      setMessage({ type: 'error', text: 'Error al verificar cuenta PayPal' });
                    }
                  }}
                  onCancel={() => setMessage({ type: 'error', text: 'Conexión PayPal cancelada' })}
                  onError={() => setMessage({ type: 'error', text: 'Error al conectar PayPal - verifica que tengas cuenta PayPal y usa el correo abajo' })}
                />
              </PayPalScriptProvider>
            )}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">O ingresa tu correo</span></div>
            </div>
            <div className="space-y-2">
              <Label>Correo PayPal</Label>
              <Input type="email" placeholder="tu@email.com" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar correo</Label>
              <Input type="email" placeholder="tu@email.com" value={paypalConfirmEmail} onChange={(e) => setPaypalConfirmEmail(e.target.value)} />
            </div>
            {paypalEmail && paypalConfirmEmail && paypalEmail !== paypalConfirmEmail && <p className="text-sm text-red-600">Los correos no coinciden</p>}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsPayPalModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (paypalEmail && paypalConfirmEmail && paypalEmail === paypalConfirmEmail) { localStorage.setItem('paypalEmail', paypalEmail); setIsPayPalModalOpen(false); } }} disabled={!paypalEmail || !paypalConfirmEmail || paypalEmail !== paypalConfirmEmail} className="bg-blue-600 hover:bg-blue-700">Guardar PayPal</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isGooglePayModalOpen} onOpenChange={setIsGooglePayModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg> Conectar Google Pay</DialogTitle>
            <DialogDescription>Conecta tu cuenta de Google de forma segura para recibir pagos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div id="google-pay-button" className="w-full flex justify-center py-2">
              <Button
                type="button"
                className="w-full bg-black hover:bg-gray-900 text-white flex items-center justify-center gap-2"
                onClick={async () => {
                  // Cargar Google Pay API si no está cargado
                  if (typeof window !== 'undefined' && !(window as any).google?.payments) {
                    const script = document.createElement('script');
                    script.src = 'https://pay.google.com/gp/p/js/pay.js';
                    script.async = true;
                    document.head.appendChild(script);
                    await new Promise(res => { script.onload = res; setTimeout(res, 1000); });
                  }
                  try {
                    const paymentsClient = new (window as any).google.payments.api.PaymentsClient({ environment: (process.env.NEXT_PUBLIC_GOOGLE_PAY_ENV as any) || 'TEST' });
                    const isReady = await paymentsClient.isReadyToPay({
                      apiVersion: 2,
                      apiVersionMinor: 0,
                      allowedPaymentMethods: [{ type: 'CARD', parameters: { allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'], allowedCardNetworks: ['AMEX','DISCOVER','MASTERCARD','VISA'] } }],
                    });
                    if (isReady.result) {
                      const paymentData = await paymentsClient.loadPaymentData({
                        apiVersion: 2,
                        apiVersionMinor: 0,
                        allowedPaymentMethods: [{ type: 'CARD', parameters: { allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'], allowedCardNetworks: ['AMEX','DISCOVER','MASTERCARD','VISA'] }, tokenizationSpecification: { type: 'PAYMENT_GATEWAY', parameters: { gateway: 'example', gatewayMerchantId: 'exampleGatewayMerchantId' } } }],
                        merchantInfo: { merchantName: 'Diamond Accounting', merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || '12345678901234567890' },
                        transactionInfo: { totalPriceStatus: 'FINAL', totalPrice: '1.00', currencyCode: 'USD', countryCode: 'US' },
                      });
                      const email = paymentData?.email || paymentData?.paymentMethodData?.info?.billingAddress?.name || 'conectado@googlepay.com';
                      setGooglePayEmail(email);
                      localStorage.setItem('googlePayEmail', email);
                      setIsGooglePayModalOpen(false);
                      setMessage({ type: 'success', text: 'Google Pay conectado correctamente' });
                    }
                  } catch (e: any) {
                    // Fallback a email manual si el usuario cancela o falla
                    console.warn('Google Pay falló, use email manual', e);
                  }
                }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>
                Pagar con Google Pay
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">O ingresa tu correo</span></div>
            </div>
            <div className="space-y-2">
              <Label>Correo Google</Label>
              <Input type="email" placeholder="tu@gmail.com" value={googlePayEmail} onChange={(e) => setGooglePayEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar correo</Label>
              <Input type="email" placeholder="tu@gmail.com" value={googlePayConfirmEmail} onChange={(e) => setGooglePayConfirmEmail(e.target.value)} />
            </div>
            {googlePayEmail && googlePayConfirmEmail && googlePayEmail !== googlePayConfirmEmail && <p className="text-sm text-red-600">Los correos no coinciden</p>}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsGooglePayModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsGooglePayModalOpen(false)} disabled={!googlePayEmail || !googlePayConfirmEmail || googlePayEmail !== googlePayConfirmEmail} className="bg-blue-600 hover:bg-blue-700">Guardar Google Pay</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStripeModalOpen} onOpenChange={setIsStripeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19L3.36 21.8C5.578 22.926 8.621 24 12.165 24c2.631 0 4.809-.649 6.306-1.878 1.635-1.341 2.461-3.291 2.461-5.659 0-4.173-2.508-5.855-6.956-7.313z"/></svg> Conectar Stripe</DialogTitle>
            <DialogDescription>Conecta tu cuenta Stripe de forma segura para recibir pagos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Button
              type="button"
              className="w-full bg-[#635bff] hover:bg-[#5851ea] text-white flex items-center justify-center gap-2"
              onClick={async () => {
                try {
                  const { loadStripe } = await import('@stripe/stripe-js');
                  const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
                  if (!stripe) throw new Error('Stripe no configurado');
                  const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planName: 'Suscripción Diamond', planPrice: 1, customerEmail: stripeEmail || 'test@stripe.com', tenantId: 'test' }),
                  });
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                  } else if (data.error) {
                    // Fallback a email si Stripe no está configurado
                    console.warn('Stripe checkout falló, use email', data.error);
                  } else {
                    setStripeEmail(stripeEmail || 'conectado@stripe.com');
                    localStorage.setItem('stripeEmail', stripeEmail || 'conectado@stripe.com');
                    setIsStripeModalOpen(false);
                    setMessage({ type: 'success', text: 'Stripe conectado correctamente' });
                  }
                } catch (e) {
                  console.warn('Stripe falló, use email manual', e);
                }
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19L3.36 21.8C5.578 22.926 8.621 24 12.165 24c2.631 0 4.809-.649 6.306-1.878 1.635-1.341 2.461-3.291 2.461-5.659 0-4.173-2.508-5.855-6.956-7.313z"/></svg>
              Pagar con Stripe
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">O ingresa tu correo</span></div>
            </div>
            <div className="space-y-2">
              <Label>Correo Stripe</Label>
              <Input type="email" placeholder="tu@stripe.com" value={stripeEmail} onChange={(e) => setStripeEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar correo</Label>
              <Input type="email" placeholder="tu@stripe.com" value={stripeConfirmEmail} onChange={(e) => setStripeConfirmEmail(e.target.value)} />
            </div>
            {stripeEmail && stripeConfirmEmail && stripeEmail !== stripeConfirmEmail && <p className="text-sm text-red-600">Los correos no coinciden</p>}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsStripeModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (stripeEmail && stripeConfirmEmail && stripeEmail === stripeConfirmEmail) { localStorage.setItem('stripeEmail', stripeEmail); setIsStripeModalOpen(false); } }} disabled={!stripeEmail || !stripeConfirmEmail || stripeEmail !== stripeConfirmEmail} className="bg-purple-600 hover:bg-purple-700">Guardar Stripe</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
