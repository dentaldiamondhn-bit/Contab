'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, 
  Calculator, 
  Download, 
  Edit,
  Plus, 
  CheckCircle, 
  Ban,
  AlertTriangle,
  Clock, 
  TrendingUp,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useTenant } from '@/lib/contexts/TenantContext';
import { createSupabaseClient } from '@/lib/supabase/client';
import { 
  Withholding, 
  WithholdingType, 
  WithholdingStatus,
  WithholdingStatistics,
  getWithholdings, 
  getWithholdingStatistics,
  createWithholding,
  updateWithholdingStatus,
  calculateWithholding,
  formatWithholdingType,
  formatWithholdingRate,
  formatCurrency,
  getCurrentPeriod,
  validateRTN,
} from '@/lib/services/withholding-service';
import { pdf } from '@react-pdf/renderer';
import WithholdingReceiptPDF from './reports/WithholdingReceiptPDF';

// Interfaces para tipado robusto
interface CAIData {
  id: string;
  caiCode: string;
  expirationDate: string;
  currentNumber: number;
  rangeEnd: number;
  establishmentCode: string;
  pointOfSaleCode: string;
}

interface WithholdingFormData {
  invoiceNumber: string;
  invoiceDate: string;
  providerName: string;
  providerRTN: string;
  providerAddress: string;
  amount: string;
  type: WithholdingType;
  description: string;
}

