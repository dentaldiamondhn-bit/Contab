"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Package, 
  Plus, 
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  MoreHorizontal,
  BarChart3,
  Boxes,
  ShoppingCart,
  Tag,
  List,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  User
} from 'lucide-react';
import { 
  formatDateForInput, 
  formatDateForDisplay, 
  formatDateRange, 
  isDateExpired 
} from '@/lib/date-utils';
import { supabase } from '@/lib/supabase/standard-client';
import { useTenant } from '@/lib/contexts/TenantContext';

interface Product {
  id: string;
  tenantid: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  discountPrice?: number;
  isDiscount?: boolean;
  stock: number;
  minstock: number;
  maxstock: number;
  tags: string[];
  isActive: boolean;
  expirationDate?: string;
  promotionStartDate?: string;
  promotionEndDate?: string;
  createdat: string;
  updatedat: string;
}

interface InventoryMovement {
  id: string;
  tenantid: string;
  productid: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  reference?: string;
  createdat: string;
  createdby: string;
}

interface NewProductData {
  tenantid: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  cost: string;
  price: string;
  discountPrice: string;
  isDiscount: boolean;
  precioTotal: string;
  nuevoStock: string;
  minstock: string;
  tags: string[];
  expirationDate: string;
  supplierId: string;
}

export default function InventoryPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'list'>('cards');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showTenantReport, setShowTenantReport] = useState(true);
  const [tenantReport, setTenantReport] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState<NewProductData>({
    tenantid: currentTenant?.id || '',
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: '',
    cost: '',
    price: '',
    discountPrice: '',
    isDiscount: false,
    precioTotal: '',
    nuevoStock: '0',
    minstock: '0',
    tags: [],
    expirationDate: ''
  });

  const [movementData, setMovementData] = useState({
    type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT',
    quantity: '',
    reason: '',
    reference: ''
  });

  const [discounts, setDiscounts] = useState<any[]>([]);
  const [showAddDiscountDialog, setShowAddDiscountDialog] = useState(false);
  const [discountData, setDiscountData] = useState({
    percentage: '',
    reason: '',
    startDate: '',
    endDate: ''
  });

  // Category management state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryData, setCategoryData] = useState({
    name: '',
    description: ''
  });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  // Package management state
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [packageData, setPackageData] = useState({
    name: '',
    description: '',
    price: '',
    promotionprice: '',
    ispromotion: false,
    selectedProducts: [] as Array<{id: string, name: string, quantity: number}>
  });
  const [packages, setPackages] = useState<any[]>([]);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'packages' | 'promotions' | 'suppliers'>('inventory');
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [selectedPromotionProduct, setSelectedPromotionProduct] = useState<Product | null>(null);
  const [selectedPromotionPackage, setSelectedPromotionPackage] = useState<any>(null);
  const [promotionTargetType, setPromotionTargetType] = useState<'product' | 'package'>('product');
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [packagesExpanded, setPackagesExpanded] = useState(false);
  const [promotionData, setPromotionData] = useState({
    discountPrice: '',
    isDiscount: false,
    promotionStartDate: '',
    promotionEndDate: ''
  });

  // Debug editing state changes - silenciado en prod
  // React.useEffect(() => {
  //   console.log('Editing category changed:', editingCategory);
  // }, [editingCategory, categoryData]);

  // Load packages from database - tenant-aware
  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('Packages')
        .select(`
          *,
          PackageProducts (
            productid,
            quantity
          )
        `)
        .eq('tenantid', tenantId)
        .eq('isactive', true)
        .order('createdat', { ascending: false });

      if (error) throw error;
      
      // Enrich packages with product names
      const enrichedPackages = await Promise.all((data || []).map(async (pkg) => {
        const productIds = pkg.PackageProducts.map((pp: any) => pp.productid);
        const { data: products } = await supabase
          .from('Product')
          .select('id, name')
          .in('id', productIds);
        
        return {
          ...pkg,
          products: pkg.PackageProducts.map((pp: any) => ({
            id: pp.productid,
            productid: pp.productid,
            productname: products?.find((p: any) => p.id === pp.productid)?.name || 'Producto desconocido',
            name: products?.find((p: any) => p.id === pp.productid)?.name || 'Producto desconocido',
            quantity: pp.quantity
          }))
        };
      }));

      setPackages(enrichedPackages || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  // Load packages on component mount - tenant-aware
  React.useEffect(() => {
    if (tenantId) loadPackages();
  }, [tenantId]);

  const [categories, setCategories] = useState([
    'Empaque',
    'Limpieza',
    'Insumos Médicos',
    'Material Dental',
    'Equipamiento',
    'Suministros de Oficina',
    'Medicamentos',
    'Productos Químicos',
    'Herramientas',
    'Otros'
  ]);

  // Predefined units
  const units = [
    'Unidades',
    'Cajas',
    'Paquetes',
    'Kilogramos',
    'Gramos',
    'Litros',
    'Mililitros',
    'Metros',
    'Centímetros',
    'Pares',
    'Docenas',
    'Botellas',
    'Tubos',
    'Frascos',
    'Bolsas',
    'Rollo'
  ];

  // State for custom values
  const [customCategory, setCustomCategory] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showCustomUnit, setShowCustomUnit] = useState(false);

  // State for validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // State for existing stock (when editing)
  const [existingStock, setExistingStock] = useState<number>(0);

  // Function to calculate cost unitario automatically
  const calculateCostUnitario = (precioTotal: string, stock: string) => {
    console.log('calculateCostUnitario llamado con:', { precioTotal, stock });
    const total = parseFloat(precioTotal) || 0;
    const unidades = parseFloat(stock) || 0;
    console.log('Valores parseados:', { total, unidades });
    
    if (unidades > 0) {
      const result = (total / unidades).toFixed(2);
      console.log('Resultado calculado:', result);
      return result;
    }
    console.log('Unidades <= 0, retornando 0.00');
    return '0.00';
  };

  // Update cost when precioTotal or stock changes
  const updateCostFromTotal = () => {
    console.log('updateCostFromTotal llamado con:', {
      precioTotal: formData.precioTotal,
      nuevoStock: formData.nuevoStock
    });
    const calculatedCost = calculateCostUnitario(formData.precioTotal, formData.nuevoStock);
    console.log('Costo calculado:', calculatedCost);
    setFormData(prev => ({ ...prev, cost: calculatedCost }));
  };

  // Calculate total stock automatically
  const calculateTotalStock = () => {
    const nuevoStock = parseInt(formData.nuevoStock) || 0;
    const totalStock = existingStock + nuevoStock;
    return totalStock;
  };

  // Calculate stock from movements (more accurate)
  const calculateStockFromMovements = (productId: string) => {
    const productMovements = movements.filter(m => m.productid === productId);
    console.log('Calculando stock para producto', productId, 'movimientos:', productMovements);
    const totalStock = productMovements.reduce((sum, movement) => {
      if (movement.type === 'IN') {
        return sum + movement.quantity;
      } else if (movement.type === 'OUT') {
        return sum - movement.quantity;
      }
      return sum; // ADJUSTMENT no cambia el stock
    }, 0);
    console.log('Stock calculado desde movimientos:', totalStock);
    return totalStock;
  };

  // Update total stock when nuevoStock changes
  const updateTotalStock = () => {
    const totalStock = calculateTotalStock();
    // We'll use this in the database save operation
    return totalStock;
  };

  // Validation functions
  const validateForm = () => {
    const errors: string[] = [];

    // Required fields validation
    if (!formData.name.trim()) {
      errors.push('El nombre del producto es requerido');
    }

    if (!formData.category || formData.category === '') {
      errors.push('La categoría es requerida');
    }

    if (!formData.unit || formData.unit === '') {
      errors.push('La unidad es requerida');
    }

    if (!formData.precioTotal || parseFloat(formData.precioTotal) <= 0) {
      errors.push('El precio total debe ser mayor a 0');
    }

    if (!formData.nuevoStock || parseInt(formData.nuevoStock) <= 0) {
      errors.push('Las unidades nuevas deben ser mayor a 0');
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.push('El precio de venta debe ser mayor a 0');
    }

    if (!formData.minstock || parseInt(formData.minstock) < 0) {
      errors.push('El stock mínimo no puede ser negativo');
    }

    // Logical validation
    const precioTotal = parseFloat(formData.precioTotal);
    const unidades = parseInt(formData.nuevoStock);
    const precioVenta = parseFloat(formData.price);
    const costoUnitario = parseFloat(formData.cost);
    const minstock = parseInt(formData.minstock);
    
    console.log('Valores en validación:', {
      formData: formData,
      precioTotal,
      unidades,
      precioVenta,
      costoUnitario,
      minstock
    });

    // Validate that calculated cost makes sense
    if (unidades > 0 && precioTotal > 0) {
      const expectedCost = precioTotal / unidades;
      console.log('Validación costo unitario:', {
        precioTotal,
        unidades,
        expectedCost,
        costoUnitario,
        diferencia: Math.abs(expectedCost - costoUnitario),
        tolerancia: 0.1,
        superaTolerancia: Math.abs(expectedCost - costoUnitario) > 0.1
      });
      
      // Si hay una gran diferencia, usar el costo calculado directamente
      if (Math.abs(expectedCost - costoUnitario) > 0.1) {
        console.log('Usando costo calculado directamente en validación...');
        // No actualizamos el estado aquí, solo usamos el valor correcto para la validación
        console.log('Costo unitario correcto sería:', expectedCost.toFixed(2));
      }
      
      // Validar usando el costo esperado en lugar del costo del formulario
      if (Math.abs(expectedCost - costoUnitario) > 0.1) {
        console.log('Diferencia detectada, pero permitiendo el guardado con el costo correcto');
        // No agregamos error, solo registramos la corrección
      }
    }

    // Validate business logic
    if (precioVenta <= costoUnitario) {
      errors.push('El precio de venta debe ser mayor al costo unitario para tener ganancia');
    }

    
    if (minstock >= unidades) {
      errors.push('El stock mínimo no puede ser mayor o igual a las unidades nuevas');
    }

    // Validate SKU uniqueness (if not auto-generated)
    if (formData.sku && formData.sku.trim()) {
      const existingProduct = products.find(p => 
        p.sku === formData.sku.trim() && 
        (!editingProduct || p.id !== editingProduct.id)
      );
      if (existingProduct) {
        errors.push('El SKU ya existe en otro producto');
      }
    }

    return errors;
  };

  const getValidationErrors = () => {
    const errors = validateForm();
    return errors;
  };

  // Real-time validation for individual fields
  const validateField = (fieldName: string, value: string) => {
    const errors: Record<string, string> = {};

    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          errors.name = 'El nombre del producto es requerido';
        } else if (value.length < 3) {
          errors.name = 'El nombre debe tener al menos 3 caracteres';
        }
        break;

      case 'precioTotal':
        const precioTotal = parseFloat(value);
        if (!value || precioTotal <= 0) {
          errors.precioTotal = 'El precio total debe ser mayor a 0';
        } else if (precioTotal > 999999999) {
          errors.precioTotal = 'El precio total es demasiado grande';
        }
        break;

      case 'nuevoStock':
        const unidades = parseInt(value);
        if (!value || unidades <= 0) {
          errors.nuevoStock = 'Las unidades nuevas deben ser mayor a 0';
        } else if (unidades > 999999) {
          errors.nuevoStock = 'La cantidad de unidades es demasiado grande';
        }
        break;

      case 'price':
        const precioVenta = parseFloat(value);
        if (!value || precioVenta <= 0) {
          errors.price = 'El precio de venta debe ser mayor a 0';
        } else if (formData.cost && precioVenta <= parseFloat(formData.cost)) {
          errors.price = 'El precio de venta debe ser mayor al costo unitario';
        }
        break;

      case 'minstock':
        const minstock = parseInt(value);
        if (minstock < 0) {
          errors.minstock = 'El stock mínimo no puede ser negativo';
        } else if (formData.nuevoStock && minstock >= parseInt(formData.nuevoStock)) {
          errors.minstock = 'El stock mínimo no puede ser mayor o igual a las unidades nuevas';
        }
        break;

      
      case 'sku':
        if (value && value.trim()) {
          const existingProduct = products.find(p => 
            p.sku === value.trim() && 
            (!editingProduct || p.id !== editingProduct.id)
          );
          if (existingProduct) {
            errors.sku = 'El SKU ya existe en otro producto';
          }
        }
        break;
    }

    setFieldErrors(prev => ({ ...prev, ...errors }));
    
    // Clear error for this field if it's now valid
    if (!errors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Update date inputs when promotion data changes
  React.useEffect(() => {
    if (showPromotionDialog && (selectedPromotionProduct || selectedPromotionPackage)) {
      setTimeout(() => {
        const startInput = document.getElementById('promotionStartDate') as HTMLInputElement;
        const endInput = document.getElementById('promotionEndDate') as HTMLInputElement;
        
        const formattedStartDate = formatDateForInput(promotionData.promotionStartDate);
        const formattedEndDate = formatDateForInput(promotionData.promotionEndDate);
        
        console.log('Actualizando inputs con timezone:', {
          originalStart: promotionData.promotionStartDate,
          originalEnd: promotionData.promotionEndDate,
          formattedStart: formattedStartDate,
          formattedEnd: formattedEndDate,
          startInput: startInput?.value,
          endInput: endInput?.value
        });
        
        if (startInput && formattedStartDate) {
          startInput.value = formattedStartDate;
        }
        if (endInput && formattedEndDate) {
          endInput.value = formattedEndDate;
        }
      }, 100);
    }
  }, [showPromotionDialog, selectedPromotionProduct, selectedPromotionPackage, promotionData]);

  const loadSuppliers = async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/suppliers?tenantId=${tenantId}`);
      if (res.ok) {
        const j = await res.json();
        setSuppliers(j.suppliers || j.data || []);
        return;
      }
      // Fallback directo Supabase con variaciones de columna
      const tryCols = [
        () => supabase.from('Supplier').select('id, name').eq('tenantid', tenantId).eq('isActive', true) as any,
        () => supabase.from('Supplier').select('id, name').eq('tenantid', tenantId) as any,
        () => supabase.from('Supplier').select('id, name').eq('tenantId', tenantId) as any,
        () => supabase.from('Supplier').select('id, name').limit(20) as any,
      ];
      for (const fn of tryCols) {
        try {
          const { data, error } = await fn();
          if (!error && data) { setSuppliers(data); return; }
        } catch {}
      }
      setSuppliers([]);
    } catch { setSuppliers([]); }
  };

  // Load data from Supabase - tenant-aware
  useEffect(() => {
    if (tenantId) {
      loadProducts();
      loadMovements();
      loadSuppliers();
    }
    fetchTenantReport();
  }, [tenantId]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('Product')
        .select('*')
        .eq('tenantid', tenantId)
        .eq('isActive', true)
        .order('createdat', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage({ type: 'error', text: 'Error al cargar productos' });
    }
  };

  const loadMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('InventoryMovement')
        .select('*')
        .eq('tenantid', tenantId)
        .order('createdat', { ascending: false });

      if (error) throw error;
      console.log('Movimientos cargados:', data);
      setMovements(data || []);
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  const fetchTenantReport = async () => {
    setLoadingReport(true);
    try {
      const res = await fetch('/api/admin/inventory/report');
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        setTenantReport(data.tenants || []);
      } else if (!res.ok) {
        // No admin o sin permiso — no mostrar error ruidoso
        setTenantReport([]);
      }
    } catch (err) {
      // Silenciar SyntaxError por HTML de login
      setTenantReport([]);
    } finally {
      setLoadingReport(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (stockFilter === 'all') return matchesSearch;
    if (stockFilter === 'low') return matchesSearch && product.stock <= product.minstock;
    if (stockFilter === 'out') return matchesSearch && product.stock === 0;
    return matchesSearch;
  });

  const lowStockProducts = products.filter(p => p.stock <= p.minstock);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  const generateSKU = () => {
    const prefix = 'PROD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== INICIO handleSubmit ===');
    console.log('formData:', formData);
    console.log('editingProduct:', editingProduct);
    
    // Validate form before submitting
    const validationErrors = validateForm();
    console.log('validationErrors:', validationErrors);
    
    if (validationErrors.length > 0) {
      console.log('Errores de validación encontrados:', validationErrors);
      setMessage({ 
        type: 'error', 
        text: `Errores de validación:\n${validationErrors.join('\n')}` 
      });
      return;
    }

    console.log('Validación pasada, iniciando guardado...');
    setLoading(true);

    try {
      const totalStock = calculateTotalStock();
      
      // Calcular el costo unitario correcto
      const precioTotal = parseFloat(formData.precioTotal);
      const unidades = parseInt(formData.nuevoStock);
      const costoUnitarioCorrecto = unidades > 0 ? (precioTotal / unidades) : parseFloat(formData.cost);
      
      console.log('Calculando costo para guardar:', {
        precioTotal,
        unidades,
        costoUnitarioCorrecto,
        costoFormulario: parseFloat(formData.cost)
      });
      
      const productData: any = {
        tenantid: formData.tenantid,
        sku: formData.sku || generateSKU(),
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unit: formData.unit,
        cost: costoUnitarioCorrecto,
        price: parseFloat(formData.price),
        discountPrice: formData.isDiscount ? parseFloat(formData.discountPrice) || null : null,
        isDiscount: formData.isDiscount,
        stock: totalStock,
        minstock: parseInt(formData.minstock),
        tags: formData.tags,
        expirationDate: formData.expirationDate || null,
        isActive: true
      };
      // Proveedor opcional - si la columna existe en Supabase se guardará, si no, se guarda en tags
      if ((formData as any).supplierId) {
        (productData as any).supplierId = (formData as any).supplierId;
        (productData as any).supplier_id = (formData as any).supplierId;
      }

      console.log('productData a guardar:', productData);

      if (editingProduct) {
        console.log('Actualizando producto existente...');
        // Update existing product
        const { data, error } = await supabase
          .from('Product')
          .update(productData)
          .eq('id', editingProduct.id)
          .select()
          .single();

        console.log('Resultado update:', { data, error });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Producto actualizado exitosamente' });
      } else {
        console.log('Creando nuevo producto...');
        // Create new product
        const { data, error } = await supabase
          .from('Product')
          .insert(productData)
          .select()
          .single();

        console.log('Resultado insert:', { data, error });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Producto agregado exitosamente' });

        // Add initial movement if nuevoStock > 0
        if (parseInt(formData.nuevoStock) > 0) {
          console.log('Agregando movimiento inicial...');
          const movementResult = await supabase
            .from('InventoryMovement')
            .insert({
              tenantid: formData.tenantid,
              productid: data.id,
              type: 'IN',
              quantity: parseInt(formData.nuevoStock),
              reason: 'Stock inicial',
              reference: 'CREACIÓN',
              createdby: 'system'
            });
          console.log('Resultado movimiento:', movementResult);
        }
      }

      console.log('Guardado exitoso, reseteando formulario...');
      // Reset form and reload data
      setFormData({
        tenantid: tenantId,
        sku: '',
        name: '',
        description: '',
        category: '',
        unit: '',
        cost: '',
        price: '',
        discountPrice: '',
        isDiscount: false,
        precioTotal: '',
        nuevoStock: '0',
        minstock: '0',
        tags: [],
        expirationDate: ''
      });
      setEditingProduct(null);
      setShowAddDialog(false);
      
      // Reset custom states
      setCustomCategory('');
      setCustomUnit('');
      setShowCustomCategory(false);
      setShowCustomUnit(false);
      
      // Clear validation errors
      setFieldErrors({});
      
      console.log('Cargando productos...');
      await loadProducts();
      console.log('=== FIN handleSubmit EXITOSO ===');
    } catch (error: any) {
      console.error('Error en handleSubmit:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      setMessage({ type: 'error', text: error.message || 'Error al guardar producto' });
    } finally {
      setLoading(false);
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const quantity = parseInt(movementData.quantity);
      
      // Validate stock for OUT movements
      if (movementData.type === 'OUT' && quantity > selectedProduct.stock) {
        setMessage({ type: 'error', text: 'No hay suficiente stock disponible' });
        return;
      }

      // Create movement record (trigger will update stock automatically)
      const movementRecord = {
        tenantid: tenantId,
        productid: selectedProduct.id,
        type: movementData.type,
        quantity: quantity,
        reason: movementData.reason,
        reference: movementData.reference,
        createdby: 'current_user'
      };

      const { error } = await supabase
        .from('InventoryMovement')
        .insert(movementRecord);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Movimiento registrado exitosamente' });
      setShowMovementDialog(false);
      setMovementData({ type: 'IN', quantity: '', reason: '', reference: '' });
      
      // Reload data to reflect changes
      await loadProducts();
      await loadMovements();
    } catch (error: any) {
      console.error('Error registering movement:', error);
      setMessage({ type: 'error', text: error.message || 'Error al registrar movimiento' });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    
    // Check if category is predefined or custom
    const isCustomCategory = !categories.includes(product.category);
    const isCustomUnit = !units.includes(product.unit);
    
    setFormData({
      tenantid: product.tenantid,
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: isCustomCategory ? 'OTRO' : product.category,
      unit: isCustomUnit ? 'OTRO' : product.unit,
      cost: product.cost.toString(),
      price: product.price.toString(),
      discountPrice: (product as any).discountPrice?.toString() || '',
      isDiscount: (product as any).isDiscount || false,
      precioTotal: (product.cost * product.stock).toString(),
      nuevoStock: product.stock.toString(),
      minstock: (product.minstock || 0).toString(),
      tags: product.tags || [],
      expirationDate: product.expirationDate || ''
    });
    
    // Set existing stock for calculation
    setExistingStock(product.stock);
    
    // Set custom values if needed
    setCustomCategory(isCustomCategory ? product.category : '');
    setCustomUnit(isCustomUnit ? product.unit : '');
    setShowCustomCategory(isCustomCategory);
    setShowCustomUnit(isCustomUnit);
    
    setShowAddDialog(true);
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailsDialog(true);
    loadDiscounts(product.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este producto?')) return;

    try {
      // Soft delete by setting isActive to false
      const { error } = await supabase
        .from('Product')
        .update({ isActive: false })
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Producto eliminado exitosamente' });
      await loadProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      setMessage({ type: 'error', text: error.message || 'Error al eliminar producto' });
    }
  };

  const getStockStatus = (product: Product) => {
    const calculatedStock = calculateStockFromMovements(product.id);
    if (calculatedStock === 0) return { status: 'out', color: 'red', text: 'Agotado' };
    if (calculatedStock <= product.minstock) return { status: 'low', color: 'orange', text: 'Stock Bajo' };
    return { status: 'normal', color: 'green', text: 'Normal' };
  };

  // Discount management functions
  const loadDiscounts = async (productId: string) => {
    try {
      // Simulated discount data - replace with actual API call
      const mockDiscounts = [
        { id: '1', percentage: 10, reason: 'Descuento por volumen', startDate: '2024-01-01', endDate: '2024-12-31', isActive: true },
        { id: '2', percentage: 5, reason: 'Promoción especial', startDate: '2024-06-01', endDate: '2024-06-30', isActive: false }
      ];
      setDiscounts(mockDiscounts);
    } catch (error) {
      console.error('Error loading discounts:', error);
    }
  };

  const handleAddDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const newDiscount = {
        id: Date.now().toString(),
        productId: selectedProduct.id,
        percentage: parseFloat(discountData.percentage),
        reason: discountData.reason,
        startDate: discountData.startDate,
        endDate: discountData.endDate,
        isActive: true
      };

      setDiscounts([...discounts, newDiscount]);
      setDiscountData({ percentage: '', reason: '', startDate: '', endDate: '' });
      setShowAddDiscountDialog(false);
      setMessage({ type: 'success', text: 'Descuento agregado exitosamente' });
    } catch (error: any) {
      console.error('Error adding discount:', error);
      setMessage({ type: 'error', text: error.message || 'Error al agregar descuento' });
    }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    try {
      setDiscounts(discounts.filter(d => d.id !== discountId));
      setMessage({ type: 'success', text: 'Descuento eliminado exitosamente' });
    } catch (error: any) {
      console.error('Error deleting discount:', error);
      setMessage({ type: 'error', text: error.message || 'Error al eliminar descuento' });
    }
  };

  // Bulk import function
  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let products: any[] = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        // Parse CSV file
        const text = await file.text();
        const config: Papa.ParseConfig = {
          header: false,
          skipEmptyLines: true
        };
        const result = Papa.parse(text, config);

        products = result.data.map((row: any) => ({
          name: row[0]?.trim(),
          category: row[1]?.trim(),
          price: parseFloat(row[2]) || 0,
          stock: parseInt(row[3]) || 0,
          cost: parseFloat(row[4]) || 0,
          description: row[5]?.trim() || ''
        }));
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        products = data.slice(1).map((row: any) => ({
          name: row[0]?.trim(),
          category: row[1]?.trim(),
          price: parseFloat(row[2]) || 0,
          stock: parseInt(row[3]) || 0,
          cost: parseFloat(row[4]) || 0,
          description: row[5]?.trim() || ''
        }));
      } else {
        setMessage({ type: 'error', text: 'Formato de archivo no soportado' });
        return;
      }

      // Validate and filter products
      const validProducts = products.filter(product => {
        if (!product.name || !product.category || !product.price || !product.stock) {
          console.warn('Producto inválido (campos obligatorios faltantes):', product);
          return false;
        }
        if (isNaN(product.price) || isNaN(product.stock)) {
          console.warn('Producto inválido (precio o stock no numérico):', product);
          return false;
        }
        return true;
      });

      if (validProducts.length === 0) {
        setMessage({ type: 'error', text: 'No se encontraron productos válidos en el archivo' });
        return;
      }

      // Check for duplicate names
      const existingProductNames = new Set(products.map(p => p.name.toLowerCase()));
      const newValidProducts = validProducts.filter(product => 
        !existingProductNames.has(product.name.toLowerCase())
      );

      if (newValidProducts.length === 0) {
        setMessage({ type: 'error', text: 'Todos los productos ya existen en el inventario' });
        return;
      }

      // Process products in batches
      const batchSize = 10;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < newValidProducts.length; i += batchSize) {
        const batch = newValidProducts.slice(i, i + batchSize);
        
        for (const product of batch) {
          try {
            // Create category if it doesn't exist
            const { data: categoryData, error: categoryError } = await supabase
              .from('Categories')
              .select('id')
              .eq('name', product.category)
              .single();

            let categoryId;
            if (categoryError || !categoryData) {
              // Create new category
              const { data: newCategory, error: createError } = await supabase
                .from('Categories')
                .insert([{ name: product.category, description: `Categoría para ${product.category}` }])
                .select()
                .single();

              if (createError) {
                console.error('Error creating category:', createError);
                errorCount++;
                continue;
              }
              categoryId = newCategory.id;
            } else {
              categoryId = categoryData.id;
            }

            // Create product
            const { error: productError } = await supabase
              .from('Products')
              .insert([{
                name: product.name,
                category: product.category,
                categoryid: categoryId,
                price: product.price,
                cost: product.cost,
                stock: product.stock,
                description: product.description,
                isactive: true
              }]);

            if (productError) {
              console.error('Error creating product:', productError);
              errorCount++;
            } else {
              successCount++;
            }
          } catch (error) {
            console.error('Error processing product:', error);
            errorCount++;
          }
        }
      }

      // Reload products
      await loadProducts();
      
      // Show results
      if (successCount > 0) {
        setMessage({ 
          type: 'success', 
          text: `Se importaron ${successCount} productos exitosamente${errorCount > 0 ? ` (${errorCount} errores)` : ''}` 
        });
        setShowBulkImportDialog(false);
      } else {
        setMessage({ type: 'error', text: 'No se pudo importar ningún producto' });
      }

    } catch (error: any) {
      console.error('Error importing products:', error);
      setMessage({ type: 'error', text: error.message || 'Error al importar productos' });
    }

    // Reset file input
    event.target.value = '';
  };

  // Category management functions
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryData.name.trim()) {
      setMessage({ type: 'error', text: 'El nombre de la categoría es requerido' });
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const updatedCategories = categories.map(cat => 
          cat === editingCategory ? categoryData.name.trim() : cat
        );
        
        // Update products with the old category name
        // In a real app, this would be a database update
        console.log('Updating products from', editingCategory, 'to', categoryData.name.trim());
        
        setCategories(updatedCategories);
        setMessage({ type: 'success', text: 'Categoría actualizada exitosamente' });
      } else {
        // Check if category already exists
        if (categories.includes(categoryData.name.trim())) {
          setMessage({ type: 'error', text: 'Esta categoría ya existe' });
          return;
        }

        // Add new category
        setCategories([...categories, categoryData.name.trim()]);
        setMessage({ type: 'success', text: 'Categoría agregada exitosamente' });
      }

      // Reset form
      setCategoryData({ name: '', description: '' });
      setEditingCategory(null);
      setShowCategoryDialog(false);
    } catch (error: any) {
      console.error('Error saving category:', error);
      setMessage({ type: 'error', text: error.message || 'Error al guardar categoría' });
    }
  };

  const handleEditCategory = (categoryName: string) => {
    console.log('Editing category:', categoryName);
    setEditingCategory(categoryName);
    setCategoryData({ 
      name: categoryName, 
      description: `Categoría: ${categoryName}` 
    });
    
    // Auto-scroll to edit form
    setTimeout(() => {
      const editForm = document.querySelector('[data-edit-form="true"]');
      if (editForm) {
        editForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleDeleteCategory = (categoryName: string) => {
    try {
      // Check if any product is using this category
      const productsWithCategory = products.filter(p => p.category === categoryName);
      if (productsWithCategory.length > 0) {
        setMessage({ 
          type: 'error', 
          text: `No se puede eliminar la categoría. Hay ${productsWithCategory.length} productos usando esta categoría.` 
        });
        return;
      }

      // Remove category
      setCategories(categories.filter(c => c !== categoryName));
      setMessage({ type: 'success', text: 'Categoría eliminada exitosamente' });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      setMessage({ type: 'error', text: error.message || 'Error al eliminar categoría' });
    }
  };

  // Package management functions
  const handleAddProductToPackage = (product: any) => {
    // Validate product has valid ID
    if (!product || !product.id) {
      console.error('Producto sin ID válido:', product);
      setMessage({ type: 'error', text: 'Producto no válido - falta ID' });
      return;
    }

    const existingProduct = packageData.selectedProducts.find(p => p.id === product.id);
    if (existingProduct) {
      // Update quantity if already in package
      setPackageData(prev => ({
        ...prev,
        selectedProducts: prev.selectedProducts.map(p => 
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      }));
    } else {
      // Add new product to package
      setPackageData(prev => ({
        ...prev,
        selectedProducts: [...prev.selectedProducts, {
          id: product.id, // Keep as string, Supabase will handle UUID conversion
          name: product.name,
          quantity: 1
        }]
      }));
    }
  };

  const handleRemoveProductFromPackage = (productId: string) => {
    setPackageData(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.filter(p => p.id !== productId)
    }));
  };

  const handleUpdateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveProductFromPackage(productId);
    } else {
      setPackageData(prev => ({
        ...prev,
        selectedProducts: prev.selectedProducts.map(p => 
          p.id === productId ? { ...p, quantity } : p
        )
      }));
    }
  };

  const handleEditPackage = (pkg: any) => {
    setEditingPackage(pkg);
    
    // Map products from database structure to form structure
    const selectedProducts = pkg.products?.map((pp: any) => ({
      id: pp.productid || pp.id,
      name: pp.productname || pp.name || 'Producto desconocido',
      quantity: pp.quantity
    })) || [];

    setPackageData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      promotionprice: pkg.promotionprice || '',
      ispromotion: pkg.ispromotion || false,
      selectedProducts: selectedProducts
    });
    setShowPackageDialog(true);
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('¿Estás seguro de eliminar este paquete?')) return;

    try {
      const { error } = await supabase
        .from('Packages')
        .update({ isactive: false })
        .eq('id', packageId);

      if (error) throw error;

      // Reload packages from database - tenant-aware
      const { data, error: loadError } = await supabase
        .from('Packages')
        .select(`
          *,
          PackageProducts (
            productid,
            quantity
          )
        `)
        .eq('tenantid', tenantId)
        .eq('isactive', true)
        .order('createdat', { ascending: false });

      if (loadError) throw loadError;
      
      // Enrich packages with product names
      const enrichedPackages = await Promise.all((data || []).map(async (pkg) => {
        const productIds = pkg.PackageProducts.map((pp: any) => pp.productid);
        const { data: products } = await supabase
          .from('Product')
          .select('id, name')
          .in('id', productIds);
        
        return {
          ...pkg,
          products: pkg.PackageProducts.map((pp: any) => ({
            id: pp.productid,
            productid: pp.productid,
            productname: products?.find((p: any) => p.id === pp.productid)?.name || 'Producto desconocido',
            name: products?.find((p: any) => p.id === pp.productid)?.name || 'Producto desconocido',
            quantity: pp.quantity
          }))
        };
      }));

      setPackages(enrichedPackages || []);
      setMessage({ type: 'success', text: 'Paquete eliminado exitosamente' });
    } catch (error: any) {
      console.error('Error deleting package:', error);
      setMessage({ type: 'error', text: error.message || 'Error al eliminar paquete' });
    }
  };

  const handleApplyPromotion = async () => {
    if (promotionTargetType === 'product' && !selectedPromotionProduct) return;
    if (promotionTargetType === 'package' && !selectedPromotionPackage) return;

    try {
      if (promotionTargetType === 'product') {
        const updateData: any = {
          isDiscount: promotionData.isDiscount,
          discountPrice: promotionData.isDiscount ? parseFloat(promotionData.discountPrice) : null
        };

        if (promotionData.isDiscount) {
          if (promotionData.promotionStartDate) {
            updateData.promotionStartDate = promotionData.promotionStartDate;
          }
          if (promotionData.promotionEndDate) {
            updateData.promotionEndDate = promotionData.promotionEndDate;
          }
        } else {
          updateData.promotionStartDate = null;
          updateData.promotionEndDate = null;
        }

        console.log('Guardando promoción de producto:', updateData);
        const { error } = await supabase
          .from('Product')
          .update(updateData)
          .eq('id', selectedPromotionProduct!.id);

        if (error) throw error;
      } else {
        const updateData: any = {
          ispromotion: promotionData.isDiscount,
          promotionprice: promotionData.isDiscount ? parseFloat(promotionData.discountPrice) : null
        };

        if (promotionData.isDiscount) {
          if (promotionData.promotionStartDate) {
            updateData.promotionstartdate = promotionData.promotionStartDate;
          }
          if (promotionData.promotionEndDate) {
            updateData.promotionenddate = promotionData.promotionEndDate;
          }
        } else {
          updateData.promotionstartdate = null;
          updateData.promotionenddate = null;
        }

        console.log('Guardando promoción de paquete:', updateData);
        const { error } = await supabase
          .from('Packages')
          .update(updateData)
          .eq('id', selectedPromotionPackage.id);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Promoción aplicada exitosamente' });
      setShowPromotionDialog(false);
      setSelectedPromotionProduct(null);
      setSelectedPromotionPackage(null);
      setPromotionTargetType('product');
      setPromotionData({ discountPrice: '', isDiscount: false, promotionStartDate: '', promotionEndDate: '' });
      if (promotionTargetType === 'product') {
        loadProducts();
      } else {
        loadPackages();
      }
    } catch (error: any) {
      console.error('Error applying promotion:', error);
      setMessage({ type: 'error', text: error.message || 'Error al aplicar promoción' });
    }
  };

  const handleOpenPromotionDialog = (product: Product) => {
    const startDate = (product as any).promotionStartDate;
    const endDate = (product as any).promotionEndDate;
    
    console.log('Fechas del producto con timezone:', {
      promotionStartDate: startDate,
      promotionEndDate: endDate,
      formattedStart: formatDateForInput(startDate),
      formattedEnd: formatDateForInput(endDate)
    });
    
    setSelectedPromotionProduct(product);
    setPromotionData({
      discountPrice: (product as any).discountPrice?.toString() || '',
      isDiscount: product.isDiscount || false,
      promotionStartDate: formatDateForInput(startDate),
      promotionEndDate: formatDateForInput(endDate)
    });
    setShowPromotionDialog(true);
  };

  const handleTogglePromotion = async (packageId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('Packages')
        .update({ 
          ispromotion: !currentStatus,
          promotionprice: currentStatus ? null : null
        })
        .eq('id', packageId);

      if (error) throw error;

      // Reload packages from database - tenant-aware
      const { data, error: loadError } = await supabase
        .from('Packages')
        .select(`
          *,
          PackageProducts (
            productid,
            quantity
          )
        `)
        .eq('tenantid', tenantId)
        .eq('isactive', true)
        .order('createdat', { ascending: false });

      if (loadError) throw loadError;
      
      // Enrich packages with product names
      const enrichedPackages = await Promise.all((data || []).map(async (pkg) => {
        const productIds = pkg.PackageProducts.map((pp: any) => pp.productid);
        const { data: products } = await supabase
          .from('Product')
          .select('id, name')
          .in('id', productIds);
        
        return {
          ...pkg,
          products: pkg.PackageProducts.map((pp: any) => ({
            id: pp.productid,
            productid: pp.productid,
            productname: products?.find((p: any) => p.id === pp.productid)?.name || 'Producto desconocido',
            name: products?.find((p: any) => p.id === pp.productid)?.name || 'Producto desconocido',
            quantity: pp.quantity
          }))
        };
      }));

      setPackages(enrichedPackages || []);
      setMessage({ 
        type: 'success', 
        text: currentStatus ? 'Paquete quitado de promoción' : 'Paquete puesto en promoción' 
      });
    } catch (error: any) {
      console.error('Error toggling promotion:', error);
      setMessage({ type: 'error', text: error.message || 'Error al cambiar estado de promoción' });
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!packageData.name.trim()) {
      setMessage({ type: 'error', text: 'El nombre del paquete es requerido' });
      return;
    }

    if (packageData.selectedProducts.length === 0) {
      setMessage({ type: 'error', text: 'Debes seleccionar al menos un producto para el paquete' });
      return;
    }

    try {
      if (editingPackage) {
        // Update existing package
        const { error: updateError } = await supabase
          .from('Packages')
          .update({
            name: packageData.name,
            description: packageData.description,
            price: parseFloat(packageData.price) || 0,
            promotionprice: packageData.ispromotion ? parseFloat(packageData.promotionprice) || null : null,
            ispromotion: packageData.ispromotion,
            updatedat: new Date().toISOString()
          })
          .eq('id', editingPackage.id);

        if (updateError) throw updateError;

        // Delete existing products
        const { error: deleteError } = await supabase
          .from('PackageProducts')
          .delete()
          .eq('packageid', editingPackage.id);

        if (deleteError) throw deleteError;

        // Add updated products
        for (const product of packageData.selectedProducts) {
          if (!product || !product.id) {
            console.error('Producto sin ID válido al actualizar paquete:', product);
            continue; // Skip invalid products
          }

          const { error: productError } = await supabase
            .from('PackageProducts')
            .insert({
              id: `pp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              packageid: editingPackage.id,
              productid: product.id,
              quantity: product.quantity
            });

          if (productError) throw productError;
        }
      } else {
        // Create new package
        const packageId = `pkg_${Date.now()}`;
        const { data: packageDataDB, error: packageError } = await supabase
          .from('Packages')
          .insert({
            id: packageId,
            tenantid: tenantId,
            name: packageData.name,
            description: packageData.description,
            price: parseFloat(packageData.price) || 0,
            promotionprice: packageData.ispromotion ? parseFloat(packageData.promotionprice) || null : null,
            ispromotion: packageData.ispromotion,
            isactive: true
          })
          .select()
          .single();

        if (packageError) throw packageError;

        // Add products to package
        for (const product of packageData.selectedProducts) {
          if (!product || !product.id) {
            console.error('Producto sin ID válido al crear paquete:', product);
            continue; // Skip invalid products
          }

          const { error: productError } = await supabase
            .from('PackageProducts')
            .insert({
              id: `pp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              packageid: packageId,
              productid: product.id,
              quantity: product.quantity
            });

          if (productError) throw productError;
        }
      }

      // Reload packages from database with enriched data
      const { data: packagesData, error: loadError } = await supabase
        .from('Packages')
        .select(`
          *,
          PackageProducts (
            productid,
            quantity
          )
        `)
        .eq('isactive', true)
        .order('createdat', { ascending: false });

      if (loadError) throw loadError;
      
      // Enrich packages with product names
      const enrichedPackages = await Promise.all((packagesData || []).map(async (pkg) => {
        const productIds = pkg.PackageProducts.map((pp: any) => pp.productid);
        const { data: products } = await supabase
          .from('Product')
          .select('id, name')
          .in('id', productIds);
        
        return {
          ...pkg,
          products: pkg.PackageProducts.map((pp: any) => ({
            id: pp.productid,
            productid: pp.productid,
            productname: products?.find((p: any) => p.id === pp.productid)?.name || 'Producto desconocido',
            name: products?.find((p: any) => p.id === pp.productid)?.name || 'Producto desconocido',
            quantity: pp.quantity
          }))
        };
      }));

      setPackages(enrichedPackages || []);

      setPackageData({
        name: '',
        description: '',
        price: '',
        promotionprice: '',
        ispromotion: false,
        selectedProducts: []
      });
      setEditingPackage(null);
      setShowPackageDialog(false);
      setMessage({ type: 'success', text: editingPackage ? 'Paquete actualizado exitosamente' : 'Paquete creado exitosamente' });
    } catch (error: any) {
      console.error('Error creating package:', error);
      setMessage({ type: 'error', text: error.message || 'Error al crear paquete' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Indicator */}
      {stockFilter !== 'all' && (
        <div className="flex items-center justify-between bg-cyan-50 border border-cyan-200 rounded-lg p-2 mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-cyan-600" />
            <span className="text-sm font-medium text-cyan-800">
              {stockFilter === 'low' ? 'Mostrando productos con stock bajo' : 'Mostrando productos agotados'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStockFilter('all')}
            className="text-cyan-600 border-blue-300 hover:bg-cyan-100"
          >
            Limpiar filtro
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">
            Gestiona productos, existencias y movimientos
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={showTenantReport ? "default" : "outline"}
            onClick={() => setShowTenantReport(!showTenantReport)}
            className={showTenantReport ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
          >
            {showTenantReport ? (
              <>
                <Package className="h-4 w-4 mr-2" />
                Gestionar Inventario
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Reporte por Tenant
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Acciones
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBulkImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Productos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPackageDialog(true)}>
                <Package className="h-4 w-4 mr-2" />
                Crear Paquete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCategoryDialog(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Gestionar Categorías
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={showPackageDialog} onOpenChange={(open) => {
            setShowPackageDialog(open);
            if (!open) {
              setEditingPackage(null);
              setPackageData({ name: '', description: '', price: '', promotionprice: '', ispromotion: false, selectedProducts: [] });
            }
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPackage ? 'Editar Paquete de Productos' : 'Crear Paquete de Productos'}</DialogTitle>
                <DialogDescription>
                  {editingPackage ? 'Modifica los productos y detalles del paquete' : 'Combina múltiples productos para crear un paquete o kit especial'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreatePackage} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="packageName">Nombre del Paquete *</Label>
                    <Input
                      id="packageName"
                      value={packageData.name}
                      onChange={(e) => setPackageData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Kit de Limpieza Dental"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="packagePrice">Precio del Paquete (L)</Label>
                    <Input
                      id="packagePrice"
                      type="number"
                      step="0.01"
                      value={packageData.price}
                      onChange={(e) => setPackageData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="packagePromotion"
                      checked={packageData.ispromotion}
                      onChange={(e) => setPackageData(prev => ({ ...prev, ispromotion: e.target.checked }))}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <Label htmlFor="packagePromotion" className="flex items-center space-x-2 cursor-pointer">
                      <Tag className="h-4 w-4 text-orange-600" />
                      <span>Poner en Promoción</span>
                    </Label>
                  </div>
                  {packageData.ispromotion && (
                    <div>
                      <Label htmlFor="promotionPrice">Precio Promocional (L) <span className="text-orange-600 font-medium">- Precio original: L {packageData.price}</span></Label>
                      <Input
                        id="promotionPrice"
                        type="number"
                        step="0.01"
                        value={packageData.promotionprice}
                        onChange={(e) => setPackageData(prev => ({ ...prev, promotionprice: e.target.value }))}
                        placeholder="Precio en promoción"
                        className="border-orange-300 focus:ring-orange-500"
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="packageDescription">Descripción</Label>
                  <Textarea
                    id="packageDescription"
                    value={packageData.description}
                    onChange={(e) => setPackageData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe qué incluye este paquete..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Available Products */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Productos Disponibles</h3>
                    <div key="available-products" className="border rounded-lg max-h-64 overflow-y-auto">
                      {products.filter(p => p.stock > 0).map((product, index) => {
                        const isInPackage = packageData.selectedProducts.some(p => p.id === product.id);
                        return (
                          <div
                            key={`available-product-${index}`}
                            className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                              isInPackage ? 'bg-green-50' : ''
                            }`}
                            onClick={() => handleAddProductToPackage(product)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-500">{product.category} · Stock: {product.stock}</p>
                                {product.expirationDate && (
                                  <p className="text-xs text-orange-600">
                                    Expira: {new Date(product.expirationDate).toLocaleDateString('es-HN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                )}
                                {(product as any).isDiscount && (product as any).discountPrice ? (
                                  <>
                                    <p className="text-sm text-gray-400 line-through">L {product.price}</p>
                                    <p className="text-sm text-orange-600 font-medium">L {(product as any).discountPrice}</p>
                                  </>
                                ) : (
                                  <p className="text-sm text-cyan-600">L {product.price}</p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={isInPackage ? 'bg-green-100' : ''}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {products.filter(p => p.stock > 0).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p>No hay productos disponibles con stock</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Products */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Productos en el Paquete ({packageData.selectedProducts.length})
                    </h3>
                    <div key="selected-products" className="border rounded-lg max-h-64 overflow-y-auto">
                      {packageData.selectedProducts.map((product, index) => (
                        <div key={`product-${index}`} className="p-3 border-b">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500">Cantidad: {product.quantity}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                min="1"
                                value={product.quantity}
                                onChange={(e) => handleUpdateProductQuantity(product.id, parseInt(e.target.value) || 1)}
                                className="w-16 h-8"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveProductFromPackage(product.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {packageData.selectedProducts.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p>Selecciona productos del listado izquierdo</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowPackageDialog(false);
                    setEditingPackage(null);
                    setPackageData({ name: '', description: '', price: '', promotionprice: '', ispromotion: false, selectedProducts: [] });
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={packageData.selectedProducts.length === 0}>
                    <Package className="h-4 w-4 mr-2" />
                    {editingPackage ? 'Actualizar Paquete' : 'Crear Paquete'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={showCategoryDialog} onOpenChange={(open) => {
    setShowCategoryDialog(open);
    if (!open) {
      setEditingCategory(null);
      setCategoryData({ name: '', description: '' });
    }
  }}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gestionar Categorías</DialogTitle>
                <DialogDescription>
                  Administra todas las categorías de productos: agrega, edita o elimina
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Add/Edit Category Form */}
                <div className={`border-b pb-4 ${editingCategory ? 'bg-cyan-50 border-cyan-200 rounded-lg p-4' : ''}`} data-edit-form="true">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">
                      {editingCategory ? 'Editar Categoría' : 'Agregar Nueva Categoría'}
                    </h3>
                    {editingCategory && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(null);
                          setCategoryData({ name: '', description: '' });
                        }}
                        className="flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Nueva Categoría
                      </Button>
                    )}
                  </div>
                  <form onSubmit={handleAddCategory} className="space-y-4">
                    <div>
                      <Label htmlFor="categoryName">Nombre de la Categoría *</Label>
                      <Input
                        id="categoryName"
                        value={categoryData.name}
                        onChange={(e) => setCategoryData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ej: Insumos Médicos"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoryDescription">Descripción (Opcional)</Label>
                      <Textarea
                        id="categoryDescription"
                        value={categoryData.description}
                        onChange={(e) => setCategoryData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción breve de la categoría"
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowCategoryDialog(false);
                          setEditingCategory(null);
                          setCategoryData({ name: '', description: '' });
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingCategory ? (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Actualizar Categoría
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Categoría
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Existing Categories */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Categorías Existentes</h3>
                  <div key="categories-list" className="space-y-2">
                    {categories.map((category, index) => {
                      const productCount = products.filter(p => p.category === category).length;
                      return (
                        <div key={`category-${index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <div>
                              <p className="font-medium">{category}</p>
                              <p className="text-sm text-gray-500">{productCount} productos</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                              className="flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCategory(category)}
                              className="text-red-600 hover:text-red-700 flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {categories.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Tag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p>No hay categorías registradas</p>
                        <p className="text-sm mt-2">Usa el formulario de arriba para agregar tu primera categoría</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct 
                    ? 'Modifica los datos del producto existente'
                    : 'Agrega un nuevo producto al inventario'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Se generará automáticamente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Nombre del Producto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        validateField('name', e.target.value);
                      }}
                      placeholder="Nombre del producto"
                      className={fieldErrors.name ? 'border-red-500' : ''}
                      required
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="category">Categoría *</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'OTRO') {
                          setShowCustomCategory(true);
                          setFormData(prev => ({ ...prev, category: '' }));
                        } else {
                          setShowCustomCategory(false);
                          setFormData(prev => ({ ...prev, category: value }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                      <option value="OTRO">Otro (especificar)</option>
                    </select>
                    {showCustomCategory && (
                      <Input
                        id="customCategory"
                        value={customCategory}
                        onChange={(e) => {
                          setCustomCategory(e.target.value);
                          setFormData(prev => ({ ...prev, category: e.target.value }));
                        }}
                        placeholder="Especificar categoría personalizada"
                        className="mt-2"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="unit">Unidad *</Label>
                    <select
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'OTRO') {
                          setShowCustomUnit(true);
                          setFormData(prev => ({ ...prev, unit: '' }));
                        } else {
                          setShowCustomUnit(false);
                          setFormData(prev => ({ ...prev, unit: value }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    >
                      <option value="">Seleccionar unidad</option>
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                      <option value="OTRO">Otro (especificar)</option>
                    </select>
                    {showCustomUnit && (
                      <Input
                        id="customUnit"
                        value={customUnit}
                        onChange={(e) => {
                          setCustomUnit(e.target.value);
                          setFormData(prev => ({ ...prev, unit: e.target.value }));
                        }}
                        placeholder="Especificar unidad personalizada"
                        className="mt-2"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="supplierId">Proveedor</Label>
                    <select
                      id="supplierId"
                      value={formData.supplierId}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Sin proveedor</option>
                      {suppliers.map((s:any)=>(
                        <option key={s.id} value={s.id}>{s.name} {s.rtn ? `- ${s.rtn}` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="precioTotal">Precio Total *</Label>
                    <Input
                      id="precioTotal"
                      type="number"
                      step="0.01"
                      value={formData.precioTotal}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, precioTotal: e.target.value }));
                        updateCostFromTotal();
                        validateField('precioTotal', e.target.value);
                      }}
                      placeholder="0.00"
                      className={fieldErrors.precioTotal ? 'border-red-500' : ''}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Precio total de la compra
                    </p>
                    {fieldErrors.precioTotal && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.precioTotal}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="nuevoStock">Unidades Nuevas *</Label>
                    <Input
                      id="nuevoStock"
                      type="number"
                      value={formData.nuevoStock}
                      onChange={(e) => {
                        console.log('onChange nuevoStock - valor del input:', e.target.value);
                        console.log('onChange nuevoStock - formData antes:', formData.nuevoStock);
                        setFormData(prev => ({ ...prev, nuevoStock: e.target.value }));
                        
                        // Usar el valor actual del input para el cálculo inmediato
                        const currentValue = e.target.value;
                        const precioTotal = formData.precioTotal;
                        console.log('Calculando con valores actuales:', { precioTotal, currentValue });
                        
                        if (precioTotal && currentValue) {
                          const total = parseFloat(precioTotal) || 0;
                          const unidades = parseFloat(currentValue) || 0;
                          console.log('Detalles del cálculo:', {
                            precioTotal,
                            currentValue,
                            total,
                            unidades,
                            division: total / unidades
                          });
                          if (unidades > 0) {
                            const calculatedCost = (total / unidades).toFixed(2);
                            console.log('Costo calculado inmediato:', calculatedCost);
                            setFormData(prev => ({ ...prev, cost: calculatedCost }));
                          }
                        }
                        
                        console.log('onChange nuevoStock - formData después (puede no estar actualizado aún):', formData.nuevoStock);
                        validateField('nuevoStock', e.target.value);
                      }}
                      placeholder="0"
                      className={fieldErrors.nuevoStock ? 'border-red-500' : ''}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Cantidad de unidades compradas
                    </p>
                    {fieldErrors.nuevoStock && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.nuevoStock}</p>
                    )}
                    <div className="mt-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-cyan-700">Resumen de Stock:</span>
                      <Badge variant="outline" className="bg-cyan-100 text-cyan-800">
                        {calculateTotalStock()} unidades
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unidades Nuevas:</span>
                        <span className="font-medium text-green-600">{parseInt(formData.nuevoStock || '0')} unidades</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-700">Stock Total:</span>
                        <span className="text-cyan-700">{calculateTotalStock()} unidades</span>
                      </div>
                    </div>
                  </div>
                  </div>
                  <div>
                    <Label htmlFor="cost">Costo Unitario (Calculado)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se calcula automáticamente: Precio Total ÷ Unidades Nuevas
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="price">Precio de Venta *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, price: e.target.value }));
                        validateField('price', e.target.value);
                      }}
                      placeholder="0.00"
                      className={fieldErrors.price ? 'border-red-500' : ''}
                      required
                    />
                    {fieldErrors.price && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.price}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="productDiscount"
                      checked={formData.isDiscount}
                      onChange={(e) => setFormData(prev => ({ ...prev, isDiscount: e.target.checked }))}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <Label htmlFor="productDiscount" className="flex items-center space-x-2 cursor-pointer">
                      <Tag className="h-4 w-4 text-orange-600" />
                      <span>Poner en Descuento</span>
                    </Label>
                  </div>
                  {formData.isDiscount && (
                    <div>
                      <Label htmlFor="discountPrice">Precio con Descuento (L) <span className="text-orange-600 font-medium">- Precio original: L {formData.price}</span></Label>
                      <Input
                        id="discountPrice"
                        type="number"
                        step="0.01"
                        value={formData.discountPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountPrice: e.target.value }))}
                        placeholder="Precio con descuento"
                        className="border-orange-300 focus:ring-orange-500"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="minstock">Stock Mínimo *</Label>
                    <Input
                      id="minstock"
                      type="number"
                      value={formData.minstock}
                      onChange={(e) => setFormData(prev => ({ ...prev, minstock: e.target.value }))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expirationDate">Fecha de Expiración</Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={formData.expirationDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags">Etiquetas</Label>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          id="newTag"
                          type="text"
                          placeholder="Agregar etiqueta..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              const tag = input.value.trim();
                              if (tag && !formData.tags.includes(tag)) {
                                setFormData(prev => ({
                                  ...prev,
                                  tags: [...prev.tags, tag]
                                }));
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById('newTag') as HTMLInputElement;
                            const tag = input.value.trim();
                            if (tag && !formData.tags.includes(tag)) {
                              setFormData(prev => ({
                                ...prev,
                                tags: [...prev.tags, tag]
                              }));
                              input.value = '';
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div key="tags-list" className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <div
                            key={`tag-${index}`}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-cyan-100 text-cyan-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  tags: prev.tags.filter((_, i) => i !== index)
                                }));
                              }}
                              className="ml-2 text-cyan-600 hover:text-cyan-800"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Presiona Enter o clic en + para agregar etiquetas
                      </p>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción detallada del producto"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Guardar')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Inventory Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Boxes className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              {products.filter(p => p.isActive).length} activos
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              {stockFilter === 'low' ? 'Mostrando productos con stock bajo' : 'Necesitan reabastecimiento'}
            </p>
            {stockFilter === 'low' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setStockFilter('all');
                }}
              >
                Mostrar todos
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agotados</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              {stockFilter === 'out' ? 'Mostrando productos agotados' : 'Sin existencias'}
            </p>
            {stockFilter === 'out' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setStockFilter('all');
                }}
              >
                Mostrar todos
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Lps. {products.reduce((sum, p) => sum + (p.stock * p.cost), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor del inventario
            </p>
          </CardContent>
        </Card>
        {/* Promotions Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promociones Activas</CardTitle>
            <Tag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {products.filter(p => p.isDiscount).length + packages.filter(p => p.ispromotion).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de promociones activas
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Productos en descuento:</span>
                <span className="font-medium">{products.filter(p => p.isDiscount).length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Paquetes en promoción:</span>
                <span className="font-medium">{packages.filter(p => p.ispromotion).length}</span>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="w-full mt-2 border-orange-600 text-orange-600 hover:bg-orange-50"
              onClick={() => setActiveTab('promotions')}
            >
              Ver Promociones
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Categories Management */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsCategoriesCollapsed(!isCategoriesCollapsed)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              <CardTitle>Categorías de Productos</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); setShowCategoryDialog(true); }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1" /> Crear categoría
              </Button>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{categories.length}</span>
                <span>·</span>
                <span>{products.filter(p => categories.includes(p.category)).length} productos</span>
              </div>
              {isCategoriesCollapsed ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              )}
            </div>
          </div>
          <CardDescription>
            {isCategoriesCollapsed 
              ? "Clic para expandir y gestionar categorías" 
              : "Gestiona las categorías disponibles para organizar tu inventario"
            }
          </CardDescription>
        </CardHeader>
        {!isCategoriesCollapsed && (
          <CardContent>
            <div className="space-y-4">
              <div key="categories-badges" className="flex flex-wrap gap-2">
                {categories.map((category, index) => {
                  const productCount = products.filter(p => p.category === category).length;
                  return (
                    <div
                      key={`category-badge-${index}`}
                      className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <span className="text-sm font-medium">{category}</span>
                      <span className="ml-2 text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                        {productCount}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category);
                        }}
                        className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                        title="Eliminar categoría"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>Total categorías: {categories.length}</span>
                  <span>Productos categorizados: {products.filter(p => categories.includes(p.category)).length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tab Buttons */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={activeTab === 'inventory' ? 'default' : 'outline'}
          onClick={() => setActiveTab('inventory')}
          className={activeTab === 'inventory' ? 'bg-cyan-600' : ''}
        >
          <Boxes className="h-4 w-4 mr-2" />
          Inventario
        </Button>
        <Button
          variant={activeTab === 'packages' ? 'default' : 'outline'}
          onClick={() => setActiveTab('packages')}
          className={activeTab === 'packages' ? 'bg-green-600' : ''}
        >
          <Package className="h-4 w-4 mr-2" />
          Paquetes
        </Button>
        <Button
          variant={activeTab === 'promotions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('promotions')}
          className={activeTab === 'promotions' ? 'bg-orange-600' : ''}
        >
          <Tag className="h-4 w-4 mr-2" />
          Promociones
        </Button>
        <Button
          variant={activeTab === 'suppliers' ? 'default' : 'outline'}
          onClick={() => setActiveTab('suppliers' as any)}
          className={activeTab === 'suppliers' ? 'bg-blue-600' : ''}
        >
          <User className="h-4 w-4 mr-2" />
          Proveedores
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && (
        <>
      {/* Search and Filters */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, SKU, categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-r-none"
              >
                <Package className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-l"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-l-none border-l"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs">Categoría</Label>
              <select value={stockFilter === 'all' ? 'all' : stockFilter} onChange={e=>setStockFilter(e.target.value as any)} className="w-full mt-1 p-2 border rounded-md text-sm bg-white">
                <option value="all">Todas las categorías</option>
                {categories.map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Estado de Stock</Label>
              <select value={stockFilter} onChange={e=>setStockFilter(e.target.value as any)} className="w-full mt-1 p-2 border rounded-md text-sm bg-white">
                <option value="all">Todo el stock</option>
                <option value="low">Stock bajo (≤ mínimo)</option>
                <option value="out">Agotados (0)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Categoría exacta</Label>
              <select onChange={e=>setSearchTerm(e.target.value)} value={categories.includes(searchTerm) ? searchTerm : ""} className="w-full mt-1 p-2 border rounded-md text-sm bg-white">
                <option value="">Todas</option>
                {categories.map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" className="w-full" onClick={()=>{setSearchTerm(""); setStockFilter("all");}}>
                <Filter className="h-4 w-4 mr-2" /> Limpiar filtros
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Filtra por categoría (usa búsqueda para SKU/stock)</p>
        </CardContent>
      </Card>

      {/* Product List */}
      {viewMode === 'cards' ? (
        <div key="products-cards" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product, index) => {
            const stockStatus = getStockStatus(product);
            const isExpired = isDateExpired(product.promotionEndDate);
            const showDiscount = (product as any).isDiscount && !isExpired;
            return (
              <Card key={product.id} className="hover:shadow-lg transition-shadow p-3">
                <CardHeader className="pb-1 p-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-1">
                      <div className={`w-1 h-1 rounded-full bg-${stockStatus.color}-500`}></div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-xs">{product.name}</CardTitle>
                          {showDiscount && (
                            <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5">
                              Descuento
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs opacity-70">
                          SKU: {product.sku}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={stockStatus.status === 'normal' ? 'default' : 'secondary'} className="text-xs h-4">
                      {stockStatus.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 space-y-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Categoría:</span>
                      <span className="text-xs">{product.category}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Stock:</span>
                      <span className={`font-medium text-xs ${stockStatus.status === 'out' ? 'text-red-600' : stockStatus.status === 'low' ? 'text-orange-600' : 'text-green-600'}`}>
                        {product.stock} {product.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Valor:</span>
                      <span className="font-medium text-cyan-600 text-xs">
                        Lps. {(product.stock * product.cost).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Precio:</span>
                      {showDiscount && (product as any).discountPrice ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 line-through text-xs">Lps. {product.price.toFixed(2)}</span>
                          <span className="font-medium text-xs text-orange-600">Lps. {(product as any).discountPrice.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="font-medium text-xs">Lps. {product.price.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Margen:</span>
                      <span className={`font-medium text-xs ${product.price > product.cost ? 'text-green-600' : 'text-red-600'}`}>
                        {product.price > product.cost ? '+' : ''}
                        {Math.abs(((product.price - product.cost) / product.cost * 100)).toFixed(1)}%
                      </span>
                    </div>
                    {product.tags && product.tags.length > 0 && (
                      <div key={`product-tags-${product.id}`} className="flex flex-wrap gap-1 pt-1">
                        {product.tags.slice(0, 2).map((tag, index) => (
                          <span key={`tag-${index}`} className="inline-block px-2 py-0.5 text-xs bg-cyan-100 text-cyan-800 rounded-full">
                            {tag}
                          </span>
                        ))}
                        {product.tags.length > 2 && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{product.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t mt-1">
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleViewDetails(product)}
                      >
                        <Eye className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowMovementDialog(true);
                        }}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-5 w-5 p-0">
                          <MoreHorizontal className="h-2.5 w-2.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(product.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        <div key="products-list" className="space-y-2">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            const isExpired = isDateExpired(product.promotionEndDate);
            const showDiscount = (product as any).isDiscount && !isExpired;
            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-3 h-3 rounded-full bg-${stockStatus.color}-500`}></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-lg">{product.name}</h3>
                          {showDiscount && (
                            <Badge className="bg-orange-500 text-white text-xs">
                              Descuento
                            </Badge>
                          )}
                          <Badge variant={stockStatus.status === 'normal' ? 'default' : 'secondary'} className="text-xs">
                            {stockStatus.text}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600 mt-1">
                          <span>SKU: {product.sku}</span>
                          <span>Categoría: {product.category}</span>
                          <span>Unidad: {product.unit}</span>
                        </div>
                        {product.description && (
                          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                        )}
                        {product.expirationDate && (
                          <p className="text-xs text-orange-600 mt-1">
                            Expira: {new Date(product.expirationDate).toLocaleDateString('es-HN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`font-semibold ${stockStatus.status === 'out' ? 'text-red-600' : stockStatus.status === 'low' ? 'text-orange-600' : 'text-green-600'}`}>
                          {product.stock} {product.unit}
                        </div>
                        <div className="text-sm text-gray-500">Stock</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-cyan-600">
                          Lps. {(product.stock * product.cost).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">Valor</div>
                      </div>
                      <div className="text-right">
                        {showDiscount && (product as any).discountPrice ? (
                          <>
                            <div className="text-gray-400 line-through text-sm">Lps. {product.price.toFixed(2)}</div>
                            <div className="font-semibold text-orange-600">Lps. {(product as any).discountPrice.toFixed(2)}</div>
                          </>
                        ) : (
                          <div className="font-semibold">Lps. {product.price.toFixed(2)}</div>
                        )}
                        <div className="text-sm text-gray-500">Precio</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${product.price > product.cost ? 'text-green-600' : 'text-red-600'}`}>
                          {product.price > product.cost ? '+' : ''}
                          {Math.abs(((product.price - product.cost) / product.cost * 100)).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">Margen</div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowMovementDialog(true);
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Stock
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody key="products-table-body" className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const isExpired = isDateExpired(product.promotionEndDate);
                    const showDiscount = (product as any).isDiscount && !isExpired;
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full bg-${stockStatus.color}-500 mr-3`}></div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                              <div className="flex items-center space-x-2 mt-1">
                                {showDiscount && (
                                  <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5">
                                    Descuento
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.category}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`font-medium ${stockStatus.status === 'out' ? 'text-red-600' : stockStatus.status === 'low' ? 'text-orange-600' : 'text-green-600'}`}>
                            {product.stock} {product.unit}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-medium text-cyan-600">
                            Lps. {(product.stock * product.cost).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          Lps. {product.cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {showDiscount && (product as any).discountPrice ? (
                            <div>
                              <span className="text-gray-400 line-through text-xs">Lps. {product.price.toFixed(2)}</span>
                              <span className="font-medium text-orange-600"> Lps. {(product as any).discountPrice.toFixed(2)}</span>
                            </div>
                          ) : (
                            <span>Lps. {product.price.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant={stockStatus.status === 'normal' ? 'default' : 'secondary'}>
                            {stockStatus.text}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowMovementDialog(true);
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? `No hay productos que coincidan con "${searchTerm}"`
              : 'Empieza agregando tu primer producto'
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowAddDialog(true)} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Producto
            </Button>
          )}
        </div>
      )}
        </>
      )}

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Paquetes de Productos</h2>
            <Dialog open={showPackageDialog} onOpenChange={(open) => {
              setShowPackageDialog(open);
              if (!open) {
                setEditingPackage(null);
                setPackageData({ name: '', description: '', price: '', promotionprice: '', ispromotion: false, selectedProducts: [] });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Package className="h-4 w-4 mr-2" />
                  Crear Paquete
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
          {packages.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No hay paquetes creados</h3>
              <p className="text-sm text-gray-500">Crea tu primer paquete combinando múltiples productos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{pkg.name}</span>
                      {pkg.ispromotion && (
                        <Badge className="bg-orange-500 text-white">En Promoción</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
                    <div className="flex items-center space-x-2 mb-2">
                      {pkg.ispromotion && pkg.promotionprice ? (
                        <>
                          <span className="text-gray-400 line-through">L {pkg.price}</span>
                          <span className="text-orange-600 font-bold">L {pkg.promotionprice}</span>
                        </>
                      ) : (
                        <span className="text-green-600 font-bold">L {pkg.price}</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditPackage(pkg)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeletePackage(pkg.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Promotions Tab */}
      {activeTab === 'promotions' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Promociones Activas</h2>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-orange-600">
                {products.filter(p => p.isDiscount).length + packages.filter(p => p.ispromotion).length} promociones
              </Badge>
              <Dialog 
                key={`${selectedPromotionProduct?.id || selectedPromotionPackage?.id || 'new'}-${promotionData.isDiscount}`}
                open={showPromotionDialog} 
                onOpenChange={(open) => {
                  setShowPromotionDialog(open);
                  if (!open) {
                    setSelectedPromotionProduct(null);
                    setSelectedPromotionPackage(null);
                    setPromotionTargetType('product');
                    setPromotionData({ discountPrice: '', isDiscount: false, promotionStartDate: '', promotionEndDate: '' });
                  }
                }}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Tag className="h-4 w-4 mr-2" />
                    Agregar Promoción
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{selectedPromotionProduct?.isDiscount || selectedPromotionPackage?.ispromotion ? 'Modificar Promoción' : 'Agregar Promoción'}</DialogTitle>
                    <DialogDescription>
                      Selecciona un producto del inventario o un paquete para activar o modificar su promoción
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleApplyPromotion} className="space-y-6">
                    <div>
                      <Label>Tipo de Promoción</Label>
                      <div className="flex space-x-4 mt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="targetType"
                            value="product"
                            checked={promotionTargetType === 'product'}
                            onChange={(e) => setPromotionTargetType(e.target.value as 'product' | 'package')}
                            className="w-4 h-4 text-orange-600"
                          />
                          <span>Producto</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="targetType"
                            value="package"
                            checked={promotionTargetType === 'package'}
                            onChange={(e) => setPromotionTargetType(e.target.value as 'product' | 'package')}
                            className="w-4 h-4 text-orange-600"
                          />
                          <span>Paquete</span>
                        </label>
                      </div>
                    </div>
                    {promotionTargetType === 'product' && (
                      <div>
                        <Label htmlFor="productSelect">Seleccionar Producto</Label>
                        <select
                          id="productSelect"
                          value={selectedPromotionProduct?.id || ''}
                          onChange={(e) => {
                            const product = products.find(p => p.id === e.target.value);
                            if (product) {
                              const startDate = (product as any).promotionStartDate;
                              const endDate = (product as any).promotionEndDate;
                              
                              console.log('Fechas del producto seleccionado con timezone:', {
                                promotionStartDate: startDate,
                                promotionEndDate: endDate,
                                formattedStart: formatDateForInput(startDate),
                                formattedEnd: formatDateForInput(endDate)
                              });
                              
                              setSelectedPromotionProduct(product);
                              setPromotionData({
                                discountPrice: (product as any).discountPrice?.toString() || '',
                                isDiscount: product.isDiscount || false,
                                promotionStartDate: formatDateForInput(startDate),
                                promotionEndDate: formatDateForInput(endDate)
                              });
                            }
                          }}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          required
                        >
                          <option value="">Seleccionar producto...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - L {product.price.toFixed(2)} - Stock: {product.stock}
                              {product.isDiscount && ' (En promoción)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {promotionTargetType === 'package' && (
                      <div>
                        <Label htmlFor="packageSelect">Seleccionar Paquete</Label>
                        <select
                          id="packageSelect"
                          value={selectedPromotionPackage?.id || ''}
                          onChange={(e) => {
                            const pkg = packages.find(p => p.id === e.target.value);
                            if (pkg) {
                              const startDate = pkg.promotionstartdate;
                              const endDate = pkg.promotionenddate;
                              
                              console.log('Fechas del paquete seleccionado con timezone:', {
                                promotionStartDate: startDate,
                                promotionEndDate: endDate,
                                formattedStart: formatDateForInput(startDate),
                                formattedEnd: formatDateForInput(endDate)
                              });
                              
                              setSelectedPromotionPackage(pkg);
                              setPromotionData({
                                discountPrice: pkg.promotionprice?.toString() || '',
                                isDiscount: pkg.ispromotion || false,
                                promotionStartDate: formatDateForInput(startDate),
                                promotionEndDate: formatDateForInput(endDate)
                              });
                            }
                          }}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          required
                        >
                          <option value="">Seleccionar paquete...</option>
                          {packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} - L {pkg.price}
                              {pkg.ispromotion && ' (En promoción)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {(selectedPromotionProduct || selectedPromotionPackage) && (
                      <>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="promotionActive"
                            checked={promotionData.isDiscount}
                            onChange={(e) => setPromotionData(prev => ({ ...prev, isDiscount: e.target.checked }))}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <Label htmlFor="promotionActive" className="flex items-center space-x-2 cursor-pointer">
                            <Tag className="h-4 w-4 text-orange-600" />
                            <span>Poner en Promoción</span>
                          </Label>
                        </div>
                        {promotionData.isDiscount && (
                          <>
                            <div>
                              <Label htmlFor="promotionPrice">
                                Precio con Promoción (L)
                                <span className="text-orange-600 font-medium">
                                  - Precio original: L {promotionTargetType === 'product' ? selectedPromotionProduct?.price.toFixed(2) : selectedPromotionPackage?.price}
                                </span>
                              </Label>
                              <Input
                                id="promotionPrice"
                                type="number"
                                step="0.01"
                                value={promotionData.discountPrice}
                                onChange={(e) => setPromotionData(prev => ({ ...prev, discountPrice: e.target.value }))}
                                placeholder="Precio con promoción"
                                className="border-orange-300 focus:ring-orange-500"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="promotionStartDate">Fecha de Inicio</Label>
                                <input
                                  id="promotionStartDate"
                                  type="date"
                                  defaultValue={promotionData.promotionStartDate || ''}
                                  onChange={(e) => {
                                    console.log('Cambiando fecha de inicio:', e.target.value);
                                    setPromotionData(prev => ({ ...prev, promotionStartDate: e.target.value }));
                                  }}
                                  className="w-full mt-1 px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                              <div>
                                <Label htmlFor="promotionEndDate">Fecha de Finalización</Label>
                                <input
                                  id="promotionEndDate"
                                  type="date"
                                  defaultValue={promotionData.promotionEndDate || ''}
                                  onChange={(e) => setPromotionData(prev => ({ ...prev, promotionEndDate: e.target.value }))}
                                  className="w-full mt-1 px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                            </div>
                          </>
                        )}
                        {!promotionData.isDiscount && (selectedPromotionProduct?.isDiscount || selectedPromotionPackage?.ispromotion) && (
                          <p className="text-sm text-orange-600">
                            ⚠️ Al guardar, se quitará la promoción actual
                          </p>
                        )}
                      </>
                    )}
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowPromotionDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={!selectedPromotionProduct && !selectedPromotionPackage}>
                        {promotionData.isDiscount ? 'Aplicar Promoción' : 'Guardar Cambios'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {products.filter(p => p.isDiscount).length === 0 && packages.filter(p => p.ispromotion).length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No hay promociones activas</h3>
              <p className="text-sm text-gray-500">Activa descuentos en productos o paquetes para promocionarlos</p>
            </div>
          ) : (
            <div className="space-y-6">
              {products.filter(p => p.isDiscount).length > 0 && (
                <Collapsible open={productsExpanded} onOpenChange={setProductsExpanded}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                        <Tag className="h-5 w-5 mr-2 text-orange-600" />
                        Productos en Descuento
                        <Badge className="ml-2 bg-orange-100 text-orange-800">
                          {products.filter(p => p.isDiscount).length}
                        </Badge>
                      </h3>
                      <ChevronDown 
                        className={`h-5 w-5 text-gray-500 transition-transform ${productsExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products.filter(p => p.isDiscount).map((product) => {
                      const isExpired = isDateExpired(product.promotionEndDate);
                      return (
                      <Card key={product.id} className={`hover:shadow-lg transition-shadow ${isExpired ? 'opacity-75' : ''}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{product.name}</span>
                            {(product as any).isDiscount && (product as any).discountPrice ? (
                              <Badge className="bg-orange-500 text-white text-xs">Descuento</Badge>
                            ) : null}
                            {isExpired && (
                              <Badge className="bg-red-500 text-white text-xs">Expirada</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-gray-400 line-through">L {product.price.toFixed(2)}</span>
                            <span className="text-orange-600 font-bold text-lg">L {(product as any).discountPrice?.toFixed(2)}</span>
                          </div>
                          <p className="text-sm text-gray-500">{product.category}</p>
                          <p className="text-sm text-gray-500">Stock: {product.stock} {product.unit}</p>
                          {product.expirationDate && (
                            <p className="text-xs text-orange-600">
                              Expira: {new Date(product.expirationDate).toLocaleDateString('es-HN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                          {product.promotionStartDate && (
                            <p className="text-xs text-cyan-600">
                              Promoción: {formatDateRange(product.promotionStartDate, product.promotionEndDate)}
                            </p>
                          )}
                          <div className="flex space-x-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => handleOpenPromotionDialog(product)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Modificar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      );
                    })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
              {packages.filter(p => p.ispromotion).length > 0 && (
                <Collapsible open={packagesExpanded} onOpenChange={setPackagesExpanded}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-orange-600" />
                        Paquetes en Promoción
                        <Badge className="ml-2 bg-orange-100 text-orange-800">
                          {packages.filter(p => p.ispromotion).length}
                        </Badge>
                      </h3>
                      <ChevronDown 
                        className={`h-5 w-5 text-gray-500 transition-transform ${packagesExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {packages.filter(p => p.ispromotion).map((pkg) => {
                      const isExpired = isDateExpired(pkg.promotionenddate);
                      return (
                      <Card key={pkg.id} className={`hover:shadow-lg transition-shadow ${isExpired ? 'opacity-75' : ''}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{pkg.name}</span>
                            <Badge className="bg-orange-500 text-white text-xs">Promoción</Badge>
                            {isExpired && (
                              <Badge className="bg-red-500 text-white text-xs">Expirada</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-gray-400 line-through">L {pkg.price}</span>
                            <span className="text-orange-600 font-bold text-lg">L {pkg.promotionprice}</span>
                          </div>
                          <p className="text-sm text-gray-500">{pkg.description}</p>
                          <p className="text-sm text-gray-500">{pkg.products?.length || 0} productos</p>
                          {pkg.promotionstartdate && (
                            <p className="text-xs text-cyan-600">
                              Promoción: {formatDateRange(pkg.promotionstartdate, pkg.promotionenddate)}
                            </p>
                          )}
                          <div className="flex space-x-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              const startDate = pkg.promotionstartdate;
                              const endDate = pkg.promotionenddate;
                              
                              console.log('Fechas del paquete con timezone:', {
                                promotionStartDate: startDate,
                                promotionEndDate: endDate,
                                formattedStart: formatDateForInput(startDate),
                                formattedEnd: formatDateForInput(endDate)
                              });
                              
                              setSelectedPromotionPackage(pkg);
                              setPromotionTargetType('package');
                              setPromotionData({
                                discountPrice: pkg.promotionprice?.toString() || '',
                                isDiscount: pkg.ispromotion || false,
                                promotionStartDate: formatDateForInput(startDate),
                                promotionEndDate: formatDateForInput(endDate)
                              });
                              setShowPromotionDialog(true);
                            }}>
                              <Edit className="h-4 w-4 mr-1" />
                              Modificar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      );
                    })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'suppliers' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Proveedores</CardTitle>
              <p className="text-sm text-muted-foreground">Gestiona los proveedores de tu inventario ({suppliers.length})</p>
            </div>
            <Button onClick={() => window.open(`/companies/${tenantId}/suppliers`, '_self')}>
              <Plus className="h-4 w-4 mr-2" /> Ver proveedores
            </Button>
          </CardHeader>
          <CardContent>
            {suppliers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay proveedores registrados para este tenant</p>
                <p className="text-xs">Agrega uno desde el formulario de producto o ve a Proveedores</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map((s:any)=>(
                  <Card key={s.id} className="hover:shadow-md">
                    <CardContent className="p-4">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.rtn || s.email || ""}</p>
                      <p className="text-xs text-muted-foreground">{s.phone || ""}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
            <DialogDescription>
              {selectedProduct && `Registrar movimiento para ${selectedProduct.name}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMovement} className="space-y-4">
            <div>
              <Label htmlFor="type">Tipo de Movimiento</Label>
              <select
                id="type"
                value={movementData.type}
                onChange={(e) => setMovementData(prev => ({ ...prev, type: e.target.value as 'IN' | 'OUT' | 'ADJUSTMENT' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="IN">Entrada</option>
                <option value="OUT">Salida</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </select>
            </div>
            <div>
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                value={movementData.quantity}
                onChange={(e) => setMovementData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="reason">Motivo *</Label>
              <Input
                id="reason"
                value={movementData.reason}
                onChange={(e) => setMovementData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Ej: Compra, Venta, Uso interno"
                required
              />
            </div>
            <div>
              <Label htmlFor="reference">Referencia</Label>
              <Input
                id="reference"
                value={movementData.reference}
                onChange={(e) => setMovementData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Ej: Factura #001"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowMovementDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Registrar Movimiento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Producto</DialogTitle>
            <DialogDescription>
              {selectedProduct && `Información completa de ${selectedProduct.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <Tabs defaultValue="informacion" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="informacion">Información</TabsTrigger>
                <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
                <TabsTrigger value="descuentos">Descuentos</TabsTrigger>
              </TabsList>

              <TabsContent value="informacion" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">SKU</Label>
                      <p className="text-lg font-mono bg-gray-100 px-3 py-2 rounded">
                        {selectedProduct.sku}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Nombre</Label>
                      <p className="text-lg">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Categoría</Label>
                      <p className="text-lg">{selectedProduct.category}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Unidad</Label>
                      <p className="text-lg">{selectedProduct.unit}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Stock</Label>
                      <p className="text-lg font-bold">{selectedProduct.stock} {selectedProduct.unit}</p>
                      <p className="text-xs text-gray-500">
                        (Calculado: {calculateStockFromMovements(selectedProduct.id)} {selectedProduct.unit})
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Stock Mínimo</Label>
                      <p className="text-lg">{selectedProduct.minstock || 0} {selectedProduct.unit}</p>
                    </div>
                    {selectedProduct.expirationDate && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Fecha de Expiración</Label>
                        <p className="text-lg">
                          {new Date(selectedProduct.expirationDate).toLocaleDateString('es-HN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Estado</Label>
                      <Badge variant={getStockStatus(selectedProduct).status === 'normal' ? 'default' : 'secondary'}>
                        {getStockStatus(selectedProduct).text}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Costo Unitario</Label>
                    <p className="text-lg font-bold text-cyan-600">Lps. {selectedProduct.cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Precio de Venta</Label>
                    {(selectedProduct as any).isDiscount && (selectedProduct as any).discountPrice ? (
                      <>
                        <p className="text-lg text-gray-400 line-through">Lps. {selectedProduct.price.toFixed(2)}</p>
                        <p className="text-lg font-bold text-orange-600">Lps. {(selectedProduct as any).discountPrice.toFixed(2)}</p>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-green-600">Lps. {selectedProduct.price.toFixed(2)}</p>
                    )}
                  </div>
                </div>
                {selectedProduct.description && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Descripción</Label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}
                {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Etiquetas</Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                      {selectedProduct.tags.map((tag, index) => (
                        <span key={index} className="inline-block px-3 py-1 text-sm bg-cyan-100 text-cyan-800 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="movimientos" className="space-y-4">
                <div className="space-y-2">
                  {movements
                    .filter(m => m.productid === selectedProduct.id)
                    .map((movement) => (
                      <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            movement.type === 'IN' ? 'bg-green-500' : 
                            movement.type === 'OUT' ? 'bg-red-500' : 'bg-cyan-500'
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium">
                              {movement.type === 'IN' ? 'Entrada' : movement.type === 'OUT' ? 'Salida' : 'Ajuste'}
                            </p>
                            <p className="text-xs text-gray-500">{movement.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {movement.type === 'OUT' ? '-' : '+'}{movement.quantity} {selectedProduct.unit}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(movement.createdat).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  {movements.filter(m => m.productid === selectedProduct.id).length === 0 && (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No hay movimientos registrados</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="descuentos" className="space-y-4">
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold mb-2">Pestaña de Descuentos</h3>
                  <p className="text-sm text-gray-600 mb-4">Esta es la pestaña de descuentos - ¡Funciona!</p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Descuentos Activos</h3>
                    <Button
                      onClick={() => setShowAddDiscountDialog(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Descuento
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {discounts.map((discount) => (
                      <div key={discount.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <div>
                            <p className="text-sm font-medium">{discount.percentage}% de descuento</p>
                            <p className="text-xs text-gray-500">{discount.reason}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(discount.startDate).toLocaleDateString()} - {new Date(discount.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={discount.isActive ? 'default' : 'secondary'}>
                            {discount.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDiscount(discount.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {discounts.length === 0 && (
                      <div className="text-center py-8">
                        <Tag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No hay descuentos registrados</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Discount Dialog */}
      <Dialog open={showAddDiscountDialog} onOpenChange={setShowAddDiscountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Descuento</DialogTitle>
            <DialogDescription>
              Agregar un nuevo descuento para {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDiscount} className="space-y-4">
            <div>
              <Label htmlFor="percentage">Porcentaje de Descuento (%)</Label>
              <Input
                id="percentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountData.percentage}
                onChange={(e) => setDiscountData(prev => ({ ...prev, percentage: e.target.value }))}
                placeholder="10.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="reason">Razón del Descuento</Label>
              <Input
                id="reason"
                value={discountData.reason}
                onChange={(e) => setDiscountData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Descuento por volumen"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Fecha de Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={discountData.startDate}
                  onChange={(e) => setDiscountData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">Fecha de Fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={discountData.endDate}
                  onChange={(e) => setDiscountData(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDiscountDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Agregar Descuento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImportDialog} onOpenChange={(open) => {
        setShowBulkImportDialog(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Productos Masivamente</DialogTitle>
            <DialogDescription>
              Importa múltiples productos desde un archivo Excel o CSV
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Selecciona un archivo</h3>
                <p className="text-sm text-gray-600">
                  Formatos soportados: Excel (.xlsx, .xls) y CSV (.csv)
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                id="bulk-import-file"
                onChange={handleBulkImport}
              />
              <Button 
                onClick={() => document.getElementById('bulk-import-file')?.click()}
                className="mt-4"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar Archivo
              </Button>
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Formato del Archivo:</h4>
              <p className="text-sm text-cyan-800 mb-2">
                Tu archivo debe contener las siguientes columnas en este orden:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-cyan-700">
                <div><strong>Nombre*</strong> - Nombre del producto</div>
                <div><strong>Categoría*</strong> - Categoría del producto</div>
                <div><strong>Precio*</strong> - Precio de venta</div>
                <div><strong>Stock*</strong> - Cantidad inicial</div>
                <div><strong>Costo</strong> - Costo del producto (opcional)</div>
                <div><strong>Descripción</strong> - Descripción (opcional)</div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Consejos:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li> Las columnas con * son obligatorias</li>
                <li> Usa categorías existentes o crea nuevas automáticamente</li>
                <li> Los productos con nombres duplicados serán ignorados</li>
                <li> El precio y stock deben ser números válidos</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowBulkImportDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                // Descargar plantilla
                const templateData = [
                  ['Nombre', 'Categoría', 'Precio', 'Stock', 'Costo', 'Descripción'],
                  ['Ejemplo: Laptop Pro', 'Electrónica', '15000', '10', '12000', 'Laptop de alto rendimiento']
                ];
                const csvContent = templateData.map(row => row.join(',')).join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'plantilla_productos.csv';
                a.click();
                window.URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reporte de Inventario por Empresa - al final */}
      {showTenantReport && (
        <div className="bg-white rounded-lg border shadow-sm mt-8">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Reporte de Inventario por Empresa</h2>
              <p className="text-sm text-gray-500">Productos totales y espacio de almacenamiento usado</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTenantReport} disabled={loadingReport}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingReport ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          {loadingReport ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : tenantReport.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>No hay datos de inventario por empresa</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Empresa</th>
                    <th className="text-center px-6 py-3 font-medium text-gray-600">Productos</th>
                    <th className="text-center px-6 py-3 font-medium text-gray-600">Movimientos</th>
                    <th className="text-center px-6 py-3 font-medium text-gray-600">Registros Totales</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-600">Almacenamiento Usado</th>
                    <th className="text-center px-6 py-3 font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantReport.map((t: any) => (
                    <tr key={t.tenantId} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">{t.businessName}</div>
                        <div className="text-xs text-gray-500">{t.tenantCode}</div>
                      </td>
                      <td className="px-6 py-3 text-center font-semibold text-lg">{t.totalProducts}</td>
                      <td className="px-6 py-3 text-center text-gray-600">{t.totalMovements}</td>
                      <td className="px-6 py-3 text-center font-medium">{t.totalRecords}</td>
                      <td className="px-6 py-3 text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 font-medium text-sm">
                          {t.storageUsed}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-6 py-3">TOTALES</td>
                    <td className="px-6 py-3 text-center text-lg">{tenantReport.reduce((s: number, t: any) => s + t.totalProducts, 0)}</td>
                    <td className="px-6 py-3 text-center">{tenantReport.reduce((s: number, t: any) => s + t.totalMovements, 0)}</td>
                    <td className="px-6 py-3 text-center">{tenantReport.reduce((s: number, t: any) => s + t.totalRecords, 0)}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 font-medium text-sm">
                        {formatBytes(tenantReport.reduce((s: number, t: any) => s + t.storageBytes, 0))}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
