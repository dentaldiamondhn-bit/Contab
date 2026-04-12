"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Search, FolderTree, ChevronRight, ChevronDown } from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { getAccountTypeLabel, ACCOUNT_TYPE_COLORS } from "@/lib/accounting-utils";

interface Account {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  description?: string;
  parentId?: string;
  children?: Account[];
  balance?: number;
}

const accountTypes = [
  { value: "ASSET", label: "Activo", color: ACCOUNT_TYPE_COLORS.ASSET },
  { value: "LIABILITY", label: "Pasivo", color: ACCOUNT_TYPE_COLORS.LIABILITY },
  { value: "EQUITY", label: "Patrimonio", color: ACCOUNT_TYPE_COLORS.EQUITY },
  { value: "REVENUE", label: "Ingresos", color: ACCOUNT_TYPE_COLORS.REVENUE },
  { value: "EXPENSE", label: "Gastos", color: ACCOUNT_TYPE_COLORS.EXPENSE },
];

const defaultAccounts: Partial<Account>[] = [
  // ==========================================
  // 1. ACTIVOS (Recursos de la empresa)
  // ==========================================
  
  // 11 - Activo Corriente
  { code: "11", name: "Activo Corriente", type: "ASSET" },
  
  // 1101 - Caja y Bancos
  { code: "1101", name: "Caja y Bancos", type: "ASSET", parentId: "11" },
  { code: "110101", name: "Caja General", type: "ASSET", parentId: "1101" },
  { code: "110102", name: "Bancos", type: "ASSET", parentId: "1101" },
  
  // 1102 - Cuentas por Cobrar
  { code: "1102", name: "Cuentas por Cobrar", type: "ASSET", parentId: "11" },
  { code: "110201", name: "Clientes Locales", type: "ASSET", parentId: "1102" },
  { code: "110205", name: "(-) Estimación de Cuentas Incobrables", type: "ASSET", parentId: "1102" },
  
  // 1103 - Inventarios
  { code: "1103", name: "Inventarios", type: "ASSET", parentId: "11" },
  { code: "110301", name: "Suministros Dentales", type: "ASSET", parentId: "1103" },
  { code: "110302", name: "Material de Oficina", type: "ASSET", parentId: "1103" },
  
  // 1104 - Impuestos Pagados por Anticipado
  { code: "1104", name: "Impuestos Pagados por Anticipado", type: "ASSET", parentId: "11" },
  { code: "110401", name: "Crédito Fiscal (ISV 15% Pagado)", type: "ASSET", parentId: "1104" },
  { code: "110402", name: "Pagos a Cuenta ISR", type: "ASSET", parentId: "1104" },
  
  // 12 - Activo No Corriente
  { code: "12", name: "Activo No Corriente", type: "ASSET" },
  
  // 1201 - Propiedad, Planta y Equipo
  { code: "1201", name: "Propiedad, Planta y Equipo", type: "ASSET", parentId: "12" },
  { code: "120101", name: "Equipo Médico y Dental", type: "ASSET", parentId: "1201" },
  { code: "120102", name: "Mobiliario y Equipo de Oficina", type: "ASSET", parentId: "1201" },
  { code: "120105", name: "(-) Depreciación Acumulada", type: "ASSET", parentId: "1201" },
  
  // ==========================================
  // 2. PASIVOS (Deudas y Obligaciones)
  // ==========================================
  
  // 21 - Pasivo Corriente
  { code: "21", name: "Pasivo Corriente", type: "LIABILITY" },
  
  // 2101 - Cuentas por Pagar Comerciales
  { code: "2101", name: "Cuentas por Pagar Comerciales", type: "LIABILITY", parentId: "21" },
  { code: "210101", name: "Proveedores Locales", type: "LIABILITY", parentId: "2101" },
  
  // 2102 - Obligaciones Fiscales (SAR)
  { code: "2102", name: "Obligaciones Fiscales (SAR)", type: "LIABILITY", parentId: "21" },
  { code: "210201", name: "ISV 15% por Pagar", type: "LIABILITY", parentId: "2102" },
  { code: "210202", name: "Retenciones de ISR por Pagar", type: "LIABILITY", parentId: "2102" },
  { code: "210203", name: "Retenciones de Alquiler (10%)", type: "LIABILITY", parentId: "2102" },
  
  // 2103 - Obligaciones Laborales
  { code: "2103", name: "Obligaciones Laborales", type: "LIABILITY", parentId: "21" },
  { code: "210301", name: "IHSS por Pagar", type: "LIABILITY", parentId: "2103" },
  { code: "210302", name: "RAP / INFOP por Pagar", type: "LIABILITY", parentId: "2103" },
  
  // 22 - Pasivo No Corriente
  { code: "22", name: "Pasivo No Corriente", type: "LIABILITY" },
  { code: "2201", name: "Préstamos Bancarios a Largo Plazo", type: "LIABILITY", parentId: "22" },
  
  // ==========================================
  // 3. PATRIMONIO (Capital y Reservas)
  // ==========================================
  { code: "3", name: "Patrimonio", type: "EQUITY" },
  
  // 31 - Capital Social
  { code: "31", name: "Capital Social", type: "EQUITY", parentId: "3" },
  { code: "3101", name: "Capital Pagado", type: "EQUITY", parentId: "31" },
  
  // 32 - Resultados
  { code: "32", name: "Resultados", type: "EQUITY", parentId: "3" },
  { code: "3201", name: "Utilidades Retenidas", type: "EQUITY", parentId: "32" },
  { code: "3202", name: "Utilidad/Pérdida del Ejercicio Actual", type: "EQUITY", parentId: "32" },
  
  // ==========================================
  // 4. INGRESOS
  // ==========================================
  { code: "4", name: "Ingresos", type: "REVENUE" },
  
  // 41 - Ingresos Operativos
  { code: "41", name: "Ingresos Operativos", type: "REVENUE", parentId: "4" },
  { code: "4101", name: "Prestación de Servicios Dentales", type: "REVENUE", parentId: "41" },
  { code: "4102", name: "Venta de Productos Especializados", type: "REVENUE", parentId: "41" },
  
  // 42 - Otros Ingresos
  { code: "42", name: "Otros Ingresos", type: "REVENUE", parentId: "4" },
  { code: "4201", name: "Intereses Ganados", type: "REVENUE", parentId: "42" },
  
  // ==========================================
  // 5. GASTOS (Egresos)
  // ==========================================
  { code: "5", name: "Gastos", type: "EXPENSE" },
  
  // 51 - Gastos de Operación
  { code: "51", name: "Gastos de Operación", type: "EXPENSE", parentId: "5" },
  
  // 5101 - Gastos de Personal
  { code: "5101", name: "Gastos de Personal", type: "EXPENSE", parentId: "51" },
  { code: "510101", name: "Sueldos y Salarios", type: "EXPENSE", parentId: "5101" },
  { code: "510102", name: "Decimotercer Mes (Aguinaldo)", type: "EXPENSE", parentId: "5101" },
  { code: "510103", name: "Decimocuarto Mes", type: "EXPENSE", parentId: "5101" },
  { code: "510105", name: "Aportaciones Patronales (IHSS/RAP)", type: "EXPENSE", parentId: "5101" },
  
  // 5102 - Gastos de Administración
  { code: "5102", name: "Gastos de Administración", type: "EXPENSE", parentId: "51" },
  { code: "510201", name: "Alquileres", type: "EXPENSE", parentId: "5102" },
  { code: "510202", name: "Servicios Públicos (EEH, SANAA)", type: "EXPENSE", parentId: "5102" },
  { code: "510203", name: "Papelería y Útiles", type: "EXPENSE", parentId: "5102" },
  { code: "510205", name: "Seguros y Fianzas", type: "EXPENSE", parentId: "5102" },
  
  // 5103 - Gastos de Ventas / Marketing
  { code: "5103", name: "Gastos de Ventas / Marketing", type: "EXPENSE", parentId: "51" },
  { code: "510301", name: "Publicidad", type: "EXPENSE", parentId: "5103" },
];