export default function WithholdingManager() {
  const { currentTenant } = useTenant();
  const supabase = createSupabaseClient();
  
  const [withholdings, setWithholdings] = useState<Withholding[]>([]);
  const [statistics, setStatistics] = useState<WithholdingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWithholding, setEditingWithholding] = useState<Withholding | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [activeCAI, setActiveCAI] = useState<CAIData | null>(null);
  
  const [formData, setFormData] = useState<WithholdingFormData>({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    providerName: '',
    providerRTN: '',
    providerAddress: '',
    amount: '',
    type: 'PROFESSIONAL_SERVICES_1%',
    description: '',
  });

  const [calculation, setCalculation] = useState<ReturnType<typeof calculateWithholding> | null>(null);

  // 1. Definir getStatusBadge DENTRO del componente o antes del return
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string, className: string }> = {
      'PENDING': { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      'PAID': { label: 'Pagado', className: 'bg-green-100 text-green-800' },
      'CANCELLED': { label: 'Anulado', className: 'bg-red-100 text-red-800' }
    };
    const config = configs[status] || { label: status, className: '' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const loadData = useCallback(async () => {
    const tenantId = currentTenant?.id;
    if (!tenantId) return;

    try {
      setLoading(true);
      // Asegurar contexto del tenant para RLS antes de cargar
      await (supabase as any).rpc("set_tenant", { tenant_id: tenantId });

      const [withholdingsData, statsData, caiResult] = await Promise.all([
        getWithholdings(),
        getWithholdingStatistics(),
        supabase
          .from('CAI')
          .select('*')
          .eq('tenantId', tenantId)
          .eq('documentType', 'COMPROBANTE')
          .eq('status', 'ACTIVE')
          .maybeSingle()
      ]);

      setWithholdings(withholdingsData);
      setStatistics(statsData);
      if (caiResult.data) {
        setActiveCAI(caiResult.data as CAIData);
      } else {
        setActiveCAI(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateCalculation = (amount: string, type: WithholdingType) => {
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      const cents = Math.round(val * 100);
      setCalculation(calculateWithholding(cents, type));
    } else {
      setCalculation(null);
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      providerName: '',
      providerRTN: '',
      providerAddress: '',
      amount: '',
      type: 'PROFESSIONAL_SERVICES_1%',
      description: '',
    });
    setCalculation(null);
    setEditingWithholding(null);
  };

  // Manejar edición
  const handleEdit = (withholding: Withholding) => {
    setEditingWithholding(withholding);
    setFormData({
      invoiceNumber: withholding.invoiceNumber,
      invoiceDate: new Date(withholding.invoiceDate).toISOString().split('T')[0],
      providerName: withholding.providerName,
      providerRTN: withholding.providerRTN,
      providerAddress: withholding.providerAddress || '',
      amount: (withholding.amount / 100).toString(),
      type: withholding.type,
      description: withholding.description,
    });
    const cents = Math.round((withholding.amount / 100) * 100);
    setCalculation(calculateWithholding(cents, withholding.type));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = currentTenant?.id;
    if (!calculation || !tenantId) return;
    
    try {
      await (supabase as any).rpc("set_tenant", { tenant_id: tenantId });

      const payload = {
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: new Date(formData.invoiceDate),
        providerName: formData.providerName,
        providerRTN: formData.providerRTN,
        providerAddress: formData.providerAddress || '',
        amount: calculation.baseAmount,
        withholdingAmount: calculation.withholdingAmount,
        withholdingRate: calculation.withholdingRate,
        type: formData.type,
        description: formData.description,
        period: getCurrentPeriod(),
      };

      if (editingWithholding) {
        await (supabase.from('Withholding') as any).update(payload).eq('id', editingWithholding.id);
      } else {
        await createWithholding(payload);
      }

      setShowForm(false);
      resetForm();
      loadData();
    } catch (error) {
      alert("Error al procesar la retención.");
    }
  };

  // Actualizar estado (Pagado / Anulado)
  const updateStatus = async (id: string, status: WithholdingStatus) => {
    try {
      let reason: string | undefined = undefined;

      if (status === 'CANCELLED') {
        const inputReason = window.prompt('Por favor, ingrese el motivo de la anulación (mínimo 5 caracteres):');
        if (!inputReason || inputReason.trim().length < 5) {
          alert('Debe proporcionar un motivo válido de al menos 5 caracteres para poder anular la retención.');
          return;
        }
        reason = inputReason.trim();
      }

      const tenantId = currentTenant?.id || "";
      await (supabase as any).rpc("set_tenant", { tenant_id: tenantId });
      await updateWithholdingStatus(id, status, status === 'PAID' ? new Date() : undefined, reason);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar el estado.");
    }
  };

  const generatePDF = async (withholding: Withholding) => {
    try {
      setGeneratingId(withholding.id);
      const tenantId = currentTenant?.id || "";
      await (supabase as any).rpc("set_tenant", { tenant_id: tenantId });

      let correlativo = withholding.receiptNumber;

      if (!correlativo) {
        if (!activeCAI) {
          alert("No se encontró un CAI activo para Comprobantes de Retención.");
          return;
        }

        // Generar número atómico vía RPC para evitar duplicados y saltos de correlativo
        const { data: generatedNumber, error: rpcError } = await (supabase as any).rpc('get_next_withholding_number', {
          cai_id_param: activeCAI.id
        });

        if (rpcError) {
          alert(`Error al generar correlativo: ${rpcError.message}`);
          return;
        }

        correlativo = generatedNumber;
        // Guardar el número asignado en la retención
        await (supabase.from('Withholding') as any).update({ receiptNumber: correlativo }).eq('id', withholding.id);
        loadData();
      }

      if (!activeCAI) {
        alert("No se encontró un CAI activo para Comprobantes de Retención.");
        return;
      }

      const receiptData = {
        issuerName: (currentTenant as any)?.name || "Empresa",
        issuerRTN: (currentTenant as any)?.rtn || "",
        issuerAddress: (currentTenant as any)?.address || "",
        cai: activeCAI.caiCode,
        correlativo: correlativo || '',
        fechaLimite: activeCAI.expirationDate,
        date: new Date(withholding.invoiceDate),
        providerName: withholding.providerName,
        providerRTN: withholding.providerRTN,
        invoiceNumber: withholding.invoiceNumber,
        baseAmount: withholding.amount / 100,
        rate: withholding.withholdingRate,
        withheldAmount: withholding.withholdingAmount / 100,
        description: withholding.description,
        type: formatWithholdingType(withholding.type),
      };
      
      const blob = await pdf(<WithholdingReceiptPDF receiptData={receiptData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Retencion-${withholding.invoiceNumber}.pdf`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingId(null);
    }
  };

  const isFormValid = useMemo(() => {
    return (
      formData.invoiceNumber.length > 5 &&
      validateRTN(formData.providerRTN) &&
      calculation !== null &&
      new Date(formData.invoiceDate) <= new Date()
    );
  }, [formData, calculation]);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-primary" /></div>;

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Receipt className="w-8 h-8" /> Retenciones</h1>
          {activeCAI && (activeCAI.rangeEnd - activeCAI.currentNumber) <= 10 && (
            <Badge variant="destructive" className="mt-2 animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              CAI Próximo a Agotarse: {activeCAI.rangeEnd - activeCAI.currentNumber} números restantes
            </Badge>
          )}
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Retención
        </Button>
      </div>

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Recibos" value={statistics.totalWithholdings} icon={<FileText className="text-cyan-500" />} />
          <StatCard title="Monto Sujeto" value={formatCurrency(statistics.totalAmount)} icon={<TrendingUp className="text-green-500" />} />
          <StatCard title="Total Retenido" value={formatCurrency(statistics.totalWithheld)} icon={<Calculator className="text-red-500" />} isRed />
          <StatCard title="Pendientes" value={statistics.pendingCount} icon={<Clock className="text-orange-500" />} />
        </div>
      )}

      {showForm && (
        <Card className="border-t-4 border-t-primary shadow-xl">
          <CardHeader><CardTitle>{editingWithholding ? 'Modificar' : 'Registrar'} Retención</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Factura Original #</Label>
                  <Input value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Emisión</Label>
                  <Input type="date" max={new Date().toISOString().split('T')[0]} value={formData.invoiceDate} onChange={e => setFormData({...formData, invoiceDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>RTN Proveedor</Label>
                  <Input value={formData.providerRTN} onChange={e => setFormData({...formData, providerRTN: e.target.value})} className={formData.providerRTN && !validateRTN(formData.providerRTN) ? "border-red-500" : ""} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Nombre o Razón Social</Label>
                  <Input value={formData.providerName} onChange={e => setFormData({...formData, providerName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Monto Bruto (L)</Label>
                  <Input type="number" step="0.01" value={formData.amount} onChange={e => {
                    setFormData({...formData, amount: e.target.value});
                    updateCalculation(e.target.value, formData.type);
                  }} />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
                <Button type="submit" disabled={!isFormValid}>Confirmar Retención</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {withholdings.map(w => (
          <Card key={w.id}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{w.invoiceNumber}</span>
                    {getStatusBadge(w.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{w.providerName}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => generatePDF(w)} disabled={generatingId === w.id} title="Descargar PDF">
                     {generatingId === w.id ? <RefreshCw className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleEdit(w)} title="Editar">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {w.status === 'PENDING' && (
                    <>
                      <Button size="icon" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(w.id, 'PAID')} title="Marcar como Pagado">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => updateStatus(w.id, 'CANCELLED')} title="Anular Retención">
                        <Ban className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {w.status === 'CANCELLED' && (w as any).cancellationReason && (
                <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                  <p><span className="font-bold">Motivo de anulación:</span> {(w as any).cancellationReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, isRed = false }: { title: string, value: string | number, icon: React.ReactNode, isRed?: boolean }) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
        </div>
        <div className="bg-slate-100 p-3 rounded-xl">{icon}</div>
      </CardContent>
    </Card>
  );
}