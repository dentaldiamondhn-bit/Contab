"use client";

import { useEffect, useState } from "react";

interface SystemConfig {
  key: string;
  value: any;
  description?: string;
}

export default function SystemConfigModule() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"financial" | "fiscal" | "whitelabel">("financial");
  const [saving, setSaving] = useState(false);
  const [financialConfig, setFinancialConfig] = useState({
    defaultCurrency: "HNL",
    exchangeRateUSD: 24.70,
    exchangeRateEUR: 27.00,
    defaultTaxRate: 15,
    defaultAccountTemplate: "DEFAULT",
  });
  const [fiscalConfig, setFiscalConfig] = useState({
    country: "HN",
    cai: "",
    rtn: "",
    businessName: "",
    businessAddress: "",
    rangeStart: 1,
    rangeEnd: 5000,
    currentNumber: 1,
    expiryDate: "",
    taxRate: 15,
    establishmentCode: "0001",
    pointOfSaleCode: "0001",
    economicActivity: "VENTA DE BIENES Y SERVICIOS",
  });
  const [whiteLabel, setWhiteLabel] = useState({
    companyName: "Contab",
    primaryColor: "#2563EB",
    secondaryColor: "#7C3AED",
    logoUrl: "",
    emailSubjectPrefix: "[Contab]",
    customDomain: "",
    footerText: "Plataforma de Contabilidad SaaS",
  });

  useEffect(() => { fetchConfigs(); }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/admin/system/config");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
        data.configs?.forEach((c: SystemConfig) => {
          const parsed = typeof c.value === "string" ? JSON.parse(c.value) : c.value;
          if (c.key === "contabhn_cai" || c.key === "fiscal_config") setFiscalConfig((prev) => ({ ...prev, ...parsed }));
          if (c.key === "financial_config") setFinancialConfig((prev) => ({ ...prev, ...parsed }));
          if (c.key === "white_label") setWhiteLabel((prev) => ({ ...prev, ...parsed }));
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveConfig = async (key: string, value: any, desc: string) => {
    setSaving(true);
    try {
      await fetch("/api/admin/system/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: JSON.stringify(value), description: desc }),
      });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">⚙️ Configuración Global del Sistema</h1>
        <p className="text-sm text-gray-500 mt-1">Parámetros financieros, configuración fiscal y personalización</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { key: "financial", label: "Parámetros Financieros", icon: "💰" },
          { key: "fiscal", label: "Configuración Fiscal", icon: "🧾" },
          { key: "whitelabel", label: "Personalización", icon: "🎨" },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-blue-500 text-blue-600 bg-blue-50" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          {tab === "financial" && (
            <div className="max-w-lg space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">Parámetros Financieros Base</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Moneda por Defecto</label>
                  <select value={financialConfig.defaultCurrency}
                    onChange={(e) => setFinancialConfig({ ...financialConfig, defaultCurrency: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="HNL">HNL - Lempira</option>
                    <option value="USD">USD - Dólar</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tasa ISV por Defecto (%)</label>
                  <input type="number" step="0.01" value={financialConfig.defaultTaxRate}
                    onChange={(e) => setFinancialConfig({ ...financialConfig, defaultTaxRate: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo Cambio USD → HNL</label>
                  <input type="number" step="0.01" value={financialConfig.exchangeRateUSD}
                    onChange={(e) => setFinancialConfig({ ...financialConfig, exchangeRateUSD: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo Cambio EUR → HNL</label>
                  <input type="number" step="0.01" value={financialConfig.exchangeRateEUR}
                    onChange={(e) => setFinancialConfig({ ...financialConfig, exchangeRateEUR: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Plantilla de Cuentas Maestro</label>
                <select value={financialConfig.defaultAccountTemplate}
                  onChange={(e) => setFinancialConfig({ ...financialConfig, defaultAccountTemplate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="DEFAULT">General (Honduras)</option>
                  <option value="RETAIL">Comercio Minorista</option>
                  <option value="SERVICES">Servicios Profesionales</option>
                  <option value="MANUFACTURING">Manufactura</option>
                </select>
              </div>
              <button onClick={() => saveConfig("financial_config", financialConfig, "Parámetros financieros globales")}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar Configuración"}
              </button>
            </div>
          )}

          {tab === "fiscal" && (
            <div className="max-w-lg space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">Configuración Fiscal de Honduras</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">País</label>
                  <select value={fiscalConfig.country}
                    onChange={(e) => setFiscalConfig({ ...fiscalConfig, country: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="HN">Honduras</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">RTN</label>
                  <input value={fiscalConfig.rtn} onChange={(e) => setFiscalConfig({ ...fiscalConfig, rtn: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre del Negocio (emisor)</label>
                <input value={fiscalConfig.businessName} onChange={(e) => setFiscalConfig({ ...fiscalConfig, businessName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Dirección del Negocio</label>
                <input value={fiscalConfig.businessAddress} onChange={(e) => setFiscalConfig({ ...fiscalConfig, businessAddress: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">CAI (Código de Autorización)</label>
                <input value={fiscalConfig.cai} onChange={(e) => setFiscalConfig({ ...fiscalConfig, cai: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Rango Inicio</label>
                  <input type="number" value={fiscalConfig.rangeStart}
                    onChange={(e) => setFiscalConfig({ ...fiscalConfig, rangeStart: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Rango Fin</label>
                  <input type="number" value={fiscalConfig.rangeEnd}
                    onChange={(e) => setFiscalConfig({ ...fiscalConfig, rangeEnd: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Número Actual</label>
                  <input type="number" value={fiscalConfig.currentNumber}
                    onChange={(e) => setFiscalConfig({ ...fiscalConfig, currentNumber: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha Vencimiento CAI</label>
                  <input type="date" value={fiscalConfig.expiryDate}
                    onChange={(e) => setFiscalConfig({ ...fiscalConfig, expiryDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cód. Establecimiento</label>
                  <input value={fiscalConfig.establishmentCode}
                    onChange={(e) => setFiscalConfig({ ...fiscalConfig, establishmentCode: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Cód. Punto Venta</label>
                  <input value={fiscalConfig.pointOfSaleCode}
                    onChange={(e) => setFiscalConfig({ ...fiscalConfig, pointOfSaleCode: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Actividad Económica</label>
                <input value={fiscalConfig.economicActivity}
                  onChange={(e) => setFiscalConfig({ ...fiscalConfig, economicActivity: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <button onClick={() => saveConfig("fiscal_config", fiscalConfig, "Configuración fiscal de Honduras")}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar Configuración Fiscal"}
              </button>
            </div>
          )}

          {tab === "whitelabel" && (
            <div className="max-w-lg space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">Personalización (White-Label)</h3>
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre de la Empresa</label>
                <input value={whiteLabel.companyName} onChange={(e) => setWhiteLabel({ ...whiteLabel, companyName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Color Primario</label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={whiteLabel.primaryColor}
                      onChange={(e) => setWhiteLabel({ ...whiteLabel, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded border cursor-pointer" />
                    <input value={whiteLabel.primaryColor} onChange={(e) => setWhiteLabel({ ...whiteLabel, primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Color Secundario</label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={whiteLabel.secondaryColor}
                      onChange={(e) => setWhiteLabel({ ...whiteLabel, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded border cursor-pointer" />
                    <input value={whiteLabel.secondaryColor} onChange={(e) => setWhiteLabel({ ...whiteLabel, secondaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">URL del Logotipo</label>
                <input value={whiteLabel.logoUrl} onChange={(e) => setWhiteLabel({ ...whiteLabel, logoUrl: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Dominio Personalizado</label>
                <input value={whiteLabel.customDomain} onChange={(e) => setWhiteLabel({ ...whiteLabel, customDomain: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="contabilidad.midominio.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Prefijo de Asunto de Correos</label>
                <input value={whiteLabel.emailSubjectPrefix} onChange={(e) => setWhiteLabel({ ...whiteLabel, emailSubjectPrefix: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Texto de Pie de Página</label>
                <textarea value={whiteLabel.footerText} onChange={(e) => setWhiteLabel({ ...whiteLabel, footerText: e.target.value })}
                  rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <button onClick={() => saveConfig("white_label", whiteLabel, "Configuración de marca personalizada")}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar Personalización"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