export default function ChartOfAccountsManager() {
  const { currentTenant } = useTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "ASSET" as Account["type"],
    description: "",
    parentId: "",
  });

  // Cargar cuentas (simulado - en producción vendría de la API)
  useEffect(() => {
    const loadAccounts = () => {
      // Simular carga de cuentas con estructura jerárquica
      const builtAccounts = buildAccountHierarchy(defaultAccounts as Account[]);
      setAccounts(builtAccounts);
    };
    loadAccounts();
  }, [currentTenant]);

  const buildAccountHierarchy = (flatAccounts: Account[]): Account[] => {
    const accountMap = new Map<string, Account>();
    const rootAccounts: Account[] = [];

    // Primero crear todas las cuentas
    flatAccounts.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Luego construir la jerarquía
    flatAccounts.forEach(account => {
      const accountWithChildren = accountMap.get(account.id)!;
      if (account.parentId) {
        const parent = accountMap.get(account.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(accountWithChildren);
        }
      } else {
        rootAccounts.push(accountWithChildren);
      }
    });

    return rootAccounts;
  };

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedNodes(newExpanded);
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "todos" || account.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: Account["type"]) => {
    return accountTypes.find(t => t.value === type)?.color || "bg-gray-100 text-gray-800";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para guardar en la base de datos
    console.log("Guardando cuenta:", formData);
    setIsCreateDialogOpen(false);
    setEditingAccount(null);
    setFormData({ code: "", name: "", type: "ASSET", description: "", parentId: "" });
  };

  const AccountRow = ({ account, level = 0 }: { account: Account; level?: number }) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);

    return (
      <div key={account.id}>
        <div 
          className="flex items-center justify-between p-3 hover:bg-gray-50 border-b"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center space-x-3">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(account.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm text-gray-500">{account.code}</span>
                <span className="font-medium">{account.name}</span>
                <Badge className={getTypeColor(account.type)}>
                  {accountTypes.find(t => t.value === account.type)?.label}
                </Badge>
              </div>
              {account.description && (
                <p className="text-sm text-gray-600 mt-1">{account.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {account.balance !== undefined && (
              <span className="text-sm font-medium">
                {account.balance.toLocaleString("es-HN", { 
                  style: "currency", 
                  currency: "HNL" 
                })}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingAccount(account);
                setFormData({
                  code: account.code,
                  name: account.name,
                  type: account.type,
                  description: account.description || "",
                  parentId: account.parentId || "",
                });
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && account.children?.map(child => (
          <AccountRow key={child.id} account={child} level={level + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Catálogo de Cuentas</h2>
          <p className="text-gray-600">
            Gestiona el catálogo de cuentas contables para {currentTenant?.businessName}
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Editar Cuenta" : "Crear Nueva Cuenta"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount 
                  ? "Modifica los datos de la cuenta contable."
                  : "Agrega una nueva cuenta al catálogo contable."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ej: 1101"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as Account["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="name">Nombre de la Cuenta</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Caja"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional de la cuenta"
                />
              </div>
              
              <div>
                <Label htmlFor="parentId">Cuenta Padre (Opcional)</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ninguna (cuenta raíz)</SelectItem>
                    {/* Aquí irían las cuentas existentes como opciones */}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingAccount(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAccount ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderTree className="h-5 w-5" />
            <span>Cuentas Contables</span>
          </CardTitle>
          <CardDescription>
            Catálogo completo de cuentas siguiendo los principios de partida doble
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {accountTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron cuentas
                </h3>
                <p className="text-gray-600">
                  {searchTerm || selectedType !== "todos" 
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "Comienza creando tu primera cuenta contable"
                  }
                </p>
              </div>
            ) : (
              filteredAccounts.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Principios de Partida Doble</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Ecuación Fundamental</h4>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-center text-lg font-mono font-bold text-blue-900">
                  Activo = Pasivo + Patrimonio
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Reglas de Débito y Crédito</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Débito (+):</span>
                  <span>Aumenta Activos y Gastos</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Crédito (-):</span>
                  <span>Aumenta Pasivos, Patrimonio e Ingresos</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
