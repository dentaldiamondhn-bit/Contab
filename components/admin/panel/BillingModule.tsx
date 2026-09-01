"use client";

import { useEffect, useState } from "react";

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  features: string[];
  modules: any[];
  isActive: boolean;
  tenantCount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  customerName: string;
  invoiceType: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  invoiceDate: string;
  dueDate?: string;
}

export default function BillingModule() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"plans" | "invoices" | "payments">("plans");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({ name: "", code: "", price: 0, maxUsers: 5, maxStorage: 100, maxTransactions: 10000, features: "" });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceTenant, setInvoiceTenant] = useState("");
  const [invoiceType, setInvoiceType] = useState("SUBSCRIPTION");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchInvoices = async () => {
    if (!invoiceTenant) return;
    setLoadingInvoices(true);
    try {
      const params = new URLSearchParams({ tenantId: invoiceTenant, type: invoiceType, limit: "50" });
      const res = await fetch(`/api/admin/billing/invoices?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingInvoices(false); }
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      const method = editingPlan ? "PATCH" : "POST";
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : "/api/admin/plans";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...planForm,
          features: planForm.features.split(",").map((f) => f.trim()).filter(Boolean),
        }),
      });
      setEditingPlan(null);
      setPlanForm({ name: "", code: "", price: 0, maxUsers: 5, maxStorage: 100, maxTransactions: 10000, features: "" });
      fetchPlans();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm("¿Eliminar este plan?")) return;
    try {
      await fetch(`/api/admin/plans/${planId}`, { method: "DELETE" });
      fetchPlans();
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">💳 Planes y Facturación del Software (SaaS)</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión de planes, suscripciones, cobros e historial de facturación</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { key: "plans", label: "Planes y Suscripciones" },
          { key: "invoices", label: "Historial de Facturas" },
          { key: "payments", label: "Pasarelas de Pago" },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-cyan-500 text-cyan-600 bg-cyan-50" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plans" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">{plans.length} planes configurados</span>
            <button onClick={() => { setEditingPlan(null); setPlanForm({ name: "", code: "", price: 0, maxUsers: 5, maxStorage: 100, maxTransactions: 10000, features: "" }); }}
              className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ Nuevo Plan</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className={`bg-white rounded-lg shadow border-2 p-5 ${plan.isActive ? "border-green-200" : "border-gray-200 opacity-60"}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                    <span className="text-xs font-mono text-gray-500">{plan.code}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${plan.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {plan.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="text-3xl font-bold text-cyan-600 mb-3">L. {plan.price.toLocaleString()}<span className="text-sm font-normal text-gray-500">/mes</span></div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between"><span>Usuarios máx:</span><span className="font-medium">{plan.maxUsers}</span></div>
                  <div className="flex justify-between"><span>Almacenamiento:</span><span className="font-medium">{plan.maxStorage} GB</span></div>
                  <div className="flex justify-between"><span>Transacciones:</span><span className="font-medium">{plan.maxTransactions.toLocaleString()}/mes</span></div>
                  <div className="flex justify-between"><span>Empresas:</span><span className="font-medium">{plan.tenantCount || 0}</span></div>
                </div>
                {plan.features && plan.features.length > 0 && (
                  <div className="border-t pt-3 mb-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Características:</div>
                    <div className="flex flex-wrap gap-1">
                      {plan.features.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-xs rounded">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setEditingPlan(plan); setPlanForm({ name: plan.name, code: plan.code, price: plan.price, maxUsers: plan.maxUsers, maxStorage: plan.maxStorage, maxTransactions: plan.maxTransactions, features: plan.features?.join(", ") || "" }); }}
                    className="flex-1 px-3 py-1.5 text-xs border rounded hover:bg-gray-50">Editar</button>
                  <button onClick={() => deletePlan(plan.id)} className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50">Eliminar</button>
                </div>
              </div>
            ))}
          </div>

          {(editingPlan || plans.length >= 0) && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{editingPlan ? `Editar: ${editingPlan.name}` : "Crear Nuevo Plan"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre *</label>
                  <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Código *</label>
                  <input value={planForm.code} onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Precio (L./mes)</label>
                  <input type="number" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Usuarios</label>
                  <input type="number" value={planForm.maxUsers} onChange={(e) => setPlanForm({ ...planForm, maxUsers: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Almacenamiento (GB)</label>
                  <input type="number" value={planForm.maxStorage} onChange={(e) => setPlanForm({ ...planForm, maxStorage: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Transacciones</label>
                  <input type="number" value={planForm.maxTransactions} onChange={(e) => setPlanForm({ ...planForm, maxTransactions: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Características (separadas por coma)</label>
                  <input value={planForm.features} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Contabilidad, Inventario, Reportes" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                {editingPlan && (
                  <button onClick={() => { setEditingPlan(null); setPlanForm({ name: "", code: "", price: 0, maxUsers: 5, maxStorage: 100, maxTransactions: 10000, features: "" }); }}
                    className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
                )}
                <button onClick={savePlan} disabled={saving || !planForm.name || !planForm.code}
                  className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? "Guardando..." : editingPlan ? "Actualizar Plan" : "Crear Plan"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "invoices" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Historial de Cobros y Facturas</h3>
          <div className="flex gap-3 mb-4">
            <input value={invoiceTenant} onChange={(e) => setInvoiceTenant(e.target.value)}
              placeholder="Tenant ID" className="px-3 py-2 border rounded-lg text-sm flex-1" />
            <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="SUBSCRIPTION">Suscripción</option>
              <option value="CUSTOMER">Cliente</option>
              <option value="EXPENSE">Gasto</option>
            </select>
            <button onClick={fetchInvoices} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700">Buscar</button>
          </div>
          {loadingInvoices ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" /></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">📄</p>
              <p>Ingresa un Tenant ID para ver sus facturas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Factura</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm">{inv.invoiceType}</td>
                      <td className="px-4 py-3 text-sm">{inv.customerName}</td>
                      <td className="px-4 py-3 text-sm">{inv.invoiceDate}</td>
                      <td className="px-4 py-3 text-sm font-medium">L. {inv.total?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          inv.status === "PAID" || inv.status === "ACTIVE" ? "bg-green-100 text-green-800" :
                          inv.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                          inv.status === "OVERDUE" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pasarelas de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Stripe", status: "Configurar", icon: "💳", desc: "Procesamiento de tarjetas de crédito/débito" },
              { name: "PayPal", status: "Configurar", icon: "🅿️", desc: "Pagos internacionales y billetera digital" },
              { name: "MercadoPago", status: "Configurar", icon: "🟦", desc: "Pagos para Latinoamérica" },
            ].map((gw) => (
              <div key={gw.name} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{gw.icon}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{gw.name}</h4>
                    <span className="text-xs text-yellow-600 font-medium">{gw.status}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-3">{gw.desc}</p>
                <button className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Configurar Integración</button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">La integración con pasarelas de pago requiere configuración de credenciales API desde el panel de cada proveedor.</p>
        </div>
      )}
    </div>
  );
}
