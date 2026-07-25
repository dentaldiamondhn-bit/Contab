'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenant } from '@/lib/contexts/TenantContext';
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
  Check,
  CreditCard,
  Package,
  DollarSign,
  Calculator
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

interface TaxConfig {
  isv15Enabled: boolean;
  isv18Enabled: boolean;
  defaultTaxRate: number;
  customTaxes: CustomTax[];
}

interface CustomTax {
  id: string;
  name: string;
  rate: number;
  enabled: boolean;
  description?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate: number;
  taxAmount: number;
}

export default function TenantSettingsPage() {
  const { currentTenant, loading: tenantLoading } = useTenant();
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
  
  const [taxConfig, setTaxConfig] = useState<TaxConfig>({
    isv15Enabled: true,
    isv18Enabled: true,
    defaultTaxRate: 15,
    customTaxes: []
  });

  // Invoice creation states
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [showInvoiceSection, setShowInvoiceSection] = useState(false);

  // Tenant info state
  const [tenantInfo, setTenantInfo] = useState({
    businessName: '',
    businessEmail: '',
    businessRTN: '',
    businessAddress: '',
    phoneNumber: '',
    industry: '',
    tenantCode: '',
    maxUsers: 0,
    maxStorage: 0,
    isActive: true,
  });
  const [savingTenantInfo, setSavingTenantInfo] = useState(false);

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

  // Collapsible states - open by default
  const [fiscalInfoCollapsed, setFiscalInfoCollapsed] = useState(false);
  const [logoCollapsed, setLogoCollapsed] = useState(false);
  const [caiCollapsed, setCaiCollapsed] = useState(false);
  const [taxCollapsed, setTaxCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  // Cargar datos cuando el componente se monta
  useEffect(() => {
    loadCaiConfigs();
    loadFiscalInfo();
    loadLogoFromStorage();
    loadTaxConfig();
  }, []);

  // Load tenant info from context when available, fallback to API
  useEffect(() => {
    if (currentTenant) {
      setTenantInfo({
        businessName: currentTenant.businessName || '',
        businessEmail: currentTenant.businessEmail || '',
        businessRTN: currentTenant.businessRTN || '',
        businessAddress: currentTenant.businessAddress || '',
        phoneNumber: currentTenant.phoneNumber || '',
        industry: currentTenant.industry || '',
        tenantCode: currentTenant.tenantCode || '',
        maxUsers: currentTenant.maxUsers || 0,
        maxStorage: currentTenant.maxStorage || 0,
        isActive: currentTenant.isActive ?? true,
      });
    } else if (!tenantLoading) {
      fetch('/api/tenants-api')
        .then(res => res.json())
        .then(data => {
          const tenants = Array.isArray(data) ? data : (data.tenants || []);
          const t = tenants.length > 0 ? tenants[0] : null;
          if (t) {
            setTenantInfo({
              businessName: t.businessName || '',
              businessEmail: t.businessEmail || '',
              businessRTN: t.businessRTN || '',
              businessAddress: t.businessAddress || '',
              phoneNumber: t.phoneNumber || '',
              industry: t.industry || '',
              tenantCode: t.tenantCode || '',
              maxUsers: t.maxUsers || 0,
              maxStorage: t.maxStorage || 0,
              isActive: t.isActive ?? true,
            });
          }
        })
        .catch(err => console.error('Error loading tenant:', err));
    }
  }, [currentTenant, tenantLoading]);

  const saveTenantInfo = async () => {
    try {
      setSavingTenantInfo(true);
      const res = await fetch('/api/tenant/my-tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantInfo),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Información del tenant guardada correctamente' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar la información del tenant' });
      }
    } catch (error) {
      console.error('Error guardando info del tenant:', error);
      setMessage({ type: 'error', text: 'Error de conexión al guardar' });
    } finally {
      setSavingTenantInfo(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const loadLogoFromStorage = async () => {
    try {
      // Primero intentar cargar desde localStorage
      const savedLogo = localStorage.getItem('companyLogo');
      if (savedLogo) {
        setLogoPreview(savedLogo);
        console.log('🔍 Logo cargado desde localStorage');
        return;
      }

      // Si no hay logo en localStorage, intentar cargar desde el servidor
      try {
        const response = await fetch('/api/billing/logo-get');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.logoUrl) {
            setLogoPreview(data.logoUrl);
            localStorage.setItem('companyLogo', data.logoUrl);
            console.log('🔍 Logo cargado desde servidor');
          }
        }
      } catch (serverError) {
        console.log('⚠️ No se pudo cargar logo desde servidor:', serverError);
      }
    } catch (error) {
      console.error('Error cargando logo:', error);
    }
  };

  const loadTaxConfig = async () => {
    try {
      // Cargar configuración estándar desde localStorage
      const savedTaxConfig = localStorage.getItem('taxConfig');
      let config;
      
      if (savedTaxConfig) {
        config = JSON.parse(savedTaxConfig);
        // Asegurar que customTaxes exista
        if (!config.customTaxes) {
          config.customTaxes = [];
        }
      } else {
        // Configuración por defecto
        config = {
          isv15Enabled: true,
          isv18Enabled: true,
          defaultTaxRate: 15,
          customTaxes: []
        };
      }

      // Cargar impuestos personalizados desde la API
      try {
        const response = await fetch('/api/taxes/custom');
        if (response.ok) {
          const { data: customTaxes } = await response.json();
          config.customTaxes = customTaxes || [];
          console.log('🔍 Impuestos personalizados cargados desde API:', customTaxes);
        } else {
          console.log('⚠️ Error cargando impuestos personalizados desde API, usando localStorage');
        }
      } catch (apiError) {
        console.log('⚠️ Error en API de impuestos personalizados, usando localStorage:', apiError);
      }

      // Guardar configuración combinada en localStorage
      localStorage.setItem('taxConfig', JSON.stringify(config));
      setTaxConfig(config);
      console.log('� Configuración de impuestos cargada:', config);
      
    } catch (error) {
      console.error('Error cargando configuración de impuestos:', error);
      // En caso de error, establecer configuración por defecto
      const defaultConfig = {
        isv15Enabled: true,
        isv18Enabled: true,
        defaultTaxRate: 15,
        customTaxes: []
      };
      setTaxConfig(defaultConfig);
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

        const response = await fetch('/api/billing/logo-upload', {
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

  const saveTaxConfig = () => {
    try {
      localStorage.setItem('taxConfig', JSON.stringify(taxConfig));
      console.log('✅ Configuración de impuestos guardada:', taxConfig);
      setMessage({ type: 'success', text: 'Configuración de impuestos guardada correctamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error guardando configuración de impuestos:', error);
      setMessage({ type: 'error', text: 'Error al guardar la configuración de impuestos' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const addCustomTax = async () => {
    const newTax: CustomTax = {
      id: Date.now().toString(),
      name: 'Nuevo Impuesto',
      rate: 15,
      enabled: true,
      description: 'Impuesto personalizado'
    };
    
    try {
      // Guardar en la base de datos
      const response = await fetch('/api/taxes/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTax.name,
          rate: newTax.rate,
          description: newTax.description
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear impuesto');
      }

      const savedTax = await response.json();
      
      // Actualizar estado local
      const newConfig = {
        ...taxConfig,
        customTaxes: [...(taxConfig.customTaxes || []), savedTax.data]
      };
      setTaxConfig(newConfig);
      
      // También guardar en localStorage como backup
      localStorage.setItem('taxConfig', JSON.stringify(newConfig));
      
      console.log('✅ Nuevo impuesto agregado y guardado en BD:', savedTax.data);
      
      // Recargar la lista de impuestos desde la API para asegurar sincronización
      setTimeout(async () => {
        try {
          const response = await fetch('/api/taxes/custom');
          if (response.ok) {
            const { data: customTaxes } = await response.json();
            const updatedConfig = {
              ...taxConfig,
              customTaxes: customTaxes || []
            };
            setTaxConfig(updatedConfig);
            localStorage.setItem('taxConfig', JSON.stringify(updatedConfig));
            console.log('🔄 Lista de impuestos recargada desde API:', customTaxes);
          }
        } catch (error) {
          console.log('⚠️ Error recargando lista de impuestos:', error);
        }
      }, 500);
      setMessage({ type: 'success', text: 'Impuesto agregado correctamente' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error guardando nuevo impuesto:', error);
      setMessage({ type: 'error', text: 'Error al guardar el impuesto' });
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const updateCustomTax = async (id: string, field: keyof CustomTax, value: any) => {
    try {
      // Actualizar en la base de datos
      const response = await fetch(`/api/taxes/custom?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,  // Incluir el ID en el body
          [field]: value
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar impuesto');
      }

      const updatedTax = await response.json();
      
      // Actualizar estado local
      const newConfig = {
        ...taxConfig,
        customTaxes: (taxConfig.customTaxes || []).map(tax => 
          tax.id === id ? { ...tax, [field]: value } : tax
        )
      };
      setTaxConfig(newConfig);
      
      // También guardar en localStorage como backup
      localStorage.setItem('taxConfig', JSON.stringify(newConfig));
      
      console.log('✅ Impuesto actualizado y guardado en BD:', updatedTax.data);
      setMessage({ type: 'success', text: 'Impuesto actualizado correctamente' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error actualizando impuesto:', error);
      setMessage({ type: 'error', text: 'Error al actualizar el impuesto' });
      setTimeout(() => setMessage(null), 2000);
    }
  };

  // Invoice functions
  const addInvoiceItem = () => {
    const defaultTaxRate = taxConfig.customTaxes.length > 0 ? taxConfig.customTaxes[0].rate : 0.15;
    
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      taxRate: defaultTaxRate,
      taxAmount: 0
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const removeInvoiceItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(invoiceItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalcular montos si cambia precio, cantidad o tasa de impuesto
        if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
          const itemSubtotal = updatedItem.quantity * updatedItem.unitPrice;
          updatedItem.taxAmount = itemSubtotal * updatedItem.taxRate;
          updatedItem.total = itemSubtotal; // Total sin impuestos
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeCustomTax = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este impuesto personalizado?')) return;
    
    try {
      // Eliminar de la base de datos
      const response = await fetch(`/api/taxes/custom?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar impuesto');
      }

      // Actualizar estado local
      const newConfig = {
        ...taxConfig,
        customTaxes: (taxConfig.customTaxes || []).filter(tax => tax.id !== id)
      };
      setTaxConfig(newConfig);
      
      // También guardar en localStorage como backup
      localStorage.setItem('taxConfig', JSON.stringify(newConfig));
      
      console.log('✅ Impuesto eliminado y guardado en BD:', id);
      setMessage({ type: 'success', text: 'Impuesto eliminado correctamente' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error eliminando impuesto:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el impuesto' });
      setTimeout(() => setMessage(null), 2000);
    }
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
            Configuración General del Tenant
          </CardTitle>
          <CardDescription>
            Información básica de tu empresa y configuración de la cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tenantBusinessName">Nombre de la Empresa</Label>
              <Input
                id="tenantBusinessName"
                value={tenantInfo.businessName}
                onChange={(e) => setTenantInfo(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="Nombre de la empresa"
              />
            </div>
            <div>
              <Label htmlFor="tenantEmail">Email de la Empresa</Label>
              <Input
                id="tenantEmail"
                type="email"
                value={tenantInfo.businessEmail}
                onChange={(e) => setTenantInfo(prev => ({ ...prev, businessEmail: e.target.value }))}
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="tenantRTN">RTN</Label>
              <Input
                id="tenantRTN"
                value={tenantInfo.businessRTN}
                onChange={(e) => setTenantInfo(prev => ({ ...prev, businessRTN: e.target.value }))}
                placeholder="08011995012345"
              />
            </div>
            <div>
              <Label htmlFor="tenantPhone">Teléfono</Label>
              <Input
                id="tenantPhone"
                value={tenantInfo.phoneNumber}
                onChange={(e) => setTenantInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+504 1234-5678"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="tenantAddress">Dirección</Label>
              <Textarea
                id="tenantAddress"
                value={tenantInfo.businessAddress}
                onChange={(e) => setTenantInfo(prev => ({ ...prev, businessAddress: e.target.value }))}
                placeholder="Calle, Avenida, Ciudad, Departamento"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="tenantIndustry">Giro / Industria</Label>
              <Input
                id="tenantIndustry"
                value={tenantInfo.industry}
                onChange={(e) => setTenantInfo(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="Ej: Servicios Profesionales"
              />
            </div>
            <div>
              <Label>Código de Tenant</Label>
              <Input value={tenantInfo.tenantCode} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">Identificador único (no editable)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold">Estado</p>
              <p className={`text-sm font-semibold mt-1 ${tenantInfo.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {tenantInfo.isActive ? 'Activo' : 'Inactivo'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold">Máx. Usuarios</p>
              <p className="text-sm font-semibold mt-1">{tenantInfo.maxUsers || 'Sin límite'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold">Almacenamiento</p>
              <p className="text-sm font-semibold mt-1">{tenantInfo.maxStorage ? `${tenantInfo.maxStorage} GB` : 'Sin límite'}</p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={saveTenantInfo} disabled={savingTenantInfo}>
              <Save className="h-4 w-4 mr-2" />
              {savingTenantInfo ? 'Guardando...' : 'Guardar Información del Tenant'}
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Configuración de Impuestos */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setTaxCollapsed(!taxCollapsed)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Configuración de Impuestos (ISV)
              </CardTitle>
              <CardDescription>
                Habilita o deshabilita las tasas de Impuesto Sobre Ventas
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {taxCollapsed ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        {!taxCollapsed && (
          <CardContent className="space-y-4">
            <div className="space-y-6">
              {/* Impuestos Estándar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isv15Enabled" className="text-sm font-medium">
                      ISV 15%
                    </Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isv15Enabled"
                        checked={taxConfig.isv15Enabled}
                        onChange={(e) => setTaxConfig(prev => ({ 
                          ...prev, 
                          isv15Enabled: e.target.checked 
                        }))}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">
                        {taxConfig.isv15Enabled ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Aplicable a productos y servicios básicos
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isv18Enabled" className="text-sm font-medium">
                      ISV 18%
                    </Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isv18Enabled"
                        checked={taxConfig.isv18Enabled}
                        onChange={(e) => setTaxConfig(prev => ({ 
                          ...prev, 
                          isv18Enabled: e.target.checked 
                        }))}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">
                        {taxConfig.isv18Enabled ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Aplicable a licores, tabaco y servicios específicos
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="defaultTaxRate" className="text-sm font-medium">
                    Tasa por Defecto
                  </Label>
                  <select
                    id="defaultTaxRate"
                    value={taxConfig.defaultTaxRate}
                    onChange={(e) => setTaxConfig(prev => ({ 
                      ...prev, 
                      defaultTaxRate: parseFloat(e.target.value) 
                    }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value={15}>15% ISV</option>
                    <option value={18}>18% ISV</option>
                    {(taxConfig.customTaxes || []).map(tax => (
                      <option key={tax.id} value={tax.rate}>
                        {tax.rate}% {tax.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    Tasa que se aplicará por defecto en nuevas facturas
                  </p>
                </div>
              </div>

              {/* Impuestos Personalizados */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Impuestos Personalizados</h4>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addCustomTax}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar Impuesto
                  </Button>
                </div>
                
                {(taxConfig.customTaxes || []).length > 0 ? (
                  <div className="space-y-3">
                    {(taxConfig.customTaxes || []).map((tax) => (
                      <div key={tax.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs font-medium">Nombre</Label>
                            <Input
                              value={tax.name}
                              onChange={(e) => updateCustomTax(tax.id, 'name', e.target.value)}
                              placeholder="Ej: Impuesto Municipal"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Tasa (%)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={tax.rate}
                              onChange={(e) => updateCustomTax(tax.id, 'rate', parseFloat(e.target.value) || 0)}
                              placeholder="Ej: 2.5"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Descripción</Label>
                            <Input
                              value={tax.description || ''}
                              onChange={(e) => updateCustomTax(tax.id, 'description', e.target.value)}
                              placeholder="Descripción opcional"
                              className="text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={tax.enabled}
                                onChange={(e) => updateCustomTax(tax.id, 'enabled', e.target.checked)}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-600">
                                {tax.enabled ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeCustomTax(tax.id)}
                              className="ml-auto"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No hay impuestos personalizados configurados</p>
                    <p className="text-xs mt-1">Agrega impuestos personalizados para tipos específicos de tributos</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={saveTaxConfig} className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración de Impuestos
              </Button>
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

      {/* Invoice Creation Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Creación de Factura
              </CardTitle>
              <CardDescription>
                Prueba la creación de facturas con la configuración actual
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowInvoiceSection(!showInvoiceSection)}
            >
              {showInvoiceSection ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
        </CardHeader>
        {showInvoiceSection && (
          <CardContent className="space-y-6">
            {/* Calculate totals */}
            {(() => {
              const subtotal = invoiceItems.reduce((sum: number, item: InvoiceItem) => sum + item.total, 0);
              const tax = invoiceItems.reduce((sum: number, item: InvoiceItem) => sum + item.taxAmount, 0);
              const total = subtotal + tax;
              
              return (
                <>
                  {/* Invoice Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Items de Factura</h3>
                      <Button onClick={addInvoiceItem} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Item
                      </Button>
                    </div>
                    
                    {invoiceItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                        <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No hay items agregados</p>
                        <p className="text-sm">Agrega items para crear una factura de prueba</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {invoiceItems.map((item, index) => (
                          <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg">
                            <div className="col-span-6">
                              <Label className="text-xs font-medium text-gray-500 mb-1">
                                Descripción
                              </Label>
                              <Input
                                value={item.description}
                                onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                                placeholder="Descripción del servicio o producto"
                                className="text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs font-medium text-gray-500 mb-1">
                                Cantidad
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs font-medium text-gray-500 mb-1">
                                Precio Unitario
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateInvoiceItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="text-sm"
                              />
                            </div>
                            <div className="col-span-1">
                              <Label className="text-xs font-medium text-gray-500 mb-1">
                                Total
                              </Label>
                              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium">
                                L. {item.total.toFixed(2)}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs font-medium text-gray-500 mb-1">
                                Impuesto
                              </Label>
                              <select
                                value={item.taxRate}
                                onChange={(e) => updateInvoiceItem(item.id, 'taxRate', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                {taxConfig.customTaxes.map((tax) => (
                                  <option key={tax.id} value={tax.rate}>
                                    {tax.name} ({(tax.rate * 100).toFixed(1)}%)
                                  </option>
                                ))}
                                <option value={0.15}>ISV 15%</option>
                                <option value={0.18}>ISV 18%</option>
                              </select>
                            </div>
                            <div className="col-span-1">
                              <Label className="text-xs font-medium text-gray-500 mb-1">
                                Acciones
                              </Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeInvoiceItem(item.id)}
                                className="w-full"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5" />
                        Totales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-end">
                        <div className="w-full md:w-1/3">
                          <div className="flex justify-between py-2">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">L. {subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-gray-600">Impuestos:</span>
                            <span className="font-medium">L. {tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-200">
                            <span>Total:</span>
                            <span>L. {total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </CardContent>
        )}
      </Card>

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
            invoiceItems={invoiceItems}
          />
        </CardContent>
        )}
      </Card>
    </div>
  );
}
