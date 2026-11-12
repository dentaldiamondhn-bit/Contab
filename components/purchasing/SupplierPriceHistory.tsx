"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Trash2,
  Edit,
  Search,
  History,
} from "lucide-react";

interface PriceHistoryItem {
  id: string;
  supplier_id: string;
  product_id?: string | null;
  price: number;
  currency: string;
  effective_date: string;
  expiry_date?: string | null;
  notes?: string | null;
  created_at: string;
  supplier?: { id: string; name: string; rtn: string } | null;
}

interface SupplierPriceHistoryProps {
  supplierId: string;
  readOnly?: boolean;
}

// NOTA: este componente NO lleva `companyId` ni `tenantId`.
//
// Antes llevaba `tenantId` y lo mandaba como `?companyId=` en la carga de
// productos, que es la confusion mas cara del proyecto (los dos identificadores
// NO son intercambiables: `companies.id` vs `Tenant.id`). El valor que llegaba
// era correcto de casualidad, porque quien lo montaba pasaba el `[id]` de la
// ruta, que es un `companies.id`, con nombre de tenant.
//
// Y en cualquier caso la ruta `/api/inventory/products` **ignora `?companyId` a
// proposito**: la empresa sale del contexto validado, porque ese parametro lo
// manda el cliente y asi cualquier usuario autenticado podia leer datos de otra
// empresa. Ver la cabecera de `app/api/inventory/products/route.ts`.
//
// O sea: el parametro no hacia falta para aislar y ademas era misleading.
// Las rutas de compras/proveedores tampoco lo necesitan, porque la empresa la
// saca del contexto validado (`exigirEmpresa(await contextoDeEmpresa(request))`).
export default function SupplierPriceHistory({ supplierId, readOnly = false }: SupplierPriceHistoryProps) {
  const [items, setItems] = useState<PriceHistoryItem[]>([]);
  const [productItems, setProductItems] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PriceHistoryItem | null>(null);
  const [form, setForm] = useState({
    product_id: "",
    price: "",
    effective_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    notes: "",
  });

  useEffect(() => {
    loadPriceHistory();
    loadProducts();
  }, [supplierId]);

  // `supplierId` es lo unico que cambia entre proveedores, asi que recargar con
  // el es lo correcto. Antes no habia ninguna dependencia de empresa aqui, y por
  // eso no se veia que el fetch mandaba un identificador que la ruta ignora.

  const loadPriceHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/price-history?supplierId=${supplierId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error loading price history:", error);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  const loadProducts = async () => {
    try {
      // Sin `?companyId`: la ruta toma la empresa del contexto validado y descarta
    // ese parametro a proposito.
    const res = await fetch(`/api/inventory/products?limit=200`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setProductItems(
          list.map((p: any) => ({
            id: p.id,
            name: p.name || p.product_name || "",
            code: p.code || p.product_code || "",
          }))
        );
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleSave = async () => {
    if (!form.price || parseFloat(form.price) <= 0) {
      alert("Ingrese un precio válido");
      return;
    }

    try {
      const payload = {
        supplier_id: supplierId,
        product_id: form.product_id || null,
        price: parseFloat(form.price),
        effective_date: form.effective_date,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
        id: editing?.id,
      };

      const res = await fetch("/api/suppliers/price-history", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        resetForm();
        loadPriceHistory();
      } else {
        const error = await res.json();
        alert("Error: " + (error.error || "No se pudo guardar"));
      }
    } catch (error) {
      console.error("Error saving price history:", error);
      alert("Error al guardar el precio");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro de precio?")) return;
    try {
      const res = await fetch(`/api/suppliers/price-history?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadPriceHistory();
      } else {
        alert("Error al eliminar");
      }
    } catch (error) {
      console.error("Error deleting price:", error);
    }
  };

  const openEdit = (item: PriceHistoryItem) => {
    setEditing(item);
    setForm({
      product_id: item.product_id || "",
      price: String(item.price),
      effective_date: item.effective_date.split("T")[0],
      expiry_date: item.expiry_date ? item.expiry_date.split("T")[0] : "",
      notes: item.notes || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      product_id: "",
      price: "",
      effective_date: new Date().toISOString().split("T")[0],
      expiry_date: "",
      notes: "",
    });
  };

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      String(item.notes || "").toLowerCase().includes(term) ||
      String(item.price).includes(term) ||
      String(productItems.find((p) => p.id === item.product_id)?.name || "").toLowerCase().includes(term)
    );
  });

  const sortedItems = [...filteredItems].sort(
    (a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
  );

  const formatPrice = (price: number) =>
    `L. ${price.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderTrend = (index: number) => {
    if (index >= sortedItems.length - 1) return null;
    const current = Number(sortedItems[index].price);
    const prev = Number(sortedItems[index + 1].price);
    if (current === prev) return <Minus className="h-4 w-4 text-gray-400" />;
    if (current > prev) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-cyan-600" />
          <div>
            <h3 className="font-semibold">Historial de Precios por Proveedor</h3>
            <p className="text-sm text-gray-500">
              Evolución de precios de productos de este proveedor
            </p>
          </div>
        </div>
        {!readOnly && (
          <Button
            onClick={() => {
              setEditing(null);
              resetForm();
              setShowForm(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Precio
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por producto, precio o nota..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando historial...</div>
          ) : sortedItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay registros de precios para este proveedor.
              <br />
              <span className="text-sm">Los precios se registran automáticamente al crear compras.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Tendencia</TableHead>
                  <TableHead>Fecha Vigencia</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Nota</TableHead>
                  {!readOnly && <TableHead className="text-center">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item, index) => {
                  const product = productItems.find((p) => p.id === item.product_id);
                  const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date();
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {product?.name || (item.product_id ? item.product_id : "—")}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPrice(Number(item.price))}
                      </TableCell>
                      <TableCell>{renderTrend(index)}</TableCell>
                      <TableCell>{new Date(item.effective_date).toLocaleDateString("es-HN")}</TableCell>
                      <TableCell>
                        {item.expiry_date ? (
                          <Badge variant={isExpired ? "destructive" : "outline"}>
                            {isExpired
                              ? "Vencido"
                              : new Date(item.expiry_date).toLocaleDateString("es-HN")}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                        {item.notes || ""}
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Precio" : "Nuevo Precio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full p-2 border rounded-md bg-white"
              >
                <option value="">— Sin producto específico —</option>
                {productItems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Precio (L.) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Vigencia *</Label>
                <Input
                  type="date"
                  value={form.effective_date}
                  onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Vencimiento</Label>
                <Input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nota</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ej: Precio por factura COMP-001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}