'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
import WarehousesManager from '@/components/inventory/WarehousesManager';
import TransfersManager from '@/components/inventory/TransfersManager';
import InventoryVariations from '@/components/inventory/InventoryVariations';
import ProductPhotoUploader from '@/components/inventory/ProductPhotoUploader';
import LocationsManager from '@/components/inventory/LocationsManager';
import * as XLSX from 'xlsx';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  History,
  Plus,
  Search,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  DollarSign,
  BarChart3,
  X,
  ChevronLeft,
  Upload,
  Download,
  FileText,
  Menu,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Product {
  id: string;
  code: string;
  name: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  current_cost: number;
  price: number;
  product_type: 'product' | 'consumable';
  valuation_method: string;
  alert_type?: string;
  alert_message?: string;
  lot_number?: string;
  expiration_date?: string;
  location?: string;
  location_id?: string;
  image_url?: string;
}

interface InventoryAlert {
  id: string;
  code: string;
  name: string;
  current_stock: number;
  min_stock: number;
  alert_type: string;
  alert_message: string;
  expiration_date?: string;
}

interface InventoryMovement {
  id: string;
  product: { code: string; name: string };
  movement_type: 'IN' | 'OUT';
  movement_reason: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  unit_cost: number;
  created_at: string;
  reference_number?: string;
}

