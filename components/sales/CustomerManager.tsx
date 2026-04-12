"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  User,
  Phone,
  Mail,
  Search
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface CustomerManagerProps {
  tenantId: string;
}

interface Customer {
  id: string;
  rtn: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

export default function CustomerManager({ tenantId }: CustomerManagerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    rtn: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    creditLimit: 0
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadCustomers();
  }, [tenantId]);

  useEffect(() => {
    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.rtn.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Customer")
        .select("*")
        .eq("tenantId", tenantId)
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error("Error loading customers:", error);
      alert("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name || !formData.rtn) {
        alert("Por favor complete el nombre y RTN");
        return;
      }

      const customerData = {
        tenantId,
        rtn: formData.rtn,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        creditLimit: formData.creditLimit * 100 // Convertir a centavos
      };

      if (editingCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from("Customer")
          .update(customerData)
          .eq("id", editingCustomer.id);

        if (error) throw error;
        alert("Cliente actualizado exitosamente");
      } else {
        // Create new customer
        const { error } = await supabase
          .from("Customer")
          .insert(customerData);

        if (error) throw error;
        alert("Cliente creado exitosamente");
      }

      // Reset form
      setFormData({
        rtn: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        creditLimit: 0
      });
      setEditingCustomer(null);
      setShowForm(false);
      loadCustomers();
    } catch (error: any) {
      console.error("Error saving customer:", error);
      alert(error.message || "Error al guardar cliente");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      rtn: customer.rtn,
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      creditLimit: customer.creditLimit / 100
    });
    setShowForm(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`¿Está seguro de eliminar al cliente ${customer.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("Customer")
        .delete()
        .eq("id", customer.id);

      if (error) throw error;
      alert("Cliente eliminado exitosamente");
      loadCustomers();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      alert("Error al eliminar cliente");
    }
  };

  const toggleStatus = async (customer: Customer) => {
    try {
      const { error } = await supabase
        .from("Customer")
        .update({ isActive: !customer.isActive })
        .eq("id", customer.id);

      if (error) throw error;
      loadCustomers();
    } catch (error: any) {
      console.error("Error toggling customer status:", error);
      alert("Error al cambiar estado del cliente");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y botón agregar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, RTN o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Formulario de cliente */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
            </CardTitle>
            <CardDescription>
              {editingCustomer ? "Modifique los datos del cliente" : "Ingrese los datos del nuevo cliente"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rtn">RTN *</Label>
                  <Input
                    id="rtn"
                    value={formData.rtn}
                    onChange={(e) => setFormData({ ...formData, rtn: e.target.value })}
                    placeholder="0801-XXXX-XXXXXX"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre completo del cliente"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+504 XXXX-XXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Dirección completa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditLimit">Límite de Crédito (L.)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : (editingCustomer ? "Actualizar" : "Guardar")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes ({filteredCustomers.length})</CardTitle>
          <CardDescription>
            Gestione sus clientes y controle las cuentas por cobrar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando clientes...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron clientes
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RTN
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Límite de Crédito
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance Actual
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{customer.rtn}</td>
                      <td className="px-4 py-3 text-sm font-medium">{customer.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {customer.email ? (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {customer.email}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {customer.phone ? (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {customer.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        L. {(customer.creditLimit / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${
                          customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          L. {(customer.currentBalance / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={customer.isActive ? "default" : "secondary"}>
                          {customer.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatus(customer)}
                            className={customer.isActive ? "text-yellow-600" : "text-green-600"}
                          >
                            <User className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(customer)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
