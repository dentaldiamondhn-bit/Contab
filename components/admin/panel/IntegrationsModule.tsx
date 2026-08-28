"use client";

import { useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  rateLimit: number;
  isActive: boolean;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
}

export default function IntegrationsModule() {
  const [tab, setTab] = useState<"apikeys" | "webhooks" | "connectors">("apikeys");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRate, setNewKeyRate] = useState(100);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState("tenant.created,tenant.updated");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);

  const generateApiKey = () => {
    const key = `sk_live_${Array.from({ length: 48 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")}`;
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: newKeyName || `API Key ${apiKeys.length + 1}`,
      key,
      createdAt: new Date().toISOString(),
      rateLimit: newKeyRate,
      isActive: true,
    };
    setApiKeys([...apiKeys, newKey]);
    setShowNewKey(key);
    setNewKeyName("");
  };

  const revokeKey = (id: string) => {
    if (!confirm("¿Revocar esta clave API?")) return;
    setApiKeys(apiKeys.map((k) => k.id === id ? { ...k, isActive: false } : k));
  };

  const addWebhook = () => {
    if (!newWebhookUrl) return;
    const webhook: Webhook = {
      id: crypto.randomUUID(),
      url: newWebhookUrl,
      events: newWebhookEvents.split(",").map((e) => e.trim()),
      isActive: true,
      secret: `whsec_${Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")}`,
    };
    setWebhooks([...webhooks, webhook]);
    setNewWebhookUrl("");
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">🔌 Integraciones y Desarrolladores</h1>
        <p className="text-sm text-gray-500 mt-1">API Keys, Webhooks y conectores de servicios externos</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { key: "apikeys", label: "Claves API" },
          { key: "webhooks", label: "Webhooks" },
          { key: "connectors", label: "Conectores" },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-blue-500 text-blue-600 bg-blue-50" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "apikeys" && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Generar Nueva Clave API</h3>
            <div className="flex gap-3">
              <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Nombre descriptivo" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Rate limit:</label>
                <input type="number" value={newKeyRate} onChange={(e) => setNewKeyRate(+e.target.value)}
                  className="w-24 px-3 py-2 border rounded-lg text-sm" />
                <span className="text-xs text-gray-500">req/min</span>
              </div>
              <button onClick={generateApiKey} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Generar</button>
            </div>
          </div>

          {showNewKey && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Clave generada correctamente</p>
                  <p className="text-xs text-green-600 mt-1">Guárdala ahora, no volverás a verla completa:</p>
                </div>
                <button onClick={() => setShowNewKey(null)} className="text-green-600 hover:text-green-800">✕</button>
              </div>
              <code className="block mt-2 p-3 bg-white rounded text-sm font-mono break-all text-gray-800 border">{showNewKey}</code>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Claves API Activas</h3>
            </div>
            {apiKeys.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg mb-2">🔑</p>
                <p>No hay claves API generadas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {apiKeys.map((key) => (
                  <div key={key.id} className="px-4 py-3 flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${key.isActive ? "bg-green-500" : "bg-red-500"}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{key.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{key.key.slice(0, 12)}...{key.key.slice(-4)}</div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>{key.rateLimit} req/min</div>
                      <div>Creada: {new Date(key.createdAt).toLocaleDateString("es-HN")}</div>
                    </div>
                    <button onClick={() => revokeKey(key.id)} disabled={!key.isActive}
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed">
                      {key.isActive ? "Revocar" : "Revocada"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "webhooks" && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Agregar Webhook</h3>
            <div className="flex gap-3">
              <input value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://tu-app.com/webhook" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
              <input value={newWebhookEvents} onChange={(e) => setNewWebhookEvents(e.target.value)}
                placeholder="Eventos (separados por coma)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
              <button onClick={addWebhook} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Agregar</button>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Eventos disponibles: tenant.created, tenant.updated, tenant.suspended, invoice.created, invoice.paid, ticket.created, user.created
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Webhooks Configurados</h3>
            </div>
            {webhooks.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg mb-2">🔗</p>
                <p>No hay webhooks configurados</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${wh.isActive ? "bg-green-500" : "bg-red-500"}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 font-mono">{wh.url}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {wh.events.map((e, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{e}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setWebhooks(webhooks.filter((w) => w.id !== wh.id))}
                        className="text-xs text-red-600 hover:text-red-800">Eliminar</button>
                    </div>
                    <div className="mt-2 ml-5">
                      <span className="text-xs text-gray-400">Secret: </span>
                      <code className="text-xs text-gray-500 font-mono">{wh.secret.slice(0, 12)}...</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "connectors" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Conectores Bancarios y Proveedores</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "SAR / SAT (Honduras)", desc: "Facturación electrónica y reportes fiscales", status: "Configurado", statusColor: "green", icon: "🇭🇳" },
              { name: "BAC Honduras", desc: "Conectividad bancaria para conciliación", status: "Pendiente", statusColor: "yellow", icon: "🏦" },
              { name: "Ficohsa", desc: "API de estado de cuentas", status: "Pendiente", statusColor: "yellow", icon: "🏦" },
              { name: "Banco Atlántida", desc: "Conectividad para transferencias", status: "Pendiente", statusColor: "yellow", icon: "🏦" },
              { name: "Invoice Ninja", desc: "Sincronización de facturas con sistemas de terceros", status: "Pendiente", statusColor: "yellow", icon: "📄" },
              { name: "Google Drive", desc: "Backup automático de documentos", status: "Pendiente", statusColor: "yellow", icon: "☁️" },
            ].map((c) => (
              <div key={c.name} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{c.name}</h4>
                    <p className="text-xs text-gray-500">{c.desc}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${c.statusColor}-100 text-${c.statusColor}-800`}>{c.status}</span>
                </div>
                <button className="w-full mt-3 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Configurar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
