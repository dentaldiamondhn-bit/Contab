'use client';

import { useState, useEffect } from 'react';

export default function SimpleSettingsPage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('Página de configuración simplificada cargando...');
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Configuración Simplificada</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-700">{message}</p>
        <div className="mt-4">
          <button 
            onClick={() => setMessage('Botón funciona correctamente')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Probar Botón
          </button>
        </div>
      </div>
    </div>
  );
}