export default function InventoryPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalValue: 0,
    expiringSoon: 0,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message?: string; errors?: { row: number; message: string }[] } | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'Unidad',
    unitPrice: '',
    currentCost: '',
    totalCost: '',
    currentStock: '0',
    minStock: '0',
    maxStock: '0',
    taxRate: '15',
    productType: 'product',
    valuationMethod: 'weighted_average',
    warehouseId: '',
    location: '',
    locationId: '',
    imageUrl: '',
    isService: false,
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    unitPrice: '',
    currentCost: '',
    minStock: '',
    maxStock: '',
    taxRate: '15',
    productType: 'product',
    valuationMethod: 'weighted_average',
    location: '',
    locationId: '',
    imageUrl: '',
    isActive: true,
  });

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: '',
      unitPrice: product.price?.toString() || '',
      currentCost: product.current_cost?.toString() || '',
      minStock: product.min_stock?.toString() || '0',
      maxStock: product.max_stock?.toString() || '0',
      taxRate: '15',
      productType: product.product_type || 'product',
      valuationMethod: product.valuation_method || 'weighted_average',
      location: product.location || '',
      locationId: product.location_id || '',
      imageUrl: product.image_url || '',
      isActive: true,
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const res = await fetch(`/api/inventory/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          name: editForm.name,
          description: editForm.description,
          unitPrice: editForm.unitPrice ? parseFloat(editForm.unitPrice) : 0,
          currentCost: editForm.currentCost ? parseFloat(editForm.currentCost) : 0,
          minStock: editForm.minStock ? parseInt(editForm.minStock) : 0,
          maxStock: editForm.maxStock ? parseInt(editForm.maxStock) : 0,
          taxRate: editForm.taxRate ? parseInt(editForm.taxRate) : 15,
          productType: editForm.productType,
          valuationMethod: editForm.valuationMethod,
          location: editForm.location,
          locationId: editForm.locationId,
          imageUrl: editForm.imageUrl,
          isActive: editForm.isActive,
        }),
      });

      if (res.ok) {
        alert('Producto actualizado exitosamente');
        setShowEditModal(false);
        setEditingProduct(null);
        loadInventoryData();
      } else {
        const errorData = await res.json();
        console.error('Update error:', errorData);
        alert('Error: ' + (errorData.details || errorData.error || 'No se pudo actualizar el producto'));
      }
    } catch (error) {
      alert('Error al actualizar producto');
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      
      // Cargar productos con alertas - tenant-aware
      const [productsRes, alertsRes, movementsRes] = await Promise.all([
        fetch(`/api/inventory/products?tenantId=${companyId}`),
        fetch(`/api/inventory/alerts?tenantId=${companyId}`),
        fetch(`/api/inventory/movements?tenantId=${companyId}&limit=50`),
      ]);

      const productsData = productsRes.ok ? await productsRes.json() : [];
      const alertsData = alertsRes.ok ? await alertsRes.json() : { alerts: [] };
      const movementsData = movementsRes.ok ? await movementsRes.json() : [];

      setProducts(productsData);
      setAlerts(alertsData.alerts);
      setMovements(movementsData);

      // Cargar ubicaciones para el formulario de producto
      try {
        const locationsRes = await fetch(`/api/companies/${companyId}/inventory/locations`);
        const locationsBody = await locationsRes.json();
        if (locationsRes.ok && locationsBody.success) {
          setLocations(locationsBody.data.locations || []);
        }
      } catch {
        /* sin ubicaciones maestras */
      }

      // Calcular estadísticas
      const totalValue = productsData.reduce(
        (sum: number, p: Product) => sum + (p.current_stock * p.current_cost),
        0
      );

      setStats({
        totalProducts: productsData.length,
        lowStock: alertsData.summary?.low_stock || 0,
        totalValue,
        expiringSoon: alertsData.summary?.expiring || 0,
      });
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'low_stock':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expiring':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getMovementIcon = (type: string) => {
    return type === 'IN' ? (
      <ArrowUp className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-red-600" />
    );
  };

  const loadWarehouses = async () => {
    try {
      const res = await fetch('/api/inventory/warehouses');
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
        if (data.length > 0) {
          setNewProduct(prev => ({ ...prev, warehouseId: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const TEMPLATE_HEADERS = [
    'code',
    'name',
    'description',
    'unit',
    'unit_price',
    'current_cost',
    'current_stock',
    'min_stock',
    'max_stock',
    'tax_rate',
    'product_type',
    'valuation_method',
    'location',
    'is_service',
  ];

  const TEMPLATE_SAMPLE = [
    'PRD-001',
    'Producto de Ejemplo',
    'Descripción del producto',
    'Unidad',
    '250',
    '150',
    '50',
    '10',
    '100',
    '15',
    'product',
    'weighted_average',
    'Estante A',
    'false',
  ];

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  };

  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    const rows = [TEMPLATE_HEADERS, TEMPLATE_SAMPLE];
    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      XLSX.writeFile(wb, 'plantilla_productos.xlsx');
      return;
    }
    const escapeCsv = (v: string) => {
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = '\ufeff' + rows.map(row => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportResult({ success: true, message: 'Seleccione un archivo para continuar' });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('tenantId', companyId);
      const res = await fetch('/api/inventory/products/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({
          success: true,
          message: data.message || 'Importación completada',
          errors: data.errors || [],
        });
        loadInventoryData();
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportResult(null);
        }, 1200);
      } else {
        setImportResult({ success: false, message: data.error || 'Error al importar el archivo' });
      }
    } catch (error) {
      console.error('Frontend: Import exception:', error);
      setImportResult({ success: false, message: 'Error al importar el archivo' });
    } finally {
      setImporting(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      const res = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newProduct.code,
          name: newProduct.name,
          description: newProduct.description,
          unit: newProduct.unit,
          unitPrice: parseFloat(newProduct.unitPrice),
          currentCost: parseFloat(newProduct.currentCost),
          currentStock: parseInt(newProduct.currentStock),
          minStock: parseInt(newProduct.minStock),
          maxStock: parseInt(newProduct.maxStock),
          taxRate: parseInt(newProduct.taxRate),
          productType: newProduct.productType,
          valuationMethod: newProduct.valuationMethod,
          warehouseId: newProduct.warehouseId,
          location: newProduct.location,
          locationId: newProduct.locationId,
          imageUrl: newProduct.imageUrl,
          isService: newProduct.isService,
        }),
      });

      if (res.ok) {
        alert('Producto creado exitosamente');
        setShowCreateModal(false);
        setNewProduct({
          code: '',
          name: '',
          description: '',
          unit: 'Unidad',
          unitPrice: '',
          currentCost: '',
          totalCost: '',
          currentStock: '0',
          minStock: '0',
          maxStock: '0',
          taxRate: '15',
          productType: 'product',
          valuationMethod: 'weighted_average',
          warehouseId: warehouses[0]?.id || '',
          location: '',
          locationId: '',
          imageUrl: '',
          isService: false,
        });
        loadInventoryData();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo crear el producto'));
      }
    } catch (error) {
      alert('Error al crear producto');
    }
  };

  useEffect(() => {
    if (showCreateModal) {
      loadWarehouses();
    }
  }, [showCreateModal]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Inventario</h1>
          <p className="text-gray-500">Control de existencias, movimientos y valuación</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/companies/${companyId}/inventory/dashboard`)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-3">
                <Menu className="w-4 h-4 mr-2" />
                Menú
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-64" forceMount>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/modules`)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Menú Principal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/inventory/dashboard`)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/inventory/kardex`)}>
                <History className="w-4 h-4 mr-2" />
                Kardex
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateModal(true)} className="bg-cyan-50 text-cyan-700 hover:bg-cyan-100">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openImportModal}>
                <Upload className="w-4 h-4 mr-2" />
                Subir Archivo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadTemplate('xlsx')}>
                <FileText className="w-4 h-4 mr-2" />
                Plantilla Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')}>
                <FileText className="w-4 h-4 mr-2" />
                Plantilla CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Package className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Productos</p>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold">{stats.lowStock}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Valor Total</p>
              <p className="text-2xl font-bold">L {stats.totalValue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Por Vencer</p>
              <p className="text-2xl font-bold">{stats.expiringSoon}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="warehouses">Almacenes</TabsTrigger>
          <TabsTrigger value="locations">Ubicaciones</TabsTrigger>
          <TabsTrigger value="transfers">Traslados</TabsTrigger>
          <TabsTrigger value="variations">Variaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Inventario de Productos</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Foto
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Unidad
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Ubicación
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      Costo
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      Valor Total
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {getFilteredProducts().map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{product.code}</td>
                      <td className="px-4 py-3 text-sm">{product.name}</td>
                      <td className="px-4 py-3 text-sm">{product.unit || 'Unidad'}</td>
                      <td className="px-4 py-3 text-sm">{product.location || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {product.current_stock} / {product.min_stock} min
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        L {product.current_cost?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        L {(product.current_stock * product.current_cost).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.alert_type && product.alert_type !== 'normal' ? (
                          <Badge className={getAlertColor(product.alert_type)}>
                            {product.alert_message}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            OK
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(product)}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Alertas de Inventario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay alertas pendientes
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.alert_type === 'low_stock'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">
                            {alert.code} - {alert.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {alert.alert_message}
                          </p>
                          <p className="text-sm mt-1">
                            Stock actual: <strong>{alert.current_stock}</strong> / Mínimo:{' '}
                            <strong>{alert.min_stock}</strong>
                          </p>
                          {alert.expiration_date && (
                            <p className="text-sm mt-1 text-red-600">
                              Vence: {new Date(alert.expiration_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={
                            alert.alert_type === 'low_stock'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {alert.alert_type === 'low_stock' ? 'Stock Bajo' : 'Por Vencer'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5" />
                Últimos Movimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      Stock Anterior
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      Stock Nuevo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.map((movement) => {
                    const product = products.find((p: any) => p.id === (movement as any).product_id);
                    return (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{product?.name || 'Producto #' + (movement as any).product_id?.slice(0, 8)}</div>
                        <div className="text-gray-500 text-xs">{product?.code || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getMovementIcon(movement.movement_type)}
                          <span className="text-sm">
                            {movement.movement_type === 'IN' ? 'Entrada' : 'Salida'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{movement.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {movement.stock_before}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {movement.stock_after}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <WarehousesManager companyId={companyId} />
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <LocationsManager companyId={companyId} />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <TransfersManager companyId={companyId} />
        </TabsContent>

        <TabsContent value="variations" className="space-y-4">
          <InventoryVariations companyId={companyId} />
        </TabsContent>
      </Tabs>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Productos desde Archivo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                Suba un archivo <strong>CSV</strong> o <strong>Excel (.xlsx / .xls)</strong> con los productos.
                Requiere la columna <code className="font-mono text-xs bg-muted px-1 rounded">name</code>. El{' '}
                <code className="font-mono text-xs bg-muted px-1 rounded">code</code> es opcional (se autogenera
                como PROD-xxx). Los códigos ya existentes se omiten automáticamente. Si ingresa stock inicial,
                se registra el movimiento de entrada correspondiente.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-500">Descargue la plantilla para ver el formato:</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate('xlsx')}>
                  <Download className="w-4 h-4 mr-2" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate('csv')}>
                  <Download className="w-4 h-4 mr-2" /> CSV
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Archivo</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportResult(null);
                }}
              />
            </div>

            {importResult && (
              <Alert variant={importResult.success ? 'default' : 'destructive'}>
                <AlertDescription>
                  {importResult.message}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto text-sm">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="text-xs">Fila {err.row > 0 ? err.row : '—'}: {err.message}</div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Cerrar</Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Product Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nuevo Producto
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Foto del Producto</Label>
              <ProductPhotoUploader
                imageUrl={newProduct.imageUrl}
                tenantId={companyId}
                onImageUrlChange={(url) => setNewProduct({ ...newProduct, imageUrl: url })}
              />
            </div>

            <div className="space-y-2">
              <Label>Código (Auto-generado si se deja vacío)</Label>
              <Input
                value={newProduct.code}
                onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                placeholder="Se generará automáticamente (PROD-001, PROD-002...)"
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Nombre del producto"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Descripción</Label>
              <Input
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>

            <div className="space-y-2">
              <Label>Unidad de Medida *</Label>
              <select
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="Unidad">Unidad</option>
                <option value="Unidades">Unidades</option>
                <option value="Caja">Caja</option>
                <option value="Cajas">Cajas</option>
                <option value="Paquete">Paquete</option>
                <option value="Paquetes">Paquetes</option>
                <option value="Galón">Galón</option>
                <option value="Galones">Galones</option>
                <option value="Litro">Litro</option>
                <option value="Litros">Litros</option>
                <option value="Kilogramo">Kilogramo</option>
                <option value="Kilogramos">Kilogramos</option>
                <option value="Gramo">Gramo</option>
                <option value="Gramos">Gramos</option>
                <option value="Metro">Metro</option>
                <option value="Metros">Metros</option>
                <option value="Par">Par</option>
                <option value="Pares">Pares</option>
                <option value="Docena">Docena</option>
                <option value="Docenas">Docenas</option>
                <option value="Botella">Botella</option>
                <option value="Botellas">Botellas</option>
                <option value="Tubo">Tubo</option>
                <option value="Tubos">Tubos</option>
                <option value="Frasco">Frasco</option>
                <option value="Frascos">Frascos</option>
                <option value="Bolsa">Bolsa</option>
                <option value="Bolsas">Bolsas</option>
                <option value="Rollo">Rollo</option>
                <option value="Rollos">Rollos</option>
                <option value="Servicio">Servicio</option>
                <option value="Hora">Hora</option>
                <option value="Día">Día</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Stock Inicial *</Label>
              <Input
                type="number"
                value={newProduct.currentStock}
                onChange={(e) => {
                  const stock = e.target.value;
                  const total = parseFloat(newProduct.totalCost) || 0;
                  const units = parseInt(stock) || 0;
                  const unitPrice = units > 0 ? (total / units).toFixed(2) : '';
                  setNewProduct({
                    ...newProduct,
                    currentStock: stock,
                    unitPrice: unitPrice,
                    currentCost: unitPrice,
                  });
                }}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Costo Total (L) *</Label>
              <Input
                type="number"
                value={newProduct.totalCost}
                onChange={(e) => {
                  const total = e.target.value;
                  const units = parseInt(newProduct.currentStock) || 0;
                  const totalNum = parseFloat(total) || 0;
                  const unitPrice = units > 0 ? (totalNum / units).toFixed(2) : '';
                  setNewProduct({
                    ...newProduct,
                    totalCost: total,
                    unitPrice: unitPrice,
                    currentCost: unitPrice,
                  });
                }}
                placeholder="Costo total de la compra"
              />
            </div>

            <div className="space-y-2">
              <Label>Precio Unitario (L) - Auto-calculado</Label>
              <Input
                type="number"
                value={newProduct.unitPrice}
                onChange={(e) => setNewProduct({ ...newProduct, unitPrice: e.target.value, currentCost: e.target.value })}
                placeholder="Se calcula: Costo Total / Stock"
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Costo Unitario (L) - Auto-calculado</Label>
              <Input
                type="number"
                value={newProduct.currentCost}
                onChange={(e) => setNewProduct({ ...newProduct, currentCost: e.target.value, unitPrice: e.target.value })}
                placeholder="Se calcula: Costo Total / Stock"
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Stock Mínimo</Label>
              <Input
                type="number"
                value={newProduct.minStock}
                onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Stock Máximo</Label>
              <Input
                type="number"
                value={newProduct.maxStock}
                onChange={(e) => setNewProduct({ ...newProduct, maxStock: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>ISV (%)</Label>
              <Input
                type="number"
                value={newProduct.taxRate}
                onChange={(e) => setNewProduct({ ...newProduct, taxRate: e.target.value })}
                placeholder="15"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Producto</Label>
              <Select
                value={newProduct.productType}
                onValueChange={(value) => setNewProduct({ ...newProduct, productType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Producto (Reventa)</SelectItem>
                  <SelectItem value="consumable">Suministro (Consumo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Método de Valuación</Label>
              <Select
                value={newProduct.valuationMethod}
                onValueChange={(value) => setNewProduct({ ...newProduct, valuationMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weighted_average">Costo Promedio Ponderado</SelectItem>
                  <SelectItem value="fifo">PEPS (FIFO)</SelectItem>
                  <SelectItem value="specific">Costo Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bodega</Label>
              <Select
                value={newProduct.warehouseId}
                onValueChange={(value) => setNewProduct({ ...newProduct, warehouseId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar bodega" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ubicación</Label>
              {locations.length > 0 ? (
                <Select
                  value={newProduct.locationId}
                  onValueChange={(value) => {
                    const loc = locations.find((l) => l.id === value);
                    setNewProduct({
                      ...newProduct,
                      locationId: value,
                      location: loc ? loc.name : '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                        {l.aisle ? ` — ${l.aisle}` : ''}
                        {l.shelf ? ` / ${l.shelf}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Ej: Estante A, Pasillo 1, Bodega principal..."
                  value={newProduct.location}
                  onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProduct}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Editar Producto
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Foto del Producto</Label>
              <ProductPhotoUploader
                imageUrl={editForm.imageUrl}
                tenantId={companyId}
                productId={editingProduct?.id}
                onImageUrlChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
              />
            </div>

            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={editingProduct?.code || ''} disabled className="bg-gray-100" />
            </div>

            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Nombre del producto"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Descripción</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>

            <div className="space-y-2">
              <Label>Precio Unitario (L)</Label>
              <Input
                type="number"
                value={editForm.unitPrice}
                onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Costo Actual (L)</Label>
              <Input
                type="number"
                value={editForm.currentCost}
                onChange={(e) => setEditForm({ ...editForm, currentCost: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Stock Mínimo</Label>
              <Input
                type="number"
                value={editForm.minStock}
                onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Stock Máximo</Label>
              <Input
                type="number"
                value={editForm.maxStock}
                onChange={(e) => setEditForm({ ...editForm, maxStock: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>ISV (%)</Label>
              <Input
                type="number"
                value={editForm.taxRate}
                onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })}
                placeholder="15"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Producto</Label>
              <Select
                value={editForm.productType}
                onValueChange={(value) => setEditForm({ ...editForm, productType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Producto (Reventa)</SelectItem>
                  <SelectItem value="consumable">Suministro (Consumo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Método de Valuación</Label>
              <Select
                value={editForm.valuationMethod}
                onValueChange={(value) => setEditForm({ ...editForm, valuationMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weighted_average">Costo Promedio Ponderado</SelectItem>
                  <SelectItem value="fifo">PEPS (FIFO)</SelectItem>
                  <SelectItem value="specific">Costo Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ubicación</Label>
              {locations.length > 0 ? (
                <Select
                  value={editForm.locationId}
                  onValueChange={(value) => {
                    const loc = locations.find((l) => l.id === value);
                    setEditForm({
                      ...editForm,
                      locationId: value,
                      location: loc ? loc.name : '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                        {l.aisle ? ` — ${l.aisle}` : ''}
                        {l.shelf ? ` / ${l.shelf}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Ej: Estante A, Pasillo 1, Bodega principal..."
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateProduct}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
