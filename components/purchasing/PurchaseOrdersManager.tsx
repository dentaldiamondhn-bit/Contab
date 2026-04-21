"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface PurchaseOrdersManagerProps {
  tenantId: string;
}

export default function PurchaseOrdersManager({ tenantId }: PurchaseOrdersManagerProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadPurchaseOrders();
  }, [tenantId]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });
      const { data, error } = await supabase
        .from('PurchaseOrder')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <ShoppingCart className="h-6 w-6 mr-2 text-orange-600" />
            Ordenes de Compra
          </h2>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Ordenes</CardTitle>
          <CardDescription>
            {orders.length} ordenes encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay ordenes registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left">Numero</th>
                    <th className="border border-gray-200 px-4 py-3 text-left">Estado</th>
                    <th className="border border-gray-200 px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3">{order.orderNumber}</td>
                      <td className="border border-gray-200 px-4 py-3">
                        <Badge variant="secondary">{order.status}</Badge>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right">
                        L. {(order.totalAmount / 100).toFixed(2)}
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
