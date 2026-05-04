'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Building2, 
  Save, 
  CheckCircle,
  Plus,
  Trash2,
  Eye,
  Upload,
  Image,
  ArrowRight,
  ArrowLeft,
  Play,
  ChevronDown,
  ChevronUp,
  X,
  Check
} from 'lucide-react';

import InvoiceExample from '@/components/billing/InvoiceExample';

interface FiscalInfo {
  rtn: string;
  businessName: string;
  businessAddress: string;
  email: string;
  phone: string;
}

interface CaiConfig {
  id?: string;
  cai: string;
  rangeStart: number;
  rangeEnd: number;
  currentNumber: number;
  expiryDate: string;
  establishmentCode: string;
  pointOfSaleCode: string;
  economicActivity: string;
  taxRate: number;
  isActive: boolean;
}

export default function TenantSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [establishingConfig, setEstablishingConfig] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [fiscalInfo, setFiscalInfo] = useState<FiscalInfo>({
    rtn: '',
    businessName: '',
    businessAddress: '',
    email: '',
    phone: ''
  });
  
  const [caiConfigs, setCaiConfigs] = useState<CaiConfig[]>([]);
  const [showCaiForm, setShowCaiForm] = useState(false);
  const [editingCai, setEditingCai] = useState<CaiConfig | null>(null);

  // Actividades económicas disponibles según SAR
  const economicActivities = [
    "Servicios Profesionales",
    "Comercio al por Mayor",
    "Comercio al por Menor",
    "Restaurantes y Servicios de Alimentación",
    "Transporte de Carga",
    "Transporte de Pasajeros",
    "Construcción",
    "Servicios de Salud",
    "Educación",
    "Servicios Financieros",
    "Servicios de Telecomunicaciones",
    "Servicios de Hotelería y Turismo",
    "Industria Manufacturera",
    "Agropecuario",
    "Servicios de Mantenimiento y Reparación",
    "Servicios de Información",
    "Servicios Inmobiliarios",
    "Servicios de Alquiler",
    "Servicios de Entretenimiento y Recreación",
    "Otros Servicios"
  ];

  // Collapsible states
  const [fiscalInfoCollapsed, setFiscalInfoCollapsed] = useState(true);
  const [logoCollapsed, setLogoCollapsed] = useState(true);
  const [caiCollapsed, setCaiCollapsed] = useState(true);
  const [previewCollapsed, setPreviewCollapsed] = useState(true);

  // Cargar datos cuando el componente se monta
  useEffect(() => {
    loadCaiConfigs();
    loadFiscalInfo();
    loadLogoFromStorage();
  }, []);

  const loadLogoFromStorage = () => {
    try {
      const savedLogo = localStorage.getItem('companyLogo');
      if (savedLogo) {
        setLogoPreview(savedLogo);
        console.log('🔍 Logo cargado desde localStorage');
      }
    } catch (error) {
      console.error('Error cargando logo desde localStorage:', error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'El archivo debe ser una imagen (JPG, PNG, etc.)' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'El tamaño máximo permitido es 2MB' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      setUploadingLogo(true);
      
      // Crear preview y guardar en localStorage
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setLogoPreview(dataUrl);
        
        // Guardar en localStorage para persistencia
        localStorage.setItem('companyLogo', dataUrl);
        localStorage.setItem('companyLogoName', file.name);
        
        console.log('✅ Logo guardado en localStorage');
        setMessage({ type: 'success', text: 'Logo guardado correctamente' });
      };
      reader.readAsDataURL(file);

      // Intentar subir al servidor (opcional)
      try {
        const formData = new FormData();
        formData.append('logo', file);

        const response = await fetch('/api/billing/logo', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          console.log('✅ Logo también sincronizado con servidor');
        } else {
          console.log('⚠️ Logo guardado localmente, pero no se pudo sincronizar con servidor');
        }
      } catch (serverError) {
        console.log('⚠️ Logo guardado localmente, error en servidor:', serverError);
      }

    } catch (error) {
      console.error('Error procesando logo:', error);
      setMessage({ type: 'error', text: 'Error al procesar el logo' });
    } finally {
      setUploadingLogo(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const saveCaiConfig = async (caiData: CaiConfig) => {
    try {
      setSaving(true);
      
      console.log('🔍 Iniciando guardado de CAI:', caiData);
      console.log('🔍 Estado actual caiConfigs:', caiConfigs);
      console.log('🔍 Editando CAI:', editingCai);
      
      // Primero guardar en localStorage para persistencia inmediata
      const currentCais = [...caiConfigs];
      
      if (editingCai) {
        // Actualizar CAI existente
        console.log('📝 Actualizando CAI existente:', editingCai.id);
        const index = currentCais.findIndex(c => c.id === editingCai.id);
        if (index !== -1) {
          currentCais[index] = { ...caiData, id: editingCai.id };
          console.log('✅ CAI actualizado en array:', currentCais[index]);
        } else {
          console.error('❌ No se encontró el CAI para actualizar');
        }
      } else {
        // Agregar nuevo CAI con ID único
        console.log('➕ Agregando nuevo CAI');
        const newCai = { ...caiData, id: Date.now().toString() };
        currentCais.push(newCai);
        console.log('✅ Nuevo CAI agregado:', newCai);
      }
      
      // Guardar en localStorage
      localStorage.setItem('caiConfigs', JSON.stringify(currentCais));
      console.log('💾 CAIs guardados en localStorage:', currentCais);
      
      // Actualizar estado del componente
      setCaiConfigs(currentCais);
      console.log('🔄 Estado caiConfigs actualizado');
      
      // Intentar sincronizar con API (opcional)
      try {
        const url = editingCai ? `/api/billing/cai/${editingCai.id}` : '/api/billing/cai/list';
        const method = editingCai ? 'PUT' : 'POST';
        
        console.log('🌐 Intentando sincronizar con API:', url, method);
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(caiData)
        });
        
        if (response.ok) {
          console.log('✅ CAI sincronizado con API');
        } else {
          console.log('⚠️ API falló, pero se guardó en localStorage');
        }
      } catch (apiError) {
        console.log('⚠️ Error en API, pero se guardó en localStorage:', apiError);
      }
      
      setMessage({ type: 'success', text: `CAI ${editingCai ? 'actualizado' : 'creado'} correctamente` });
      setShowCaiForm(false);
      setEditingCai(null);
      
      console.log('🎉 Proceso de guardado completado exitosamente');
      
    } catch (error) {
      console.error('❌ Error guardando CAI:', error);
      setMessage({ type: 'error', text: 'Error al guardar la configuración del CAI' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const deleteCaiConfig = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta configuración CAI?')) return;
    
    try {
      const response = await fetch(`/api/billing/cai/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'CAI eliminado correctamente' });
        loadCaiConfigs();
      } else {
        throw new Error('Error al eliminar CAI');
      }
      
    } catch (error) {
      console.error('Error eliminando CAI:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el CAI' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const loadCaiConfigs = async () => {
    try {
      console.log('🔄 Iniciando carga de CAIs...');
      
      // Primero intentar cargar desde localStorage como solución persistente
      const savedCais = localStorage.getItem('caiConfigs');
      console.log('📦 Verificando localStorage:', savedCais ? 'Datos encontrados' : 'No hay datos');
      
      if (savedCais) {
        const data = JSON.parse(savedCais);
        setCaiConfigs(data);
        console.log('✅ CAIs cargados desde localStorage:', data.length, 'items');
        console.log('📋 Datos de CAIs:', data);
      } else {
        // Si no hay datos en localStorage, crear datos de prueba
        console.log('📝 No hay CAIs en localStorage, creando datos de prueba...');
        const testCaiData = [
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
        
        // Guardar datos de prueba en localStorage
        localStorage.setItem('caiConfigs', JSON.stringify(testCaiData));
        setCaiConfigs(testCaiData);
        console.log('✅ Datos de prueba creados y guardados:', testCaiData);
      }
      
      // Intentar sincronizar con API (opcional)
      try {
        console.log('🌐 Intentando sincronizar con API...');
        const response = await fetch('/api/billing/cai/list');
        if (response.ok) {
          const apiData = await response.json();
          console.log('📡 Datos sincronizados desde API:', apiData);
          // Aquí podrías mezclar o priorizar datos de API vs localStorage
        } else {
          console.log('⚠️ API respondió con error:', response.status);
        }
      } catch (apiError) {
        console.log('⚠️ Error cargando desde API, usando localStorage:', apiError);
      }
      
      console.log('🎯 Carga de CAIs completada');
      
    } catch (localError) {
      console.error('❌ Error cargando desde localStorage:', localError);
      
      // Como último recurso, crear datos de prueba
      const testCaiData = [
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
      localStorage.setItem('caiConfigs', JSON.stringify(testCaiData));
      setCaiConfigs(testCaiData);
      console.log('🆘 Datos de prueba creados como emergencia:', testCaiData);
    }
  };

  const handleCaiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const caiData: CaiConfig = {
      cai: formData.get('cai') as string,
      rangeStart: parseInt(formData.get('rangeStart') as string),
      rangeEnd: parseInt(formData.get('rangeEnd') as string),
      currentNumber: parseInt(formData.get('currentNumber') as string),
      expiryDate: formData.get('expiryDate') as string,
      establishmentCode: formData.get('establishmentCode') as string,
      pointOfSaleCode: formData.get('pointOfSaleCode') as string,
      economicActivity: formData.get('economicActivity') as string,
      taxRate: parseFloat(formData.get('taxRate') as string) || 15,
      isActive: true
    };
    
    saveCaiConfig(caiData);
  };

  const handleEstablishConfiguration = async () => {
    try {
      setEstablishingConfig(true);
      
      // Validar que haya información fiscal
      if (!fiscalInfo.rtn || !fiscalInfo.businessName || !fiscalInfo.businessAddress) {
        setMessage({ type: 'error', text: 'Debes completar la información fiscal antes de establecer la configuración' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      
      // Validar que haya al menos un CAI configurado
      if (caiConfigs.length === 0) {
        setMessage({ type: 'error', text: 'Debes configurar al menos un CAI antes de establecer la configuración' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      
      // Verificar que haya un CAI activo
      const activeCai = caiConfigs.find(cai => cai.isActive);
      if (!activeCai) {
        setMessage({ type: 'error', text: 'Debes tener al menos un CAI activo' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      
      // Guardar configuración completa en localStorage
      const configurationData = {
        fiscalInfo,
        caiConfigs,
        logoUrl: logoPreview,
        establishedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      localStorage.setItem('invoiceConfiguration', JSON.stringify(configurationData));
      
      // Mostrar mensaje de éxito
      setMessage({ 
        type: 'success', 
        text: '✅ Configuración de facturación establecida exitosamente. Todos los cambios han sido guardados.' 
      });
      
      console.log('🎯 Configuración establecida:', configurationData);
      
      setTimeout(() => setMessage(null), 5000);
      
    } catch (error) {
      console.error('Error estableciendo configuración:', error);
      setMessage({ type: 'error', text: 'Error al establecer la configuración. Por favor, inténtalo nuevamente.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setEstablishingConfig(false);
    }
  };

  const loadFiscalInfo = async () => {
    try {
      // Cargar desde localStorage como solución temporal
      const savedFiscalInfo = localStorage.getItem('fiscalInfo');
      if (savedFiscalInfo) {
        const data = JSON.parse(savedFiscalInfo);
        setFiscalInfo(data);
      }
    } catch (error) {
      console.error('Error cargando información fiscal:', error);
    }
  };

  const handleFiscalInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFiscalInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveFiscalInfo = async () => {
    try {
      setSaving(true);
      
      // Guardar en localStorage como solución temporal
      localStorage.setItem('fiscalInfo', JSON.stringify(fiscalInfo));
      
      setMessage({ type: 'success', text: 'Información fiscal guardada correctamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error guardando información fiscal:', error);
      setMessage({ type: 'error', text: 'Error al guardar información fiscal' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditCai = (cai: CaiConfig) => {
    setEditingCai(cai);
    setShowCaiForm(true);
  };

  const handleDeleteCai = async (id: string) => {
    // First try to delete via API
    try {
      const response = await fetch(`/api/billing/cai/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'CAI eliminado correctamente' });
      } else {
        throw new Error('Error al eliminar CAI');
      }
    } catch (error) {
      console.error('Error eliminando CAI:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el CAI' });
    }
    
    // Always update localStorage as fallback
    try {
      const currentCais = [...caiConfigs];
      const updatedCais = currentCais.filter(c => c.id !== id);
      localStorage.setItem('caiConfigs', JSON.stringify(updatedCais));
      setCaiConfigs(updatedCais);
    } catch (localError) {
      console.error('Error actualizando localStorage:', localError);
    }
    
    setTimeout(() => setMessage(null), 3000);
  };

  
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración del Tenant</h1>
          <p className="text-gray-600 mt-2">Administra la configuración general de tu empresa</p>
        </div>
      </div>

      {/* General Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configuración General
          </CardTitle>
          <CardDescription>
            Otras configuraciones del tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Más secciones de configuración próximamente...</p>
            <p className="text-sm text-gray-400 mt-2">Aquí podrás configurar otros aspectos de tu tenant</p>
          </div>
        </CardContent>
      </Card>

      {/* Billing Configuration Section */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Configuración de Facturación
            </CardTitle>
            <CardDescription>
              Configura tu información fiscal, CAI y personaliza tus facturas
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
      {/* Messages */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200' : 'border-green-200'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Botón para Establecer Configuración */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Establecer Configuración de Facturación</h4>
            <p className="text-sm text-blue-700">
              Guarda todos los cambios realizados y establece la configuración actual como la configuración definitiva de facturación.
            </p>
          </div>
          <Button 
            onClick={handleEstablishConfiguration}
            disabled={establishingConfig}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            {establishingConfig ? 'Estableciendo...' : 'Establecer Configuración'}
          </Button>
        </div>
      </div>

      {/* Información Fiscal */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setFiscalInfoCollapsed(!fiscalInfoCollapsed)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información Fiscal (SAR)
              </CardTitle>
              <CardDescription>
                Datos fiscales requeridos por la Secretaría de Administración Tributaria
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {fiscalInfoCollapsed ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        {!fiscalInfoCollapsed && (
          <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rtn">RTN *</Label>
              <Input
                id="rtn"
                value={fiscalInfo.rtn}
                onChange={(e) => setFiscalInfo(prev => ({ ...prev, rtn: e.target.value }))}
                placeholder="08011995012345"
              />
              <p className="text-xs text-gray-500 mt-1">Formato: 14 dígitos</p>
            </div>
            <div>
              <Label htmlFor="businessName">Nombre o Razón Social *</Label>
              <Input
                id="businessName"
                value={fiscalInfo.businessName}
                onChange={(e) => setFiscalInfo(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="Nombre completo de la empresa"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Fiscal *</Label>
              <Input
                id="email"
                type="email"
                value={fiscalInfo.email}
                onChange={(e) => setFiscalInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={fiscalInfo.phone}
                onChange={(e) => setFiscalInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+504 1234-5678"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="businessAddress">Dirección Fiscal Completa *</Label>
              <Textarea
                id="businessAddress"
                value={fiscalInfo.businessAddress}
                onChange={(e) => setFiscalInfo(prev => ({ ...prev, businessAddress: e.target.value }))}
                placeholder="Calle, Avenida, Ciudad, Departamento"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveFiscalInfo} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Información'}
            </Button>
          </div>
        </CardContent>
        )}
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setLogoCollapsed(!logoCollapsed)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo de la Empresa
              </CardTitle>
              <CardDescription>
                Sube el logo que aparecerá en tus facturas
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {logoCollapsed ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        {!logoCollapsed && (
          <CardContent className="space-y-4">
          <div className="flex items-center justify-center">
            {logoPreview ? (
              <div className="relative">
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="h-32 w-32 object-contain border border-gray-200 rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute -top-2 -right-2 bg-white"
                  onClick={() => setLogoPreview(null)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="h-32 w-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center">
                <Image className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Sin logo</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center">
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Upload className="h-4 w-4" />
                <span>{uploadingLogo ? 'Subiendo...' : 'Subir Logo'}</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500">Formatos aceptados: JPG, PNG, GIF</p>
            <p className="text-xs text-gray-500">Tamaño máximo: 2MB</p>
            <p className="text-xs text-gray-500">Recomendación: 200x200px o mayor</p>
          </div>
        </CardContent>
        )}
      </Card>

      {/* Configuración CAI */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setCaiCollapsed(!caiCollapsed)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configuración CAI (SAR)
              </CardTitle>
              <CardDescription>
                Códigos de Autorización de Impresión emitidos por la SAR
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCaiForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo CAI
              </Button>
              {caiCollapsed ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        {!caiCollapsed && (
          <CardContent>
          {caiConfigs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No tienes configuraciones CAI registradas</p>
              <p className="text-sm text-gray-400 mt-2">Debes solicitar tus CAIs en el portal de la SAR</p>
              <Button onClick={() => setShowCaiForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primer CAI
              </Button>
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-600 font-mono">
                  Debug: caiConfigs.length = {caiConfigs.length}
                </p>
                <p className="text-xs text-gray-600 font-mono">
                  Debug: caiConfigs = {JSON.stringify(caiConfigs)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {caiConfigs.map((cai) => (
                <div key={cai.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{cai.cai}</span>
                        <Badge className={cai.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {cai.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          {cai.taxRate}% ISV
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Rango:</span>
                          <p className="font-medium">{cai.rangeStart} - {cai.rangeEnd}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Actual:</span>
                          <p className="font-medium">{cai.currentNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Vence:</span>
                          <p className="font-medium">{new Date(cai.expiryDate).toLocaleDateString('es-HN')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Establecimiento:</span>
                          <p className="font-medium">{cai.establishmentCode}-{cai.pointOfSaleCode}</p>
                        </div>
                      </div>
                      {cai.economicActivity && (
                        <div className="mt-2">
                          <span className="text-gray-500 text-sm">Actividad Económica:</span>
                          <p className="text-sm font-medium">{cai.economicActivity}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCai(cai)}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cai.id && handleDeleteCai(cai.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        )}
      </Card>

      {/* CAI Modal */}
      {showCaiForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {editingCai ? 'Editar CAI' : 'Nuevo CAI'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {editingCai ? 'Modifica los datos del CAI existente' : 'Registra un nuevo Código de Autorización de Impresión'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCaiForm(false);
                  setEditingCai(null);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleCaiSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cai">CAI *</Label>
                    <Input
                      id="cai"
                      name="cai"
                      defaultValue={editingCai?.cai}
                      placeholder="Ej: 1234567890123456789012345678901234567"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="economicActivity">Actividad Económica *</Label>
                    <select
                      id="economicActivity"
                      name="economicActivity"
                      defaultValue={editingCai?.economicActivity || ""}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecciona una actividad económica</option>
                      {economicActivities.map((activity) => (
                        <option key={activity} value={activity}>
                          {activity}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="rangeStart">Rango Inicial *</Label>
                    <Input
                      id="rangeStart"
                      name="rangeStart"
                      type="number"
                      defaultValue={editingCai?.rangeStart}
                      placeholder="1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="rangeEnd">Rango Final *</Label>
                    <Input
                      id="rangeEnd"
                      name="rangeEnd"
                      type="number"
                      defaultValue={editingCai?.rangeEnd}
                      placeholder="1000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentNumber">Número Actual</Label>
                    <Input
                      id="currentNumber"
                      name="currentNumber"
                      type="number"
                      defaultValue={editingCai?.currentNumber}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxRate">Tasa ISV (%)</Label>
                    <Input
                      id="taxRate"
                      name="taxRate"
                      type="number"
                      step="0.01"
                      defaultValue={editingCai?.taxRate || 15}
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <Label htmlFor="establishmentCode">Código Establecimiento</Label>
                    <Input
                      id="establishmentCode"
                      name="establishmentCode"
                      defaultValue={editingCai?.establishmentCode}
                      placeholder="001"
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pointOfSaleCode">Código Punto Venta</Label>
                    <Input
                      id="pointOfSaleCode"
                      name="pointOfSaleCode"
                      defaultValue={editingCai?.pointOfSaleCode}
                      placeholder="001"
                      maxLength={3}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="expiryDate">Fecha Vencimiento *</Label>
                    <Input
                      id="expiryDate"
                      name="expiryDate"
                      type="date"
                      defaultValue={editingCai?.expiryDate}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCaiForm(false);
                      setEditingCai(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar CAI'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Vista Previa de Factura */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setPreviewCollapsed(!previewCollapsed)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Vista Previa de Factura
              </CardTitle>
              <CardDescription>
                Ejemplo de cómo se verá tu factura con la configuración actual
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {previewCollapsed ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        {!previewCollapsed && (
          <CardContent>
          <InvoiceExample 
            fiscalInfo={fiscalInfo}
            caiConfig={caiConfigs.length > 0 ? caiConfigs[0] : undefined}
            logoUrl={logoPreview || undefined}
          />
        </CardContent>
        )}
      </Card>
        </CardContent>
      </Card>
    </div>
  );
}
