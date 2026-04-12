"use client";

import React, { useEffect, useState } from "react";

export default function AccountingBooksTest() {
  const [isClient, setIsClient] = useState(false);
  
  console.log("🔍 Debug - AccountingBooksTest component rendered");
  
  useEffect(() => {
    setIsClient(true);
    console.log("🔍 Debug - useEffect mounted");
    console.log("🔍 Debug - Window object:", typeof window);
    console.log("🔍 Debug - Document object:", typeof document);
    console.log("🔍 Debug - Console object:", typeof console);
    
    // Probar si los eventos globales funcionan
    const handleGlobalClick = () => {
      console.log("🔍 Debug - Global click handler works!");
    };
    
    document.addEventListener('click', handleGlobalClick);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);
  
  const handleButtonClick = () => {
    console.log("🔍 Debug - Button clicked via handler");
    try {
      alert("✅ Botón funciona!");
    } catch (error) {
      console.error("🔍 Debug - Error en alert:", error);
    }
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">
        🧪 AccountingBooks Test Component
      </h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-green-100 rounded-lg">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Componente renderizado correctamente
          </h2>
          <p className="text-green-600">
            Si ves esto, el componente se está renderizando.
          </p>
          <p className="text-green-600">
            Estado: {isClient ? '✅ Client-side' : '⏳ Server-side'}
          </p>
        </div>
        
        {isClient && (
          <div className="p-4 bg-yellow-100 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              🧪 Prueba de botones
            </h2>
            
            <button 
              onClick={handleButtonClick}
              style={{
                backgroundColor: 'blue',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Test Button 1
            </button>
            
            <button 
              onClick={() => {
                console.log("🔍 Debug - Inline button clicked");
                alert("✅ Botón 2 también funciona!");
              }}
              style={{
                backgroundColor: 'green',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Test Button 2
            </button>
          </div>
        )}
        
        <div className="p-4 bg-red-100 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            🔍 Información de diagnóstico
          </h2>
          <p className="text-red-600">
            URL: {typeof window !== 'undefined' ? window.location.href : 'Server-side'}
          </p>
          <p className="text-red-600">
            Timestamp: {new Date().toLocaleString()}
          </p>
          <p className="text-red-600">
            User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}
          </p>
        </div>
        
        <div className="p-4 bg-purple-100 rounded-lg">
          <h2 className="text-lg font-semibold text-purple-800 mb-2">
            📋 Prueba de estado
          </h2>
          <p className="text-purple-600">
            React renderizado: ✅
          </p>
          <p className="text-purple-600">
            useEffect ejecutado: {isClient ? '✅' : '❌'}
          </p>
          <p className="text-purple-600">
            Eventos disponibles: {typeof document !== 'undefined' ? '✅' : '❌'}
          </p>
        </div>
      </div>
    </div>
  );
}
