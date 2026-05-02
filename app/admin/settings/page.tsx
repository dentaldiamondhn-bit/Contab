'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings,
  Mail,
  CreditCard,
  Shield,
  Database,
  Bell,
  Globe,
  Palette,
  Save,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Key,
  Server,
  Users,
  Lock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SystemSettings {
  // General
  companyName: string;
  supportEmail: string;
  timezone: string;
  dateFormat: string;
  
  // Email/SMTP
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpFrom: string;
  
  // Billing
  defaultCurrency: string;
  taxRate: string;
  invoicePrefix: string;
  
  // CAI
  caiNumber: string;
  caiExpiryDate: string;
  caiRangeStart: string;
  caiRangeEnd: string;
  
  // Security
  requireEmailVerification: boolean;
  passwordMinLength: string;
  sessionTimeout: string;
  twoFactorAuth: boolean;
  
  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  adminAlerts: boolean;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: 'ContabHN',
    supportEmail: 'soporte@contabhn.com',
    timezone: 'America/Tegucigalpa',
    dateFormat: 'DD/MM/YYYY',
    
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpFrom: 'noreply@contabhn.com',
    
    defaultCurrency: 'HNL',
    taxRate: '15',
    invoicePrefix: 'CONTAB-',
    
    caiNumber: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
    caiExpiryDate: '',
    caiRangeStart: '1',
    caiRangeEnd: '1000',
    
    requireEmailVerification: true,
    passwordMinLength: '8',
    sessionTimeout: '30',
    twoFactorAuth: false,
    
    emailNotifications: true,
    smsNotifications: false,
    adminAlerts: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Aquí se cargarían las configuraciones desde el API
      // Por ahora usamos los valores por defecto
      
      // Simular carga
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Aquí se guardarían las configuraciones en el API
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Configuración guardada exitosamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setError('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'email', name: 'Correo', icon: Mail },
    { id: 'billing', name: 'Facturación', icon: CreditCard },
    { id: 'cai', name: 'CAI', icon: Database },
    { id: 'security', name: 'Seguridad', icon: Shield },
    { id: 'notifications', name: 'Notificaciones', icon: Bell }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al Dashboard
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
              <p className="text-gray-600 mt-1">Gestiona la configuración global de ContabHN</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={fetchSettings}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Cargando...' : 'Recargar'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700">{success}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:w-64">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* General Settings */}
            {activeTab === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configuración General
                  </CardTitle>
                  <CardDescription>
                    Configuración básica del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre de la Empresa
                      </label>
                      <input
                        type="text"
                        value={settings.companyName}
                        onChange={(e) => handleChange('companyName', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email de Soporte
                      </label>
                      <input
                        type="email"
                        value={settings.supportEmail}
                        onChange={(e) => handleChange('supportEmail', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zona Horaria
                      </label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => handleChange('timezone', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="America/Tegucigalpa">Tegucigalpa (Honduras)</option>
                        <option value="America/Guatemala">Guatemala</option>
                        <option value="America/El_Salvador">El Salvador</option>
                        <option value="America/Costa_Rica">Costa Rica</option>
                        <option value="America/Panama">Panamá</option>
                        <option value="America/Mexico_City">Ciudad de México</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Formato de Fecha
                      </label>
                      <select
                        value={settings.dateFormat}
                        onChange={(e) => handleChange('dateFormat', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email Settings */}
            {activeTab === 'email' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Configuración de Correo (SMTP)
                  </CardTitle>
                  <CardDescription>
                    Configura el servidor de correo para notificaciones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Servidor SMTP
                      </label>
                      <input
                        type="text"
                        value={settings.smtpHost}
                        onChange={(e) => handleChange('smtpHost', e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Puerto SMTP
                      </label>
                      <input
                        type="text"
                        value={settings.smtpPort}
                        onChange={(e) => handleChange('smtpPort', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Usuario SMTP
                      </label>
                      <input
                        type="text"
                        value={settings.smtpUser}
                        onChange={(e) => handleChange('smtpUser', e.target.value)}
                        placeholder="usuario@ejemplo.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email de Envío
                      </label>
                      <input
                        type="email"
                        value={settings.smtpFrom}
                        onChange={(e) => handleChange('smtpFrom', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña SMTP
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dejar en blanco para mantener la contraseña actual
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Billing Settings */}
            {activeTab === 'billing' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Configuración de Facturación
                  </CardTitle>
                  <CardDescription>
                    Configuración de moneda e impuestos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Moneda por Defecto
                      </label>
                      <select
                        value={settings.defaultCurrency}
                        onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="HNL">Lempira (HNL)</option>
                        <option value="USD">Dólar (USD)</option>
                        <option value="GTQ">Quetzal (GTQ)</option>
                        <option value="CRC">Colón (CRC)</option>
                        <option value="PAB">Balboa (PAB)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tasa de Impuesto (%)
                      </label>
                      <input
                        type="number"
                        value={settings.taxRate}
                        onChange={(e) => handleChange('taxRate', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prefijo de Factura
                      </label>
                      <input
                        type="text"
                        value={settings.invoicePrefix}
                        onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CAI Settings */}
            {activeTab === 'cai' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Configuración de CAI
                  </CardTitle>
                  <CardDescription>
                    Configuración del Código de Autorización de Impresión
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de CAI
                    </label>
                    <input
                      type="text"
                      value={settings.caiNumber}
                      onChange={(e) => handleChange('caiNumber', e.target.value)}
                      placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Vencimiento
                      </label>
                      <input
                        type="date"
                        value={settings.caiExpiryDate}
                        onChange={(e) => handleChange('caiExpiryDate', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rango Inicial
                      </label>
                      <input
                        type="number"
                        value={settings.caiRangeStart}
                        onChange={(e) => handleChange('caiRangeStart', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rango Final
                      </label>
                      <input
                        type="number"
                        value={settings.caiRangeEnd}
                        onChange={(e) => handleChange('caiRangeEnd', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Importante
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          El CAI debe estar vigente y ser válido ante la autoridad tributaria. 
                          Asegúrate de que los rangos de facturación estén actualizados.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Configuración de Seguridad
                  </CardTitle>
                  <CardDescription>
                    Configuración de políticas de seguridad
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Longitud Mínima de Contraseña
                      </label>
                      <input
                        type="number"
                        value={settings.passwordMinLength}
                        onChange={(e) => handleChange('passwordMinLength', e.target.value)}
                        min="6"
                        max="32"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tiempo de Expiración de Sesión (minutos)
                      </label>
                      <input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => handleChange('sessionTimeout', e.target.value)}
                        min="5"
                        max="1440"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.requireEmailVerification}
                        onChange={(e) => handleChange('requireEmailVerification', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Requerir Verificación de Email</span>
                        <p className="text-sm text-gray-500">Los usuarios deben verificar su email antes de acceder</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.twoFactorAuth}
                        onChange={(e) => handleChange('twoFactorAuth', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Autenticación de Dos Factores (2FA)</span>
                        <p className="text-sm text-gray-500">Requerir 2FA para todos los usuarios administrativos</p>
                      </div>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Configuración de Notificaciones
                  </CardTitle>
                  <CardDescription>
                    Configura qué notificaciones se envían y cómo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <span className="font-medium text-gray-900">Notificaciones por Email</span>
                          <p className="text-sm text-gray-500">Enviar notificaciones importantes por correo electrónico</p>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.smsNotifications}
                        onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3">
                        <Server className="w-5 h-5 text-gray-400" />
                        <div>
                          <span className="font-medium text-gray-900">Notificaciones por SMS</span>
                          <p className="text-sm text-gray-500">Enviar alertas críticas por mensaje de texto</p>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.adminAlerts}
                        onChange={(e) => handleChange('adminAlerts', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                        <div>
                          <span className="font-medium text-gray-900">Alertas de Administrador</span>
                          <p className="text-sm text-gray-500">Notificar sobre eventos importantes del sistema</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
