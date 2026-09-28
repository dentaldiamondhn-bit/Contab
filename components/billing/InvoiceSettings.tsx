'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InvoicePreviewLive from '@/components/billing/InvoicePreviewLive';
import {
  Building2,
  Receipt,
  Settings2,
  Percent,
  Save,
  Upload,
  Trash2,
  Plus,
  Pencil,
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';

interface Emisor {
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  phoneNumber: string;
  logoUrl: string | null;
}

interface CaiRecord {
  id: string;
  cai: string;
  rangeStart: number;
  rangeEnd: number;
  currentNumber: number;
  issueDate: string | null;
  expiryDate: string | null;
  isActive: boolean;
}

interface PrintSettings {
  footerText: string;
  showQR: boolean;
  showBarcode: boolean;
  currency: string;
  language: string;
}

interface TaxEntry {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
}

interface TaxConfig {
  defaultRate: number;
  applyTax: boolean;
  taxes: TaxEntry[];
}

interface ConfigData {
  tenantId: string;
  emisor: Emisor;
  logoPath: string | null;
  cais: CaiRecord[];
  settings: { print: PrintSettings; tax: TaxConfig };
}

interface InvoiceSettingsProps {
  companyId: string;
}

const EMPTY_EMISOR: Emisor = {
  businessName: '',
  businessRTN: '',
  businessEmail: '',
  businessAddress: '',
  phoneNumber: '',
  logoUrl: null,
};

export default function InvoiceSettings({ companyId }: InvoiceSettingsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [emisor, setEmisor] = useState<Emisor>(EMPTY_EMISOR);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [cais, setCais] = useState<CaiRecord[]>([]);
  const [print, setPrint] = useState<PrintSettings>({
    footerText: 'Gracias por su compra.',
    showQR: true,
    showBarcode: false,
    currency: 'HNL',
    language: 'es',
  });
  const [tax, setTax] = useState<TaxConfig>({ defaultRate: 15, applyTax: true, taxes: [] });
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal CAI
  const [caiModalOpen, setCaiModalOpen] = useState(false);
  const [editingCai, setEditingCai] = useState<CaiRecord | null>(null);
  const [caiForm, setCaiForm] = useState({
    cai: '',
    rangeStart: '',
    rangeEnd: '',
    currentNumber: '',
    expiryDate: '',
    isActive: true,
  });
  const [caiSaving, setCaiSaving] = useState(false);
const [caiError, setCaiError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/billing/config`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const data = json.data as ConfigData;
          setConfig(data);
          setEmisor({ ...EMPTY_EMISOR, ...data.emisor });
          setLogoPath(data.logoPath || null);
          setCais(data.cais || []);
          setPrint(data.settings?.print || print);
          setTax(data.settings?.tax || tax);        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    loadConfig();
  }, [companyId, loadConfig]);

  const navigate = (path: string) => router.push(`/companies/${companyId}${path}`);

  const saveConfig = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);
      const res = await fetch(`/api/companies/${companyId}/billing/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emisor, settings: { print, tax }, logoPath }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatusMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
      } else {
        setStatusMessage({ type: 'error', text: json.error || 'Error al guardar la configuración.' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Error de red al guardar la configuración.' });
    } finally {
      setSaving(false);
    }
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'El archivo debe ser una imagen.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'El tamaño máximo permitido es 2MB.' });
      return;
    }
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await fetch(`/api/companies/${companyId}/billing/config/logo`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setLogoPath(json.logoPath);
        setEmisor((p) => ({ ...p, logoUrl: json.logoUrl || p.logoUrl }));
        setStatusMessage({ type: 'success', text: 'Logo subido correctamente.' });
      } else {
        setStatusMessage({ type: 'error', text: json.error || 'Error al subir el logo.' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Error de red al subir el logo.' });
    }
  };

  const openCaiCreate = () => {
    setEditingCai(null);
    setCaiForm({ cai: '', rangeStart: '', rangeEnd: '', currentNumber: '', expiryDate: '', isActive: true });
    setCaiError(null);
    setCaiModalOpen(true);
  };

  const openCaiEdit = (cai: CaiRecord) => {
    setEditingCai(cai);
    setCaiForm({
      cai: cai.cai,
      rangeStart: String(cai.rangeStart),
      rangeEnd: String(cai.rangeEnd),
      currentNumber: String(cai.currentNumber),
      expiryDate: cai.expiryDate ? String(cai.expiryDate).slice(0, 10) : '',
      isActive: cai.isActive,
    });
    setCaiError(null);
    setCaiModalOpen(true);
  };

  const saveCai = async () => {
    // Convierte a numero solo si el campo tiene contenido; '' se envia como undefined
    // para que el backend pueda aplicar sus valores por defecto.
    const toNumber = (value: string): number | undefined => {
      const trimmed = String(value ?? '').trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const rangeStart = toNumber(caiForm.rangeStart);
    const rangeEnd = toNumber(caiForm.rangeEnd);

    let validationError: string | null = null;
    if (!caiForm.cai.trim()) {
      validationError = 'El código CAI es obligatorio.';
    } else if (caiForm.cai.trim().length < 32 || caiForm.cai.trim().length > 37) {
      validationError = `El CAI debe tener entre 32 y 37 caracteres (tiene ${caiForm.cai.trim().length}).`;
    } else if (!rangeStart || !rangeEnd) {
      validationError = 'Ingresa el rango inicial y el rango final (ambos obligatorios).';
    } else if (rangeStart >= rangeEnd) {
      validationError = 'El rango inicial debe ser menor al rango final.';
    } else if (!caiForm.expiryDate) {
      validationError = 'La fecha de vencimiento es obligatoria.';
    }

    if (validationError) {
      setCaiError(validationError);
      return;
    }

    try {
      setCaiSaving(true);
      setCaiError(null);
      setStatusMessage(null);
      const payload = {
        cai: caiForm.cai.trim(),
        rangeStart,
        rangeEnd,
        currentNumber: toNumber(caiForm.currentNumber),
        expiryDate: caiForm.expiryDate,
        isActive: caiForm.isActive,
      };
      const url = editingCai
        ? `/api/companies/${companyId}/billing/config/cai/${editingCai.id}`
        : `/api/companies/${companyId}/billing/config/cai`;
      const res = await fetch(url, {
        method: editingCai ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setCaiModalOpen(false);
        setCaiError(null);
        await loadConfig();
        setStatusMessage({ type: 'success', text: editingCai ? 'CAI actualizado.' : 'CAI creado.' });
      } else {
        const message = json?.error || `Error ${res.status} al guardar el CAI.`;
        setCaiError(message);
        setStatusMessage({ type: 'error', text: message });
      }
    } catch (error) {
      setCaiError('Error de red al guardar el CAI. Revisa tu conexión.');
      setStatusMessage({ type: 'error', text: 'Error de red al guardar el CAI.' });
    } finally {
      setCaiSaving(false);
    }
  };

  const deleteCai = async (cai: CaiRecord) => {
    if (!confirm(`¿Eliminar el CAI ${cai.cai}?`)) return;
    try {
      const res = await fetch(`/api/companies/${companyId}/billing/config/cai/${cai.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await loadConfig();
        setStatusMessage({ type: 'success', text: 'CAI eliminado.' });
      } else {
        setStatusMessage({ type: 'error', text: json.error || 'Error al eliminar el CAI.' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Error de red al eliminar el CAI.' });
    }
  };

  const addTax = () => {
    const id = `tax-${Date.now()}`;
    setTax((prev) => ({
      ...prev,
      taxes: [
        ...prev.taxes,
        { id, name: '', rate: 0, isDefault: prev.taxes.length === 0, isActive: true },
      ],
    }));
  };

  const updateTax = (index: number, patch: Partial<TaxEntry>) => {
    setTax((prev) => ({
      ...prev,
      taxes: prev.taxes.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  };

  const removeTax = (index: number) => {
    setTax((prev) => {
      const taxes = prev.taxes.filter((_, i) => i !== index);
      // Si se eliminó el principal, promote el primero activo.
      if (taxes.length > 0 && !taxes.some((t) => t.isDefault)) {
        return { ...prev, taxes: taxes.map((t, i) => ({ ...t, isDefault: i === 0 })) };
      }
      return { ...prev, taxes };
    });
  };

  const setDefaultTax = (index: number) => {
    setTax((prev) => {
      const taxes = prev.taxes.map((t, i) => ({ ...t, isDefault: i === index }));
      const def = taxes[index];
      return { ...prev, taxes, defaultRate: def ? def.rate : prev.defaultRate };
    });
  };

  // CAI que se usaría para la próxima factura (activo, o el primero disponible).
  const activeCai = cais.find((c) => c.isActive) || cais[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando configuración...</div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold">Configurar Factura</h2>
          <p className="text-gray-500">Datos del emisor, logo, CAI e impuestos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/billing/dashboard')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <Tabs defaultValue="emisor">
        <TabsList>
          <TabsTrigger value="emisor">
            <Building2 className="w-4 h-4 mr-2" /> Emisor
          </TabsTrigger>
          <TabsTrigger value="cai">
            <Receipt className="w-4 h-4 mr-2" /> CAI / Talonarios
          </TabsTrigger>
          <TabsTrigger value="impresion">
            <Settings2 className="w-4 h-4 mr-2" /> Impresión
          </TabsTrigger>
          <TabsTrigger value="impuestos">
            <Percent className="w-4 h-4 mr-2" /> Impuestos
          </TabsTrigger>
        </TabsList>

        {/* ===== EMISOR ===== */}
        <TabsContent value="emisor">
          <Card>
            <CardHeader>
              <CardTitle>Datos del Emisor</CardTitle>
              <CardDescription>
                Estos datos aparecerán en la parte superior de la factura.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Emisor</Label>
                  <Input
                    value={emisor.businessName}
                    onChange={(e) => setEmisor({ ...emisor, businessName: e.target.value })}
                    placeholder="Nombre de la empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>RTN</Label>
                  <Input
                    value={emisor.businessRTN}
                    onChange={(e) => setEmisor({ ...emisor, businessRTN: e.target.value })}
                    placeholder="0801-1990-123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <Mail className="w-3 h-3 inline mr-1" /> Email
                  </Label>
                  <Input
                    type="email"
                    value={emisor.businessEmail}
                    onChange={(e) => setEmisor({ ...emisor, businessEmail: e.target.value })}
                    placeholder="facturacion@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <Phone className="w-3 h-3 inline mr-1" /> Teléfono
                  </Label>
                  <Input
                    value={emisor.phoneNumber}
                    onChange={(e) => setEmisor({ ...emisor, phoneNumber: e.target.value })}
                    placeholder="+504 9999-9999"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    <MapPin className="w-3 h-3 inline mr-1" /> Dirección
                  </Label>
                  <Input
                    value={emisor.businessAddress}
                    onChange={(e) => setEmisor({ ...emisor, businessAddress: e.target.value })}
                    placeholder="Dirección fiscal de la empresa"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Logo de la Empresa</CardTitle>
              <CardDescription>
                Se muestra en el encabezado de la factura. Imagen PNG/JPG hasta 2MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {emisor.logoUrl || logoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={emisor.logoUrl || undefined}
                    alt="Logo"
                    className="w-24 h-24 object-contain border rounded-lg bg-white p-2"
                  />
                ) : (
                  <div className="w-24 h-24 border rounded-lg flex items-center justify-center text-gray-400">
                    Sin logo
                  </div>
                )}
                <div className="space-y-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-gray-50">
                    <Upload className="w-4 h-4" />
                    Subir Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onLogoChange}
                    />
                  </label>
                  {logoPath && (
                    <Button size="sm" variant="ghost" onClick={() => setLogoPath(null)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Quitar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CAI / TALONARIOS ===== */}
        <TabsContent value="cai">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>CAI / Talonarios</CardTitle>
                <CardDescription>
                  Códigos de autorización fiscal (CAI) del SAR para numerar facturas.
                </CardDescription>
              </div>
              <Button onClick={openCaiCreate}>
                <Plus className="w-4 h-4 mr-2" /> Nuevo CAI
              </Button>
            </CardHeader>
            <CardContent>
              {cais.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Aún no hay CAI configurados. Agrega uno para poder emitir facturas fiscalmente válidas.
                </p>
              ) : (
                <div className="space-y-3">
                  {cais.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{c.cai}</span>
                          <Badge variant={c.isActive ? 'default' : 'secondary'}>
                            {c.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          Rango {c.rangeStart.toLocaleString('es-HN')} - {c.rangeEnd.toLocaleString('es-HN')} • Actual:{' '}
                          {c.currentNumber.toLocaleString('es-HN')}
                        </div>
                        {c.expiryDate && (
                          <div className="text-xs text-gray-400">
                            Vence: {String(c.expiryDate).slice(0, 10)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openCaiEdit(c)}>
                          <Pencil className="w-4 h-4 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteCai(c)}>
                          <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {caiModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-4">
                  {editingCai ? 'Editar CAI' : 'Nuevo CAI'}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Código CAI</Label>
                    <Input
                      value={caiForm.cai}
                      onChange={(e) => setCaiForm({ ...caiForm, cai: e.target.value })}
                      placeholder="Código CAI (32-37 caracteres)"
                    />
                    <p className="text-xs text-gray-500">
                      El CAI lo otorga el SAR. Debe tener entre 32 y 37 caracteres.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rango Inicial</Label>
                      <Input
                        type="number"
                        value={caiForm.rangeStart}
                        onChange={(e) => setCaiForm({ ...caiForm, rangeStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rango Final</Label>
                      <Input
                        type="number"
                        value={caiForm.rangeEnd}
                        onChange={(e) => setCaiForm({ ...caiForm, rangeEnd: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Correlativo Actual</Label>
                      <Input
                        type="number"
                        value={caiForm.currentNumber}
                        onChange={(e) => setCaiForm({ ...caiForm, currentNumber: e.target.value })}
                        placeholder={caiForm.rangeStart || 'Correlativo inicial'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de Vencimiento</Label>
                      <Input
                        type="date"
                        value={caiForm.expiryDate}
                        onChange={(e) => setCaiForm({ ...caiForm, expiryDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={caiForm.isActive}
                      onCheckedChange={(v) => setCaiForm({ ...caiForm, isActive: !!v })}
                    />
                    CAI activo (se usará para emitir facturas)
                  </label>
                </div>
                {caiError && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {caiError}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setCaiModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveCai} disabled={caiSaving}>
                    {caiSaving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== IMPRESIÓN ===== */}
        <TabsContent value="impresion">
          <Card>
            <CardHeader>
              <CardTitle>Ajustes de Impresión</CardTitle>
              <CardDescription>
                Personaliza el contenido y formato de la factura impresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Texto de Pie de Página</Label>
                <Input
                  value={print.footerText}
                  onChange={(e) => setPrint({ ...print, footerText: e.target.value })}
                  placeholder="Mensaje que aparece al pie de la factura"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={print.currency} onValueChange={(v) => setPrint({ ...print, currency: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HNL">Lempira (HNL)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select value={print.language} onValueChange={(v) => setPrint({ ...print, language: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <Checkbox
                    checked={print.showQR}
                    onCheckedChange={(v) => setPrint({ ...print, showQR: !!v })}
                  />
                  Mostrar código QR de verificación
                </label>
                <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <Checkbox
                    checked={print.showBarcode}
                    onCheckedChange={(v) => setPrint({ ...print, showBarcode: !!v })}
                  />
                  Mostrar código de barras
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== IMPUESTOS ===== */}
        <TabsContent value="impuestos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Impuestos</CardTitle>
                <CardDescription>
                  Tasas disponibles al emitir facturas. La marcada como principal se usa por defecto.
                </CardDescription>
              </div>
              <Button onClick={addTax} variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Agregar Impuesto
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <Checkbox
                  checked={tax.applyTax}
                  onCheckedChange={(v) => setTax({ ...tax, applyTax: !!v })}
                />
                Mostrar impuestos en las nuevas facturas
              </label>

              {tax.taxes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  No hay impuestos configurados. Agrega al menos uno para facturar.
                </p>
              ) : (
                <div className="space-y-3">
                  {tax.taxes.map((t, index) => (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="flex flex-1 flex-col gap-2 min-w-[200px]">
                        <Input
                          value={t.name}
                          onChange={(e) => updateTax(index, { name: e.target.value })}
                          placeholder="Nombre del impuesto (ej. ISV 15%)"
                          className="font-medium"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={String(t.rate)}
                            onChange={(e) => updateTax(index, { rate: Number(e.target.value) })}
                            className="w-28"
                            min="0"
                            max="100"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={t.isDefault}
                            onCheckedChange={(v) => setDefaultTax(index)}
                          />
                          Principal
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={t.isActive}
                            onCheckedChange={(v) => updateTax(index, { isActive: !!v })}
                          />
                          Activo
                        </label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTax(index)}
                          aria-label={`Eliminar ${t.name}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vista previa en vivo de la factura con la configuración actual */}
      <InvoicePreviewLive emisor={emisor} cai={activeCai} tax={tax} print={print} />
    </div>
  );
}