"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Clock, Package, TrendingDown } from "lucide-react";

type Alerta = {
  id: string;
  product_id: string;
  code: string;
  name: string;
  alert_type: "low_stock" | "expiring";
  alert_message: string;
  current_stock: number;
  min_stock: number | null;
  expiration_date: string | null;
};

type Resumen = {
  total: number;
  low_stock: number;
  expiring: number;
};

type AlertaTipo = "all" | "low_stock" | "expiring";

export default function AlertasPage() {
  const params = useParams();
  const companyId = (params?.id as string) || "";
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ total: 0, low_stock: 0, expiring: 0 });
  const [tipoSeleccionado, setTipoSeleccionado] = useState<AlertaTipo>("all");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarAlertas = async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await fetch(`/api/inventory/alerts?type=${tipoSeleccionado}&companyId=${companyId}`);
      if (!res.ok) throw new Error("No se pudieron cargar las alertas");
      const data = await res.json();
      setAlertas(data.alerts || []);
      setResumen(data.summary || { total: 0, low_stock: 0, expiring: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando alertas");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, [tipoSeleccionado]);

  const alertasFiltradas = alertas.filter((a) => {
    if (tipoSeleccionado === "all") return true;
    return a.alert_type === tipoSeleccionado;
  });

  const tipoLabel = (t: string) => {
    if (t === "low_stock") return "Stock bajo";
    if (t === "expiring") return "Vencimiento";
    return t;
  };

  const tipoColor = (t: string) => {
    if (t === "low_stock") return "text-orange-600 bg-orange-50 border-orange-200";
    if (t === "expiring") return "text-red-600 bg-red-50 border-red-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  const fechaVencimiento = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("es-HN");
  };

  if (cargando) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-gray-600">Cargando alertas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="h-10 w-10 text-red-600" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">Error al cargar alertas</h2>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={cargarAlertas}
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-900">Alertas de Inventario</h1>
        </div>
        <p className="text-sm text-gray-600">
          Productos con stock bajo o vencidos de la empresa
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardResumen
          titulo="Total alertas"
          valor={resumen.total}
          icono={<AlertTriangle className="h-5 w-5" />}
          color="text-gray-600 border-gray-200"
        />
        <CardResumen
          titulo="Stock bajo"
          valor={resumen.low_stock}
          icono={<TrendingDown className="h-5 w-5" />}
          color="text-orange-600 border-orange-200"
        />
        <CardResumen
          titulo="Vencimientos"
          valor={resumen.expiring}
          icono={<Clock className="h-5 w-5" />}
          color="text-red-600 border-red-200"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[("all" as AlertaTipo), ("low_stock" as AlertaTipo), ("expiring" as AlertaTipo)].map(
          (t) => {
            const activa = tipoSeleccionado === t;
            return (
              <button
                key={t}
                onClick={() => setTipoSeleccionado(t)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activa
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                }`}
              >
                {tipoLabel(t)}
              </button>
            );
          }
        )}
      </div>

      {/* Lista de alertas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Alertas activas ({alertasFiltradas.length})
          </h2>
        </div>

        {alertasFiltradas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">No hay alertas</h3>
            <p className="text-sm text-gray-500">
              Todos los productos tienen stock suficiente y sin vencimientos cercanos.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-900">Producto</th>
                  <th className="px-4 py-3 font-medium text-gray-900">Código</th>
                  <th className="px-4 py-3 font-medium text-gray-900">Tipo</th>
                  <th className="px-4 py-3 font-medium text-gray-900">Mensaje</th>
                  <th className="px-4 py-3 font-medium text-gray-900 text-right">Stock</th>
                  <th className="px-4 py-3 font-medium text-gray-900 text-right">Vence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {alertasFiltradas.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tipoColor(a.alert_type)}`}>
                        {tipoLabel(a.alert_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{a.alert_message}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {a.current_stock}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {fechaVencimiento(a.expiration_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CardResumen({
  titulo,
  valor,
  icono,
  color,
}: {
  titulo: string;
  valor: number;
  icono: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{titulo}</p>
          <p className="text-2xl font-bold text-gray-900">{valor}</p>
        </div>
        <div className="p-2 rounded-md bg-white/50">{icono}</div>
      </div>
    </div>
  );
}
