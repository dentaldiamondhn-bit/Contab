"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Database,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Table,
  Search,
  Building2,
  Loader2
} from "lucide-react";

interface Tenant {
  id: string;
  businessName: string;
  tenantCode: string;
}

interface TableData {
  count: number;
  rows: any[];
  error?: string;
}

const TABLE_LABELS: Record<string, string> = {
  Account: 'Cuentas Contables',
  JournalEntry: 'Asientos Contables',
  Transaction: 'Transacciones',
  Invoice: 'Facturas',
  invoice: 'Facturas (legacy)',
  InvoiceItem: 'Detalles de Factura',
  invoiceitem: 'Detalles de Factura (legacy)',
  customer: 'Clientes',
  product: 'Productos',
  warehouse: 'Almacenes',
  inventory_movement: 'Movimientos de Inventario',
  bankaccount: 'Cuentas Bancarias',
  cai: 'CAI',
  talonarios: 'Talonarios',
  chart_of_accounts: 'Plan de Cuentas',
  User: 'Usuarios',
  users: 'Usuarios (legacy)',
};

const TABLE_ORDER = [
  'User', 'users', 'Account', 'chart_of_accounts', 'JournalEntry', 'Transaction',
  'Invoice', 'invoice', 'InvoiceItem', 'invoiceitem', 'customer', 'product',
  'warehouse', 'inventory_movement', 'bankaccount', 'cai', 'talonarios'
];

const USER_COLUMNS = ['email', 'firstname', 'lastname', 'role', 'isactive', 'lastloginat', 'emailverified'];

export default function SupportDatabasesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tableData, setTableData] = useState<Record<string, TableData>>({});
  const [loadingData, setLoadingData] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [searchTable, setSearchTable] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoadingTenants(true);
      const response = await fetch('/api/tenants-api', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.tenants || []);
        setTenants(list.map((t: any) => ({
          id: t.id,
          businessName: t.businessName || t.businessname || t.business_name || '',
          tenantCode: t.tenantCode || t.tenant_code || t.id,
        })));
      }
    } catch (error) {
      console.warn('Error loading tenants:', error);
    } finally {
      setLoadingTenants(false);
    }
  };

  const loadTenantData = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setTableData({});
    setExpandedTables(new Set());
    setLoadingData(true);
    try {
      const response = await fetch(`/api/support/tenants-db?tenantId=${tenant.id}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setTableData(data.tables || {});
      }
    } catch (error) {
      console.warn('Error loading tenant data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const sortedTables = Object.keys(tableData).sort((a, b) => {
    const idxA = TABLE_ORDER.indexOf(a);
    const idxB = TABLE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const filteredTables = sortedTables.filter(name => {
    if (!searchTable) return true;
    const label = TABLE_LABELS[name] || name;
    return name.toLowerCase().includes(searchTable.toLowerCase()) ||
           label.toLowerCase().includes(searchTable.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6 bg-purple-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/support/panel"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="h-6 w-6 text-purple-600" />
              Bases de Datos
            </h1>
            <p className="text-gray-600 mt-1">Explorar datos de cada tenant</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tenant List */}
        <Card className="border-purple-200 shadow-sm">
          <CardHeader className="pb-3 bg-purple-50/50 border-b border-purple-100">
            <CardTitle className="text-purple-900 text-sm">Empresas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTenants ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => loadTenantData(tenant)}
                    className={`w-full text-left p-3 border-b border-purple-100 hover:bg-purple-50 transition-colors ${
                      selectedTenant?.id === tenant.id ? 'bg-purple-100 border-l-4 border-l-purple-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{tenant.businessName}</p>
                        <p className="text-xs text-gray-500">{tenant.tenantCode}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Viewer */}
        <div className="lg:col-span-3">
          {!selectedTenant ? (
            <Card className="border-purple-200 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Database className="h-12 w-12 mb-4 text-purple-300" />
                <p className="text-lg">Selecciona una empresa para ver sus datos</p>
                <p className="text-sm text-gray-400">{tenants.length} empresas disponibles</p>
              </CardContent>
            </Card>
          ) : loadingData ? (
            <Card className="border-purple-200 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
                <p className="text-gray-600">Cargando datos de {selectedTenant.businessName}...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Tenant Info */}
              <Card className="border-purple-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedTenant.businessName}</p>
                        <p className="text-sm text-gray-500">{selectedTenant.tenantCode}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {filteredTables.length} tablas · {Object.values(tableData).reduce((sum, t) => sum + t.count, 0)} registros
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Table Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar tabla..."
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>

              {/* Tables */}
              {filteredTables.map((tableName) => {
                const data = tableData[tableName];
                const isExpanded = expandedTables.has(tableName);
                const label = TABLE_LABELS[tableName] || tableName;

                return (
                  <Card key={tableName} className="border-purple-200 shadow-sm">
                    <div
                      onClick={() => toggleTable(tableName)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-purple-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-purple-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-purple-500" />
                        )}
                        <Table className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500">{tableName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {data.error ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Error</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                            {data.count} {data.count === 1 ? 'registro' : 'registros'}
                          </span>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-purple-100">
                        {data.error ? (
                          <div className="p-4 text-sm text-red-600 bg-red-50">
                            {data.error}
                          </div>
                        ) : data.rows.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500 text-center bg-gray-50">
                            Sin datos
                          </div>
                        ) : (
                          <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-purple-50 sticky top-0">
                                <tr>
                                  {(tableName === 'User' || tableName === 'users'
                                    ? Object.keys(data.rows[0]).filter(col => USER_COLUMNS.includes(col))
                                    : Object.keys(data.rows[0])
                                  ).map((col) => (
                                    <th
                                      key={col}
                                      className="px-3 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider border-b border-purple-100"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-purple-100">
                                {data.rows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-purple-50/50">
                                    {(tableName === 'User' || tableName === 'users'
                                      ? Object.entries(row).filter(([col]) => USER_COLUMNS.includes(col))
                                      : Object.entries(row)
                                    ).map(([col, val], colIdx) => (
                                      <td
                                        key={colIdx}
                                        className="px-3 py-2 text-gray-700 border-b border-purple-50 max-w-[200px] truncate"
                                        title={String(val ?? '')}
                                      >
                                        {val === null ? (
                                          <span className="text-gray-400 italic">null</span>
                                        ) : typeof val === 'boolean' ? (
                                          val ? '✓' : '✗'
                                        ) : typeof val === 'object' ? (
                                          <span className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                            {JSON.stringify(val).substring(0, 50)}
                                          </span>
                                        ) : (
                                          String(val)
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
