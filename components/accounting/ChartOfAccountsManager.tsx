"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, Edit, Trash2, Search, FolderTree, ChevronRight, ChevronDown,
  Download, Upload, FileText, AlertTriangle, Lock, Unlock, Eye,
} from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { ACCOUNT_TYPE_COLORS } from "@/lib/accounting-utils";

interface Account {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  nature: "DEBIT" | "CREDIT";
  level: number;
  isSelectable: boolean;
  description?: string;
  parentId?: string;
  children?: Account[];
  balance?: number;
  isActive?: boolean;
  currency?: string;
  fiscalCode?: string;
}

const TYPE_NATURE_MAP: Record<string, "DEBIT" | "CREDIT"> = {
  ASSET: "DEBIT", EXPENSE: "DEBIT",
  LIABILITY: "CREDIT", EQUITY: "CREDIT", REVENUE: "CREDIT",
};
function getNatureFromType(type: string): "DEBIT" | "CREDIT" { return TYPE_NATURE_MAP[type] || "DEBIT"; }
function getLevelFromCode(code: string): number {
  if (code.length <= 2) return 1;
  if (code.length <= 4) return 2;
  if (code.length <= 6) return 3;
  return 4;
}

const accountTypes = [
  { value: "ASSET", label: "Activo", color: ACCOUNT_TYPE_COLORS.ASSET },
  { value: "LIABILITY", label: "Pasivo", color: ACCOUNT_TYPE_COLORS.LIABILITY },
  { value: "EQUITY", label: "Patrimonio", color: ACCOUNT_TYPE_COLORS.EQUITY },
  { value: "REVENUE", label: "Ingresos", color: ACCOUNT_TYPE_COLORS.REVENUE },
  { value: "EXPENSE", label: "Gastos", color: ACCOUNT_TYPE_COLORS.EXPENSE },
];

