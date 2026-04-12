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
  Upload
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
      
      // Datos mock para empresas
      const mockCompanies = {
        "1": {
          id: "1",
          business_name: "Dental Diamond Center",
          business_rtn: "08011999012345",
          industry: "Servicios Profesionales",
          regimen_tributario: "Régimen General",
          actividad_economica: "Consultoría Dental",
          direccion_fiscal: "Colonia Palmira, Tegucigalpa, Honduras",
          telefono_fiscal: "+504 2234-5678",
          email_fiscal: "contacto@dentaldiamond.com",
          is_active: true,
          created_at: "2024-01-15T10:30:00Z",
          _count: {
            polizas: 156,
            accounts: 45,
            talonarios: 8
          }
        },
        "2": {
          id: "2",
          business_name: "Clínica Médica San José",
          business_rtn: "08011999067890",
          industry: "Salud",
          regimen_tributario: "Régimen General",
          actividad_economica: "Servicios Médicos",
          direccion_fiscal: "Boulevard Suyapa, Tegucigalpa, Honduras",
          telefono_fiscal: "+504 2255-6789",
          email_fiscal: "contacto@clinicamedica.com",
          is_active: true,
          created_at: "2024-01-20T14:15:00Z",
          _count: {
            polizas: 89,
            accounts: 32,
            talonarios: 5
          }
        },
        "3": {
          id: "3",
          business_name: "Laboratorio Dental Pro",
          business_rtn: "08011999054321",
          industry: "Salud",
          regimen_tributario: "Régimen General",
          actividad_economica: "Laboratorio Dental",
          direccion_fiscal: "Avenida Morazán, San Pedro Sula, Honduras",
          telefono_fiscal: "+504 2345-1234",
          email_fiscal: "info@labdentalpro.com",
          is_active: false,
          created_at: "2024-01-10T09:30:00Z",
          _count: {
            polizas: 0,
            accounts: 0,
            talonarios: 0
          }
        }
      };
      
      // Obtener datos de la empresa mock
      const companyData = mockCompanies[companyId as keyof typeof mockCompanies];
      if (companyData) {
        console.log("Empresa encontrada:", companyData.business_name);
        setCompany(companyData);
      } else {
        console.error("Empresa no encontrada para companyId:", companyId);
        throw new Error('Empresa no encontrada');
      }
      
      // Datos mock para transacciones
      const mockTransactions = [
        {
          id: "1",
          date: "2024-01-15",
          description: "Pago de servicios dentales",
          voucherType: "INGRESO",
          voucherNumber: 1001,
          totalAmount: 5000.00,
          currency: "HNL",
          entries: [
            {
              accountCode: "1101",
              accountName: "Caja",
              debit: 5000.00,
              credit: 0
            },
            {
              accountCode: "4101",
              accountName: "Ingresos por Servicios",
              debit: 0,
              credit: 5000.00
            }
          ]
        },
        {
          id: "2",
          date: "2024-01-16",
          description: "Compra de materiales dentales",
          voucherType: "EGRESO",
          voucherNumber: 2001,
          totalAmount: 2500.00,
          currency: "HNL",
          entries: [
            {
              accountCode: "5101",
              accountName: "Compras",
              debit: 2500.00,
              credit: 0
            },
            {
              accountCode: "1101",
              accountName: "Caja",
              debit: 0,
              credit: 2500.00
            }
          ]
        },
        {
          id: "3",
          date: "2024-01-17",
          description: "Ajuste de inventario",
          voucherType: "AJUSTE",
          voucherNumber: 3001,
          totalAmount: 500.00,
          currency: "HNL",
          entries: [
            {
              accountCode: "1201",
              accountName: "Inventario",
              debit: 500.00,
              credit: 0
            },
            {
              accountCode: "5102",
              accountName: "Ajustes de Inventario",
              debit: 0,
              credit: 500.00
            }
          ]
        }
      ];
      
      // Datos mock para cuentas
      const mockAccounts = [
        {
          id: "1",
          code: "1101",
          name: "Caja",
          type: "Activo Corriente",
          description: "Efectivo y equivalentes",
          is_active: true
        },
        {
          id: "2",
          code: "1201",
          name: "Inventario",
          type: "Activo Corriente",
          description: "Materiales y suministros",
          is_active: true
        },
        {
          id: "3",
          code: "2101",
          name: "Cuentas por Pagar",
          type: "Pasivo Corriente",
          description: "Deudas a corto plazo",
          is_active: true
        },
        {
          id: "4",
          code: "3101",
          name: "Capital Social",
          type: "Patrimonio",
          description: "Capital aportado por socios",
          is_active: true
        },
        {
          id: "5",
          code: "4101",
          name: "Ingresos por Servicios",
          type: "Ingreso",
          description: "Ingresos principales",
          is_active: true
        },
        {
          id: "6",
          code: "5101",
          name: "Compras",
          type: "Gasto",
          description: "Costo de ventas",
          is_active: true
        },
        {
          id: "7",
          code: "5102",
          name: "Ajustes de Inventario",
          type: "Gasto",
          description: "Ajustes y mermas",
          is_active: true
        }
      ];
      
      // Cargar datos reales de la base de datos primero
      console.log("Cargando datos reales de transacciones y cuentas...");
      
      const transactionsResponse = await fetch(`/api/accounting/transactions?tenantId=${companyId}`);
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
        console.log("Transacciones reales cargadas:", transactionsData.length);
      } else {
        console.log("Error cargando transacciones, usando datos mock");
        setTransactions(mockTransactions);
      }
      
      const accountsResponse = await fetch(`/api/accounting/accounts?tenantId=${companyId}`);
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setAccounts(accountsData);
        console.log("Cuentas reales cargadas:", accountsData.length);
      } else {
        console.log("Error cargando cuentas, usando datos mock");
        setAccounts(mockAccounts);
      }
      
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
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
    // Recargar transacciones
    loadCompanyData();
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
              <p className="font-medium">{company.regimen_tributario}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Actividad Económica</p>
              <p className="font-medium">{company.actividad_economica}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Dirección Fiscal</p>
              <p className="font-medium">{company.direccion_fiscal}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Teléfono Fiscal</p>
              <p className="font-medium">{company.telefono_fiscal}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email Fiscal</p>
              <p className="font-medium">{company.email_fiscal}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transacciones</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactions.length}</div>
                <p className="text-xs text-muted-foreground">
                  En el período seleccionado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cuentas</CardTitle>
                <Scale className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accounts.length}</div>
                <p className="text-xs text-muted-foreground">
                  Cuentas configuradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado</CardTitle>
                <Badge className={company.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {company.is_active ? "Activa" : "Inactiva"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {company.is_active ? "✅" : "❌"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estado fiscal actual
                </p>
              </CardContent>
            </Card>

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
    </>
  );
}