'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ChevronLeft, 
  Menu, 
  FileText, 
  ShoppingCart, 
  BarChart3, 
  Building2,
  CreditCard,
  PiggyBank,
  Activity,
  Target,
  AlertCircle,
  AlertTriangle,
  Plus,
  Download
} from 'lucide-react';

interface FinancialControlProps {
  params: Promise<{
    id: string;
  }>;
}

interface KPIData {
  occupancyRate: number;
  revenuePerUnit: number;
  cac: number;
  operatingMargin: number;
  cashFlow: number;
  inventoryTurnover: number;
  maintenanceCost: number;
  replacementFund: number;
}

interface FixedCosts {
  [key: string]: number;
  rent: number;
  salaries: number;
  insurance: number;
  internet: number;
  permits: number;
  utilities: number;
  maintenance: number;
}

interface VariableCosts {
  [key: string]: number;
  electricity: number;
  water: number;
  cleaning: number;
  materials: number;
  preventive: number;
}

interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}


export default function FinancialControlPage({ params }: FinancialControlProps) {
  const { id: companyId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [customKPIs, setCustomKPIs] = useState<any[]>([]);
  const [showAddKPI, setShowAddKPI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Functions to handle custom KPIs with real APIs
  const addCustomKPI = async (newKPI: any) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/custom-kpis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newKPI),
      });

      if (response.ok) {
        const result = await response.json();
        const newKPIs = [...customKPIs, result.data];
        setCustomKPIs(newKPIs);
        // Save to localStorage
        const storageKey = `customKPIs_${companyId}`;
        const userKPIs = newKPIs.filter(kpi => !['kpi-1', 'kpi-2', 'kpi-3'].includes(kpi.id));
        localStorage.setItem(storageKey, JSON.stringify(userKPIs));
        setShowAddKPI(false);
      } else {
        console.error('Failed to save custom KPI');
      }
    } catch (error) {
      console.error('Error saving custom KPI:', error);
    }
  };

  const deleteCustomKPI = async (id: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/custom-kpis?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const newKPIs = customKPIs.filter(kpi => kpi.id !== id);
        setCustomKPIs(newKPIs);
        // Update localStorage
        const storageKey = `customKPIs_${companyId}`;
        const userKPIs = newKPIs.filter(kpi => !['kpi-1', 'kpi-2', 'kpi-3'].includes(kpi.id));
        localStorage.setItem(storageKey, JSON.stringify(userKPIs));
      } else {
        console.error('Failed to delete custom KPI');
      }
    } catch (error) {
      console.error('Error deleting custom KPI:', error);
    }
  };

  // State for real data
  const [kpis, setKPIs] = useState<any>(null);
  const [fixedCosts, setFixedCosts] = useState<FixedCosts | null>(null);
  const [variableCosts, setVariableCosts] = useState<VariableCosts | null>(null);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [editingCosts, setEditingCosts] = useState(false);
  const [fixedCostsOriginal, setFixedCostsOriginal] = useState<FixedCosts | null>(null);
  const [variableCostsOriginal, setVariableCostsOriginal] = useState<VariableCosts | null>(null);
  const [showAddFixedCost, setShowAddFixedCost] = useState(false);
  const [showAddVariableCost, setShowAddVariableCost] = useState(false);
  const [newFixedCostName, setNewFixedCostName] = useState('');
  const [newFixedCostValue, setNewFixedCostValue] = useState(0);
  const [newVariableCostName, setNewVariableCostName] = useState('');
  const [newVariableCostValue, setNewVariableCostValue] = useState(0);
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([]);
  const [showRecords, setShowRecords] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{[key: string]: {dueDate: string, paid: boolean, paidDate?: string}}>({});
  const [replacementFund, setReplacementFund] = useState({ percentage: 2, currentAmount: 0 });
  const [editingFund, setEditingFund] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [editingUnits, setEditingUnits] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: '', revenue: 0, costs: 0, utilization: 0 });
  const [recordFilter, setRecordFilter] = useState<'all' | 'monthly' | 'quarterly' | 'yearly'>('all');
  const [overviewPeriod, setOverviewPeriod] = useState<'current' | 'monthly' | 'quarterly' | 'yearly'>('current');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Get record data based on selected period
  const getRecordData = () => {
    if (overviewPeriod === 'current' || !selectedRecord) {
      return {
        totalFixed: fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0,
        totalVariable: variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0,
        units: units.length,
        utilization: units.length > 0 ? Math.round(units.reduce((sum, u) => sum + u.utilization, 0) / units.length) : 0,
        revenue: units.reduce((sum, u) => sum + u.revenue, 0)
      };
    }
    return {
      totalFixed: selectedRecord.totalFixed || 0,
      totalVariable: selectedRecord.totalVariable || 0,
      units: selectedRecord.units || 0,
      utilization: units.length > 0 ? Math.round(units.reduce((sum, u) => sum + u.utilization, 0) / units.length) : 0,
      revenue: units.reduce((sum, u) => sum + u.revenue, 0)
    };
  };

  // Load monthly records from localStorage
  const loadMonthlyRecords = () => {
    const storageKey = `monthly_records_${companyId}`;
    const records = localStorage.getItem(storageKey);
    if (records) {
      setMonthlyRecords(JSON.parse(records));
    }
  };

  // Load payment status from localStorage
  const loadPaymentStatus = () => {
    const storageKey = `payment_status_${companyId}`;
    const status = localStorage.getItem(storageKey);
    if (status) {
      setPaymentStatus(JSON.parse(status));
    }
  };

  // Save payment status to localStorage
  const savePaymentStatus = (newStatus: {[key: string]: {dueDate: string, paid: boolean}}) => {
    const storageKey = `payment_status_${companyId}`;
    localStorage.setItem(storageKey, JSON.stringify(newStatus));
    setPaymentStatus(newStatus);
  };

  // Toggle payment status
  const togglePaymentStatus = (costKey: string) => {
    const current = paymentStatus[costKey] || { dueDate: '', paid: false };
    const newPaid = !current.paid;
    const newStatus = {
      ...paymentStatus,
      [costKey]: {
        ...current,
        paid: newPaid,
        paidDate: newPaid ? new Date().toISOString().split('T')[0] : undefined
      }
    };
    savePaymentStatus(newStatus);
  };

  // Update paid date for a cost
  const updatePaidDate = (costKey: string, date: string) => {
    const current = paymentStatus[costKey] || { dueDate: '', paid: false };
    const newStatus = {
      ...paymentStatus,
      [costKey]: {
        ...current,
        paidDate: date
      }
    };
    savePaymentStatus(newStatus);
  };

  // Update due date for a cost
  const updateDueDate = (costKey: string, date: string) => {
    const current = paymentStatus[costKey] || { dueDate: '', paid: false };
    const newStatus = {
      ...paymentStatus,
      [costKey]: {
        ...current,
        dueDate: date
      }
    };
    savePaymentStatus(newStatus);
  };

  // Load replacement fund from localStorage
  const loadReplacementFund = () => {
    const storageKey = `replacement_fund_${companyId}`;
    const fund = localStorage.getItem(storageKey);
    if (fund) {
      setReplacementFund(JSON.parse(fund));
    }
  };

  // Save replacement fund to localStorage
  const saveReplacementFund = () => {
    const storageKey = `replacement_fund_${companyId}`;
    localStorage.setItem(storageKey, JSON.stringify(replacementFund));
    setEditingFund(false);
  };

  // Load units from localStorage
  const loadUnits = () => {
    const storageKey = `units_${companyId}`;
    const savedUnits = localStorage.getItem(storageKey);
    if (savedUnits) {
      setUnits(JSON.parse(savedUnits));
    } else {
      // Default unit
      setUnits([{
        id: 'unit-1',
        name: 'Unidad Principal',
        revenue: 55000,
        costs: 35000,
        utilization: 85
      }]);
    }
  };

  // Save units to localStorage
  const saveUnits = () => {
    const storageKey = `units_${companyId}`;
    localStorage.setItem(storageKey, JSON.stringify(units));
    setEditingUnits(false);
  };

  // Add new unit
  const addUnit = () => {
    const unit = {
      id: `unit-${Date.now()}`,
      name: newUnit.name,
      revenue: newUnit.revenue,
      costs: newUnit.costs,
      utilization: newUnit.utilization
    };
    setUnits([...units, unit]);
    setNewUnit({ name: '', revenue: 0, costs: 0, utilization: 0 });
    setShowAddUnit(false);
  };

  // Remove unit
  const removeUnit = (id: string) => {
    setUnits(units.filter(u => u.id !== id));
  };

  // Update unit
  const updateUnit = (id: string, field: string, value: any) => {
    setUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  // Save current month record
  const saveMonthlyRecord = () => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    const quarterKey = `${now.getFullYear()}-Q${quarter}`;
    const yearKey = `${now.getFullYear()}`;

    const createRecord = (id: string, type: string) => ({
      id,
      type,
      date: now.toISOString(),
      fixedCosts: fixedCosts || {},
      variableCosts: variableCosts || {},
      totalFixed: fixedCosts ? Object.values(fixedCosts).reduce((sum: number, cost: number) => sum + cost, 0) : 0,
      totalVariable: variableCosts ? Object.values(variableCosts).reduce((sum: number, cost: number) => sum + cost, 0) : 0,
      totalMonthly: calculateBreakeEvenPoint(),
      kpis: kpis || {},
      units: units.length
    });

    const storageKey = `monthly_records_${companyId}`;
    const records = localStorage.getItem(storageKey);
    const allRecords = records ? JSON.parse(records) : [];

    // Save monthly record
    const monthlyRecord = createRecord(monthKey, 'monthly');
    const existingMonthlyIndex = allRecords.findIndex((r: any) => r.id === monthKey && r.type === 'monthly');
    if (existingMonthlyIndex >= 0) {
      allRecords[existingMonthlyIndex] = monthlyRecord;
    } else {
      allRecords.push(monthlyRecord);
    }

    // Save quarterly record
    const quarterlyRecord = createRecord(quarterKey, 'quarterly');
    const existingQuarterlyIndex = allRecords.findIndex((r: any) => r.id === quarterKey && r.type === 'quarterly');
    if (existingQuarterlyIndex >= 0) {
      allRecords[existingQuarterlyIndex] = quarterlyRecord;
    } else {
      allRecords.push(quarterlyRecord);
    }

    // Save yearly record
    const yearlyRecord = createRecord(yearKey, 'yearly');
    const existingYearlyIndex = allRecords.findIndex((r: any) => r.id === yearKey && r.type === 'yearly');
    if (existingYearlyIndex >= 0) {
      allRecords[existingYearlyIndex] = yearlyRecord;
    } else {
      allRecords.push(yearlyRecord);
    }

    localStorage.setItem(storageKey, JSON.stringify(allRecords));
    setMonthlyRecords(allRecords);
    alert('Registros guardados: mensual, trimestral y anual');
  };

  // Download record as CSV
  const downloadRecordCSV = (record: any) => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    let title = '';
    if (record.type === 'monthly') {
      const [year, month] = record.id.split('-');
      title = `${monthNames[parseInt(month) - 1]} ${year}`;
    } else if (record.type === 'quarterly') {
      const [year, quarter] = record.id.split('-');
      title = `${quarter} ${year}`;
    } else {
      title = `Anual ${record.id}`;
    }

    let csv = `Registro Financiero ${record.type === 'monthly' ? 'Mensual' : record.type === 'quarterly' ? 'Trimestral' : 'Anual'} - ${title}\n\n`;
    csv += 'Costos Fijos\n';
    Object.entries(record.fixedCosts).forEach(([key, value]) => {
      csv += `${key.replace(/_/g, ' ')},${value}\n`;
    });
    csv += `Total Fijos,${record.totalFixed}\n\n`;
    
    csv += 'Costos Variables\n';
    Object.entries(record.variableCosts).forEach(([key, value]) => {
      csv += `${key.replace(/_/g, ' ')},${value}\n`;
    });
    csv += `Total Variables,${record.totalVariable}\n\n`;
    
    csv += `Total Mensual,${record.totalMonthly}\n`;
    csv += `Unidades,${record.units || 0}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro_${record.type}_${record.id}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Delete a record
  const deleteRecord = (recordId: string, recordType: string) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      const storageKey = `monthly_records_${companyId}`;
      const updatedRecords = monthlyRecords.filter(r => !(r.id === recordId && r.type === recordType));
      localStorage.setItem(storageKey, JSON.stringify(updatedRecords));
      setMonthlyRecords(updatedRecords);
    }
  };

  useEffect(() => {
    loadMonthlyRecords();
    loadPaymentStatus();
    loadReplacementFund();
    loadUnits();
  }, [companyId]);

  // Auto-save at end of month
  useEffect(() => {
    const checkAndAutoSave = () => {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const isLastDay = now.getDate() === lastDayOfMonth;
      const hour = now.getHours();
      
      // Auto-save on last day of month after 6 PM
      if (isLastDay && hour >= 18) {
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const storageKey = `monthly_records_${companyId}`;
        const records = localStorage.getItem(storageKey);
        const allRecords = records ? JSON.parse(records) : [];
        
        // Check if already saved for this month
        const alreadySaved = allRecords.some((r: any) => r.id === monthKey);
        
        if (!alreadySaved && (fixedCosts || variableCosts)) {
          saveMonthlyRecord();
        }
      }
    };

    // Check every hour
    const interval = setInterval(checkAndAutoSave, 60 * 60 * 1000);
    checkAndAutoSave(); // Check immediately on mount
    
    return () => clearInterval(interval);
  }, [companyId, fixedCosts, variableCosts, kpis]);

  // Load financial data from APIs
  useEffect(() => {
    const loadFinancialData = async () => {
      try {
        setLoading(true);
        
        // Load KPIs
        const kpisResponse = await fetch(`/api/companies/${companyId}/kpis`);
        if (kpisResponse.ok) {
          const kpisData = await kpisResponse.json();
          setKPIs(kpisData);
        }

        // Load Costs
        const costsResponse = await fetch(`/api/companies/${companyId}/costs`);
        if (costsResponse.ok) {
          const costsData = await costsResponse.json();
          // Try to load from localStorage first
          const storageKey = `costs_${companyId}`;
          const savedCosts = localStorage.getItem(storageKey);
          if (savedCosts) {
            const parsed = JSON.parse(savedCosts);
            setFixedCosts(parsed.fixed);
            setVariableCosts(parsed.variable);
          } else {
            setFixedCosts(costsData.fixed);
            setVariableCosts(costsData.variable);
          }
        }

        // Load Cash Flow
        const cashFlowResponse = await fetch(`/api/companies/${companyId}/cashflow`);
        if (cashFlowResponse.ok) {
          const cashFlowData = await cashFlowResponse.json();
          setCashFlowData(cashFlowData);
        }

        // Load Custom KPIs from API and merge with localStorage
        const customKPIsResponse = await fetch(`/api/companies/${companyId}/custom-kpis`);
        if (customKPIsResponse.ok) {
          const apiKPIs = await customKPIsResponse.json();
          // Load user-added KPIs from localStorage
          const storageKey = `customKPIs_${companyId}`;
          const savedKPIs = localStorage.getItem(storageKey);
          const userKPIs = savedKPIs ? JSON.parse(savedKPIs) : [];
          // Combine API KPIs (defaults) with user-added KPIs
          setCustomKPIs([...apiKPIs, ...userKPIs]);
        }

      } catch (error) {
        console.error('Error loading financial data:', error);
        setError('Error al cargar los datos financieros. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadFinancialData();
  }, [companyId]);

  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(amount);
  };

  const saveCosts = async () => {
    try {
      const storageKey = `costs_${companyId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        fixed: fixedCosts,
        variable: variableCosts
      }));

      setEditingCosts(false);
      setFixedCostsOriginal(null);
      setVariableCostsOriginal(null);
    } catch (error) {
      console.error('Error saving costs:', error);
    }
  };

  const addFixedCost = () => {
    if (newFixedCostName && newFixedCostValue >= 0) {
      const key = newFixedCostName.toLowerCase().replace(/\s+/g, '_');
      setFixedCosts({ ...fixedCosts!, [key]: newFixedCostValue });
      setNewFixedCostName('');
      setNewFixedCostValue(0);
      setShowAddFixedCost(false);
    }
  };

  const removeFixedCost = (key: string) => {
    const { [key]: _, ...rest } = fixedCosts!;
    setFixedCosts(rest as FixedCosts);
  };

  const addVariableCost = () => {
    if (newVariableCostName && newVariableCostValue >= 0) {
      const key = newVariableCostName.toLowerCase().replace(/\s+/g, '_');
      setVariableCosts({ ...variableCosts!, [key]: newVariableCostValue });
      setNewVariableCostName('');
      setNewVariableCostValue(0);
      setShowAddVariableCost(false);
    }
  };

  const removeVariableCost = (key: string) => {
    const { [key]: _, ...rest } = variableCosts!;
    setVariableCosts(rest as VariableCosts);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Cargando datos financieros...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const calculateBreakeEvenPoint = () => {
    if (!fixedCosts || !variableCosts) return 0;
    const totalFixedCosts = Object.values(fixedCosts).reduce((sum: number, cost: number) => sum + cost, 0);
    const totalVariableCosts = Object.values(variableCosts).reduce((sum: number, cost: number) => sum + cost, 0);
    return totalFixedCosts + totalVariableCosts;
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-600';
    if (margin >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCashFlowColor = (flow: number) => {
    if (flow > 0) return 'text-green-600';
    return 'text-red-600';
  };

  // Dynamic menu based on current page
  const getMenuItems = () => {
    const currentPage = pathname.split('/').pop() || '';
    
    if (currentPage === 'financial-control') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
        { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
        { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
        { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
        { icon: FileText, label: 'Reportes', href: `/companies/${companyId}/reports` },
        { icon: Target, label: 'Configuración', href: `/companies/${companyId}/settings` }
      ];
    }
    
    if (currentPage === 'purchases') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
        { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
        { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
        { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` },
        { icon: Plus, label: 'Nueva Compra', href: `/companies/${companyId}/purchases/new` }
      ];
    }
    
    if (currentPage === 'suppliers') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
        { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
        { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
        { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` },
        { icon: Plus, label: 'Nuevo Proveedor', href: `/companies/${companyId}/suppliers/new` }
      ];
    }
    
    if (currentPage === 'accounts-payable') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
        { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
        { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
        { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` },
        { icon: Plus, label: 'Nueva Compra', href: `/companies/${companyId}/purchases/new` }
      ];
    }
    
    if (currentPage === 'dashboard') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
        { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
        { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
        { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` },
        { icon: FileText, label: 'Exportar Datos', href: `/companies/${companyId}/purchases/export` }
      ];
    }
    
    // Default menu
    return [
      { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
      { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
      { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
      { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
      { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
      { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` }
    ];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Control Financiero</h1>
          <p className="text-gray-500">Gestión financiera y análisis de rendimiento</p>
        </div>
        
        {/* Single Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 px-3">
              <Menu className="w-4 h-4 mr-2" />
              Menú
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="w-64" forceMount>
            {getMenuItems().map((item, index) => {
              const IconComponent = item.icon;
              return (
                <DropdownMenuItem key={index} onClick={() => router.push(item.href)}>
                  <IconComponent className="w-4 h-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="costs">Costos</TabsTrigger>
          <TabsTrigger value="cashflow">Flujo de Caja</TabsTrigger>
          <TabsTrigger value="units">Unidades</TabsTrigger>
          <TabsTrigger value="records">Registros</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Period Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Período:</label>
                  <select 
                    value={overviewPeriod} 
                    onChange={(e) => {
                      setOverviewPeriod(e.target.value as any);
                      setSelectedRecord(null);
                    }}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="current">Actual</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                
                {overviewPeriod !== 'current' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Seleccionar:</label>
                    <select 
                      value={selectedRecord?.id || ''} 
                      onChange={(e) => {
                        const record = monthlyRecords.find(r => r.id === e.target.value && r.type === overviewPeriod);
                        setSelectedRecord(record || null);
                      }}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="">
                        {monthlyRecords.filter(r => r.type === overviewPeriod).length === 0 
                          ? `No hay registros ${overviewPeriod === 'monthly' ? 'mensuales' : overviewPeriod === 'quarterly' ? 'trimestrales' : 'anuales'}`
                          : 'Seleccionar...'}
                      </option>
                      {monthlyRecords
                        .filter(r => r.type === overviewPeriod)
                        .sort((a, b) => b.id.localeCompare(a.id))
                        .map(record => {
                          let label = record.id;
                          if (record.type === 'monthly') {
                            const [year, month] = record.id.split('-');
                            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                            label = `${monthNames[parseInt(month) - 1]} ${year}`;
                          } else if (record.type === 'quarterly') {
                            label = record.id.replace('-', ' ');
                          } else {
                            label = `Anual ${record.id}`;
                          }
                          return (
                            <option key={record.id} value={record.id}>{label}</option>
                          );
                        })}
                    </select>
                    {monthlyRecords.filter(r => r.type === overviewPeriod).length === 0 && (
                      <span className="text-xs text-orange-500">
                        Guarda registros primero
                      </span>
                    )}
                  </div>
                )}

                {overviewPeriod !== 'current' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setOverviewPeriod('current');
                      setSelectedRecord(null);
                    }}
                  >
                    Ver Actual
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tasa de Ocupación</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getOccupancyColor(getRecordData().utilization)}>
                    {getRecordData().utilization}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {overviewPeriod === 'current' ? 'Promedio actual' : `Período: ${overviewPeriod === 'monthly' ? 'Mensual' : overviewPeriod === 'quarterly' ? 'Trimestral' : 'Anual'}`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(getRecordData().revenue)}
                </div>
                <p className="text-xs text-gray-500">
                  {getRecordData().units} unidades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Margen Operativo</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getMarginColor(
                    (() => {
                      const data = getRecordData();
                      const totalRevenue = data.revenue;
                      const totalCosts = data.totalFixed + data.totalVariable;
                      return totalRevenue > 0 ? Math.round(((totalRevenue - totalCosts) / totalRevenue) * 100) : 0;
                    })()
                  )}>
                    {(() => {
                      const data = getRecordData();
                      const totalRevenue = data.revenue;
                      const totalCosts = data.totalFixed + data.totalVariable;
                      return totalRevenue > 0 ? Math.round(((totalRevenue - totalCosts) / totalRevenue) * 100) : 0;
                    })()}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">Objetivo: 25-40%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Costos Totales</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(getRecordData().totalFixed + getRecordData().totalVariable)}
                </div>
                <p className="text-xs text-gray-500">
                  Fijos: {formatCurrency(getRecordData().totalFixed)} | Variables: {formatCurrency(getRecordData().totalVariable)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breake Even Point */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Punto de Equilibrio</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Costos Fijos:</span>
                  <span className="font-medium">{formatCurrency(
                    fixedCosts ? Object.values(fixedCosts).reduce((sum: number, cost: number) => sum + cost, 0) : 0
                  )}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costos Variables:</span>
                  <span className="font-medium">{formatCurrency(
                    variableCosts ? Object.values(variableCosts).reduce((sum: number, cost: number) => sum + cost, 0) : 0
                  )}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Mensual:</span>
                  <span className="font-medium">{formatCurrency(calculateBreakeEvenPoint())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Punto Equilibrio:</span>
                  <span className="font-medium text-green-600">
                    {Math.round(calculateBreakeEvenPoint() / (kpis?.revenuePerUnit || 1))} días
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Indicadores Clave de Rendimiento</h2>
            <Button onClick={() => setShowAddKPI(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Agregar KPI
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Indicadores Clave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tasa de Ocupación</span>
                  <Badge variant={kpis?.occupancyRate >= 70 ? 'default' : 'secondary'}>
                    {kpis?.occupancyRate || 0}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${kpis?.occupancyRate || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Rentabilidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Margen Operativo</span>
                  <Badge variant={kpis?.operatingMargin >= 25 ? 'default' : 'secondary'}>
                    {kpis?.operatingMargin || 0}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${Math.min(kpis?.operatingMargin || 0, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Eficiencia del Espacio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ingreso por Cubículo</span>
                  <span className="font-medium">{formatCurrency(kpis?.revenuePerUnit || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Costos por Cubículo</span>
                  <span className="font-medium">{formatCurrency((kpis?.revenuePerUnit || 0) * 0.65)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Utilización</span>
                  <span className="font-medium">{kpis?.occupancyRate || 0}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Custom KPIs */}
            {customKPIs.map((kpi) => (
              <Card key={kpi.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-bold">{kpi.name}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deleteCustomKPI(kpi.id)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Valor Actual</span>
                    <Badge variant={kpi.value >= kpi.target ? 'default' : 'secondary'}>
                      {kpi.value} {kpi.unit}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Objetivo</span>
                    <span className="font-medium">{kpi.target} {kpi.unit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${kpi.value >= kpi.target ? 'bg-green-500' : 'bg-yellow-500'} h-2 rounded-full`}
                      style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((kpi.value / kpi.target) * 100)}% del objetivo
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add KPI Modal */}
          {showAddKPI && (
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Agregar Nuevo KPI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nombre del KPI</label>
                    <input 
                      type="text" 
                      id="kpi-name"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: ROI Marketing"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Unidad</label>
                    <select 
                      id="kpi-unit"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="%">Porcentaje (%)</option>
                      <option value="HNL">Lempiras (HNL)</option>
                      <option value="USD">Dólares (USD)</option>
                      <option value="días">Días</option>
                      <option value="horas">Horas</option>
                      <option value="unidades">Unidades</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Valor Actual</label>
                    <input 
                      type="number" 
                      id="kpi-value"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Objetivo</label>
                    <input 
                      type="number" 
                      id="kpi-target"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddKPI(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => {
                      const name = (document.getElementById('kpi-name') as HTMLInputElement).value;
                      const unit = (document.getElementById('kpi-unit') as HTMLSelectElement).value;
                      const value = parseFloat((document.getElementById('kpi-value') as HTMLInputElement).value) || 0;
                      const target = parseFloat((document.getElementById('kpi-target') as HTMLInputElement).value) || 0;
                      
                      if (name && value >= 0 && target > 0) {
                        addCustomKPI({ name, unit, value, target });
                      }
                    }}
                  >
                    Agregar KPI
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={saveMonthlyRecord}>
              Guardar Registro Mensual
            </Button>
            {editingCosts && (
              <>
                <Button variant="outline" onClick={() => setShowAddFixedCost(true)}>
                  + Costo Fijo
                </Button>
                <Button variant="outline" onClick={() => setShowAddVariableCost(true)}>
                  + Costo Variable
                </Button>
              </>
            )}
            <Button
              variant={editingCosts ? "destructive" : "default"}
              onClick={() => {
                if (editingCosts) {
                  setEditingCosts(false);
                  if (fixedCostsOriginal) setFixedCosts(fixedCostsOriginal);
                  if (variableCostsOriginal) setVariableCosts(variableCostsOriginal);
                  setShowAddFixedCost(false);
                  setShowAddVariableCost(false);
                } else {
                  setFixedCostsOriginal({ ...fixedCosts! });
                  setVariableCostsOriginal({ ...variableCosts! });
                  setEditingCosts(true);
                }
              }}
            >
              {editingCosts ? 'Cancelar' : 'Editar Costos'}
            </Button>
            {editingCosts && (
              <Button onClick={saveCosts}>Guardar Cambios</Button>
            )}
          </div>

          {/* Add Fixed Cost Form */}
          {showAddFixedCost && (
            <Card className="border-2 border-dashed">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Agregar Costo Fijo</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Nombre del costo"
                    value={newFixedCostName}
                    onChange={(e) => setNewFixedCostName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Monto"
                    value={newFixedCostValue || ''}
                    onChange={(e) => setNewFixedCostValue(parseFloat(e.target.value) || 0)}
                    className="w-32 px-3 py-2 border rounded"
                  />
                  <Button onClick={addFixedCost}>Agregar</Button>
                  <Button variant="outline" onClick={() => setShowAddFixedCost(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Variable Cost Form */}
          {showAddVariableCost && (
            <Card className="border-2 border-dashed">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Agregar Costo Variable</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Nombre del costo"
                    value={newVariableCostName}
                    onChange={(e) => setNewVariableCostName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Monto"
                    value={newVariableCostValue || ''}
                    onChange={(e) => setNewVariableCostValue(parseFloat(e.target.value) || 0)}
                    className="w-32 px-3 py-2 border rounded"
                  />
                  <Button onClick={addVariableCost}>Agregar</Button>
                  <Button variant="outline" onClick={() => setShowAddVariableCost(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Costos Fijos Mensuales</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {editingCosts ? (
                  <div className="space-y-3">
                    {Object.entries(fixedCosts || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 capitalize w-32">{key.replace(/_/g, ' ')}:</span>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setFixedCosts({ ...fixedCosts!, [key]: parseFloat(e.target.value) || 0 })}
                          className="w-28 px-2 py-1 border rounded text-right"
                        />
                        <input
                          type="date"
                          value={paymentStatus[key]?.dueDate || ''}
                          onChange={(e) => updateDueDate(key, e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                          title="Fecha de pago"
                        />
                        <button
                          onClick={() => removeFixedCost(key)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-4 gap-2 mb-2 text-sm font-medium text-gray-500">
                      <div>Concepto</div>
                      <div className="text-right">Monto</div>
                      <div>Fecha Pago</div>
                      <div className="text-center">Pagado</div>
                    </div>
                    {Object.entries(fixedCosts || {}).map(([key, value]) => {
                      const status = paymentStatus[key] || { dueDate: '', paid: false, paidDate: '' };
                      const isOverdue = status.dueDate && !status.paid && new Date(status.dueDate) < new Date();
                      return (
                        <div key={key} className={`border-b ${status.paid ? 'bg-green-50' : isOverdue ? 'bg-red-50' : ''}`}>
                          <div className="grid grid-cols-4 gap-2 items-center py-2">
                            <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-right font-medium">{formatCurrency(value)}</span>
                            <span className="text-sm text-gray-500">
                              {status.dueDate ? new Date(status.dueDate).toLocaleDateString('es-HN') : '-'}
                            </span>
                            <div className="text-center">
                              <input
                                type="checkbox"
                                checked={status.paid}
                                onChange={() => togglePaymentStatus(key)}
                                className="h-4 w-4 cursor-pointer"
                              />
                            </div>
                          </div>
                          {status.paid && (
                            <div className="grid grid-cols-4 gap-2 items-center pb-2">
                              <div></div>
                              <div></div>
                              <div className="col-span-2">
                                <label className="text-xs text-gray-500">Fecha de realización:</label>
                                <input
                                  type="date"
                                  value={status.paidDate || ''}
                                  onChange={(e) => updatePaidDate(key, e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total Fijos:</span>
                    <span className="text-blue-600">{formatCurrency(
                      fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0
                    )}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Pagados:</span>
                    <span className="text-green-600">
                      {Object.keys(fixedCosts || {}).filter(k => paymentStatus[k]?.paid).length} / {Object.keys(fixedCosts || {}).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Costos Variables</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {editingCosts ? (
                  <div className="space-y-3">
                    {Object.entries(variableCosts || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 capitalize w-32">{key.replace(/_/g, ' ')}:</span>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setVariableCosts({ ...variableCosts!, [key]: parseFloat(e.target.value) || 0 })}
                          className="w-28 px-2 py-1 border rounded text-right"
                        />
                        <input
                          type="date"
                          value={paymentStatus[`var_${key}`]?.dueDate || ''}
                          onChange={(e) => updateDueDate(`var_${key}`, e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                          title="Fecha de pago"
                        />
                        <button
                          onClick={() => removeVariableCost(key)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-4 gap-2 mb-2 text-sm font-medium text-gray-500">
                      <div>Concepto</div>
                      <div className="text-right">Monto</div>
                      <div>Fecha Pago</div>
                      <div className="text-center">Pagado</div>
                    </div>
                    {Object.entries(variableCosts || {}).map(([key, value]) => {
                      const status = paymentStatus[`var_${key}`] || { dueDate: '', paid: false, paidDate: '' };
                      const isOverdue = status.dueDate && !status.paid && new Date(status.dueDate) < new Date();
                      return (
                        <div key={key} className={`border-b ${status.paid ? 'bg-green-50' : isOverdue ? 'bg-red-50' : ''}`}>
                          <div className="grid grid-cols-4 gap-2 items-center py-2">
                            <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-right font-medium">{formatCurrency(value)}</span>
                            <span className="text-sm text-gray-500">
                              {status.dueDate ? new Date(status.dueDate).toLocaleDateString('es-HN') : '-'}
                            </span>
                            <div className="text-center">
                              <input
                                type="checkbox"
                                checked={status.paid}
                                onChange={() => togglePaymentStatus(`var_${key}`)}
                                className="h-4 w-4 cursor-pointer"
                              />
                            </div>
                          </div>
                          {status.paid && (
                            <div className="grid grid-cols-4 gap-2 items-center pb-2">
                              <div></div>
                              <div></div>
                              <div className="col-span-2">
                                <label className="text-xs text-gray-500">Fecha de realización:</label>
                                <input
                                  type="date"
                                  value={status.paidDate || ''}
                                  onChange={(e) => updatePaidDate(`var_${key}`, e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total Variables:</span>
                    <span className="text-blue-600">{formatCurrency(
                      variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0
                    )}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Pagados:</span>
                    <span className="text-green-600">
                      {Object.keys(variableCosts || {}).filter(k => paymentStatus[`var_${k}`]?.paid).length} / {Object.keys(variableCosts || {}).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total Summary */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-blue-800">Resumen de Costos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Costos Fijos:</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Costos Variables:</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0)}
                  </span>
                </div>
                <div className="border-t-2 border-blue-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800">TOTAL COSTOS MENSUALES:</span>
                    <span className="text-2xl font-bold text-red-600">
                      {formatCurrency(
                        (fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0) +
                        (variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold">Fondo de Reposición</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Porcentaje de ahorro mensual (%):</label>
                <input
                  type="number"
                  value={replacementFund.percentage}
                  onChange={(e) => setReplacementFund({ ...replacementFund, percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md"
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Ahorrado mensual:</label>
                <div className="px-3 py-2 bg-gray-50 rounded-md">
                  {formatCurrency((kpis?.revenuePerUnit || 0) * (replacementFund.percentage / 100))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Total estimado en 5 años:</label>
                <div className="px-3 py-2 bg-gray-50 rounded-md">
                  {formatCurrency((kpis?.revenuePerUnit || 0) * 12 * 5 * (replacementFund.percentage / 100))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Valor actual del fondo:</label>
                <input
                  type="number"
                  value={replacementFund.currentAmount}
                  onChange={(e) => setReplacementFund({ ...replacementFund, currentAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md"
                  min="0"
                />
              </div>
              <Button onClick={saveReplacementFund}>Guardar Cambios</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Flujo de Caja</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cashFlowData.map((item, index) => (
                  <div key={item.month} className="flex justify-between items-center pb-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{item.month}</div>
                      <div className="text-sm text-gray-500">
                        Ingresos: {formatCurrency(item.income)} | Egresos: {formatCurrency(item.expenses)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${item.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.netCashFlow)}
                      </div>
                      <div className={`text-xs text-gray-500 ${item.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Flujo acumulado: {formatCurrency(item.cumulativeCashFlow)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Resumen de Flujo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ingresos totales:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.income, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Egresos totales:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.expenses, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flujo neto:</span>
                  <span className={`font-medium ${cashFlowData.reduce((sum, item) => sum + item.netCashFlow, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.netCashFlow, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flujo acumulado:</span>
                  <span className={`font-medium ${cashFlowData[cashFlowData.length - 1]?.cumulativeCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cashFlowData[cashFlowData.length - 1]?.cumulativeCashFlow || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units Performance Tab */}
        <TabsContent value="units" className="space-y-6">
          {/* Cost Summary Card */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-blue-800">Costo por Unidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600">Costos Totales Mensuales</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(
                      (fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0) +
                      (variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0)
                    )}
                  </p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600">Cantidad de Unidades</p>
                  <p className="text-xl font-bold text-green-600">{units.length}</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600">Costo por Unidad</p>
                  <p className="text-xl font-bold text-red-600">
                    {units.length > 0 
                      ? formatCurrency(
                          ((fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0) +
                           (variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0)) / units.length
                        )
                      : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Rendimiento por Unidad</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddUnit(true)}>
                + Agregar Unidad
              </Button>
              <Button
                variant={editingUnits ? "destructive" : "default"}
                onClick={() => {
                  if (editingUnits) {
                    setEditingUnits(false);
                    loadUnits();
                  } else {
                    setEditingUnits(true);
                  }
                }}
              >
                {editingUnits ? 'Cancelar' : 'Editar'}
              </Button>
              {editingUnits && (
                <Button onClick={saveUnits}>Guardar</Button>
              )}
            </div>
          </div>

          {/* Add Unit Form */}
          {showAddUnit && (
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Agregar Nueva Unidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nombre</label>
                    <input 
                      type="text" 
                      value={newUnit.name}
                      onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Unidad 2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ingresos Mensuales</label>
                    <input 
                      type="number" 
                      value={newUnit.revenue}
                      onChange={(e) => setNewUnit({ ...newUnit, revenue: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Utilización (%)</label>
                    <input 
                      type="number" 
                      value={newUnit.utilization}
                      onChange={(e) => setNewUnit({ ...newUnit, utilization: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-500">
                      Costo asignado: {formatCurrency(
                        ((fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0) +
                         (variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0)) / ((units.length || 0) + 1)
                      )}
                      <div className="text-xs text-gray-400">(con {units.length + 1} unidades)</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addUnit}>Agregar</Button>
                  <Button variant="outline" onClick={() => setShowAddUnit(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Units List */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {units.map((unit) => (
                  <div key={unit.id} className="border rounded-lg p-4">
                    {editingUnits ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={unit.name}
                            onChange={(e) => updateUnit(unit.id, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-md"
                            placeholder="Nombre de la unidad"
                          />
                          <button
                            onClick={() => removeUnit(unit.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-600">Ingresos:</label>
                            <input
                              type="number"
                              value={unit.revenue}
                              onChange={(e) => updateUnit(unit.id, 'revenue', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Utilización (%):</label>
                            <input
                              type="number"
                              value={unit.utilization}
                              onChange={(e) => updateUnit(unit.id, 'utilization', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded"
                              min="0"
                              max="100"
                            />
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Costo asignado: {formatCurrency(
                            ((fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0) +
                             (variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0)) / (units.length || 1)
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{unit.name}</div>
                            <div className="text-sm text-gray-500">ID: {unit.id}</div>
                          </div>
                          <div className="text-right">
                            <Badge variant="default">{unit.utilization}% ocupación</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Ingresos:</span>
                            <div className="font-medium text-green-600">{formatCurrency(unit.revenue)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Costos (asignados):</span>
                            <div className="font-medium text-red-600">
                              {units.length > 0 
                                ? formatCurrency(
                                    ((fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0) +
                                     (variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0)) / units.length
                                  )
                                : formatCurrency(0)}
                            </div>
                            <div className="text-xs text-gray-400">Total / {units.length} unidades</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                          <div>
                            <span className="text-gray-600">Utilización:</span>
                            <div className="font-medium">{unit.utilization}%</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Beneficio:</span>
                            <div className="font-medium text-green-600">
                              {formatCurrency(unit.revenue - (
                                ((fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0) +
                                 (variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0)) / (units.length || 1)
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Registros Financieros</h2>
            <div className="flex gap-2">
              <select 
                value={recordFilter} 
                onChange={(e) => setRecordFilter(e.target.value as any)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="monthly">Mensuales</option>
                <option value="quarterly">Trimestrales</option>
                <option value="yearly">Anuales</option>
              </select>
              <Button onClick={saveMonthlyRecord}>Guardar Registros</Button>
            </div>
          </div>

          {monthlyRecords.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No hay registros</h3>
                <p className="text-gray-500">Guarda tus primeros registros en la tab de Costos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {monthlyRecords
                .filter(r => recordFilter === 'all' || r.type === recordFilter)
                .sort((a, b) => b.id.localeCompare(a.id))
                .map((record) => {
                  const typeLabel = record.type === 'monthly' ? 'Mensual' : 
                                   record.type === 'quarterly' ? 'Trimestral' : 'Anual';
                  const typeColor = record.type === 'monthly' ? 'bg-blue-100 text-blue-800' :
                                   record.type === 'quarterly' ? 'bg-purple-100 text-purple-800' :
                                   'bg-green-100 text-green-800';
                  
                  let displayTitle = record.id;
                  if (record.type === 'monthly') {
                    const [year, month] = record.id.split('-');
                    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    displayTitle = `${monthNames[parseInt(month) - 1]} ${year}`;
                  } else if (record.type === 'quarterly') {
                    const [year, quarter] = record.id.split('-');
                    displayTitle = `${quarter} ${year}`;
                  } else {
                    displayTitle = `Anual ${record.id}`;
                  }
                  
                  return (
                    <Card key={`${record.type}-${record.id}`}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{displayTitle}</CardTitle>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${typeColor}`}>
                              {typeLabel}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadRecordCSV(record)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Descargar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteRecord(record.id, record.type)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Costos Fijos</div>
                            <div className="text-lg font-bold text-blue-600">
                              {formatCurrency(record.totalFixed)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {Object.keys(record.fixedCosts).length} conceptos
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Costos Variables</div>
                            <div className="text-lg font-bold text-orange-600">
                              {formatCurrency(record.totalVariable)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {Object.keys(record.variableCosts).length} conceptos
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Total</div>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(record.totalMonthly)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Unidades: {record.units || 0}
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Guardado</div>
                            <div className="text-sm font-medium">
                              {new Date(record.date).toLocaleDateString('es-HN')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