const CATALOG_TEMPLATES: Record<string, Partial<Account>[]> = {
  pyme: [
    { code: "1", name: "Activos", type: "ASSET" },
    { code: "11", name: "Activo Corriente", type: "ASSET", parentId: "1" },
    { code: "1101", name: "Caja y Bancos", type: "ASSET", parentId: "11" },
    { code: "110101", name: "Caja General", type: "ASSET", parentId: "1101" },
    { code: "110102", name: "Bancos Nacionales", type: "ASSET", parentId: "1101" },
    { code: "110103", name: "Bancos Extranjeros (USD)", type: "ASSET", parentId: "1101", currency: "USD" },
    { code: "1102", name: "Cuentas por Cobrar", type: "ASSET", parentId: "11" },
    { code: "110201", name: "Clientes Locales", type: "ASSET", parentId: "1102" },
    { code: "1103", name: "Inventarios", type: "ASSET", parentId: "11" },
    { code: "110301", name: "Mercancía General", type: "ASSET", parentId: "1103" },
    { code: "1104", name: "Créditos Fiscales", type: "ASSET", parentId: "11" },
    { code: "110401", name: "ISV Pagado por Anticipado", type: "ASSET", parentId: "1104" },
    { code: "12", name: "Activo No Corriente", type: "ASSET", parentId: "1" },
    { code: "1201", name: "Propiedad y Equipo", type: "ASSET", parentId: "12" },
    { code: "120101", name: "Equipo de Oficina", type: "ASSET", parentId: "1201" },
    { code: "120102", name: "(-) Depreciación Acumulada", type: "ASSET", parentId: "1201" },
    { code: "2", name: "Pasivos", type: "LIABILITY" },
    { code: "21", name: "Pasivo Corriente", type: "LIABILITY", parentId: "2" },
    { code: "2101", name: "Cuentas por Pagar", type: "LIABILITY", parentId: "21" },
    { code: "210101", name: "Proveedores Locales", type: "LIABILITY", parentId: "2101" },
    { code: "2102", name: "Obligaciones Fiscales", type: "LIABILITY", parentId: "21" },
    { code: "210201", name: "ISV por Pagar", type: "LIABILITY", parentId: "2102" },
    { code: "210202", name: "Retenciones por Pagar", type: "LIABILITY", parentId: "2102" },
    { code: "2103", name: "Obligaciones Laborales", type: "LIABILITY", parentId: "21" },
    { code: "210301", name: "IHSS por Pagar", type: "LIABILITY", parentId: "2103" },
    { code: "22", name: "Pasivo No Corriente", type: "LIABILITY", parentId: "2" },
    { code: "2201", name: "Préstamos Largo Plazo", type: "LIABILITY", parentId: "22" },
    { code: "3", name: "Patrimonio", type: "EQUITY" },
    { code: "31", name: "Capital Social", type: "EQUITY", parentId: "3" },
    { code: "3101", name: "Capital Pagado", type: "EQUITY", parentId: "31" },
    { code: "32", name: "Resultados", type: "EQUITY", parentId: "3" },
    { code: "3201", name: "Utilidades Retenidas", type: "EQUITY", parentId: "32" },
    { code: "3202", name: "Utilidad del Ejercicio", type: "EQUITY", parentId: "32" },
    { code: "4", name: "Ingresos", type: "REVENUE" },
    { code: "41", name: "Ingresos Operativos", type: "REVENUE", parentId: "4" },
    { code: "4101", name: "Ventas", type: "REVENUE", parentId: "41" },
    { code: "42", name: "Otros Ingresos", type: "REVENUE", parentId: "4" },
    { code: "4201", name: "Intereses Ganados", type: "REVENUE", parentId: "42" },
    { code: "5", name: "Gastos", type: "EXPENSE" },
    { code: "51", name: "Gastos de Operación", type: "EXPENSE", parentId: "5" },
    { code: "5101", name: "Gastos de Personal", type: "EXPENSE", parentId: "51" },
    { code: "510101", name: "Sueldos y Salarios", type: "EXPENSE", parentId: "5101" },
    { code: "5102", name: "Gastos de Administración", type: "EXPENSE", parentId: "51" },
    { code: "510201", name: "Alquileres", type: "EXPENSE", parentId: "5102" },
    { code: "510202", name: "Servicios Públicos", type: "EXPENSE", parentId: "5102" },
    { code: "5103", name: "Gastos de Venta", type: "EXPENSE", parentId: "51" },
    { code: "510301", name: "Publicidad y Marketing", type: "EXPENSE", parentId: "5103" },
  ],
  comercial: [
    { code: "1", name: "Activos", type: "ASSET" },
    { code: "11", name: "Activo Corriente", type: "ASSET", parentId: "1" },
    { code: "1101", name: "Efectivo y Equivalentes", type: "ASSET", parentId: "11" },
    { code: "110101", name: "Caja General", type: "ASSET", parentId: "1101" },
    { code: "110102", name: "Bancos Nacionales", type: "ASSET", parentId: "1101" },
    { code: "110103", name: "Bancos Extranjeros", type: "ASSET", parentId: "1101", currency: "USD" },
    { code: "110104", name: "Inversiones a Corto Plazo", type: "ASSET", parentId: "1101" },
    { code: "1102", name: "Cuentas por Cobrar", type: "ASSET", parentId: "11" },
    { code: "110201", name: "Clientes Nacionales", type: "ASSET", parentId: "1102" },
    { code: "110202", name: "Clientes Exportación", type: "ASSET", parentId: "1102", currency: "USD" },
    { code: "110205", name: "(-) Estimación Cuentas Incobrables", type: "ASSET", parentId: "1102" },
    { code: "1103", name: "Inventarios", type: "ASSET", parentId: "11" },
    { code: "110301", name: "Mercancía en Tránsito", type: "ASSET", parentId: "1103" },
    { code: "110302", name: "Mercancía Disponible", type: "ASSET", parentId: "1103" },
    { code: "110303", name: "Materia Prima", type: "ASSET", parentId: "1103" },
    { code: "1104", name: "Créditos Fiscales", type: "ASSET", parentId: "11" },
    { code: "110401", name: "ISV Crédito Fiscal", type: "ASSET", parentId: "1104" },
    { code: "12", name: "Activo No Corriente", type: "ASSET", parentId: "1" },
    { code: "1201", name: "Propiedad Planta y Equipo", type: "ASSET", parentId: "12" },
    { code: "120101", name: "Terrenos", type: "ASSET", parentId: "1201" },
    { code: "120102", name: "Edificios", type: "ASSET", parentId: "1201" },
    { code: "120103", name: "Maquinaria y Equipo", type: "ASSET", parentId: "1201" },
    { code: "120104", name: "Equipo de Transporte", type: "ASSET", parentId: "1201" },
    { code: "120105", name: "(-) Depreciación Acumulada", type: "ASSET", parentId: "1201" },
    { code: "2", name: "Pasivos", type: "LIABILITY" },
    { code: "21", name: "Pasivo Corriente", type: "LIABILITY", parentId: "2" },
    { code: "2101", name: "Proveedores", type: "LIABILITY", parentId: "21" },
    { code: "210101", name: "Proveedores Nacionales", type: "LIABILITY", parentId: "2101" },
    { code: "210102", name: "Proveedores Importación", type: "LIABILITY", parentId: "2101", currency: "USD" },
    { code: "2102", name: "Obligaciones Fiscales", type: "LIABILITY", parentId: "21" },
    { code: "210201", name: "ISV por Pagar", type: "LIABILITY", parentId: "2102" },
    { code: "210202", name: "Retenciones ISR por Pagar", type: "LIABILITY", parentId: "2102" },
    { code: "210203", name: "Retenciones Alquiler por Pagar", type: "LIABILITY", parentId: "2102" },
    { code: "2103", name: "Obligaciones Laborales", type: "LIABILITY", parentId: "21" },
    { code: "210301", name: "IHSS por Pagar", type: "LIABILITY", parentId: "2103" },
    { code: "210302", name: "RAP por Pagar", type: "LIABILITY", parentId: "2103" },
    { code: "210303", name: "Decimo Tercer Mes por Pagar", type: "LIABILITY", parentId: "2103" },
    { code: "210304", name: "Decimo Cuarto Mes por Pagar", type: "LIABILITY", parentId: "2103" },
    { code: "22", name: "Pasivo No Corriente", type: "LIABILITY", parentId: "2" },
    { code: "2201", name: "Préstamos Bancarios LP", type: "LIABILITY", parentId: "22" },
    { code: "3", name: "Patrimonio", type: "EQUITY" },
    { code: "31", name: "Capital Social", type: "EQUITY", parentId: "3" },
    { code: "3101", name: "Capital Suscrito y Pagado", type: "EQUITY", parentId: "31" },
    { code: "32", name: "Resultados Acumulados", type: "EQUITY", parentId: "3" },
    { code: "3201", name: "Utilidades Retenidas", type: "EQUITY", parentId: "32" },
    { code: "3202", name: "Utilidad del Ejercicio", type: "EQUITY", parentId: "32" },
    { code: "4", name: "Ingresos", type: "REVENUE" },
    { code: "41", name: "Ingresos Operacionales", type: "REVENUE", parentId: "4" },
    { code: "4101", name: "Ventas Nacionales", type: "REVENUE", parentId: "41" },
    { code: "4102", name: "Ventas de Exportación", type: "REVENUE", parentId: "41" },
    { code: "4103", name: "Devoluciones en Venta", type: "REVENUE", parentId: "41" },
    { code: "42", name: "Otros Ingresos", type: "REVENUE", parentId: "4" },
    { code: "4201", name: "Descuentos Recibidos", type: "REVENUE", parentId: "42" },
    { code: "4202", name: "Intereses Ganados", type: "REVENUE", parentId: "42" },
    { code: "5", name: "Costos y Gastos", type: "EXPENSE" },
    { code: "51", name: "Costo de Ventas", type: "EXPENSE", parentId: "5" },
    { code: "5101", name: "Costo de Mercancía Vendida", type: "EXPENSE", parentId: "51" },
    { code: "52", name: "Gastos de Administración", type: "EXPENSE", parentId: "5" },
    { code: "5201", name: "Sueldos y Salarios", type: "EXPENSE", parentId: "52" },
    { code: "5202", name: "Alquileres", type: "EXPENSE", parentId: "52" },
    { code: "5203", name: "Servicios Públicos", type: "EXPENSE", parentId: "52" },
    { code: "5204", name: "Depreciaciones", type: "EXPENSE", parentId: "52" },
    { code: "53", name: "Gastos de Venta", type: "EXPENSE", parentId: "5" },
    { code: "5301", name: "Comisiones de Venta", type: "EXPENSE", parentId: "53" },
    { code: "5302", name: "Publicidad", type: "EXPENSE", parentId: "53" },
    { code: "5303", name: "Transporte de Ventas", type: "EXPENSE", parentId: "53" },
  ],
  servicios: [
    { code: "1", name: "Activos", type: "ASSET" },
    { code: "11", name: "Activo Corriente", type: "ASSET", parentId: "1" },
    { code: "1101", name: "Efectivo", type: "ASSET", parentId: "11" },
    { code: "110101", name: "Caja General", type: "ASSET", parentId: "1101" },
    { code: "110102", name: "Bancos", type: "ASSET", parentId: "1101" },
    { code: "1102", name: "Cuentas por Cobrar", type: "ASSET", parentId: "11" },
    { code: "110201", name: "Clientes", type: "ASSET", parentId: "1102" },
    { code: "1103", name: "Créditos Fiscales", type: "ASSET", parentId: "11" },
    { code: "110301", name: "ISV Crédito Fiscal", type: "ASSET", parentId: "1103" },
    { code: "12", name: "Activo No Corriente", type: "ASSET", parentId: "1" },
    { code: "1201", name: "Equipo y Mobiliario", type: "ASSET", parentId: "12" },
    { code: "120101", name: "Equipo de Cómputo", type: "ASSET", parentId: "1201" },
    { code: "120102", name: "Mobiliario de Oficina", type: "ASSET", parentId: "1201" },
    { code: "120103", name: "(-) Depreciación Acumulada", type: "ASSET", parentId: "1201" },
    { code: "2", name: "Pasivos", type: "LIABILITY" },
    { code: "21", name: "Pasivo Corriente", type: "LIABILITY", parentId: "2" },
    { code: "2101", name: "Cuentas por Pagar", type: "LIABILITY", parentId: "21" },
    { code: "210101", name: "Proveedores", type: "LIABILITY", parentId: "2101" },
    { code: "2102", name: "Obligaciones Fiscales", type: "LIABILITY", parentId: "21" },
    { code: "210201", name: "ISV por Pagar", type: "LIABILITY", parentId: "2102" },
    { code: "2103", name: "Obligaciones Laborales", type: "LIABILITY", parentId: "21" },
    { code: "210301", name: "IHSS por Pagar", type: "LIABILITY", parentId: "2103" },
    { code: "3", name: "Patrimonio", type: "EQUITY" },
    { code: "31", name: "Capital", type: "EQUITY", parentId: "3" },
    { code: "32", name: "Resultados", type: "EQUITY", parentId: "3" },
    { code: "4", name: "Ingresos por Servicios", type: "REVENUE" },
    { code: "41", name: "Servicios Profesionales", type: "REVENUE", parentId: "4" },
    { code: "4101", name: "Honorarios por Consultoría", type: "REVENUE", parentId: "41" },
    { code: "4102", name: "Servicios Técnicos", type: "REVENUE", parentId: "41" },
    { code: "42", name: "Otros Ingresos", type: "REVENUE", parentId: "4" },
    { code: "5", name: "Gastos", type: "EXPENSE" },
    { code: "51", name: "Gastos de Administración", type: "EXPENSE", parentId: "5" },
    { code: "5101", name: "Sueldos", type: "EXPENSE", parentId: "51" },
    { code: "5102", name: "Alquileres", type: "EXPENSE", parentId: "51" },
    { code: "5103", name: "Servicios Públicos", type: "EXPENSE", parentId: "51" },
    { code: "52", name: "Gastos de Venta", type: "EXPENSE", parentId: "5" },
    { code: "5201", name: "Publicidad", type: "EXPENSE", parentId: "52" },
  ],
};

