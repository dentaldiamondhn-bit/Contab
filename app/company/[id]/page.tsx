'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/standard-client';
import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
import { 
  Building2, 
  Settings, 
  FileText, 
  Calculator, 
  Plus, 
  Edit, 
  Save,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Hash,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  User
} from 'lucide-react';

interface CompanyProfile {
  id: string;
  businessname: string;
  businessrtn: string;
  businessemail: string;
  businessphone: string;
  businessaddress: string;
  businesscity: string;
  businesscountry: string;
  businesstype: string;
  industry: string;
  isactive: boolean;
  createdat: string;
  updatedat: string;
}

interface ConfigFiscal {
  id: string;
  rtnempresa: string;
  caiactivo?: string;
  rangoinicial?: number;
  rangofinal?: number;
  fechalimiteemision?: string;
  regimentributario: string;
  obligadocontabilidad: boolean;
  actividad_economica: string;
  direccionfiscal?: string;
  telefonofiscal?: string;
  emailfiscal?: string;
}

interface CAI {
  id: string;
  caicode: string;
  establishmentcode: string;
  pointofsalecode: string;
  documenttype: string;
  rangestart: number;
  rangeend: number;
  currentnumber: number;
  issuedate: string;
  expirationdate: string;
  status: string;
  isactive: boolean;
}

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [configFiscal, setConfigFiscal] = useState<ConfigFiscal | null>(null);
  const [cais, setCais] = useState<CAI[]>([]);
  const [showCAIDialog, setShowCAIDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Form states
  const [companyForm, setCompanyForm] = useState<Partial<CompanyProfile>>({});
  const [fiscalForm, setFiscalForm] = useState<Partial<ConfigFiscal>>({});
  const [caiForm, setCaiForm] = useState({
    caicode: '',
    establishmentcode: '001',
    pointofsalecode: '001',
    documenttype: 'FACT',
    rangestart: 1,
    rangeend: 1000,
    issuedate: new Date().toISOString().split('T')[0],
    expirationdate: ''
  });

  useEffect(() => {
    if (companyId) {
      loadCompanyData();
    }
  }, [companyId]);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos de la empresa
      const { data: companyData, error: companyError } = await supabase
        .from('Tenant')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);
      setCompanyForm(companyData);

      // Cargar configuración fiscal
      const { data: fiscalData, error: fiscalError } = await supabase
        .from('config_fiscal')
        .select('*')
        .eq('rtnempresa', companyData.businessrtn)
        .single();

      if (fiscalError && fiscalError.code !== 'PGRST116') {
        throw fiscalError;
      }
      
      if (fiscalData) {
        setConfigFiscal(fiscalData);
        setFiscalForm(fiscalData);
      }

      // Cargar CAIs
      const { data: caiData, error: caiError } = await supabase
        .from('CAI')
        .select('*')
        .eq('tenant_id', companyId)
        .order('createdat', { ascending: false });

      if (caiError) throw caiError;
      setCais(caiData || []);

    } catch (error) {
      console.error('Error loading company data:', error);
      setError('Error al cargar los datos de la empresa');
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('Tenant')
        .update({
          ...companyForm,
          updatedat: new Date().toISOString()
        })
        .eq('id', companyId);

      if (error) throw error;

      setSuccess('Perfil de empresa actualizado correctamente');
      await loadCompanyData();
    } catch (error: any) {
      setError(error.message || 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const saveFiscalConfig = async () => {
    try {
      setSaving(true);
      setError(null);

      if (configFiscal) {
        // Actualizar existente
        const { error } = await supabase
          .from('config_fiscal')
          .update(fiscalForm)
          .eq('id', configFiscal.id);

        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('config_fiscal')
          .insert({
            ...fiscalForm,
            rtnempresa: company?.businessrtn
          });

        if (error) throw error;
      }

      setSuccess('Configuración fiscal actualizada correctamente');
      await loadCompanyData();
    } catch (error: any) {
      setError(error.message || 'Error al actualizar configuración fiscal');
    } finally {
      setSaving(false);
    }
  };

  const createNewCAI = async () => {
    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('CAI')
        .insert({
          ...caiForm,
          tenant_id: companyId,
          status: 'ACTIVE',
          isactive: true
        });

      if (error) throw error;

      setSuccess('CAI creado correctamente');
      setShowCAIDialog(false);
      setCaiForm({
        caicode: '',
        establishmentcode: '001',
        pointofsalecode: '001',
        documenttype: 'FACT',
        rangestart: 1,
        rangeend: 1000,
        issuedate: new Date().toISOString().split('T')[0],
        expirationdate: ''
      });
      
      await loadCompanyData();
    } catch (error: any) {
      setError(error.message || 'Error al crear CAI');
    } finally {
      setSaving(false);
    }
  };

  const getCAIStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'green';
      case 'EXPIRING': return 'orange';
      case 'EXPIRED': return 'red';
      case 'EXHAUSTED': return 'gray';
      default: return 'gray';
    }
  };

  const getCAIStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Activo';
      case 'EXPIRING': return 'Por Vencer';
      case 'EXPIRED': return 'Vencido';
      case 'EXHAUSTED': return 'Agotado';
      default: return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Empresa no encontrada
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-cyan-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.businessname}</h1>
            <p className="text-muted-foreground">RTN: {company.businessrtn}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Badge variant={company.isactive ? "default" : "secondary"}>
            {company.isactive ? "Activa" : "Inactiva"}
          </Badge>
          <Button variant="outline" onClick={() => router.push('/companies')}>
            ← Volver a Empresas
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="fiscal">Configuración Fiscal</TabsTrigger>
          <TabsTrigger value="cai">Gestión de CAI</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas Contables</TabsTrigger>
        </TabsList>

        {/* General Information Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de la Empresa
              </CardTitle>
              <CardDescription>
                Datos básicos y de contacto de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessname">Nombre de la Empresa</Label>
                  <Input
                    id="businessname"
                    value={companyForm.businessname || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, businessname: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="businessrtn">RTN</Label>
                  <Input
                    id="businessrtn"
                    value={companyForm.businessrtn || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, businessrtn: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessemail">Email Principal</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="businessemail"
                      type="email"
                      value={companyForm.businessemail || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, businessemail: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="businessphone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="businessphone"
                      value={companyForm.businessphone || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, businessphone: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="businessaddress">Dirección</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="businessaddress"
                    value={companyForm.businessaddress || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, businessaddress: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businesscity">Ciudad</Label>
                  <Input
                    id="businesscity"
                    value={companyForm.businesscity || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, businesscity: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="businesscountry">País</Label>
                  <Input
                    id="businesscountry"
                    value={companyForm.businesscountry || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, businesscountry: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businesstype">Tipo de Empresa</Label>
                  <select
                    id="businesstype"
                    value={companyForm.businesstype || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, businesstype: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="SOCIEDAD">Sociedad</option>
                    <option value="CORPORATION">Corporación</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="industry">Rubro</Label>
                  <Input
                    id="industry"
                    value={companyForm.industry || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, industry: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveCompanyProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiscal Configuration Tab */}
        <TabsContent value="fiscal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configuración Fiscal
              </CardTitle>
              <CardDescription>
                Configuración para declaraciones y cumplimiento fiscal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="regimentributario">Régimen Tributario</Label>
                  <select
                    id="regimentributario"
                    value={fiscalForm.regimentributario || ''}
                    onChange={(e) => setFiscalForm(prev => ({ ...prev, regimentributario: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="COMUN">Común</option>
                    <option value="GRANDE">Gran Contribuyente</option>
                    <option value="PEQUEÑO">Pequeño Contribuyente</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="actividad_economica">Actividad Económica</Label>
                  <Input
                    id="actividad_economica"
                    value={fiscalForm.actividad_economica || ''}
                    onChange={(e) => setFiscalForm(prev => ({ ...prev, actividad_economica: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  <input
                    type="checkbox"
                    checked={fiscalForm.obligadocontabilidad || false}
                    onChange={(e) => setFiscalForm(prev => ({ ...prev, obligadocontabilidad: e.target.checked }))}
                  />
                  Obligado a llevar contabilidad
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="direccionfiscal">Dirección Fiscal</Label>
                  <Input
                    id="direccionfiscal"
                    value={fiscalForm.direccionfiscal || ''}
                    onChange={(e) => setFiscalForm(prev => ({ ...prev, direccionfiscal: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="telefonofiscal">Teléfono Fiscal</Label>
                  <Input
                    id="telefonofiscal"
                    value={fiscalForm.telefonofiscal || ''}
                    onChange={(e) => setFiscalForm(prev => ({ ...prev, telefonofiscal: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="emailfiscal">Email Fiscal</Label>
                <Input
                  id="emailfiscal"
                  type="email"
                  value={fiscalForm.emailfiscal || ''}
                  onChange={(e) => setFiscalForm(prev => ({ ...prev, emailfiscal: e.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveFiscalConfig} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAI Management Tab */}
        <TabsContent value="cai" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Gestión de CAI</h2>
              <p className="text-muted-foreground">
                Códigos de Autorización de Impresión
              </p>
            </div>
            
            <Dialog open={showCAIDialog} onOpenChange={setShowCAIDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo CAI
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo CAI</DialogTitle>
                  <DialogDescription>
                    Registra un nuevo Código de Autorización de Impresión
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="caicode">Código CAI</Label>
                    <Input
                      id="caicode"
                      value={caiForm.caicode}
                      onChange={(e) => setCaiForm(prev => ({ ...prev, caicode: e.target.value }))}
                      placeholder="Ej: 12345678901234567890"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="establishmentcode">Código Establecimiento</Label>
                      <Input
                        id="establishmentcode"
                        value={caiForm.establishmentcode}
                        onChange={(e) => setCaiForm(prev => ({ ...prev, establishmentcode: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pointofsalecode">Código Punto Venta</Label>
                      <Input
                        id="pointofsalecode"
                        value={caiForm.pointofsalecode}
                        onChange={(e) => setCaiForm(prev => ({ ...prev, pointofsalecode: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rangestart">Rango Inicial</Label>
                      <Input
                        id="rangestart"
                        type="number"
                        value={caiForm.rangestart}
                        onChange={(e) => setCaiForm(prev => ({ ...prev, rangestart: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="rangeend">Rango Final</Label>
                      <Input
                        id="rangeend"
                        type="number"
                        value={caiForm.rangeend}
                        onChange={(e) => setCaiForm(prev => ({ ...prev, rangeend: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="issuedate">Fecha de Emisión</Label>
                      <Input
                        id="issuedate"
                        type="date"
                        value={caiForm.issuedate}
                        onChange={(e) => setCaiForm(prev => ({ ...prev, issuedate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expirationdate">Fecha de Vencimiento</Label>
                      <Input
                        id="expirationdate"
                        type="date"
                        value={caiForm.expirationdate}
                        onChange={(e) => setCaiForm(prev => ({ ...prev, expirationdate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCAIDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={createNewCAI} disabled={saving}>
                      {saving ? 'Creando...' : 'Crear CAI'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* CAIs List */}
          <div className="grid gap-4">
            {cais.map((cai) => (
              <Card key={cai.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-cyan-600" />
                        <span className="font-mono font-medium">{cai.caicode}</span>
                        <Badge variant={getCAIStatusColor(cai.status) as any}>
                          {getCAIStatusText(cai.status)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Establecimiento:</span>
                          <span className="ml-2">{cai.establishmentcode}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Punto Venta:</span>
                          <span className="ml-2">{cai.pointofsalecode}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Rango:</span>
                          <span className="ml-2">{cai.rangestart} - {cai.rangeend}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Actual:</span>
                          <span className="ml-2">{cai.currentnumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Emisión:</span>
                          <span className="ml-2">{new Date(cai.issuedate).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Vencimiento:</span>
                          <span className="ml-2">{new Date(cai.expirationdate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {cais.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay CAIs registrados
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Comienza registrando tu primer Código de Autorización de Impresión
                  </p>
                  <Button onClick={() => setShowCAIDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Primer CAI
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cuentas Contables
              </CardTitle>
              <CardDescription>
                Catálogo de cuentas para esta empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Configuración de Cuentas
                </h3>
                <p className="text-gray-500 mb-4">
                  Aquí podrás configurar el plan de cuentas específico para esta empresa
                </p>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Cuentas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
