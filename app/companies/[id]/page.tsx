"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Calculator, 
  Scale,
  Search,
  Filter,
  Edit,
  Trash2,
  Download,
  Eye,
  Settings,
  BookOpen,
  Receipt,
  FileSpreadsheet,
  Printer,
  Upload,
  CheckCircle,
  DollarSign,
  History,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Calendar,
  Lock,
  Unlock,
  Building2,
  Users,
  Package,
  ClipboardList,
  CreditCard,
  BarChart3,
  LayoutDashboard,
  Briefcase,
  Shield,
  HelpCircle,
} from "lucide-react";

interface Company {
  id: string;
  tenant_id?: string;
  business_name: string;
  business_rtn: string;
  industry: string;
  regimen_tributario: string;
  actividad_economica: string;
  direccion_fiscal: string;
  telefono_fiscal: string;
  email_fiscal: string;
  is_active: boolean;
}

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  const formatCurrency = (amount: number, currency: string = "HNL") => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "L 0.00";
    }
    const amountInCurrency = amount / 100;
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: currency,
    }).format(amountInCurrency);
  };

  const loadCompanyData = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      const [companyRes, companiesRes, tenantRes] = await Promise.all([
        fetch(`/api/companies/${companyId}`).catch(() => null),
        fetch(`/api/companies`).catch(() => null),
        fetch(`/api/tenant/my-tenant`).catch(() => null),
      ]);

      let companyData: any = null;
      let tenantIdReal: string = companyId;

      if (companyRes?.ok) {
        companyData = await companyRes.json();
        tenantIdReal = companyData.id || companyData.tenant_id || companyId;
      }

      if (companiesRes?.ok) {
        const compJson = await companiesRes.json();
        const comps: any[] = compJson.companies || compJson || [];
        const comp = comps.find((c: any) => c.id === companyId);
        if (comp) {
          companyData = companyData ? { ...comp, ...companyData } : comp;
          tenantIdReal = comp.tenant_id || comp.id || tenantIdReal;
        } else if (!companyData && comps.length === 1) {
          companyData = comps[0];
          tenantIdReal = comps[0].tenant_id || comps[0].id;
        }
      }

      if (!companyData && tenantRes?.ok) {
        const tJson = await tenantRes.json();
        const tid = tJson.id || tJson.tenant?.id;
        if (tid) {
          tenantIdReal = tid;
          companyData = {
            id: companyId,
            tenant_id: tid,
            business_name: tJson.businessName || `Empresa ${companyId}`,
            business_rtn: tJson.businessRTN || "",
            industry: tJson.industry || "",
            regimen_tributario: "Régimen General",
            actividad_economica: "",
            direccion_fiscal: tJson.businessAddress || "",
            telefono_fiscal: tJson.phoneNumber || "",
            email_fiscal: tJson.businessEmail || "",
            is_active: true,
          };
        }
      }

      if (companyData) {
        const cleanEmail = (e: string) => (e || "").replace(/\+[^@]+@/, "@");
        const cleanRtn = (r: string) => (r || "").split("-")[0].trim();
        companyData = {
          id: companyId,
          tenant_id: tenantIdReal,
          business_name: companyData.business_name || companyData.businessname || companyData.name || `Empresa ${companyId}`,
          business_rtn: cleanRtn(companyData.business_rtn || companyData.businessrtn || companyData.rtn || ""),
          industry: companyData.industry || companyData.business_type || "",
          regimen_tributario: companyData.regimen_tributario || "Régimen General",
          actividad_economica: companyData.actividad_economica || companyData.business_type || "",
          direccion_fiscal: companyData.direccion_fiscal || companyData.businessaddress || companyData.address || "",
          telefono_fiscal: companyData.telefono_fiscal || companyData.phonenumber || companyData.phone || "",
          email_fiscal: cleanEmail(companyData.email_fiscal || companyData.businessemail || companyData.email || ""),
          is_active: companyData.is_active ?? true,
        };
      } else {
        companyData = {
          id: companyId,
          tenant_id: tenantIdReal,
          business_name: `Empresa ${companyId}`,
          business_rtn: "", industry: "", regimen_tributario: "Régimen General",
          actividad_economica: "", direccion_fiscal: "", telefono_fiscal: "", email_fiscal: "",
          is_active: true,
        };
      }

      setCompany(companyData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading company data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId && !company) {
      loadCompanyData();
    }
  }, [companyId]);

  const getModuleIcon = (module: string) => {
    const icons: Record<string, any> = {
      accounting: Calculator,
      billing: Receipt,
      inventory: Package,
      hr: Users,
      reports: BarChart3,
      dashboard: LayoutDashboard,
      contacts: Briefcase,
      purchases: ClipboardList,
      payroll: CreditCard,
      security: Shield,
      modules: Settings,
    };
    return icons[module] || HelpCircle;
  };

  const modules = [
    { key: "dashboard", label: "Dashboard", description: "Resumen ejecutivo", icon: LayoutDashboard },
    { key: "accounting", label: "Contabilidad", description: "Libros, asientos, catálogo", icon: Calculator },
    { key: "billing", label: "Facturación", description: "Facturas, clientes, CAI", icon: Receipt },
    { key: "inventory", label: "Inventario", description: "Productos, stock, kardex", icon: Package },
    { key: "hr", label: "Recursos Humanos", description: "Empleados, nómina, asistencia", icon: Users },
    { key: "purchases", label: "Compras", description: "Órdenes, proveedores, egresos", icon: ClipboardList },
    { key: "reports", label: "Reportes", description: "Estados financieros, libros", icon: BarChart3 },
    { key: "security", label: "Seguridad", description: "Permisos, auditoría, CAI", icon: Shield },
    { key: "modules", label: "Módulos", description: "Configurar plan y módulos", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando empresa...</span>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Empresa no encontrada</h3>
          <p className="text-gray-600">La empresa que buscas no existe o ha sido eliminada.</p>
          <Button onClick={() => router.push("/companies")} className="mt-4">
            Volver a Empresas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de la empresa */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {company.business_name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                RTN: {company.business_rtn || "No especificado"}
              </Badge>
            </span>
            <span className="flex items-center gap-1">
              {company.industry && (
                <Badge variant="outline" className="text-xs">
                  {company.industry}
                </Badge>
              )}
            </span>
            <span className="flex items-center gap-1">
              {company.regimen_tributario && (
                <Badge variant="outline" className="text-xs">
                  {company.regimen_tributario}
                </Badge>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Herramientas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Acciones de Empresa</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/accounting`)}>
                <Calculator className="h-4 w-4 mr-2" />
                Contabilidad
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/billing/invoices`)}>
                <Receipt className="h-4 w-4 mr-2" />
                Facturación
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/inventory/dashboard`)}>
                <Package className="h-4 w-4 mr-2" />
                Inventario
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/hr`)}>
                <Users className="h-4 w-4 mr-2" />
                Recursos Humanos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/reports/general-ledger`)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Reportes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/security`)}>
                <Shield className="h-4 w-4 mr-2" />
                Seguridad
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/modules`)}>
                <Settings className="h-4 w-4 mr-2" />
                Módulos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => router.push("/companies")}>
            Volver a Empresas
          </Button>
        </div>
      </div>

      {/* Información de la Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Régimen Tributario</p>
              <p className="font-medium">{company.regimen_tributario || "Régimen General"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Actividad Económica</p>
              <p className="font-medium">{company.actividad_economica || company.industry || "No especificado"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Dirección Fiscal</p>
              <p className="font-medium">{company.direccion_fiscal || "No especificado"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Teléfono Fiscal</p>
              <p className="font-medium">{company.telefono_fiscal || "No especificado"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email Fiscal</p>
              <p className="font-medium">{company.email_fiscal || "No especificado"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado</p>
              <Badge variant={company.is_active ? "default" : "destructive"}>
                {company.is_active ? "Activa" : "Inactiva"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Módulos Disponibles */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Módulos de la Empresa
          </CardTitle>
          <CardDescription>
            Accede a los diferentes módulos funcionales de tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Button
                  key={module.key}
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-3 text-left hover:shadow-lg hover:border-primary/40 transition-all"
                  onClick={() => {
                    const routes: Record<string, string> = {
                      dashboard: `/companies/${companyId}`,
                      accounting: `/companies/${companyId}/accounting`,
                      billing: `/companies/${companyId}/billing/invoices`,
                      inventory: `/companies/${companyId}/inventory/dashboard`,
                      hr: `/companies/${companyId}/hr`,
                      purchases: `/companies/${companyId}/purchases`,
                      reports: `/companies/${companyId}/reports/general-ledger`,
                      security: `/companies/${companyId}/security`,
                      modules: `/companies/${companyId}/modules`,
                    };
                    router.push(routes[module.key] || `/companies/${companyId}`);
                  }}
                >
                  <Icon className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-semibold text-base">{module.label}</p>
                    <p className="text-xs text-gray-500">{module.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Información Adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalles Adicionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">ID de Empresa</p>
              <p className="font-medium font-mono text-sm">{company.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tenant ID</p>
              <p className="font-medium font-mono text-sm">{company.tenant_id || "No disponible"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/companies/${companyId}/accounting`)}>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-6">
            <Calculator className="h-10 w-10 text-green-600" />
            <h3 className="font-semibold text-lg">Contabilidad</h3>
            <p className="text-sm text-gray-500 text-center">Libros, asientos, catálogo</p>
            <Button className="mt-2" size="sm">Acceder</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/companies/${companyId}/billing/invoices`)}>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-6">
            <Receipt className="h-10 w-10 text-cyan-600" />
            <h3 className="font-semibold text-lg">Facturación</h3>
            <p className="text-sm text-gray-500 text-center">Facturas, clientes, CAI</p>
            <Button className="mt-2" size="sm">Acceder</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/companies/${companyId}/inventory/dashboard`)}>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-6">
            <Package className="h-10 w-10 text-orange-600" />
            <h3 className="font-semibold text-lg">Inventario</h3>
            <p className="text-sm text-gray-500 text-center">Productos, stock, kardex</p>
            <Button className="mt-2" size="sm">Acceder</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}