const defaultAccounts: Partial<Account>[] = CATALOG_TEMPLATES.pyme;

export default function ChartOfAccountsManager() {
  const { currentTenant } = useTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    code: "", name: "", type: "ASSET" as Account["type"],
    nature: "DEBIT" as "DEBIT" | "CREDIT", description: "", parentId: "",
    isSelectable: true, isActive: true, currency: "HNL", fiscalCode: "",
  });
  const [hasTransactions, setHasTransactions] = useState(false);
  const [natureAuto, setNatureAuto] = useState(true);
  const [accountBalance, setAccountBalance] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!currentTenant?.id) return;
      try {
        const res = await fetch(`/api/accounting/accounts?tenantId=${currentTenant.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const normalized = data.map((a: any) => {
              const type = a.type || a.account_type || "ASSET";
              const code = a.code || a.account_code || "";
              return {
                id: a.id || a.account_id || `acc-${code}`,
                code, name: a.name || a.account_name || "", type,
                nature: a.nature || getNatureFromType(type),
                level: a.level || getLevelFromCode(code),
                isSelectable: a.is_selectable ?? a.isSelectable ?? (code.length >= 6),
                description: a.description || "",
                parentId: a.parent_id || a.parentId || "",
                balance: Number(a.balance || 0),
                isActive: a.is_active ?? a.isActive ?? true,
                currency: a.currency || "HNL",
                fiscalCode: a.fiscal_code || a.fiscalCode || "",
              };
            });
            setAccounts(buildAccountHierarchy(normalized));
            return;
          }
        }
      } catch (e) { console.error("Error loading accounts:", e); }
      setAccounts(buildAccountHierarchy(defaultAccounts as Account[]));
    };
    loadAccounts();
  }, [currentTenant]);

  const buildAccountHierarchy = (flatAccounts: Account[]): Account[] => {
    const accountMap = new Map<string, Account>();
    const rootAccounts: Account[] = [];
    const normalized = flatAccounts.map(a => ({
      ...a,
      nature: a.nature || getNatureFromType(a.type),
      level: a.level || getLevelFromCode(a.code),
      isSelectable: a.isSelectable ?? (a.code.length >= 6),
    }));
    normalized.forEach(account => accountMap.set(account.id, { ...account, children: [] }));
    normalized.forEach(account => {
      const node = accountMap.get(account.id)!;
      if (account.parentId) {
        const parent = accountMap.get(account.parentId);
        if (parent) { parent.children = parent.children || []; parent.children.push(node); }
      } else { rootAccounts.push(node); }
    });
    return rootAccounts;
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collect = (list: Account[]) => { list.forEach(a => { if (a.children?.length) { allIds.add(a.id); collect(a.children); } }); };
    collect(accounts);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => setExpandedNodes(new Set());

  const filteredAccounts = accounts.filter(account => {
    const match = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  account.code.toLowerCase().includes(searchTerm.toLowerCase());
    const typeMatch = selectedType === "todos" || account.type === selectedType;
    return match && typeMatch;
  });

  const getTypeColor = (type: string) => accountTypes.find(t => t.value === type)?.color || "bg-gray-100 text-gray-800";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        const res = await fetch(`/api/accounting/accounts?tenantId=${currentTenant?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingAccount.id, code: formData.code, name: formData.name,
            type: formData.type, nature: formData.nature, description: formData.description,
            parentId: formData.parentId || null, isSelectable: formData.isSelectable,
            isActive: formData.isActive, currency: formData.currency,
            fiscalCode: formData.fiscalCode,
          }),
        });
        const json = await res.json();
        if (!res.ok) { alert(json.error || "Error al actualizar"); return; }
        const update = (list: Account[]): Account[] => list.map(a => {
          if (a.id === editingAccount.id) {
            return { ...a, ...formData, parentId: formData.parentId || undefined };
          }
          return { ...a, children: a.children ? update(a.children) : [] };
        });
        setAccounts(prev => update(prev));
      } else {
        const res = await fetch(`/api/accounting/accounts?tenantId=${currentTenant?.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: formData.code, name: formData.name, type: formData.type,
            nature: formData.nature, description: formData.description,
            parentId: formData.parentId || null, currency: formData.currency,
            fiscalCode: formData.fiscalCode,
          }),
        });
        if (res.ok) {
          const newAcc = await res.json();
          const norm: Account = {
            id: newAcc.id, code: newAcc.code, name: newAcc.name, type: newAcc.type,
            nature: formData.nature, level: getLevelFromCode(formData.code),
            isSelectable: formData.isSelectable, description: formData.description || "",
            parentId: newAcc.parent_id || "", isActive: true, children: [],
            currency: formData.currency, fiscalCode: formData.fiscalCode,
          };
          if (formData.parentId) {
            const add = (list: Account[]): Account[] => list.map(a => {
              if (a.id === formData.parentId) return { ...a, children: [...(a.children || []), norm] };
              return { ...a, children: a.children ? add(a.children) : [] };
            });
            setAccounts(prev => add(prev));
          } else { setAccounts(prev => [...prev, norm]); }
        }
      }
    } catch (err) { console.error("Error:", err); }
    closeDialog();
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingAccount(null);
    setHasTransactions(false);
    setAccountBalance(0);
    setFormData({ code: "", name: "", type: "ASSET", nature: "DEBIT", description: "", parentId: "", isSelectable: true, isActive: true, currency: "HNL", fiscalCode: "" });
  };

  const handleImportCSV = (text: string) => {
    try {
      setImportError("");
      const lines = text.trim().split("\n").filter(l => l.trim());
      if (lines.length === 0) { setImportError("El archivo está vacío"); return; }
      const startIdx = lines[0].toLowerCase().includes("codigo") || lines[0].toLowerCase().includes("code") ? 1 : 0;
      const newAccounts: Partial<Account>[] = [];
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(",").map(p => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) { setImportError(`Línea ${i + 1}: se esperan al menos 3 columnas (Código, Nombre, Tipo)`); return; }
        const [code, name, type, ...rest] = parts;
        const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
        const upperType = type.toUpperCase();
        if (!validTypes.includes(upperType)) { setImportError(`Línea ${i + 1}: tipo "${type}" no válido. Use: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE`); return; }
        newAccounts.push({ code, name, type: upperType as Account["type"], currency: rest[0] || "HNL" });
      }
      importAccounts(newAccounts);
    } catch { setImportError("Error al procesar el archivo CSV"); }
  };

  const importAccounts = async (toImport: Partial<Account>[]) => {
    if (!currentTenant?.id) return;
    let success = 0, failed = 0;
    for (const acc of toImport) {
      try {
        const res = await fetch(`/api/accounting/accounts?tenantId=${currentTenant.id}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...acc, parentId: null }),
        });
        if (res.ok) success++; else failed++;
      } catch { failed++; }
    }
    alert(`Importación completada: ${success} cuentas creadas, ${failed} fallidas`);
    setImportDialogOpen(false);
    setImportText("");
    window.location.reload();
  };

  const exportToCSV = () => {
    const flat: any[] = [];
    const flatten = (list: Account[], parentCode = "") => {
      list.forEach(a => {
        flat.push({ code: a.code, name: a.name, type: a.type, nature: a.nature, level: a.level, currency: a.currency || "HNL", fiscalCode: a.fiscalCode || "", parentCode, isSelectable: a.isSelectable, isActive: a.isActive });
        if (a.children?.length) flatten(a.children, a.code);
      });
    };
    flatten(accounts);
    const header = "Codigo,Nombre,Tipo,Naturaleza,Nivel,Moneda,Codigo Fiscal,Cuenta Padre,Permite Asientos,Activa";
    const rows = flat.map(a => `${a.code},"${a.name}",${a.type},${a.nature},${a.level},${a.currency},${a.fiscalCode},${a.parentCode},${a.isSelectable},${a.isActive}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `catalogo_cuentas_${currentTenant?.businessName || "contab"}.csv`;
    link.click();
  };

  const applyTemplate = async (templateKey: string) => {
    if (!currentTenant?.id) return;
    const template = CATALOG_TEMPLATES[templateKey];
    if (!template) return;
    if (!confirm(`¿Cargar plantilla "${templateKey}"? Esto agregará ${template.length} cuentas.`)) return;

    // Two-pass: insert roots first, then children with parent_id mapped
    const codeToId = new Map<string, string>();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Pass 1: root accounts (no parentId in template)
    for (const acc of template) {
      if (acc.parentId) continue;
      try {
        const res = await fetch(`/api/accounting/accounts?tenantId=${currentTenant.id}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...acc, parentId: null, currency: acc.currency || "HNL" }),
        });
        if (res.ok) {
          const data = await res.json();
          codeToId.set(acc.code!, data.id);
          success++;
        } else {
          const err = await res.json().catch(() => ({}));
          failed++;
          errors.push(`${acc.code}: ${err.error || res.statusText}`);
        }
      } catch (e: any) { failed++; errors.push(`${acc.code}: ${e.message}`); }
    }

    // Pass 2: child accounts (resolve parentId from code -> id)
    for (const acc of template) {
      if (!acc.parentId) continue;
      const resolvedParentId = codeToId.get(acc.parentId) || null;
      try {
        const res = await fetch(`/api/accounting/accounts?tenantId=${currentTenant.id}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...acc, parentId: resolvedParentId, currency: acc.currency || "HNL" }),
        });
        if (res.ok) {
          const data = await res.json();
          codeToId.set(acc.code!, data.id);
          success++;
        } else {
          const err = await res.json().catch(() => ({}));
          failed++;
          errors.push(`${acc.code}: ${err.error || res.statusText}`);
        }
      } catch (e: any) { failed++; errors.push(`${acc.code}: ${e.message}`); }
    }

    const msg = `Plantilla "${templateKey}": ${success} creadas, ${failed} fallidas${errors.length ? "\n\nErrores:\n" + errors.slice(0, 5).join("\n") : ""}`;
    alert(msg);
    setTemplateDialogOpen(false);
    if (success > 0) window.location.reload();
  };

  const AccountRow = ({ account, level = 0 }: { account: Account; level?: number }) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    return (
      <div key={account.id}>
        <div className="flex items-center justify-between p-3 hover:bg-gray-50 border-b" style={{ paddingLeft: `${level * 24 + 12}px` }}>
          <div className="flex items-center space-x-3">
            {hasChildren ? (
              <button onClick={() => toggleExpand(account.id)} className="p-1 hover:bg-gray-200 rounded">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : <div className="w-6" />}
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-mono text-sm text-gray-500">{account.code}</span>
                <span className={`font-medium ${account.isActive === false ? "text-gray-400 line-through" : ""}`}>{account.name}</span>
                <Badge className={getTypeColor(account.type)}>{accountTypes.find(t => t.value === account.type)?.label}</Badge>
                <Badge className={account.nature === "DEBIT" ? "bg-cyan-100 text-cyan-700" : "bg-purple-100 text-purple-700"}>
                  {account.nature === "DEBIT" ? "Deudora" : "Acreedora"}
                </Badge>
                {account.currency && account.currency !== "HNL" && (
                  <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">{account.currency}</Badge>
                )}
                {!account.isSelectable && <Badge className="bg-gray-100 text-gray-500 text-[10px]">Grupo</Badge>}
                {account.isActive === false && <Badge className="bg-red-100 text-red-500 text-[10px]">Inactiva</Badge>}
              </div>
              {account.description && <p className="text-sm text-gray-600 mt-1">{account.description}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {account.balance !== undefined && account.balance !== 0 && (
              <span className={`text-sm font-medium ${account.balance > 0 ? "text-green-600" : "text-red-600"}`}>
                {account.balance.toLocaleString("es-HN", { style: "currency", currency: account.currency === "USD" ? "USD" : "HNL" })}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={async () => {
              setEditingAccount(account);
              setFormData({
                code: account.code, name: account.name, type: account.type,
                nature: account.nature, description: account.description || "",
                parentId: account.parentId || "", isSelectable: account.isSelectable ?? (account.code.length >= 6),
                isActive: account.isActive ?? true, currency: account.currency || "HNL",
                fiscalCode: account.fiscalCode || "",
              });
              setNatureAuto(true);
              setHasTransactions(false);
              setAccountBalance(0);
              setIsCreateDialogOpen(true);
              try {
                const [txRes, balRes] = await Promise.all([
                  fetch(`/api/accounting/accounts/check-transactions?id=${account.id}`),
                  fetch(`/api/accounting/accounts/check-transactions?id=${account.id}`),
                ]);
                const txJson = await txRes.json();
                setHasTransactions(txJson.hasTransactions ?? false);
                setAccountBalance(Number(account.balance || 0));
              } catch { setHasTransactions(false); }
            }}>
              <Edit className="h-4 w-4" />
            </Button>
            {account.isActive !== false ? (
              <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700" onClick={async () => {
                if (Math.abs(account.balance || 0) > 0.01) {
                  alert(`No se puede desactivar: la cuenta tiene un saldo de ${account.balance?.toFixed(2)}. Debe ser cero para inactivar.`);
                  return;
                }
                if (!confirm(`Inactivar cuenta "${account.code} - ${account.name}"?`)) return;
                const res = await fetch(`/api/accounting/accounts?tenantId=${currentTenant?.id}`, {
                  method: "PUT", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: account.id, name: account.name, type: account.type, nature: account.nature, isActive: false, isSelectable: account.isSelectable, currency: account.currency, fiscalCode: account.fiscalCode }),
                });
                if (res.ok) {
                  const update = (list: Account[]): Account[] => list.map(a => {
                    if (a.id === account.id) return { ...a, isActive: false };
                    return { ...a, children: a.children ? update(a.children) : [] };
                  });
                  setAccounts(prev => update(prev));
                }
              }}>
                <Lock className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700" onClick={async () => {
                const res = await fetch(`/api/accounting/accounts?tenantId=${currentTenant?.id}`, {
                  method: "PUT", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: account.id, name: account.name, type: account.type, nature: account.nature, isActive: true, isSelectable: account.isSelectable, currency: account.currency, fiscalCode: account.fiscalCode }),
                });
                if (res.ok) {
                  const update = (list: Account[]): Account[] => list.map(a => {
                    if (a.id === account.id) return { ...a, isActive: true };
                    return { ...a, children: a.children ? update(a.children) : [] };
                  });
                  setAccounts(prev => update(prev));
                }
              }}>
                <Unlock className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={async () => {
              if (hasTransactions) {
                alert("No se puede eliminar una cuenta con partidas contables. Use Inactivar.");
                return;
              }
              if (!confirm(`Eliminar cuenta "${account.code} - ${account.name}"?`)) return;
              try { await fetch(`/api/accounting/accounts?id=${account.id}`, { method: "DELETE" }); } catch {}
              setAccounts(prev => {
                const remove = (list: Account[]): Account[] => list.filter(a => a.id !== account.id).map(a => ({ ...a, children: a.children ? remove(a.children) : [] }));
                return remove(prev);
              });
            }}>
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Catálogo de Cuentas</h2>
          <p className="text-gray-600">Gestiona el catálogo contable para {currentTenant?.businessName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-1" /> Plantillas
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={async () => {
            if (!currentTenant?.id) return;
            if (!confirm("⚠️ ¿Eliminar TODAS las cuentas contables? Esta acción no se puede deshacer.")) return;
            if (!confirm("Seguro que deseas eliminar todo el catálogo de cuentas?")) return;
            try {
              const res = await fetch(`/api/accounting/accounts/delete-all?tenantId=${currentTenant.id}`, { method: "DELETE" });
              const json = await res.json();
              if (res.ok) {
                alert(`✅ ${json.deleted || 0} cuentas eliminadas`);
                setAccounts([]);
              } else {
                alert(`Error: ${json.error || "No se pudieron eliminar"}`);
              }
            } catch (e: any) { alert(`Error: ${e.message}`); }
          }}>
            <Trash2 className="h-4 w-4 mr-1" /> Eliminar Todo
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nueva Cuenta</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Editar Cuenta" : "Crear Nueva Cuenta"}</DialogTitle>
                <DialogDescription>{editingAccount ? "Modifica los datos de la cuenta contable." : "Agrega una nueva cuenta al catálogo."}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Código {hasTransactions && editingAccount && <span className="text-[10px] text-amber-600">(bloqueado)</span>}</Label>
                    <Input id="code" value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value, isSelectable: e.target.value.length >= 6 }))} placeholder="Ej: 1101" required disabled={hasTransactions && !!editingAccount} className={hasTransactions && editingAccount ? "bg-gray-50 cursor-not-allowed" : ""} />
                  </div>
                  <div>
                    <Label htmlFor="type">Tipo {hasTransactions && editingAccount && <span className="text-[10px] text-amber-600">(bloqueado)</span>}</Label>
                    <Select value={formData.type} onValueChange={(v) => { const t = v as Account["type"]; if (natureAuto) setFormData(prev => ({ ...prev, type: t, nature: getNatureFromType(t) })); else setFormData(prev => ({ ...prev, type: t })); }} disabled={hasTransactions && !!editingAccount}>
                      <SelectTrigger className={hasTransactions && editingAccount ? "bg-gray-50 cursor-not-allowed" : ""}><SelectValue /></SelectTrigger>
                      <SelectContent>{accountTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Naturaleza */}
                <div>
                  <Label>Naturaleza {hasTransactions && editingAccount && <span className="text-[10px] text-amber-600">(bloqueado)</span>}</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button type="button" disabled={hasTransactions && !!editingAccount} onClick={() => { setNatureAuto(false); setFormData(prev => ({ ...prev, nature: "DEBIT" })); }} className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${formData.nature === "DEBIT" ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"} ${hasTransactions && editingAccount ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                      <span className="font-bold">D</span> Deudora
                    </button>
                    <button type="button" disabled={hasTransactions && !!editingAccount} onClick={() => { setNatureAuto(false); setFormData(prev => ({ ...prev, nature: "CREDIT" })); }} className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${formData.nature === "CREDIT" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"} ${hasTransactions && editingAccount ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                      <span className="font-bold">A</span> Acreedora
                    </button>
                    <button type="button" disabled={hasTransactions && !!editingAccount} onClick={() => { setNatureAuto(true); setFormData(prev => ({ ...prev, nature: getNatureFromType(prev.type) })); }} className={`py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all ${natureAuto ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"} ${hasTransactions && editingAccount ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`} title="Auto-seleccionar">
                      Auto
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{natureAuto ? "Se asigna automáticamente según el Tipo" : `Manual — puede diferir de "${accountTypes.find(t => t.value === formData.type)?.label}"`}</p>
                </div>

                {/* Nombre */}
                <div>
                  <Label htmlFor="name">Nombre de la Cuenta</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Ej: Caja General" required />
                </div>

                {/* Descripción */}
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Input id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Descripción opcional" />
                </div>

                {/* Moneda + Codigo Fiscal */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Moneda</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HNL">Lempira (HNL)</SelectItem>
                        <SelectItem value="USD">Dólar (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.currency === "USD" && <p className="text-[11px] text-amber-600 mt-1">Requiere revaluación por diferencial cambiario al cierre</p>}
                  </div>
                  <div>
                    <Label htmlFor="fiscalCode">Código Fiscal</Label>
                    <Input id="fiscalCode" value={formData.fiscalCode} onChange={(e) => setFormData(prev => ({ ...prev, fiscalCode: e.target.value }))} placeholder="Ej: 1101-001" />
                  </div>
                </div>

                {/* Nivel + Padre */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nivel Jerárquico</Label>
                    <div className="mt-1.5 py-2 px-3 rounded-lg bg-gray-50 border text-sm">
                      {(() => { const l = getLevelFromCode(formData.code); const lbl: Record<number, string> = { 1: "1 - Grupo Mayor", 2: "2 - Subgrupo", 3: "3 - Cuenta de Mayor", 4: "4 - Auxiliar/Detalle" }; return lbl[l] || `${l} - Detalle`; })()}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="parentId">Cuenta Padre</Label>
                    <Select value={formData.parentId || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, parentId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Ninguna (raíz)</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Switches */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg border">
                    <div><Label className="text-sm font-medium">Permite Asientos</Label><p className="text-[11px] text-gray-400">is_selectable</p></div>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, isSelectable: !prev.isSelectable }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isSelectable ? "bg-cyan-600" : "bg-gray-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isSelectable ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3 px-3 rounded-lg border">
                    <div><Label className="text-sm font-medium">Cuenta Activa</Label><p className="text-[11px] text-gray-400">is_active</p></div>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive ? "bg-green-600" : "bg-gray-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>

                {hasTransactions && editingAccount && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>Esta cuenta tiene partidas contables. <strong>Código</strong>, <strong>Tipo</strong> y <strong>Naturaleza</strong> están bloqueados.</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                  <Button type="submit">{editingAccount ? "Actualizar" : "Crear"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Cuentas (CSV)</DialogTitle>
            <DialogDescription>Carga un archivo CSV con las columnas: Codigo,Nombre,Tipo,Moneda (opcional)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-600">
              Codigo,Nombre,Tipo,Moneda<br/>
              11,Activo Corriente,ASSET,<br/>
              1101,Caja y Bancos,ASSET,11<br/>
              110101,Caja General,ASSET,1101
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => setImportText(ev.target?.result as string);
              reader.readAsText(file);
            }} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Seleccionar archivo CSV</Button>
            {importText && (
              <div>
                <Label>Vista previa ({importText.split("\n").filter(l => l.trim()).length} líneas)</Label>
                <pre className="mt-1 p-2 bg-gray-50 rounded text-xs max-h-40 overflow-auto">{importText}</pre>
              </div>
            )}
            {importError && <p className="text-red-600 text-sm">{importError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportText(""); setImportError(""); }}>Cancelar</Button>
              <Button disabled={!importText} onClick={() => handleImportCSV(importText)}>Importar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Plantillas de Catálogo</DialogTitle>
            <DialogDescription>Selecciona una plantilla predefinida para crear tu catálogo base</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[{ key: "pyme", label: "PYME", desc: "37 cuentas — Empresas pequeñas y medianas" },
              { key: "comercial", label: "Comercial", desc: "53 cuentas — Empresas con inventario y exportación" },
              { key: "servicios", label: "Servicios", desc: "28 cuentas — Empresas de servicios profesionales" },
            ].map(t => (
              <button key={t.key} onClick={() => applyTemplate(t.key)} className="w-full text-left p-4 rounded-lg border-2 hover:border-cyan-500 hover:bg-cyan-50 transition-all">
                <div className="font-semibold text-gray-900">{t.label}</div>
                <div className="text-sm text-gray-500">{t.desc}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderTree className="h-5 w-5" />
            <span>Cuentas Contables</span>
          </CardTitle>
          <CardDescription>Catálogo completo siguiendo principios de partida doble</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Buscar por código o nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {accountTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={expandAll}><ChevronDown className="h-3 w-3 mr-1" /> Expandir</Button>
            <Button variant="outline" size="sm" onClick={collapseAll}><ChevronRight className="h-3 w-3 mr-1" /> Colapsar</Button>
            <span className="text-xs text-gray-400 self-center ml-2">
              {filteredAccounts.length} cuentas raíz | {accounts.reduce((s, a) => s + (a.children?.length || 0), 0)} subcuentas
            </span>
          </div>

          <div className="border rounded-lg">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron cuentas</h3>
                <p className="text-gray-600">{searchTerm || selectedType !== "todos" ? "Ajusta los filtros" : "Crea tu primera cuenta o carga una plantilla"}</p>
              </div>
            ) : (
              filteredAccounts.map((account, i) => <AccountRow key={account.id || `acc-${i}`} account={account} />)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader><CardTitle>Principios de Partida Doble</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Ecuación Fundamental</h4>
              <div className="bg-cyan-50 p-4 rounded-lg">
                <p className="text-center text-lg font-mono font-bold text-blue-900">Activo = Pasivo + Patrimonio</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Reglas de Débito y Crédito</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="font-medium">Débito (+):</span><span>Aumenta Activos y Gastos</span></div>
                <div className="flex justify-between"><span className="font-medium">Crédito (-):</span><span>Aumenta Pasivos, Patrimonio e Ingresos</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
