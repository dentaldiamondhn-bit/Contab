"use client";

import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Eye,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  LayoutGrid
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import InvoiceStats from "@/components/dashboard/InvoiceStats";
import InventoryStats from "@/components/dashboard/InventoryStats";

export default function DashboardPage() {
  const { currentTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('todos');

  // TODO: Fetch companies from database
  // const [companies, setCompanies] = useState([]);
  // useEffect(() => { fetchCompanies().then(setCompanies); }, []);
  
  // Empty initially - data will come from database after onboarding
  const companiesManaged: any[] = [];

  // Obtener industrias únicas para el filtro
  const industries = [...new Set(companiesManaged.map(company => company.industry))];

  // Filtrar empresas según búsqueda e industria seleccionada
  const filteredCompanies = companiesManaged.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.rtn.includes(searchTerm);
    const matchesIndustry = selectedIndustry === 'todos' || company.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  const totalStats = {
    totalRevenue: filteredCompanies.reduce((sum, company) => sum + company.monthlyRevenue, 0),
    totalExpenses: filteredCompanies.reduce((sum, company) => sum + company.monthlyExpenses, 0),
    totalTransactions: filteredCompanies.reduce((sum, company) => sum + company.transactions, 0),
    totalCompanies: filteredCompanies.length
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Selecciona una Empresa</h3>
          <p className="text-gray-500">Por favor selecciona una empresa para ver el dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Dashboard */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Contable</h1>
        <p className="text-gray-600">
          Gestión contable para <span className="font-medium">{currentTenant.businessName}</span>
        </p>
        {currentTenant.businessRTN && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              RTN: {currentTenant.businessRTN}
            </Badge>
            {currentTenant.industry && (
              <Badge variant="secondary" className="text-xs">
                {currentTenant.industry}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              {filteredCompanies.length} Empresas Asignadas
            </Badge>
          </div>
        )}
      </div>

      {/* Estadísticas de Facturación */}
      {currentTenant && (
        <InvoiceStats tenantId={currentTenant.id} />
      )}

      {/* Estadísticas de Inventario */}
      {currentTenant && (
        <InventoryStats tenantId={currentTenant.id} />
      )}

      {/* Filtros de Empresas */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o RTN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filtro por Industria */}
          <div className="flex-1">
            <select
              value={selectedIndustry}
              onChange={(e) => {
                setSelectedIndustry(e.target.value);
                setSearchTerm(''); // Limpiar búsqueda al cambiar filtro
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todas las Industrias</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Limpiar Filtros */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedIndustry('todos');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>

        {/* Resultados del Filtro */}
        <div className="text-sm text-gray-600">
          Mostrando {filteredCompanies.length} de {companiesManaged.length} empresas
          {searchTerm && `con búsqueda: "${searchTerm}"`}
          {selectedIndustry !== 'todos' && `industria: ${selectedIndustry}`}
        </div>
      </div>

      {/* Tarjetas de Resumen General - Simplificadas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredCompanies.length} empresas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalStats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Mes en curso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalStats.totalRevenue - totalStats.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totalStats.totalRevenue - totalStats.totalExpenses) / totalStats.totalRevenue * 100).toFixed(1)}% margen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {filteredCompanies.length} empresas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empresas Filtradas */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Empresas 
            {searchTerm && `(filtrado: "${searchTerm}")`}
            {selectedIndustry !== 'todos' && `(industria: ${selectedIndustry})`}
          </h2>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Empresa
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <CardDescription className="text-xs">
                      RTN: {company.rtn} • {company.industry}
                    </CardDescription>
                  </div>
                  <Badge className={company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {company.status === 'active' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Métricas Financieras Esenciales */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Ingresos</p>
                    <p className="font-bold text-green-600">{formatCurrency(company.monthlyRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Gastos</p>
                    <p className="font-bold text-red-600">{formatCurrency(company.monthlyExpenses)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Utilidad</p>
                    <p className="font-bold text-blue-600">
                      {formatCurrency(company.monthlyRevenue - company.monthlyExpenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Transacciones</p>
                    <p className="font-bold">{company.transactions}</p>
                  </div>
                </div>

                {/* Crecimiento */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-gray-500">Crecimiento</span>
                  <div className="flex items-center">
                    {company.growth > 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={`font-bold ${company.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(company.growth)}%
                    </span>
                  </div>
                </div>

                {/* Acciones Rápidas - Simplificadas */}
                <div className="flex space-x-2">
                  <Link href={`/companies/${company.id}`}>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </Link>
                  <Link href={`/companies/${company.id}/accounting`}>
                    <Button variant="outline" size="sm" className="flex-1">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Contabilidad
                    </Button>
                  </Link>
                  <Link href={`/companies/${company.id}/modules`}>
                    <Button variant="outline" size="sm" className="flex-1 bg-blue-50 hover:bg-blue-100 border-blue-200">
                      <LayoutGrid className="h-4 w-4 mr-1 text-blue-600" />
                      Módulos
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Mensaje si no hay resultados */}
          {filteredCompanies.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                {searchTerm || selectedIndustry !== 'todos' ? 'No se encontraron empresas' : 'No hay empresas asignadas'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? `No hay empresas que coincidan con "${searchTerm}"`
                  : 'No hay empresas asignadas al contador'
                }
              </p>
              {!searchTerm && selectedIndustry === 'todos' && (
                <Button 
                  onClick={() => setSelectedIndustry('todos')}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primera Empresa
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sección de Enlaces Rápidos a Contabilidad */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Accesos a Contabilidad</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/transactions">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Transacciones</h3>
                <p className="text-sm text-gray-600">Gestionar asientos contables</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/reports">
              <CardContent className="p-6 text-center">
                <PieChart className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Reportes Financieros</h3>
                <p className="text-sm text-gray-600">Estado de resultados, balance</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/multi-currency">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Multi-Divisa</h3>
                <p className="text-sm text-gray-600">HNL/USD y tasas de cambio</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/import-export">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Importar/Exportar</h3>
                <p className="text-sm text-gray-600">Archivos Excel y CSV</p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
