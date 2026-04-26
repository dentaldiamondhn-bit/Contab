"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Database,
  Shield
} from 'lucide-react';

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  isActive: boolean;
  updatedAt: string;
}

interface CAIConfig {
  cai: string;
  rangeStart: number;
  rangeEnd: number;
  currentNumber: number;
  expiryDate: string;
  rtn: string;
  businessName: string;
  businessAddress: string;
  establishmentCode: string;
  pointOfSaleCode: string;
  economicActivity: string;
  taxRate: number;
}

export default function SystemConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [caiConfig, setCaiConfig] = useState<CAIConfig>({
    cai: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
    rangeStart: 1,
    rangeEnd: 1000,
    currentNumber: 1,
    expiryDate: '2024-12-31T23:59:59.000Z',
    rtn: '05011991078006',
    businessName: 'CONTAB HN',
    businessAddress: 'Tegucigalpa, Honduras',
    establishmentCode: '001',
    pointOfSaleCode: '001',
    economicActivity: '631100',
    taxRate: 15
  });

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  const fetchSystemConfig = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Iniciando fetchSystemConfig...');
      
      const response = await fetch('/api/admin/system/config');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Error al cargar configuración');
      }
      
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (data.success && data.configs) {
        console.log('✅ Configs recibidas:', data.configs);
        setConfigs(data.configs);
        
        // Buscar configuración del CAI
        const caiConfigData = data.configs.find((config: SystemConfig) => config.key === 'contabhn_cai');
        
        console.log('🔍 Buscando config contabhn_cai:', caiConfigData);
        
        if (caiConfigData) {
          try {
            const caiData = JSON.parse(caiConfigData.value);
            console.log('📊 CAI data parsed:', caiData);
            
            setCaiConfig({
              cai: caiData.cai || '',
              rangeStart: caiData.rangeStart || 1,
              rangeEnd: caiData.rangeEnd || 1000,
              currentNumber: caiData.currentNumber || 1,
              expiryDate: caiData.expiryDate || new Date().toISOString(),
              rtn: caiData.rtn || '',
              businessName: caiData.businessName || '',
              businessAddress: caiData.businessAddress || '',
              establishmentCode: caiData.establishmentCode || '001',
              pointOfSaleCode: caiData.pointOfSaleCode || '001',
              economicActivity: caiData.economicActivity || '631100',
              taxRate: caiData.taxRate || 15
            });
            
            console.log('✅ CAI config actualizado en el estado');
          } catch (parseError) {
            console.error('❌ Error parsing CAI config:', parseError);
            setError('Error al procesar configuración del CAI');
          }
        } else {
          console.log('⚠️ No se encontró configuración contabhn_cai');
        }
      } else {
        console.log('❌ Error en respuesta:', data.error);
        throw new Error(data.error || 'Error desconocido');
      }
      
    } catch (err) {
      console.error('❌ Error fetching system config:', err);
      setError('Error al cargar configuración del sistema');
      
      console.log('🔄 Cargando configuración por defecto...');
      // Cargar configuración por defecto si hay error
      setCaiConfig({
        cai: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
        rangeStart: 1,
        rangeEnd: 1000,
        currentNumber: 1,
        expiryDate: '2024-12-31T23:59:59.000Z',
        rtn: '05011991078006',
        businessName: 'CONTAB HN',
        businessAddress: 'Tegucigalpa, Honduras',
        establishmentCode: '001',
        pointOfSaleCode: '001',
        economicActivity: '631100',
        taxRate: 15
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCAIConfig = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      console.log('🔄 Iniciando saveCAIConfig...');
      console.log('📝 Current caiConfig:', caiConfig);
      
      // Validaciones básicas
      if (!caiConfig.cai.trim()) {
        console.log('❌ CAI validation failed');
        setError('El CAI es requerido');
        return;
      }
      
      if (!caiConfig.rtn.trim()) {
        console.log('❌ RTN validation failed');
        setError('El RTN es requerido');
        return;
      }
      
      if (caiConfig.rangeStart >= caiConfig.rangeEnd) {
        console.log('❌ Range validation failed');
        setError('El rango inicial debe ser menor que el rango final');
        return;
      }
      
      if (caiConfig.currentNumber < caiConfig.rangeStart || caiConfig.currentNumber > caiConfig.rangeEnd) {
        console.log('❌ Current number validation failed');
        setError('El número actual debe estar dentro del rango');
        return;
      }
      
      console.log('✅ Validaciones pasadas, enviando al API...');
      
      // Enviar configuración al API
      const requestBody = {
        key: 'contabhn_cai',
        value: JSON.stringify(caiConfig),
        description: 'Configuración del CAI para ContabHN'
      };
      
      console.log('📤 Request body:', requestBody);
      
      const response = await fetch('/api/admin/system/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ Error response:', errorData);
        throw new Error(errorData.error || 'Error al guardar configuración');
      }
      
      const data = await response.json();
      console.log('✅ Response data:', data);
      
      if (data.success) {
        setSuccess('✅ Configuración del CAI guardada exitosamente');
        
        // Actualizar configs locales
        const updatedConfigs = configs.map(config => 
          config.key === 'contabhn_cai' 
            ? { ...config, value: JSON.stringify(caiConfig), updatedAt: new Date().toISOString() }
            : config
        );
        setConfigs(updatedConfigs);
        
        console.log('🔄 Configs locales actualizadas');
        
        // Limpiar mensajes de éxito después de 3 segundos
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
      
    } catch (err: any) {
      console.error('❌ Error saving CAI config:', err);
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    console.log('🔄 Restableciendo a valores por defecto...');
    
    const defaultConfig = {
      cai: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
      rangeStart: 1,
      rangeEnd: 1000,
      currentNumber: 1,
      expiryDate: '2024-12-31T23:59:59.000Z',
      rtn: '05011991078006',
      businessName: 'CONTAB HN',
      businessAddress: 'Tegucigalpa, Honduras',
      establishmentCode: '001',
      pointOfSaleCode: '001',
      economicActivity: '631100',
      taxRate: 15
    };
    
    console.log('📝 Default config:', defaultConfig);
    
    setCaiConfig(defaultConfig);
    setSuccess('');
    setError('');
    
    // También actualizar las configs locales para que persista el reset
    const updatedConfigs = configs.map(config => 
      config.key === 'contabhn_cai' 
        ? { ...config, value: JSON.stringify(defaultConfig), updatedAt: new Date().toISOString() }
        : config
    );
    setConfigs(updatedConfigs);
    
    console.log('✅ Configs locales actualizadas con valores por defecto');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p>Cargando configuración del sistema...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
              <p className="text-gray-600 mt-1">Gestión de configuraciones globales de ContabHN</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={fetchSystemConfig} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recargar
              </Button>
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sistema Activo
              </Badge>
            </div>
          </div>
        </div>

        {/* Error y Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuración Principal - CAI */}
          <div className="lg:col-span-2 space-y-6">
            {/* CAI Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Configuración del CAI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>CAI</Label>
                    <Input
                      value={caiConfig.cai}
                      onChange={(e) => setCaiConfig({...caiConfig, cai: e.target.value})}
                      placeholder="Código de Autorización de Impresión"
                    />
                  </div>
                  <div>
                    <Label>RTN</Label>
                    <Input
                      value={caiConfig.rtn}
                      onChange={(e) => setCaiConfig({...caiConfig, rtn: e.target.value})}
                      placeholder="RTN del negocio"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Rango Inicial</Label>
                    <Input
                      type="number"
                      value={caiConfig.rangeStart}
                      onChange={(e) => setCaiConfig({...caiConfig, rangeStart: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Rango Final</Label>
                    <Input
                      type="number"
                      value={caiConfig.rangeEnd}
                      onChange={(e) => setCaiConfig({...caiConfig, rangeEnd: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Número Actual</Label>
                    <Input
                      type="number"
                      value={caiConfig.currentNumber}
                      onChange={(e) => setCaiConfig({...caiConfig, currentNumber: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha de Vencimiento</Label>
                    <Input
                      type="date"
                      value={caiConfig.expiryDate.split('T')[0]}
                      onChange={(e) => setCaiConfig({...caiConfig, expiryDate: e.target.value + 'T23:59:59.000Z'})}
                    />
                  </div>
                  <div>
                    <Label>Tasa de ISV (%)</Label>
                    <Input
                      type="number"
                      value={caiConfig.taxRate}
                      onChange={(e) => setCaiConfig({...caiConfig, taxRate: parseFloat(e.target.value) || 0})}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Nombre del Negocio</Label>
                  <Input
                    value={caiConfig.businessName}
                    onChange={(e) => setCaiConfig({...caiConfig, businessName: e.target.value})}
                    placeholder="Nombre legal del negocio"
                  />
                </div>

                <div>
                  <Label>Dirección del Negocio</Label>
                  <Textarea
                    value={caiConfig.businessAddress}
                    onChange={(e) => setCaiConfig({...caiConfig, businessAddress: e.target.value})}
                    placeholder="Dirección completa del negocio"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Código de Establecimiento</Label>
                    <Input
                      value={caiConfig.establishmentCode}
                      onChange={(e) => setCaiConfig({...caiConfig, establishmentCode: e.target.value})}
                      placeholder="001"
                    />
                  </div>
                  <div>
                    <Label>Código de Punto Venta</Label>
                    <Input
                      value={caiConfig.pointOfSaleCode}
                      onChange={(e) => setCaiConfig({...caiConfig, pointOfSaleCode: e.target.value})}
                      placeholder="001"
                    />
                  </div>
                  <div>
                    <Label>Actividad Económica</Label>
                    <Input
                      value={caiConfig.economicActivity}
                      onChange={(e) => setCaiConfig({...caiConfig, economicActivity: e.target.value})}
                      placeholder="631100"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button onClick={saveCAIConfig} disabled={saving} className="flex-1">
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                  </Button>
                  <Button onClick={resetToDefaults} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restablecer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Información y Estado */}
          <div className="space-y-6">
            {/* Estado del Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Estado del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">CAI Activo</span>
                  <Badge className="bg-green-100 text-green-800">Sí</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Facturas Disponibles</span>
                  <span className="text-sm">{caiConfig.rangeEnd - caiConfig.currentNumber + 1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Última Actualización</span>
                  <span className="text-sm text-gray-500">Hoy</span>
                </div>
              </CardContent>
            </Card>

            {/* Configuraciones Adicionales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Configuraciones Adicionales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {configs.map((config) => (
                  <div key={config.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">{config.key}</span>
                      <Badge className={config.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {config.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{config.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Información de Ayuda */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Información
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>
                  <strong>CAI:</strong> Código de Autorización de Impresión proporcionado por la SAR.
                </p>
                <p>
                  <strong>Rango:</strong> Rango de números de factura autorizados.
                </p>
                <p>
                  <strong>RTN:</strong> Registro Tributario Nacional del negocio.
                </p>
                <p>
                  <strong>Actividad Económica:</strong> Código de actividad según clasificación SAR.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
