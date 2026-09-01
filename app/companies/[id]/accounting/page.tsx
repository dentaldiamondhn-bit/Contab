"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionFormSimple } from "@/components/accounting/TransactionFormSimple";
import { ExcelBooksUploader } from "@/components/accounting/ExcelBooksUploader";
import { getAccountTypeLabel } from "@/lib/accounting-utils";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  CheckCircle
} from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  voucherType: string;
  voucherNumber: number;
  totalAmount: number;
  currency: string;
  entries: {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }[];
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string;
  is_active: boolean;
}

interface Company {
  id: string;
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

interface AccountingBook {
  id: string;
  name: string;
  type: 'diario' | 'mayor' | 'balance' | 'inventarios';
  period: string;
  status: 'active' | 'inactive' | 'pending';
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  lastModified?: string;
  entries?: number;
  companyId: string;
}

export default function CompanyAccountingPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [company, setCompany] = useState<Company | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("2024-01");
  
  // Estados para modales de edición
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [bookViewMode, setBookViewMode] = useState<'view' | 'edit'>('view');
  const [accountingBooks, setAccountingBooks] = useState<AccountingBook[]>([]);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<AccountingBook | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Estados para ingreso de transacciones
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showExcelUploader, setShowExcelUploader] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<any>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Cargar datos de la empresa
  useEffect(() => {
    if (companyId && !company) {
      loadCompanyData();
    }
  }, [companyId]);

  const loadCompanyData = async () => {
    try {
      console.log("Cargando datos para companyId:", companyId);
      setLoading(true);
      
      // 1. Resolver empresa/tenant (soporta id uuid, tenant_code como ANGELOH7, o companies.id)
      let companyData: any = null;
      let tenantIdReal: string = companyId;

      const companyResponse = await fetch(`/api/companies/${companyId}`);
      if (companyResponse.ok) {
        companyData = await companyResponse.json();
        tenantIdReal = companyData.id || companyData.tenant_id || companyId;
        // Normalizar campos de Tenant (vienen como businessname/business_name, etc.)
        const cleanEmail = (e: string) => (e || "").replace(/\+[^@]+@/, "@");
        const cleanRtn = (r: string) => (r || "").split("-")[0].trim();
        companyData = {
          ...companyData,
          business_name: companyData.business_name || companyData.businessname || companyData.name || "",
          business_rtn: cleanRtn(companyData.business_rtn || companyData.businessrtn || companyData.rtn || ""),
          industry: companyData.industry || companyData.business_type || "",
          regimen_tributario: companyData.regimen_tributario || "Régimen General",
          actividad_economica: companyData.actividad_economica || companyData.business_type || companyData.industry || "",
          direccion_fiscal: companyData.direccion_fiscal || companyData.businessaddress || companyData.business_address || companyData.address || "",
          telefono_fiscal: companyData.telefono_fiscal || companyData.phonenumber || companyData.phone_number || companyData.phone || "",
          email_fiscal: cleanEmail(companyData.email_fiscal || companyData.businessemail || companyData.business_email || companyData.email || ""),
        };
        // Enriquecer con fila de companies (tiene industry, business_type, address, etc.)
        try {
          const compListRes = await fetch(`/api/companies`);
          if (compListRes.ok) {
            const compJson = await compListRes.json();
            const comps: any[] = compJson.companies || compJson || [];
            const comp = comps.find((c:any)=> c.tenant_id === tenantIdReal || c.id === tenantIdReal);
            if (comp) {
              companyData = {
                ...companyData,
                industry: companyData.industry || comp.industry || comp.business_type || "",
                regimen_tributario: companyData.regimen_tributario || (comp as any).regimen_tributario || "Régimen General",
                actividad_economica: companyData.actividad_economica || comp.actividad_economica || comp.business_type || comp.industry || "",
                direccion_fiscal: companyData.direccion_fiscal || comp.direccion_fiscal || comp.address || "",
                telefono_fiscal: companyData.telefono_fiscal || comp.telefono_fiscal || comp.phone || comp.contact_phone || comp.company_phone || "",
                email_fiscal: cleanEmail(companyData.email_fiscal || comp.email_fiscal || comp.email || ""),
                business_name: companyData.business_name || comp.business_name || comp.name || "",
                business_rtn: cleanRtn(companyData.business_rtn || comp.business_rtn || comp.rtn || ""),
              };
            }
          }
        } catch {}
      } else {
        // Fallback: buscar en lista de companies por id / name / tenant_code
        try {
          const listRes = await fetch(`/api/companies`);
          if (listRes.ok) {
            const listJson = await listRes.json();
            const list: any[] = listJson.companies || listJson || [];
            const found = list.find((c: any) => c.id === companyId || c.tenant_code === companyId || c.business_name === companyId);
            if (found) {
              companyData = found;
              tenantIdReal = found.tenant_id || found.id;
            } else if (list.length === 1) {
              // si solo hay 1 empresa para el tenant, usarla
              companyData = list[0];
              tenantIdReal = list[0].tenant_id || list[0].id;
            }
          }
        } catch {}
        // Último fallback: intentar Tenant directo por tenant_code
        if (!companyData) {
          try {
            const tRes = await fetch(`/api/tenant/my-tenant`);
            if (tRes.ok) {
              const tJson = await tRes.json();
              if (tJson.id || tJson.tenant?.id) {
                const tid = tJson.id || tJson.tenant?.id;
                // verificar si coincide con ANGELOH7 etc - usar igual para no bloquear
                if (!companyId || tid) tenantIdReal = tid;
                if (!companyData && tJson.businessName) {
                  companyData = {
                    id: tid,
                    business_name: tJson.businessName,
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
            }
          } catch {}
        }
      }

      if (!companyData) {
        // mock mínimo para no bloquear UI, pero con tenantIdReal correcto para cargar transacciones
        companyData = {
          id: tenantIdReal,
          business_name: `Empresa ${companyId}`,
          business_rtn: "",
          industry: "",
          regimen_tributario: "Régimen General",
          actividad_economica: "",
          direccion_fiscal: "",
          telefono_fiscal: "",
          email_fiscal: "",
          is_active: true,
        };
        console.warn(`Empresa no encontrada para ${companyId}, usando fallback con tenantIdReal=${tenantIdReal}`);
      }

      setCompany(companyData);

      // 2. Cargar transacciones y cuentas reales en paralelo (usa tenantIdReal, no el param crudo)
      console.log(`Cargando datos reales para tenantIdReal=${tenantIdReal} (param=${companyId})`);
      try {
        const [txRes, accRes] = await Promise.all([
          fetch(`/api/accounting/transactions?tenantId=${tenantIdReal}`),
          fetch(`/api/accounting/accounts?tenantId=${tenantIdReal}`),
        ]);
        if (txRes.ok) {
          const txData = await txRes.json();
          // normalizar: la API puede devolver array o {transactions:[]}
          const arr = Array.isArray(txData) ? txData : txData.transactions || [];
          // mapear a formato local Transaction si viene con entries anidadas
          const mapped: Transaction[] = arr.map((t: any) => ({
            id: t.id,
            date: t.date,
            description: t.description,
            voucherType: t.voucherType || t.voucher_type,
            voucherNumber: t.voucherNumber ?? t.voucher_number ?? 0,
            totalAmount: typeof t.totalAmount === "number" ? t.totalAmount : Number(t.total_amount ?? t.totalAmount ?? 0),
            currency: t.currency || "HNL",
            entries: (t.entries || t.JournalEntry || []).map((e: any) => ({
              accountCode: e.accountCode || e.Account?.code || e.code || "",
              accountName: e.accountName || e.Account?.name || e.name || "",
              debit: e.debit ?? (e.amount > 0 ? e.amount : 0),
              credit: e.credit ?? (e.amount < 0 ? Math.abs(e.amount) : 0),
            })),
          }));
          setTransactions(mapped);
          console.log(`Transacciones reales cargadas: ${mapped.length}`);
        } else {
          console.warn("Error cargando transacciones", await txRes.text());
        }
        if (accRes.ok) {
          const accData = await accRes.json();
          const arr = Array.isArray(accData) ? accData : accData.accounts || [];
          const mappedAcc: Account[] = arr.map((a: any) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            type: a.type,
            description: a.description || "",
            is_active: a.is_active ?? a.isActive ?? true,
          }));
          setAccounts(mappedAcc);
          console.log(`Cuentas reales cargadas: ${mappedAcc.length}`);
        } else {
          console.warn("Error cargando cuentas", await accRes.text());
        }
      } catch (e) {
        console.error("Error cargando transacciones/cuentas", e);
      }

      // Cargar historial de archivos subidos
      try {
        const filesRes = await fetch(`/api/accounting/uploaded-files?tenantId=${tenantIdReal}`);
        if (filesRes.ok) {
          const fj = await filesRes.json();
          setUploadedFiles(fj.files || []);
        }
      } catch {}

      setLoading(false);
    } catch (error) {
      console.error("Error loading company data:", error);
      setLoading(false);
    }
  };

  const loadUploadedFiles = async () => {
    try {
      const tid = company?.id || companyId;
      const r = await fetch(`/api/accounting/uploaded-files?tenantId=${tid}`);
      if (r.ok) {
        const j = await r.json();
        setUploadedFiles(j.files || []);
      }
    } catch {}
  };

  const handleDownloadFile = async (f:any) => {
    try {
      if (f.filePath) {
        const res = await fetch(`/api/accounting/uploaded-files?downloadId=${encodeURIComponent(f.id)}`);
        if (!res.ok) throw new Error("No se pudo descargar");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = f.fileName || "archivo.xlsx"; a.click();
        URL.revokeObjectURL(url);
        setSuccessMessage(`Descarga iniciada: ${f.fileName}`);
        setShowSuccessDialog(true);
        return;
      }
      const uploadedAt = f.uploadedAt ? new Date(f.uploadedAt).toISOString().slice(0,10) : null;
      let txs: any[] = transactions;
      if (uploadedAt) {
        txs = transactions.filter((t:any)=> (t.date || "").slice(0,10) === uploadedAt);
        if (txs.length===0) txs = transactions;
      }
      if (txs.length===0) { setSuccessMessage("No hay transacciones para exportar"); setShowSuccessDialog(true); return; }
      const rows = [["fecha","tipo_comprobante","numero_comprobante","descripcion","codigo_cuenta","nombre_cuenta","debe","haber"]];
      txs.forEach((t:any)=>{
        const debe = t.totalAmount >0 ? (t.totalAmount/100) : 0;
        (t.entries||[]).forEach((e:any)=>{
          rows.push([t.date, t.voucherType, t.voucherNumber, t.description, e.accountCode, e.accountName, e.debit ? e.debit/100 : 0, e.credit ? e.credit/100 : 0]);
        });
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "libro_diario");
      XLSX.writeFile(wb, f.fileName.endsWith(".xlsx") ? f.fileName : `${f.fileName}.xlsx`);
      setSuccessMessage(`Archivo generado: ${f.fileName}`);
      setShowSuccessDialog(true);
    } catch (e:any) { setSuccessMessage(`Error al descargar: ${e.message}`); setShowSuccessDialog(true); }
  };

  const handleDeleteFile = async (f:any) => {
    setFileToDelete(f);
    setShowDeleteDialog(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      const r = await fetch(`/api/accounting/uploaded-files?id=${encodeURIComponent(fileToDelete.id)}&tenantId=${encodeURIComponent(companyId)}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json()).error || "Error al eliminar");
      const j = await r.json();
      setUploadedFiles(prev => prev.filter(x=>x.id!==fileToDelete.id));
      loadCompanyData();
      setShowDeleteDialog(false);
      setSuccessMessage(j.deletedTransactions ? `Archivo eliminado. ${j.deletedTransactions} transacciones borradas de los libros.` : `Archivo eliminado correctamente.`);
      setShowSuccessDialog(true);
      setFileToDelete(null);
    } catch (e:any) {
      setShowDeleteDialog(false);
      setSuccessMessage(`Error: ${e.message}`);
      setShowSuccessDialog(true);
    }
  };

  const handleModifyFile = async (f:any) => {
    if (editingFileId === f.id) {
      // guardar
      try {
        const r = await fetch(`/api/accounting/uploaded-files`, { method: "PATCH", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ id: f.id, fileName: editingFileName }) });
        if (!r.ok) throw new Error((await r.json()).error || "Error al modificar");
        setUploadedFiles(prev=> prev.map(x=> x.id===f.id ? {...x, fileName: editingFileName} : x));
        setEditingFileId(null);
      } catch (e:any) { alert(`Error: ${e.message}`); }
    } else {
      setEditingFileId(f.id);
      setEditingFileName(f.fileName);
    }
  };

  const formatCurrency = (amount: number, currency: string = "HNL") => {
    // Debug logging to see what we're getting
    console.log("🔍 formatCurrency input:", { amount, currency, type: typeof amount });
    
    // Handle null/undefined/invalid amounts
    if (amount === null || amount === undefined || isNaN(amount)) {
      console.log("❌ Invalid amount detected:", amount);
      return "L 0.00";
    }
    
    // Convert from cents to regular currency units
    const amountInCurrency = amount / 100;
    console.log("✅ Converted amount:", amountInCurrency);
    
    const formatted = new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: currency,
    }).format(amountInCurrency);
    
    console.log("📝 Final formatted:", formatted);
    return formatted;
  };

  // Función para calcular datos de libros contables
  const calculateBookData = () => {
    // Calcular totales por tipo de cuenta
    const accountTotals = accounts.reduce((acc, account) => {
      acc[account.code] = { debit: 0, credit: 0, balance: 0 };
      return acc;
    }, {} as Record<string, { debit: number; credit: number; balance: number }>);

    // Sumar transacciones a las cuentas
    transactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        if (accountTotals[entry.accountCode]) {
          accountTotals[entry.accountCode].debit += entry.debit;
          accountTotals[entry.accountCode].credit += entry.credit;
          accountTotals[entry.accountCode].balance = entry.debit - entry.credit;
        }
      });
    });

    // Calcular totales financieros
    const totalIngresos = transactions
      .filter(t => t.voucherType === "INGRESO")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const totalGastos = transactions
      .filter(t => t.voucherType === "EGRESO")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const totalAjustes = transactions
      .filter(t => t.voucherType === "AJUSTE")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const utilidadNeta = totalIngresos - totalGastos - totalAjustes;

    // Calcular IVA (15% en Honduras)
    const debitoFiscal = totalIngresos * 0.15;
    const creditoFiscal = totalGastos * 0.15;

    // Calcular balances
    const totalActivos = 7500; // Basado en mock data
    const totalPasivos = 2500; // Basado en mock data
    const totalPatrimonio = totalActivos - totalPasivos;

    return {
      libroDiario: {
        transactions: transactions.length,
        periodo: "Ene 2024",
        lastUpdate: "Hoy"
      },
      libroMayor: {
        accounts: accounts.length,
        periodo: "Ene 2024",
        balance: utilidadNeta
      },
      balanceGeneral: {
        activos: totalActivos,
        pasivos: totalPasivos,
        patrimonio: totalPatrimonio
      },
      estadoResultados: {
        ingresos: totalIngresos,
        gastos: totalGastos,
        ajustes: totalAjustes,
        utilidadNeta: utilidadNeta
      },
      libroCompras: {
        compras: totalGastos,
        creditoFiscal: creditoFiscal,
        cfPendiente: creditoFiscal * 0.46 // 46% pendiente
      },
      libroVentas: {
        ventas: totalIngresos,
        debitoFiscal: debitoFiscal,
        dfPendiente: debitoFiscal * 0.31 // 31% pendiente
      }
    };
  };

  const bookData = calculateBookData();

  // Funciones CRUD para Libros Contables
  const handleAddBook = () => {
    setEditingBook({
      id: '',
      name: '',
      type: 'diario',
      period: selectedPeriod,
      status: 'pending',
      entries: 0,
      companyId: companyId
    });
    setShowBookDialog(true);
  };

  const handleEditBook = (book: AccountingBook) => {
    setEditingBook({ ...book });
    setShowBookDialog(true);
  };

  const handleSaveBook = async (book: AccountingBook) => {
    try {
      if (book.id) {
        // Actualizar libro existente
        setAccountingBooks(prev => 
          prev.map(b => b.id === book.id ? { ...book, lastModified: new Date().toISOString() } : b)
        );
      } else {
        // Crear nuevo libro
        const newBook: AccountingBook = {
          ...book,
          id: Date.now().toString(),
          uploadedAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        setAccountingBooks(prev => [...prev, newBook]);
      }
      setShowBookDialog(false);
      setEditingBook(null);
    } catch (error) {
      console.error('Error saving book:', error);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm('¿Está seguro de eliminar este libro contable?')) {
      try {
        setAccountingBooks(prev => prev.filter(b => b.id !== bookId));
      } catch (error) {
        console.error('Error deleting book:', error);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadProgress(0);
      
      // Simular progreso de subida
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Simular subida de archivo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Actualizar libro con información del archivo
      if (editingBook) {
        const updatedBook: AccountingBook = {
          ...editingBook,
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          uploadedAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        
        await handleSaveBook(updatedBook);
      }
      
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadProgress(0);
    }
  };

  // Funciones CRUD para Transacciones
  const handleAddTransaction = () => {
    setShowTransactionForm(true);
  };

  const handleTransactionSuccess = () => {
    setShowTransactionForm(false);
    setShowExcelUploader(false);
    // Recargar transacciones y archivos
    loadCompanyData();
    loadUploadedFiles();
  };

  const handleCancelTransactionEntry = () => {
    setShowTransactionForm(false);
    setShowExcelUploader(false);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionDialog(true);
  };

  const handleSaveTransaction = (transaction: Transaction) => {
    if (editingTransaction) {
      if (transactions.find(t => t.id === transaction.id)) {
        // Editar existente
        setTransactions(transactions.map(t => t.id === transaction.id ? transaction : t));
      } else {
        // Agregar nuevo
        setTransactions([...transactions, transaction]);
      }
      setShowTransactionDialog(false);
      setEditingTransaction(null);
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    if (confirm("¿Está seguro de eliminar esta transacción?")) {
      setTransactions(transactions.filter(t => t.id !== transactionId));
    }
  };

  // Funciones CRUD para Cuentas
  const handleAddAccount = () => {
    const newAccount: Account = {
      id: Date.now().toString(),
      code: "",
      name: "",
      type: "Activo Corriente",
      description: "",
      is_active: true
    };
    setEditingAccount(newAccount);
    setShowAccountDialog(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowAccountDialog(true);
  };

  const handleSaveAccount = (account: Account) => {
    if (editingAccount) {
      if (accounts.find(a => a.id === account.id)) {
        // Editar existente
        setAccounts(accounts.map(a => a.id === account.id ? account : a));
      } else {
        // Agregar nuevo
        setAccounts([...accounts, account]);
      }
      setShowAccountDialog(false);
      setEditingAccount(null);
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    if (confirm("¿Está seguro de eliminar esta cuenta?")) {
      setAccounts(accounts.filter(a => a.id !== accountId));
    }
  };

  const getVoucherTypeColor = (type: string) => {
    const colors = {
      INGRESO: "bg-green-100 text-green-800",
      EGRESO: "bg-red-100 text-red-800",
      DIARIO: "bg-blue-100 text-blue-800",
      AJUSTE: "bg-yellow-100 text-yellow-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };


  const filteredTransactions = transactions.filter(transaction => 
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.voucherType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando datos contables...</span>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Contabilidad - {company.business_name}
          </h1>
          <p className="text-gray-600">
            RTN: {company.business_rtn} | {company.industry}
          </p>
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/accounting/voucher-form`)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Póliza
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/modules`)}>
              Volver al Menú
            </Button>
          </div>
      </div>

      {/* Información de la Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Información Fiscal</CardTitle>
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
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Contabilidad */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Transacciones</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center space-x-2">
            <Scale className="h-4 w-4" />
            <span>Cuentas</span>
          </TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Reportes</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Botón prominente para Libros Contables */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <BookOpen className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <CardTitle className="text-lg text-green-800">Libros Contables</CardTitle>
                <CardDescription className="text-green-600">
                  Gestiona los libros obligatorios del Código de Comercio
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button 
                  onClick={() => router.push(`/companies/${companyId}/accounting/books`)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  Ir a Libros
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contenedor: Conteo por cada libro (DB) */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                Conteo por Libro — Base de Datos
              </CardTitle>
              <CardDescription>
                Transacciones reales agrupadas por libro contable (tenant: {companyId})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div onClick={()=>router.push(`/companies/${companyId}/accounting/books?tab=diario`)} className="rounded-lg border p-4 text-center bg-slate-50 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all">
                  <p className="text-xs text-muted-foreground uppercase">Libro Diario</p>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                  <p className="text-xs text-muted-foreground">pólizas • clic para ver</p>
                </div>
                <div onClick={()=>router.push(`/companies/${companyId}/accounting/books?tab=ingresos`)} className="rounded-lg border p-4 text-center bg-green-50 cursor-pointer hover:shadow-md hover:border-green-300 transition-all">
                  <p className="text-xs text-muted-foreground uppercase">Ingresos</p>
                  <p className="text-2xl font-bold text-green-700">{transactions.filter(t=>t.voucherType==="INGRESO").length}</p>
                  <p className="text-xs text-muted-foreground">INGRESO • ver</p>
                </div>
                <div onClick={()=>router.push(`/companies/${companyId}/accounting/books?tab=egresos`)} className="rounded-lg border p-4 text-center bg-red-50 cursor-pointer hover:shadow-md hover:border-red-300 transition-all">
                  <p className="text-xs text-muted-foreground uppercase">Egresos</p>
                  <p className="text-2xl font-bold text-red-700">{transactions.filter(t=>t.voucherType==="EGRESO").length}</p>
                  <p className="text-xs text-muted-foreground">EGRESO • ver</p>
                </div>
                <div onClick={()=>router.push(`/companies/${companyId}/accounting/books?tab=mayor`)} className="rounded-lg border p-4 text-center bg-blue-50 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all">
                  <p className="text-xs text-muted-foreground uppercase">Libro Mayor</p>
                  <p className="text-2xl font-bold text-blue-700">{accounts.length}</p>
                  <p className="text-xs text-muted-foreground">cuentas • ver</p>
                </div>
                <div onClick={()=>router.push(`/companies/${companyId}/accounting/books?tab=egresos`)} className="rounded-lg border p-4 text-center bg-purple-50 cursor-pointer hover:shadow-md hover:border-purple-300 transition-all">
                  <p className="text-xs text-muted-foreground uppercase">Compras</p>
                  <p className="text-2xl font-bold text-purple-700">{transactions.filter(t=>t.voucherType==="EGRESO").length}</p>
                  <p className="text-xs text-muted-foreground">crédito fiscal • ver</p>
                </div>
                <div onClick={()=>router.push(`/companies/${companyId}/accounting/books?tab=ingresos`)} className="rounded-lg border p-4 text-center bg-amber-50 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all">
                  <p className="text-xs text-muted-foreground uppercase">Ventas</p>
                  <p className="text-2xl font-bold text-amber-700">{transactions.filter(t=>t.voucherType==="INGRESO").length}</p>
                  <p className="text-xs text-muted-foreground">débito fiscal • ver</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Total transacciones DB: {transactions.length} • Total cuentas DB: {accounts.length}</span>
                <Badge variant="outline">{transactions.length>0 ? "Sincronizado" : "Sin datos"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Opciones de Transacciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleAddTransaction}>
              <CardHeader className="text-center">
                <Plus className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Ingreso Manual</CardTitle>
                <CardDescription>
                  Ingrese transacciones una por una con partida doble automática
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Transacción
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowExcelUploader(true)}>
              <CardHeader className="text-center">
                <Upload className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Subir desde Excel</CardTitle>
                <CardDescription>
                  Importe transacciones completas desde archivos Excel
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Archivo
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Formulario de transacción (si está activo) */}
          {showTransactionForm && (
            <div className="mt-6">
              <TransactionFormSimple
                tenantId={companyId}
                onSuccess={handleTransactionSuccess}
                onCancel={handleCancelTransactionEntry}
              />
            </div>
          )}

          {/* Upload de Excel (si está activo) */}
          {showExcelUploader && (
            <div className="mt-6">
              <ExcelBooksUploader
                tenantId={companyId}
                onSuccess={handleTransactionSuccess}
              />
            </div>
          )}

          {/* Historial de archivos subidos */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Archivos subidos
              </CardTitle>
              <CardDescription>
                Historial de archivos Excel subidos con fecha y hora
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay archivos subidos aún</p>
              ) : (
                <div>
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 w-[32%]">Nombre del archivo</th>
                        <th className="text-left p-2 w-[22%]">Fecha y hora</th>
                        <th className="text-right p-2 w-[12%]">Tamaño</th>
                        <th className="text-right p-2 w-[14%]">Estado</th>
                        <th className="text-center p-2 w-[20%]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedFiles.map((f:any)=> (
                        <tr key={f.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium min-w-[320px]">
                            {editingFileId===f.id ? (
                              <Input value={editingFileName} onChange={e=>setEditingFileName(e.target.value)} className="h-8" />
                            ) : (
                              <span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />{f.fileName}</span>
                            )}
                          </td>
                          <td className="p-2 whitespace-nowrap">{f.uploadedAt ? new Date(f.uploadedAt).toLocaleString('es-HN') : '-'}</td>
                          <td className="p-2 text-right whitespace-nowrap">{f.fileSize ? `${(f.fileSize/1024).toFixed(1)} KB` : (f.metadata?.totalRows ? `${f.metadata.totalRows} filas` : '-')}</td>
                          <td className="p-2 text-right">
                            <div className="group relative inline-block">
                              <Badge variant={f.status==='processed'?'default':'secondary'} className={f.metadata?.errors?.length ? "cursor-help" : ""}>{f.status || 'procesado'}</Badge>
                              {f.metadata?.errors?.length > 0 ? (
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50 w-72">
                                  <div className="bg-gray-900 text-white text-xs rounded-md p-3 shadow-lg">
                                    <p className="font-semibold mb-1">Errores ({f.metadata.errors.length}):</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {f.metadata.errors.slice(0,4).map((e:string,i:number)=>(<li key={i} className="truncate">{e}</li>))}
                                    </ul>
                                    {f.metadata.processed !== undefined && (
                                      <p className="mt-2 text-gray-300">Procesadas {f.metadata.processed} de {f.metadata.totalRows} filas</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50">
                                  <div className="bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg whitespace-nowrap">
                                    Sin errores — {f.metadata?.processed ?? '-'} de {f.metadata?.totalRows ?? '-'} filas procesadas correctamente
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex justify-center items-center gap-1">
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>handleDownloadFile(f)} title="Descargar"><Download className="h-4 w-4" /></Button>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>handleModifyFile(f)} title={editingFileId===f.id ? "Guardar" : "Modificar"}>{editingFileId===f.id ? <CheckCircle className="h-4 w-4" /> : <Edit className="h-4 w-4" />}</Button>
                              <Button variant="outline" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={()=>handleDeleteFile(f)} title="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Transacciones */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Transacciones</h3>
              <p className="text-gray-600 text-center mb-6">
                Las opciones para crear y subir transacciones han sido movidas a la pestaña de Resumen para mejor organización.
              </p>
              <Button onClick={() => setActiveTab("overview")} variant="outline">
                Ir a Resumen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Cuentas */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <CardTitle>Catálogo de Cuentas</CardTitle>
                  <Badge variant="outline">{accounts.length} cuentas</Badge>
                </div>
                <Button onClick={handleAddAccount}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cuenta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cuentas configuradas</h3>
                    <p className="text-gray-600">
                      No se encontraron cuentas para esta empresa
                    </p>
                    <Button onClick={handleAddAccount}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Cuenta
                    </Button>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <div key={account.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="text-left">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm">{account.code}</span>
                            <span className="font-medium">{account.name}</span>
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              {getAccountTypeLabel(account.type)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditAccount(account)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteAccount(account.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {account.description && (
                        <p className="text-sm text-gray-600 mt-2">{account.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Libros Contables */}
        <TabsContent value="books" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Libros Contables</h2>
              <p className="text-gray-600">Gestiona los libros obligatorios según el Código de Comercio de Honduras</p>
            </div>
            <Button onClick={handleAddBook}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Libro
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Libro Diario */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    <span>Libro Diario</span>
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-800">Activo</Badge>
                </div>
                <CardDescription>
                  Registro cronológico de todas las transacciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transacciones:</span>
                    <span className="font-medium">{bookData.libroDiario.transactions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Período:</span>
                    <span className="font-medium">{bookData.libroDiario.periodo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Última actualización:</span>
                    <span className="font-medium">{bookData.libroDiario.lastUpdate}</span>
                  </div>
                  <div className="flex space-x-2 pt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditBook({
                      id: 'diario',
                      name: 'Libro Diario',
                      type: 'diario',
                      period: selectedPeriod,
                      status: 'active',
                      entries: bookData.libroDiario.transactions,
                      companyId: companyId
                    })}>
                      <Edit className="h-4 w-4 mr-1" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteBook('diario')}>
                      <Trash2 className="h-4 w-4 mr-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Libro Mayor */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <span>Libro Mayor</span>
                  </CardTitle>
                  <Badge className="bg-green-100 text-green-800">Activo</Badge>
                </div>
                <CardDescription>
                  Resumen por cuentas con saldos acumulados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cuentas:</span>
                    <span className="font-medium">{bookData.libroMayor.accounts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Período:</span>
                    <span className="font-medium">{bookData.libroMayor.periodo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance:</span>
                    <span className="font-medium text-green-600">{formatCurrency(bookData.libroMayor.balance)}</span>
                  </div>
                  <div className="flex space-x-2 pt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Balance General */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Scale className="h-5 w-5 text-purple-600" />
                    <span>Balance General</span>
                  </CardTitle>
                  <Badge className="bg-purple-100 text-purple-800">Activo</Badge>
                </div>
                <CardDescription>
                  Estado financiero de situación patrimonial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Activos:</span>
                    <span className="font-medium">{formatCurrency(bookData.balanceGeneral.activos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pasivos:</span>
                    <span className="font-medium">{formatCurrency(bookData.balanceGeneral.pasivos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Patrimonio:</span>
                    <span className="font-medium">{formatCurrency(bookData.balanceGeneral.patrimonio)}</span>
                  </div>
                  <div className="flex space-x-2 pt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estado de Resultados */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    <span>Estado de Resultados</span>
                  </CardTitle>
                  <Badge className="bg-orange-100 text-orange-800">Activo</Badge>
                </div>
                <CardDescription>
                  Resumen de ingresos, gastos y utilidad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ingresos:</span>
                    <span className="font-medium text-green-600">{formatCurrency(bookData.estadoResultados.ingresos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gastos:</span>
                    <span className="font-medium text-red-600">{formatCurrency(bookData.estadoResultados.gastos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Utilidad Neta:</span>
                    <span className="font-medium text-green-600">{formatCurrency(bookData.estadoResultados.utilidadNeta)}</span>
                  </div>
                  <div className="flex space-x-2 pt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Libro de Compras */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-red-600" />
                    <span>Libro de Compras</span>
                  </CardTitle>
                  <Badge className="bg-red-100 text-red-800">Activo</Badge>
                </div>
                <CardDescription>
                  Registro de compras y crédito fiscal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Compras:</span>
                    <span className="font-medium">{formatCurrency(bookData.libroCompras.compras)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Crédito Fiscal:</span>
                    <span className="font-medium">{formatCurrency(bookData.libroCompras.creditoFiscal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CF Pendiente:</span>
                    <span className="font-medium">{formatCurrency(bookData.libroCompras.cfPendiente)}</span>
                  </div>
                  <div className="flex space-x-2 pt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Libro de Ventas */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Libro de Ventas</span>
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-800">Activo</Badge>
                </div>
                <CardDescription>
                  Registro de ventas y débito fiscal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ventas:</span>
                    <span className="font-medium">{formatCurrency(bookData.libroVentas.ventas)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Débito Fiscal:</span>
                    <span className="font-medium">{formatCurrency(bookData.libroVentas.debitoFiscal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">DF Pendiente:</span>
                    <span className="font-medium">{formatCurrency(bookData.libroVentas.dfPendiente)}</span>
                  </div>
                  <div className="flex space-x-2 pt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acciones Globales */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones de Libros Contables</CardTitle>
              <CardDescription>
                Operaciones masivas para todos los libros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="flex items-center space-x-2">
                  <Printer className="h-4 w-4" />
                  <span>Imprimir Todos los Libros</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Exportar Todo (ZIP)</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Configurar Períodos</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Reportes */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Reportes Financieros</CardTitle>
                <div className="flex space-x-2">
                  <Button>
                    <Download className="h-4 w-4" />
                    Exportar Balance General
                  </Button>
                  <Button>
                    <Download className="h-4 w-4" />
                    Exportar Estado de Resultados
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Reportes Financieros</h3>
                <p className="text-gray-600 mb-4">
                  Los reportes financieros estarán disponibles próximamente
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-20 flex-col space-y-2">
                    <Scale className="h-6 w-6" />
                    <span>Balance General</span>
                  </Button>
                  <Button className="h-20 flex-col space-y-2">
                    <TrendingUp className="h-6 w-6" />
                    <span>Estado de Resultados</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    {/* Modal para Editar Transacción */}
    {showTransactionDialog && editingTransaction && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            {editingTransaction?.id && !!transactions.find(t => t.id === editingTransaction?.id) 
              ? "Editar Transacción" 
              : "Nueva Transacción"}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={editingTransaction?.date || ''}
                  onChange={(e) => editingTransaction && setEditingTransaction({...editingTransaction, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Tipo de Comprobante</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={editingTransaction?.voucherType || ''}
                  onChange={(e) => editingTransaction && setEditingTransaction({...editingTransaction, voucherType: e.target.value})}
                >
                  <option value="INGRESO">Ingreso</option>
                  <option value="EGRESO">Egreso</option>
                  <option value="DIARIO">Diario</option>
                  <option value="AJUSTE">Ajuste</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={editingTransaction?.description || ''}
                onChange={(e) => editingTransaction && setEditingTransaction({...editingTransaction, description: e.target.value})}
                placeholder="Descripción de la transacción"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número de Comprobante</Label>
                <Input
                  type="number"
                  value={editingTransaction?.voucherNumber || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => editingTransaction && setEditingTransaction({...editingTransaction, voucherNumber: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Monto Total</Label>
                <Input
                  type="number"
                  value={editingTransaction?.totalAmount || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => editingTransaction && setEditingTransaction({...editingTransaction, totalAmount: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Detalles de Partida Doble</h4>
              {editingTransaction?.entries?.map((entry, index) => (
                <div key={index} className="border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <Label>Cuenta</Label>
                      <select
                        className="w-full p-1 border rounded text-sm"
                        value={entry.accountCode}
                        onChange={(e) => {
                          if (!editingTransaction) return;
                          const account = accounts.find(a => a.code === e.target.value);
                          const newEntries = [...editingTransaction.entries];
                          newEntries[index] = {
                            ...entry,
                            accountCode: e.target.value,
                            accountName: account?.name || ""
                          };
                          setEditingTransaction({...editingTransaction, entries: newEntries});
                        }}
                      >
                        <option value="">Seleccionar cuenta</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Descripción</Label>
                      <Input
                        value={entry.accountName}
                        readOnly
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Débito</Label>
                      <Input
                        type="number"
                        value={entry.debit}
                        onChange={(e) => {
                          if (!editingTransaction) return;
                          const newEntries = [...editingTransaction.entries];
                          newEntries[index] = {...entry, debit: parseFloat(e.target.value)};
                          setEditingTransaction({...editingTransaction, entries: newEntries});
                        }}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label>Crédito</Label>
                      <Input
                        type="number"
                        value={entry.credit}
                        onChange={(e) => {
                          if (!editingTransaction) return;
                          const newEntries = [...editingTransaction.entries];
                          newEntries[index] = {...entry, credit: parseFloat(e.target.value)};
                          setEditingTransaction({...editingTransaction, entries: newEntries});
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => editingTransaction && handleSaveTransaction(editingTransaction)}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Modal para Editar Cuenta */}
    {showAccountDialog && editingAccount && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            {editingAccount?.id && accounts.find(a => a.id === editingAccount?.id) 
              ? "Editar Cuenta" 
              : "Nueva Cuenta"}
          </h3>
          <div className="space-y-4">
            <div>
              <Label>Código de Cuenta</Label>
              <Input
                value={editingAccount?.code || ''}
                onChange={(e) => editingAccount && setEditingAccount({...editingAccount, code: e.target.value})}
                placeholder="Ej: 1101"
              />
            </div>
            <div>
              <Label>Nombre de Cuenta</Label>
              <Input
                value={editingAccount?.name || ''}
                onChange={(e) => editingAccount && setEditingAccount({...editingAccount, name: e.target.value})}
                placeholder="Ej: Caja"
              />
            </div>
            <div>
              <Label>Tipo de Cuenta</Label>
              <select
                className="w-full p-2 border rounded"
                value={editingAccount?.type || 'Activo Corriente'}
                onChange={(e) => editingAccount && setEditingAccount({...editingAccount, type: e.target.value})}
              >
                <option value="Activo Corriente">Activo Corriente</option>
                <option value="Activo No Corriente">Activo No Corriente</option>
                <option value="Pasivo Corriente">Pasivo Corriente</option>
                <option value="Pasivo No Corriente">Pasivo No Corriente</option>
                <option value="Patrimonio">Patrimonio</option>
                <option value="Ingreso">Ingreso</option>
                <option value="Gasto">Gasto</option>
              </select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={editingAccount?.description || ''}
                onChange={(e) => editingAccount && setEditingAccount({...editingAccount, description: e.target.value})}
                placeholder="Descripción opcional"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => editingAccount && handleSaveAccount(editingAccount)}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Modal para Gestionar Libro Contable */}
    {showBookDialog && editingBook && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            {editingBook?.id && accountingBooks.find(b => b.id === editingBook?.id) 
              ? "Editar Libro Contable" 
              : "Nuevo Libro Contable"}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre del Libro</Label>
                <Input
                  value={editingBook?.name || ''}
                  onChange={(e) => editingBook && setEditingBook({...editingBook, name: e.target.value})}
                  placeholder="Ej: Libro Diario Enero 2024"
                />
              </div>
              <div>
                <Label>Tipo de Libro</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={editingBook?.type || 'diario'}
                  onChange={(e) => editingBook && setEditingBook({...editingBook, type: e.target.value as any})}
                >
                  <option value="diario">Libro Diario</option>
                  <option value="mayor">Libro Mayor</option>
                  <option value="balance">Balance General</option>
                  <option value="inventarios">Libro de Inventarios y Balances</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Período</Label>
                <Input
                  type="month"
                  value={editingBook?.period || ''}
                  onChange={(e) => editingBook && setEditingBook({...editingBook, period: e.target.value})}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={editingBook?.status || 'pending'}
                  onChange={(e) => editingBook && setEditingBook({...editingBook, status: e.target.value as any})}
                >
                  <option value="pending">Pendiente</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label>Archivo del Libro</Label>
              <div className="space-y-2">
                {editingBook.fileName ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">{editingBook.fileName}</span>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="mb-2"
                    />
                    {uploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {editingBook.entries !== undefined && (
              <div>
                <Label>Entradas Registradas</Label>
                <div className="p-3 bg-gray-50 rounded">
                  <span className="text-2xl font-bold">{editingBook.entries}</span>
                  <p className="text-sm text-gray-600">entradas en el libro</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowBookDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => editingBook && handleSaveBook(editingBook)}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    )}

      {/* Popup Confirmar Eliminar - estilo proyecto */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              ¿Eliminar archivo?
            </DialogTitle>
            <DialogDescription>
              {fileToDelete ? `¿Eliminar "${fileToDelete.fileName}"? Se borrarán también las transacciones de los libros correspondientes. Esta acción no se puede deshacer.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button onClick={confirmDeleteFile} className="bg-red-600 hover:bg-red-700">Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup Éxito/Error - estilo proyecto */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {successMessage.includes("Error") ? "Error" : "Operación exitosa"}
            </DialogTitle>
            <DialogDescription>{successMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)} className="bg-green-600 hover:bg-green-700">Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}