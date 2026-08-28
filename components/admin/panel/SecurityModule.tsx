"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName?: string;
  isActive: boolean;
  lastSignInAt?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  table: string;
  timestamp: string;
  userId?: string;
  details?: string;
}

const ROLES = ["SUPER_ADMIN", "SUPPORT", "ADMIN", "MANAGER", "ACCOUNTANT", "USER", "VIEWER"];
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", SUPPORT: "Soporte", ADMIN: "Admin", MANAGER: "Gerente",
  ACCOUNTANT: "Contador", USER: "Usuario", VIEWER: "Visor",
};

export default function SecurityModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [securityPolicies, setSecurityPolicies] = useState({
    twoFactorRequired: false,
    passwordMinLength: 8,
    passwordExpiryDays: 90,
    ipWhitelist: "",
    maxLoginAttempts: 5,
  });
  const [savingPolicies, setSavingPolicies] = useState(false);
  const [tab, setTab] = useState<"users" | "audit" | "policies">("users");

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "15" });
      if (roleFilter) params.set("role", roleFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalItems(data.pagination?.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/admin/comprehensive-stats");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.data?.recentActivity || []);
      }
    } catch (e) { console.error(e); }
  };

  const updateUserRole = async () => {
    if (!editingUser) return;
    try {
      await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      });
      setEditingUser(null);
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const savePolicies = async () => {
    setSavingPolicies(true);
    try {
      await fetch("/api/admin/system/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "security_policies", value: JSON.stringify(securityPolicies) }),
      });
    } catch (e) { console.error(e); }
    finally { setSavingPolicies(false); }
  };

  const filtered = users.filter((u) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">🔐 Seguridad, Usuarios y Roles</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión de administradores, RBAC, políticas de seguridad y auditoría</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["users", "audit", "policies"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === "audit") fetchAuditLogs(); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-blue-500 text-blue-600 bg-blue-50" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t === "users" ? "Usuarios y Roles" : t === "audit" ? "Bitácora de Auditoría" : "Políticas de Seguridad"}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
              <input type="text" placeholder="Buscar por nombre o email..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Todos los roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
              </select>
              <span className="text-sm text-gray-500">{totalItems} usuarios</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No se encontraron usuarios</td></tr>
                    ) : filtered.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-gray-500">{u.username}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            u.role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-800" :
                            u.role === "SUPPORT" ? "bg-yellow-100 text-yellow-800" :
                            u.role === "ADMIN" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>{ROLE_LABELS[u.role] || u.role}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{u.tenantName || "N/A"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {u.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm space-x-2">
                          <button onClick={() => { setEditingUser(u); setEditRole(u.role); }}
                            className="text-blue-600 hover:text-blue-800 text-xs">Editar Rol</button>
                          {u.role !== "SUPER_ADMIN" && (
                            <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:text-red-800 text-xs">Eliminar</button>
                          )}
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
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Anterior</button>
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Historial de Auditoría</h3>
            <p className="text-xs text-gray-500 mt-1">Acciones críticas realizadas en el sistema</p>
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg mb-2">📋</p>
              <p>No hay registros de auditoría disponibles</p>
              <p className="text-xs mt-1">Las acciones se registrarán automáticamente</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-4 py-3 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${
                    log.action.includes("CREATE") ? "bg-green-500" :
                    log.action.includes("DELETE") ? "bg-red-500" :
                    log.action.includes("UPDATE") ? "bg-blue-500" : "bg-gray-500"
                  }`}>{log.action[0]}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{log.action} en {log.table}</div>
                    <div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString("es-HN")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "policies" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Políticas de Seguridad</h3>
          <div className="space-y-4 max-w-lg">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={securityPolicies.twoFactorRequired}
                onChange={(e) => setSecurityPolicies({ ...securityPolicies, twoFactorRequired: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded" />
              <div>
                <span className="text-sm font-medium text-gray-900">Requerir 2FA para todos</span>
                <p className="text-xs text-gray-500">Forzar autenticación en dos pasos</p>
              </div>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Longitud mínima de contraseña</label>
                <input type="number" value={securityPolicies.passwordMinLength}
                  onChange={(e) => setSecurityPolicies({ ...securityPolicies, passwordMinLength: +e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Días para expirar contraseña</label>
                <input type="number" value={securityPolicies.passwordExpiryDays}
                  onChange={(e) => setSecurityPolicies({ ...securityPolicies, passwordExpiryDays: +e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Intentos máximos de login</label>
              <input type="number" value={securityPolicies.maxLoginAttempts}
                onChange={(e) => setSecurityPolicies({ ...securityPolicies, maxLoginAttempts: +e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Whitelist de IPs (una por línea)</label>
              <textarea value={securityPolicies.ipWhitelist}
                onChange={(e) => setSecurityPolicies({ ...securityPolicies, ipWhitelist: e.target.value })}
                rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono" placeholder="192.168.1.0/24&#10;10.0.0.1" />
            </div>
            <button onClick={savePolicies} disabled={savingPolicies}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {savingPolicies ? "Guardando..." : "Guardar Políticas"}
            </button>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">Editar Rol — {editingUser.firstName} {editingUser.lastName}</h3>
            <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-4">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={updateUserRole} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
