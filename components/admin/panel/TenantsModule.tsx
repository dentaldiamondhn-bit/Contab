"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Tenant {
  id: string;
  businessName: string;
  tenantCode: string;
  businessEmail: string;
  businessRTN: string;
  businessAddress: string;
  phoneNumber: string;
  subscriptionPlans: any[];
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  monthlyCost: number;
  isActive: boolean;
  modules: string[];
  totalUsers: number;
  activeUsers: number;
  createdAt?: string;
}

export default function TenantsModule() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showLimits, setShowLimits] = useState<Tenant | null>(null);
  const [limitsForm, setLimitsForm] = useState({ maxUsers: 5, maxStorage: 100, maxTransactions: 10000, monthlyCost: 0 });
  const [savingLimits, setSavingLimits] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    businessName: "", businessRTN: "", businessEmail: "", businessAddress: "", phoneNumber: "",
    maxUsers: 5, maxStorage: 100, maxTransactions: 10000,
  });
  const [creating, setCreating] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => { fetchTenants(); }, [page, statusFilter]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "15", status: statusFilter });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/tenants?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalItems(data.pagination?.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (id: string) => {
    try {
      await fetch(`/api/admin/tenants/${id}/toggle`, { method: "PATCH" });
      fetchTenants();
    } catch (e) { console.error(e); }
  };

  const saveLimits = async () => {
    if (!showLimits) return;
    setSavingLimits(true);
    try {
      await fetch(`/api/admin/tenants/${showLimits.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(limitsForm),
      });
      setShowLimits(null);
      fetchTenants();
    } catch (e) { console.error(e); }
    finally { setSavingLimits(false); }
  };

  const createTenant = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setCreateForm({ businessName: "", businessRTN: "", businessEmail: "", businessAddress: "", phoneNumber: "", maxUsers: 5, maxStorage: 100, maxTransactions: 10000 });
        fetchTenants();
      }
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  const impersonateTenant = async (tenant: Tenant) => {
    setImpersonating(tenant.id);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/impersonate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.redirectUrl) window.location.href = data.redirectUrl;
        else window.location.href = `/dashboard?tenant=${tenant.tenantCode}`;
      } else {
        window.location.href = `/dashboard?tenant=${tenant.tenantCode}`;
      }
    } catch { window.location.href = `/dashboard?tenant=${tenant.tenantCode}`; }
  };

  const filtered = tenants.filter(
    (t) => t.businessName.toLowerCase().includes(search.toLowerCase()) ||
      t.tenantCode.toLowerCase().includes(search.toLowerCase()) ||
      t.businessEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🏢 Gestión de Empresas / Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">Alta, baja, suspensión, configuración de límites y suplantación</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Nueva Empresa
        </button>
      </div>

      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
          <input
            type="text" placeholder="Buscar por nombre, código o email..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTenants()}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <span className="text-sm text-gray-500">{totalItems} empresas</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuarios</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Almacenamiento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No se encontraron empresas</td></tr>
                ) : filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{t.businessName}</div>
                      <div className="text-xs text-gray-500">{t.businessEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{t.tenantCode}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800">
                        {Array.isArray(t.subscriptionPlans) && t.subscriptionPlans.length > 0
                          ? t.subscriptionPlans.map((p: any) => p.code || p).join(", ")
                          : "Sin plan"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.activeUsers || 0}/{t.maxUsers}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.maxStorage} GB</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {t.isActive ? "Activo" : "Suspendido"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-1">
                      <Link href={`/admin/tenants/${t.id}`} className="text-cyan-600 hover:text-cyan-800 text-xs">Ver</Link>
                      <button onClick={() => { setShowLimits(t); setLimitsForm({ maxUsers: t.maxUsers, maxStorage: t.maxStorage, maxTransactions: t.maxTransactions, monthlyCost: t.monthlyCost }); }}
                        className="text-purple-600 hover:text-purple-800 text-xs ml-2">Límites</button>
                      <button onClick={() => impersonateTenant(t)} disabled={impersonating === t.id}
                        className="text-orange-600 hover:text-orange-800 text-xs ml-2 disabled:opacity-50">
                        {impersonating === t.id ? "Entrando..." : "Entrar"}
                      </button>
                      <button onClick={() => toggleStatus(t.id)}
                        className={`${t.isActive ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"} text-xs ml-2`}>
                        {t.isActive ? "Suspender" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50">Anterior</button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {showLimits && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Configurar Límites — {showLimits.businessName}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Máximo Usuarios</label>
                <input type="number" value={limitsForm.maxUsers} onChange={(e) => setLimitsForm({ ...limitsForm, maxUsers: +e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Almacenamiento (GB)</label>
                <input type="number" value={limitsForm.maxStorage} onChange={(e) => setLimitsForm({ ...limitsForm, maxStorage: +e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Máx. Transacciones/mes</label>
                <input type="number" value={limitsForm.maxTransactions} onChange={(e) => setLimitsForm({ ...limitsForm, maxTransactions: +e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Costo Mensual (L.)</label>
                <input type="number" value={limitsForm.monthlyCost} onChange={(e) => setLimitsForm({ ...limitsForm, monthlyCost: +e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowLimits(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={saveLimits} disabled={savingLimits}
                className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50">
                {savingLimits ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Nueva Empresa</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre *</label>
                <input value={createForm.businessName} onChange={(e) => setCreateForm({ ...createForm, businessName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">RTN *</label>
                  <input value={createForm.businessRTN} onChange={(e) => setCreateForm({ ...createForm, businessRTN: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <input type="email" value={createForm.businessEmail} onChange={(e) => setCreateForm({ ...createForm, businessEmail: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Dirección</label>
                <input value={createForm.businessAddress} onChange={(e) => setCreateForm({ ...createForm, businessAddress: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Teléfono</label>
                  <input value={createForm.phoneNumber} onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Usuarios</label>
                  <input type="number" value={createForm.maxUsers} onChange={(e) => setCreateForm({ ...createForm, maxUsers: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Almacenamiento (GB)</label>
                  <input type="number" value={createForm.maxStorage} onChange={(e) => setCreateForm({ ...createForm, maxStorage: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Transacciones</label>
                  <input type="number" value={createForm.maxTransactions} onChange={(e) => setCreateForm({ ...createForm, maxTransactions: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={createTenant} disabled={creating || !createForm.businessName || !createForm.businessRTN || !createForm.businessEmail}
                className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50">
                {creating ? "Creando..." : "Crear Empresa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
