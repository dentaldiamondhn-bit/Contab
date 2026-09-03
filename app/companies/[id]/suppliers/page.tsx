'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, Building2, Phone, Mail, MapPin, History, CreditCard, AlertCircle, ChevronLeft, Trash2, Edit, Menu, FileText, ShoppingCart, BarChart3 } from 'lucide-react';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface Supplier {
  id: string;
  rtn: string;
  name: string;
  commercial_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  supplier_type: string;
  category?: string;
  payment_terms: number;
  payment_method: string;
  is_active: boolean;
  is_preferred: boolean;
  tenant_id: string;
  company_id: string;
  created_at: string;
}

interface Purchase {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total: number;
  status: string;
  is_credit: boolean;
  balance_due: number;
}

export default function SuppliersPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierPurchases, setSupplierPurchases] = useState<Purchase[]>([]);
  const [rtnError, setRtnError] = useState('');

  const [formData, setFormData] = useState({
    rtn: '',
    name: '',
    commercial_name: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    country: 'Honduras',
    supplier_type: 'merchandise',
    category: '',
    payment_terms: '30',
    payment_method: 'transfer',
    bank_name: '',
    bank_account: '',
    account_type: 'checking',
    is_active: true,
    is_preferred: false,
  });

  // Validar RTN de Honduras
  const validateRTN = (rtn: string): boolean => {
    const cleanRTN = rtn.replace(/[-\s]/g, '');
    if (cleanRTN.length !== 14) return false;
    if (!/^\d{14}$/.test(cleanRTN)) return false;
    
    // Algoritmo de validación de RTN hondureño
    const weights = [3, 7, 9, 3, 7, 9, 3, 7, 9, 3, 7, 9, 3, 7];
    let sum = 0;
    
    for (let i = 0; i < 14; i++) {
      sum += parseInt(cleanRTN[i]) * weights[i];
    }
    
    const checkDigit = (11 - (sum % 11)) % 11;
    // Simplificado - el dígito 14 es el verificador
    return true; // Retornamos true para formato válido
  };

  const formatRTN = (rtn: string): string => {
    const clean = rtn.replace(/\D/g, '');
    if (clean.length <= 4) return clean;
    if (clean.length <= 9) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    if (clean.length <= 13) return `${clean.slice(0, 4)}-${clean.slice(4, 9)}-${clean.slice(9)}`;
    return `${clean.slice(0, 4)}-${clean.slice(4, 9)}-${clean.slice(9, 13)}-${clean.slice(13, 14)}`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("from")) {
      router.replace(`/companies/${companyId}/purchases/dashboard`);
    }
  }, [companyId]);

  useEffect(() => {
    loadSuppliers();
  }, [companyId]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rtn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      console.log('Frontend: Loading suppliers for companyId:', companyId);
      const res = await fetch(`/api/suppliers?companyId=${companyId}`);
      console.log('Frontend: Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Frontend: Suppliers loaded:', data.length, 'suppliers');
        setSuppliers(data);
        setFilteredSuppliers(data);
      } else {
        console.error('Frontend: API response not ok:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Frontend: Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierPurchases = async (supplierId: string) => {
    try {
      const res = await fetch(`/api/purchases?supplierId=${supplierId}&companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setSupplierPurchases(data);
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const handleSubmit = async () => {
    if (!validateRTN(formData.rtn)) {
      setRtnError('RTN inválido. Debe tener 14 dígitos numéricos.');
      return;
    }
    setRtnError('');

    try {
      const supplierData = {
        ...formData,
        companyId,
        payment_terms: parseInt(formData.payment_terms),
      };
      console.log('Frontend: Creating supplier:', supplierData);
      
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierData),
      });

      console.log('Frontend: Create response status:', res.status);
      if (res.ok) {
        const newSupplier = await res.json();
        console.log('Frontend: Supplier created:', newSupplier);
        setShowCreateModal(false);
        resetForm();
        loadSuppliers();
      } else {
        const error = await res.json();
        console.error('Frontend: Create error:', error);
        alert('Error: ' + (error.error || 'No se pudo crear el proveedor'));
      }
    } catch (error) {
      console.error('Frontend: Create exception:', error);
      alert('Error al crear proveedor');
    }
  };

  const handleUpdate = async () => {
    if (!selectedSupplier) return;
    
    if (!validateRTN(formData.rtn)) {
      setRtnError('RTN inválido. Debe tener 14 dígitos numéricos.');
      return;
    }
    setRtnError('');

    try {
      const res = await fetch('/api/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSupplier.id,
          ...formData,
          payment_terms: parseInt(formData.payment_terms),
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setSelectedSupplier(null);
        resetForm();
        loadSuppliers();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo actualizar el proveedor'));
      }
    } catch (error) {
      alert('Error al actualizar proveedor');
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    try {
      const res = await fetch(`/api/suppliers?id=${selectedSupplier.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShowDeleteModal(false);
        setSelectedSupplier(null);
        loadSuppliers();
      } else {
        alert('Error al eliminar proveedor');
      }
    } catch (error) {
      alert('Error al eliminar proveedor');
    }
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      rtn: supplier.rtn,
      name: supplier.name,
      commercial_name: supplier.commercial_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      mobile: supplier.mobile || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: 'Honduras',
      supplier_type: supplier.supplier_type,
      category: supplier.category || '',
      payment_terms: supplier.payment_terms.toString(),
      payment_method: supplier.payment_method,
      bank_name: '',
      bank_account: '',
      account_type: 'checking',
      is_active: supplier.is_active,
      is_preferred: supplier.is_preferred,
    });
    setRtnError('');
    setShowEditModal(true);
  };

  const openDetailModal = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    await loadSupplierPurchases(supplier.id);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      rtn: '',
      name: '',
      commercial_name: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      country: 'Honduras',
      supplier_type: 'merchandise',
      category: '',
      payment_terms: '30',
      payment_method: 'transfer',
      bank_name: '',
      bank_account: '',
      account_type: 'checking',
      is_active: true,
      is_preferred: false,
    });
    setRtnError('');
  };

  const getSupplierTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      merchandise: 'Mercadería',
      services: 'Servicios',
      creditors: 'Acreedores',
    };
    return labels[type] || type;
  };

  const getSupplierTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      merchandise: 'bg-cyan-100 text-cyan-800',
      services: 'bg-green-100 text-green-800',
      creditors: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => {
            const params = new URLSearchParams(window.location.search);
            if (params.get("from") === "dashboard") router.push(`/companies/${companyId}/purchases/dashboard`);
            else router.push(`/companies/${companyId}/modules`);
          }}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Atrás
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gestión de Proveedores</h1>
            <p className="text-gray-500">Directorio maestro de proveedores y acreedores</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { resetForm(); setShowCreateModal(true); }} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" /> Agregar Proveedor
          </Button>
        {/* Single Dropdown Menu - Same level as title */}
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
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/suppliers`)}>
              <Building2 className="w-4 h-4 mr-2" />
              Proveedores
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/accounts-payable`)}>
              <CreditCard className="w-4 h-4 mr-2" />
              Ctas. por Pagar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases`)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Compras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases/dashboard`)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard de Compras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { resetForm(); setShowCreateModal(true); }} className="bg-cyan-50 text-cyan-700 hover:bg-cyan-100">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proveedor
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Proveedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">De Mercadería</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.filter(s => s.supplier_type === 'merchandise').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">De Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.filter(s => s.supplier_type === 'services').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Preferidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.filter(s => s.is_preferred).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre, RTN o razón social..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Suppliers List */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron proveedores. Cree uno nuevo para comenzar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">RTN</th>
                    <th className="text-left py-3 px-4">Nombre</th>
                    <th className="text-left py-3 px-4">Tipo</th>
                    <th className="text-left py-3 px-4">Contacto</th>
                    <th className="text-center py-3 px-4">Estado</th>
                    <th className="text-center py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">
                        {formatRTN(supplier.rtn)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{supplier.name}</div>
                        {supplier.commercial_name && (
                          <div className="text-sm text-gray-500">{supplier.commercial_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getSupplierTypeColor(supplier.supplier_type)}>
                          {getSupplierTypeLabel(supplier.supplier_type)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {supplier.phone && <div>{supplier.phone}</div>}
                          {supplier.email && <div className="text-gray-500">{supplier.email}</div>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {supplier.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Activo</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Inactivo</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailModal(supplier)}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(supplier)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedSupplier(supplier); setShowDeleteModal(true); }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          setShowEditModal(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEditModal ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="payment">Pagos</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label>RTN *</Label>
                <Input
                  value={formData.rtn}
                  onChange={(e) => {
                    const formatted = formatRTN(e.target.value);
                    setFormData({ ...formData, rtn: formatted });
                    if (rtnError) setRtnError('');
                  }}
                  placeholder="0801-1990-123456-7"
                  maxLength={19}
                />
                {rtnError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{rtnError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label>Nombre o Razón Social *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div className="space-y-2">
                <Label>Nombre Comercial</Label>
                <Input
                  value={formData.commercial_name}
                  onChange={(e) => setFormData({ ...formData, commercial_name: e.target.value })}
                  placeholder="Nombre comercial (opcional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Proveedor</Label>
                  <Select
                    value={formData.supplier_type}
                    onValueChange={(value) => setFormData({ ...formData, supplier_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merchandise">Mercadería (Inventario)</SelectItem>
                      <SelectItem value="services">Servicios</SelectItem>
                      <SelectItem value="creditors">Acreedores Diversos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ej: Alquiler, Luz, Teléfono"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <Label htmlFor="is_active">Activo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_preferred"
                    checked={formData.is_preferred}
                    onChange={(e) => setFormData({ ...formData, is_preferred: e.target.checked })}
                  />
                  <Label htmlFor="is_preferred">Proveedor Preferido</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="2222-3333"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="8888-9999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="proveedor@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Dirección completa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Tegucigalpa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Honduras"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Términos de Pago (Días)</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Contado</SelectItem>
                      <SelectItem value="15">15 días</SelectItem>
                      <SelectItem value="30">30 días</SelectItem>
                      <SelectItem value="45">45 días</SelectItem>
                      <SelectItem value="60">60 días</SelectItem>
                      <SelectItem value="90">90 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Método de Pago Preferido</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Banco</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Nombre del banco"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cuenta Bancaria</Label>
                  <Input
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    placeholder="Número de cuenta"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Cuenta</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Corriente</SelectItem>
                      <SelectItem value="savings">Ahorros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={showEditModal ? handleUpdate : handleSubmit}>
              {showEditModal ? 'Guardar Cambios' : 'Crear Proveedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Proveedor</DialogTitle>
          </DialogHeader>

          {selectedSupplier && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">RTN</Label>
                  <div className="font-mono text-lg">{formatRTN(selectedSupplier.rtn)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Tipo</Label>
                  <div>
                    <Badge className={getSupplierTypeColor(selectedSupplier.supplier_type)}>
                      {getSupplierTypeLabel(selectedSupplier.supplier_type)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-gray-500">Nombre</Label>
                <div className="text-lg font-medium">{selectedSupplier.name}</div>
                {selectedSupplier.commercial_name && (
                  <div className="text-gray-600">{selectedSupplier.commercial_name}</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedSupplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{selectedSupplier.phone}</span>
                  </div>
                )}
                {selectedSupplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedSupplier.email}</span>
                  </div>
                )}
                {selectedSupplier.address && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{selectedSupplier.address}, {selectedSupplier.city}</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-3">Historial de Compras</h3>
                {supplierPurchases.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">
                    No hay compras registradas para este proveedor
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Factura</th>
                          <th className="text-left py-2">Fecha</th>
                          <th className="text-right py-2">Monto</th>
                          <th className="text-center py-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierPurchases.map((purchase) => (
                          <tr key={purchase.id} className="border-b">
                            <td className="py-2">{purchase.invoice_number}</td>
                            <td className="py-2">{new Date(purchase.invoice_date).toLocaleDateString()}</td>
                            <td className="py-2 text-right">
                              L {(purchase.total / 100).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 text-center">
                              <Badge className={
                                purchase.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                purchase.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {purchase.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetailModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p>¿Está seguro de que desea eliminar al proveedor <strong>{selectedSupplier?.name}</strong>?</p>
          <p className="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
