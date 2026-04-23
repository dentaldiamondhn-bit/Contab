# Integración de Paquetes con Frontend

## Archivos SQL Creados

1. **CREATE_PACKAGES_TABLE.sql** - Estructura de tablas y políticas RLS
2. **PACKAGES_FUNCTIONS.sql** - Funciones y consultas especializadas

## Estructura de la Base de Datos

### Tablas Principales

```sql
-- Paquetes de productos
Packages (
    id: TEXT (PRIMARY KEY)
    tenantid: TEXT
    name: TEXT
    description: TEXT
    price: DECIMAL(10,2)
    isactive: BOOLEAN
    createdat: TIMESTAMP
    updatedat: TIMESTAMP
)

-- Relación paquete-producto
PackageProducts (
    id: TEXT (PRIMARY KEY)
    packageid: TEXT (FOREIGN KEY)
    productid: TEXT (FOREIGN KEY)
    quantity: INTEGER
    createdat: TIMESTAMP
)
```

## Integración con Supabase

### 1. Crear el tipo en TypeScript

```typescript
// types/package.ts
export interface Package {
  id: string;
  tenantid: string;
  name: string;
  description?: string;
  price: number;
  isactive: boolean;
  createdat: string;
  updatedat: string;
  products?: PackageProduct[];
}

export interface PackageProduct {
  id: string;
  packageid: string;
  productid: string;
  quantity: number;
  createdat: string;
  product_name?: string;
  product_sku?: string;
  product_price?: number;
}
```

### 2. API Routes para Paquetes

```typescript
// app/api/packages/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Establecer el tenant context para RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    const { data, error } = await supabase
      .from('Packages')
      .select(`
        *,
        PackageProducts (
          productid,
          quantity,
          Products (
            id,
            name,
            sku,
            price,
            stock
          )
        )
      `)
      .eq('isactive', true)
      .order('createdat', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, name, description, price, products } = body;

    if (!tenantId || !name || !products || products.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: tenantId, name, products' 
      }, { status: 400 });
    }

    // Establecer el tenant context para RLS
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // Usar la función PostgreSQL para crear el paquete
    const { data, error } = await supabase.rpc('create_package_with_products', {
      p_tenantid: tenantId,
      p_name: name,
      p_description: description,
      p_price: price,
      p_products: JSON.stringify(products)
    });

    if (error) throw error;

    return NextResponse.json({ 
      success: data[0].success, 
      message: data[0].message,
      package_id: data[0].package_id 
    });
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}
```

### 3. Componente React para Paquetes

```typescript
// components/packages/PackageManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Plus, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface PackageData {
  name: string;
  description: string;
  price: string;
  selectedProducts: Array<{id: string, name: string, quantity: number}>;
}

export function PackageManager({ products, tenantId }: { products: Product[], tenantId: string }) {
  const [showDialog, setShowDialog] = useState(false);
  const [packageData, setPackageData] = useState<PackageData>({
    name: '',
    description: '',
    price: '',
    selectedProducts: []
  });

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: packageData.name,
          description: packageData.description,
          price: parseFloat(packageData.price) || 0,
          products: packageData.selectedProducts.map(p => ({
            productid: p.id,
            quantity: p.quantity
          }))
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Reset form
        setPackageData({
          name: '',
          description: '',
          price: '',
          selectedProducts: []
        });
        setShowDialog(false);
        // Show success message
        console.log('Package created successfully');
      } else {
        console.error('Failed to create package:', result.message);
      }
    } catch (error) {
      console.error('Error creating package:', error);
    }
  };

  const addProductToPackage = (product: Product) => {
    const existing = packageData.selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setPackageData(prev => ({
        ...prev,
        selectedProducts: prev.selectedProducts.map(p => 
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      }));
    } else {
      setPackageData(prev => ({
        ...prev,
        selectedProducts: [...prev.selectedProducts, {
          id: product.id,
          name: product.name,
          quantity: 1
        }]
      }));
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Package className="h-4 w-4 mr-2" />
          Crear Paquete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Paquete de Productos</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleCreatePackage} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Paquete *</label>
              <Input
                value={packageData.name}
                onChange={(e) => setPackageData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Kit de Limpieza Dental"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Precio del Paquete (L)</label>
              <Input
                type="number"
                step="0.01"
                value={packageData.price}
                onChange={(e) => setPackageData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <Textarea
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
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {products.filter(p => p.stock > 0).map((product) => {
                  const isInPackage = packageData.selectedProducts.some(p => p.id === product.id);
                  return (
                    <div
                      key={product.id}
                      className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                        isInPackage ? 'bg-green-50' : ''
                      }`}
                      onClick={() => addProductToPackage(product)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.category} · Stock: {product.stock}</p>
                          <p className="text-sm text-blue-600">L {product.price}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Products */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Productos en el Paquete ({packageData.selectedProducts.length})
              </h3>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {packageData.selectedProducts.map((product) => (
                  <div key={product.id} className="p-3 border-b">
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
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            setPackageData(prev => ({
                              ...prev,
                              selectedProducts: prev.selectedProducts.map(p => 
                                p.id === product.id ? { ...p, quantity: newQuantity } : p
                              )
                            }));
                          }}
                          className="w-16 h-8"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPackageData(prev => ({
                              ...prev,
                              selectedProducts: prev.selectedProducts.filter(p => p.id !== product.id)
                            }));
                          }}
                          className="text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={packageData.selectedProducts.length === 0}>
              <Package className="h-4 w-4 mr-2" />
              Crear Paquete
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Ejecución del SQL

### 1. Ejecutar las tablas
```bash
# En la consola de Supabase o psql
\i CREATE_PACKAGES_TABLE.sql
```

### 2. Ejecutar las funciones
```bash
\i PACKAGES_FUNCTIONS.sql
```

### 3. Verificar la creación
```sql
-- Verificar tablas
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('Packages', 'PackageProducts');

-- Verificar funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%package%';
```

## Flujo Completo

1. **Usuario abre el diálogo de paquetes**
2. **Selecciona productos** del inventario
3. **Configura cantidades** y precio del paquete
4. **Frontend llama a `/api/packages` con POST**
5. **API usa la función `create_package_with_products`**
6. **PostgreSQL valida** stock, tenant, duplicados
7. **Se crea el paquete** y sus relaciones
8. **Frontend muestra** mensaje de éxito

## Consideraciones Importantes

- **RLS**: Todas las operaciones están protegidas por tenant
- **Stock**: Se valida stock disponible al crear paquetes
- **Transacciones**: Las operaciones son atómicas
- **Escalabilidad**: Índices optimizados para consultas
- **Seguridad**: Validaciones múltiples en DB y frontend
