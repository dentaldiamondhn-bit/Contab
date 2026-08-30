"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TenantInvoiceCount {
  tenantId: string;
  businessName: string;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  cancelledInvoices: number;
  totalAmount: number;
  paidAmount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  tenant: {
    businessName: string;
    businessEmail: string;
  };
  invoiceItems: {
    planName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    plan: {
      name: string;
      code: string;
    };
  }[];
}

export default function BillingPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenantCounts, setTenantCounts] = useState<TenantInvoiceCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [countFilter, setCountFilter] = useState<"ALL" | "SUBSCRIPTION" | "CUSTOMER" | "EXPENSE">("ALL");

  useEffect(() => {
    fetchInvoices();
    fetchTenantCounts();
  }, [countFilter]);

  const fetchTenantCounts = async () => {
    try {
      const params = new URLSearchParams();
      if (countFilter !== "ALL") params.set("type", countFilter);
      const response = await fetch(`/api/admin/billing/invoice-counts?${params}`);
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        setTenantCounts(data.tenants || []);
      } else {
        console.warn('invoice-counts no es JSON:', response.status);
        setTenantCounts([]);
      }
    } catch (err) {
      console.error("Error fetching tenant counts:", err);
      setTenantCounts([]);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/admin/billing/invoices");
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      } else {
        console.warn('invoices no es JSON:', response.status);
        setInvoices([]);
        if (response.status !== 200) setError(response.status === 403 ? 'No autorizado' : '');
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setInvoices([]);
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    setError("");
    setGenerationResult(null);

    try {
      const response = await fetch("/api/admin/billing/generate-invoices", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setGenerationResult(data.results);
        // Refresh invoices list
        fetchInvoices();
      } else {
        setError(data.error || "Error al generar facturas");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PAID":
        return "Pagada";
      case "PENDING":
        return "Pendiente";
      case "OVERDUE":
        return "Vencida";
      case "CANCELLED":
        return "Cancelada";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-600 mt-2">Gestiona las facturas mensuales de los tenants</p>
        </div>

        {/* Generation Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Generar Facturas Mensuales</h2>
              <p className="text-gray-600 mt-1">
                Genera automáticamente las facturas para todos los tenants activos del mes actual
              </p>
            </div>
            <button
              onClick={handleGenerateInvoices}
              disabled={generating}
              className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Generar Facturas
                </>
              )}
            </button>
          </div>

          {generationResult && (
            <div className={`p-4 rounded-lg ${
              generationResult.errors.length === 0 
                ? "bg-green-50 border border-green-200" 
                : "bg-yellow-50 border border-yellow-200"
            }`}>
              <h3 className={`font-medium ${
                generationResult.errors.length === 0 ? "text-green-800" : "text-yellow-800"
              }`}>
                Resultado de la Generación
              </h3>
              <div className="mt-2">
                <p className={`text-sm ${
                  generationResult.errors.length === 0 ? "text-green-700" : "text-yellow-700"
                }`}>
                  ✅ {generationResult.success} facturas generadas exitosamente
                </p>
                {generationResult.errors.length > 0 && (
                  <p className="text-sm text-yellow-700 mt-1">
                    ⚠️ {generationResult.errors} errores encontrados
                  </p>
                )}
              </div>
              {generationResult.errorDetails && generationResult.errorDetails.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-yellow-800">Detalles de errores:</h4>
                  <ul className="mt-1 text-xs text-yellow-700 list-disc list-inside">
                    {generationResult.errorDetails.slice(0, 3).map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                    {generationResult.errorDetails.length > 3 && (
                      <li>... y {generationResult.errorDetails.length - 3} errores más</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tenant Invoice Counts Summary */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Facturas por Tenant</h2>
              <p className="text-gray-500 text-sm mt-1">Cantidad de facturas generadas por cada empresa</p>
            </div>
            <select
              value={countFilter}
              onChange={(e) => setCountFilter(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="SUBSCRIPTION">Suscripción</option>
              <option value="CUSTOMER">Cliente</option>
              <option value="EXPENSE">Gasto</option>
            </select>
          </div>
          {tenantCounts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No hay facturas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Facturas
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pagadas
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pendientes
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencidas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cobrado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenantCounts.map((tc) => (
                    <tr key={tc.tenantId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tc.businessName}</div>
                        <div className="text-xs text-gray-500">{tc.tenantId.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-cyan-100 text-cyan-800">
                          {tc.totalInvoices}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-green-600 font-medium">{tc.paidInvoices}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-yellow-600 font-medium">{tc.pendingInvoices}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-red-600 font-medium">{tc.overdueInvoices}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          L. {tc.totalAmount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-green-600 font-medium">
                          L. {tc.paidAmount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">Totales</td>
                    <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                      {tenantCounts.reduce((s, t) => s + t.totalInvoices, 0)}
                    </td>
                    <td className="px-6 py-3 text-center text-sm font-bold text-green-600">
                      {tenantCounts.reduce((s, t) => s + t.paidInvoices, 0)}
                    </td>
                    <td className="px-6 py-3 text-center text-sm font-bold text-yellow-600">
                      {tenantCounts.reduce((s, t) => s + t.pendingInvoices, 0)}
                    </td>
                    <td className="px-6 py-3 text-center text-sm font-bold text-red-600">
                      {tenantCounts.reduce((s, t) => s + t.overdueInvoices, 0)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      L. {tenantCounts.reduce((s, t) => s + t.totalAmount, 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-green-600">
                      L. {tenantCounts.reduce((s, t) => s + t.paidAmount, 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Facturas Recientes</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No hay facturas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Periodo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.tenant.businessName}</div>
                        <div className="text-sm text-gray-500">{invoice.tenant.businessEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.currency} {invoice.total.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Subtotal: {invoice.currency} {invoice.subtotal.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {getStatusText(invoice.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
