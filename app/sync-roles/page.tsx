"use client";

import { useState } from "react";

export default function SyncRolesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSync = async () => {
    setLoading(true);
    setResult("");
    setError("");

    try {
      const response = await fetch("/api/sync-roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(JSON.stringify(data, null, 2));
      } else {
        setError(data.error || "Error al sincronizar roles");
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Sincronizar Roles de Usuarios
        </h1>
        
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Acciones a realizar:</strong>
          </p>
          <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
            <li>jainreyes8763@gmail.com → SUPPORT</li>
            <li>sucachi.123@gmail.com → SUPER_ADMIN</li>
          </ul>
        </div>

        <button
          onClick={handleSync}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sincronizando..." : "Sincronizar Roles"}
        </button>

        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              ✅ Resultado:
            </h3>
            <pre className="text-xs text-green-700 whitespace-pre-wrap break-all">
              {result}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-sm font-medium text-red-800 mb-2">
              ❌ Error:
            </h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <a
            href="/support/users"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Volver a Ver Usuarios
          </a>
        </div>
      </div>
    </div>
  );
}
