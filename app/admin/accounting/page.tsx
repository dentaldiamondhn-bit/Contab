'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, RefreshCw, CheckCircle, XCircle, Building2, HardDrive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TenantData {
  id: string;
  businessName: string;
  rtn: string;
  tenantCode: string;
  isActive: boolean;
  modules: string[];
  storageUsed?: string;
  storageBytes?: number;
  maxStorage?: number;
  totalRecords?: number;
}

interface AccountingBook {
  id: string;
  name: string;
  description: string;
}

export default function AdminAccountingPage() {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [books, setBooks] = useState<AccountingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accessRes, storageRes] = await Promise.all([
        fetch('/api/admin/accounting/access'),
        fetch('/api/admin/accounting/storage'),
      ]);
      const accessData = await accessRes.json();
      const storageData = await storageRes.json();

      if (accessRes.ok && storageRes.ok) {
        const storageMap: Record<string, any> = {};
        (storageData.tenants || []).forEach((s: any) => {
          storageMap[s.tenantId] = s;
        });

        const merged = (accessData.tenants || []).map((t: TenantData) => {
          const s = storageMap[t.id] || {};
          return {
            ...t,
            storageUsed: s.storageUsed || '0 B',
            storageBytes: s.storageBytes || 0,
            maxStorage: s.maxStorage || 100,
            totalRecords: s.totalRecords || 0,
          };
        });

        setTenants(merged);
        setBooks(accessData.books || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async (tenantId: string, moduleId: string, currentEnabled: boolean) => {
    const key = `${tenantId}-${moduleId}`;
    setToggling(key);
    try {
      const res = await fetch('/api/admin/accounting/access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, moduleId, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setTenants(prev =>
          prev.map(t => {
            if (t.id !== tenantId) return t;
            const newModules = currentEnabled
              ? t.modules.filter(m => m !== moduleId)
              : [...t.modules, moduleId];
            return { ...t, modules: newModules };
          })
        );
      }
    } catch (error) {
      console.error('Error toggling module:', error);
    } finally {
      setToggling(null);
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.rtn?.includes(searchTerm) ||
    t.tenantCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStats = () => {
    const total = tenants.length;
    const active = tenants.filter(t => t.isActive).length;
    const withAccounting = tenants.filter(t => t.modules.includes('ACCOUNTING')).length;
    const withFinancial = tenants.filter(t => t.modules.includes('FINANCIAL_STATEMENTS')).length;
    const withLegal = tenants.filter(t => t.modules.includes('LEGAL_BOOKS')).length;
    const totalStorageMB = tenants.reduce((sum, t) => sum + (t.storageBytes || 0), 0) / (1024 * 1024);
    return { total, active, withAccounting, withFinancial, withLegal, totalStorageMB };
  };

  const getStorageColor = (bytes: number, maxGB: number) => {
    const usedGB = bytes / (1024 * 1024 * 1024);
    const pct = (usedGB / maxGB) * 100;
    if (pct > 90) return 'text-red-600 font-bold';
    if (pct > 70) return 'text-yellow-600 font-medium';
    return 'text-green-600';
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Acceso a Libros Contables</h1>
          <p className="text-gray-600">Gestiona el acceso de cada tenant a los módulos contables</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Contabilidad Central</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{stats.withAccounting}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Estados Financieros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.withFinancial}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Libros Legales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.withLegal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Almacenamiento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{stats.totalStorageMB.toFixed(2)} MB</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, RTN o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Matriz de Acceso
          </CardTitle>
          <CardDescription>
            Activa o desactiva el acceso de cada tenant a los libros contables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Tenant</TableHead>
                  <TableHead className="min-w-[80px]">Estado</TableHead>
                  <TableHead className="min-w-[140px]">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-4 w-4" />
                      Almacenamiento
                    </div>
                  </TableHead>
                  {books.map(book => (
                    <TableHead key={book.id} className="text-center min-w-[140px]">
                      <div className="font-medium text-xs">{book.name}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map(tenant => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">{tenant.businessName}</div>
                          <div className="text-xs text-gray-500">{tenant.tenantCode}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.isActive ? 'default' : 'secondary'} className="text-xs">
                        {tenant.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className={getStorageColor(tenant.storageBytes || 0, tenant.maxStorage || 100)}>
                          {tenant.storageUsed}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">/ {tenant.maxStorage} GB</span>
                      </div>
                      <div className="text-xs text-gray-400">{tenant.totalRecords} registros</div>
                    </TableCell>
                    {books.map(book => {
                      const isEnabled = tenant.modules.includes(book.id);
                      const isToggling = toggling === `${tenant.id}-${book.id}`;
                      return (
                        <TableCell key={book.id} className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggle(tenant.id, book.id, isEnabled)}
                              disabled={isToggling || !tenant.isActive}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                isEnabled ? 'bg-cyan-600' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                }`}
                              />
                            </button>
                            {isEnabled ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-gray-300" />
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {filteredTenants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3 + books.length} className="text-center py-8 text-gray-500">
                      No se encontraron tenants
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
