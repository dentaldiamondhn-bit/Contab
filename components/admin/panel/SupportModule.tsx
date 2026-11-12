"use client";

import { useEffect, useState } from "react";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  tenantId: string;
  userId: string;
  resolutionComment?: string;
  createdAt?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "maintenance";
  sentAt?: string;
}

export default function SupportModule() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tickets" | "notifications" | "backups" | "maintenance">("tickets");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolution, setResolution] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState<"info" | "warning" | "maintenance">("info");
  const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
  const [backups, setBackups] = useState([
    { id: "1", date: new Date(Date.now() - 86400000).toISOString(), size: "12.4 MB", status: "Completado" },
    { id: "2", date: new Date(Date.now() - 172800000).toISOString(), size: "12.1 MB", status: "Completado" },
    { id: "3", date: new Date(Date.now() - 259200000).toISOString(), size: "11.8 MB", status: "Completado" },
  ]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [purging, setPurging] = useState(false);

  useEffect(() => { fetchTickets(); }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      const res = await fetch(`/api/support/tickets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      } else {
        setTickets([]);
      }
    } catch { setTickets([]); }
    finally { setLoading(false); }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionComment: resolution }),
      });
      setSelectedTicket(null);
      setResolution("");
      fetchTickets();
    } catch (e) { console.error(e); }
  };

  const sendNotification = () => {
    if (!notifTitle || !notifMessage) return;
    const notif: Notification = {
      id: crypto.randomUUID(),
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      sentAt: new Date().toISOString(),
    };
    setSentNotifications([notif, ...sentNotifications]);
    setNotifTitle("");
    setNotifMessage("");
  };

  const purgeLogs = async () => {
    setPurging(true);
    try {
      await fetch("/api/admin/comprehensive-angel-ring-cleanup", { method: "POST" });
    } catch (e) { console.error(e); }
    finally { setPurging(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">🛠️ Mantenimiento y Soporte</h1>
        <p className="text-sm text-gray-500 mt-1">Tickets de soporte, notificaciones del sistema, backups y mantenimiento</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { key: "tickets", label: "Tickets de Soporte" },
          { key: "notifications", label: "Notificaciones" },
          { key: "backups", label: "Copias de Seguridad" },
          { key: "maintenance", label: "Mantenimiento" },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-cyan-500 text-cyan-600 bg-cyan-50" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tickets" && (
        <div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Todos los estados</option>
                <option value="OPEN">Abierto</option>
                <option value="IN_PROGRESS">En Progreso</option>
                <option value="RESOLVED">Resuelto</option>
                <option value="CLOSED">Cerrado</option>
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Todas las prioridades</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
              </select>
              <span className="text-sm text-gray-500">{tickets.length} tickets</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" /></div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg mb-2">🎫</p>
                <p>No hay tickets de soporte</p>
                <p className="text-xs mt-1">Los tickets creados por los usuarios aparecerán aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        ticket.priority === "HIGH" ? "bg-red-500" :
                        ticket.priority === "MEDIUM" ? "bg-yellow-500" : "bg-cyan-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</div>
                        <div className="text-xs text-gray-500 truncate">{ticket.description}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          ticket.status === "OPEN" ? "bg-red-100 text-red-800" :
                          ticket.status === "IN_PROGRESS" ? "bg-yellow-100 text-yellow-800" :
                          ticket.status === "RESOLVED" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>{ticket.status}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          ticket.priority === "HIGH" ? "bg-red-100 text-red-800" :
                          ticket.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
                          "bg-cyan-100 text-cyan-800"
                        }`}>{ticket.priority}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Enviar Notificación Global</h3>
          <div className="max-w-lg space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <select value={notifType} onChange={(e) => setNotifType(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                <option value="info">Informativo</option>
                <option value="warning">Advertencia</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Título</label>
              <input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Mantenimiento programado" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Mensaje</label>
              <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)}
                rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                placeholder="El sistema estará en mantenimiento el día..." />
            </div>
            <button onClick={sendNotification} disabled={!notifTitle || !notifMessage}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 disabled:opacity-50">
              Enviar a Todos los Usuarios
            </button>
          </div>

          {sentNotifications.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Notificaciones Enviadas</h4>
              <div className="divide-y divide-gray-100">
                {sentNotifications.map((n) => (
                  <div key={n.id} className="py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        n.type === "maintenance" ? "bg-orange-100 text-orange-800" :
                        n.type === "warning" ? "bg-yellow-100 text-yellow-800" :
                        "bg-cyan-100 text-cyan-800"
                      }`}>{n.type}</span>
                      <span className="text-sm font-medium">{n.title}</span>
                      <span className="text-xs text-gray-500">{n.sentAt ? new Date(n.sentAt).toLocaleString("es-HN") : ""}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 ml-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "backups" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Copias de Seguridad</h3>
            <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700">Crear Backup Ahora</button>
          </div>
          <p className="text-sm text-gray-500 mb-4">Backups automáticos diarios de la base de datos</p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tamaño</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-sm">{new Date(b.date).toLocaleString("es-HN")}</td>
                    <td className="px-4 py-3 text-sm">{b.size}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{b.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button className="text-cyan-600 hover:text-cyan-800 text-xs">Descargar</button>
                      <button className="text-green-600 hover:text-green-800 text-xs">Restaurar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "maintenance" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Modo Mantenimiento</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  {maintenanceMode
                    ? "El sistema está en modo mantenimiento. Los usuarios no podrán acceder."
                    : "Activar para mostrar una página de mantenimiento a todos los usuarios."}
                </p>
              </div>
              <button onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${maintenanceMode ? "bg-red-600 text-white hover:bg-red-700" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"}`}>
                {maintenanceMode ? "Desactivar Mantenimiento" : "Activar Mantenimiento"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Purga de Logs Antiguos</h3>
            <p className="text-sm text-gray-600 mb-4">Eliminar registros de auditoría y logs antiguos para liberar espacio en la base de datos.</p>
            <button onClick={purgeLogs} disabled={purging}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">
              {purging ? "Purgando..." : "Purgar Logs (más de 90 días)"}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Exportación de Datos</h3>
            <p className="text-sm text-gray-600 mb-4">Exportar datos masivos de empresas para reportes o migraciones.</p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Exportar Empresas (CSV)</button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Exportar Facturas (CSV)</button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Exportar Transacciones (CSV)</button>
            </div>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{selectedTicket.subject}</h3>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedTicket.status === "OPEN" ? "bg-red-100 text-red-800" :
                  selectedTicket.status === "IN_PROGRESS" ? "bg-yellow-100 text-yellow-800" :
                  "bg-green-100 text-green-800"
                }`}>{selectedTicket.status}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedTicket.priority === "HIGH" ? "bg-red-100 text-red-800" :
                  selectedTicket.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
                  "bg-cyan-100 text-cyan-800"
                }`}>{selectedTicket.priority}</span>
              </div>
              <p className="text-sm text-gray-700">{selectedTicket.description}</p>
            </div>
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-gray-700">Comentario de Resolución</label>
              <textarea value={resolution} onChange={(e) => setResolution(e.target.value)}
                rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                placeholder="Describe la resolución..." />
              <div className="flex gap-3 mt-3">
                <button onClick={() => updateTicketStatus(selectedTicket.id, "IN_PROGRESS")}
                  className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm hover:bg-yellow-200">Marcar En Progreso</button>
                <button onClick={() => updateTicketStatus(selectedTicket.id, "RESOLVED")}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Marcar Resuelto</button>
                <button onClick={() => updateTicketStatus(selectedTicket.id, "CLOSED")}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
