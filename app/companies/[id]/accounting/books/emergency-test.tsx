"use client";

import { useState, useEffect } from "react";

export default function EmergencyTestPage() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    console.log('🔍 Debug - Emergency test page loaded');
    document.addEventListener('click', function(e) {
      console.log('🔍 Debug - Click detected on:', e.target);
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ 
        background: 'lightblue', 
        padding: '20px', 
        margin: '10px', 
        border: '2px solid blue',
        borderRadius: '5px'
      }}>
        <h1 style={{ color: 'red', fontSize: '24px' }}>🚨 EMERGENCY TEST PAGE</h1>
        <p>Esta es una prueba de emergencia con React puro.</p>
        <p>Si este botón funciona, el problema está en los componentes UI.</p>
        <p>Si este botón no funciona, hay un problema global.</p>
        <p>Estado: {isClient ? '✅ Client-side' : '⏳ Server-side'}</p>
      </div>
      
      {isClient && (
        <>
          <button 
            style={{
              background: 'red', 
              color: 'white', 
              padding: '20px', 
              border: 'none', 
              fontSize: '16px',
              cursor: 'pointer',
              margin: '10px',
              borderRadius: '5px'
            }}
            onClick={() => alert('✅ REACT PURO FUNCIONA!')}
          >
            CLICK AQUÍ (REACT PURO)
          </button>
          
          <button 
            style={{
              background: 'green', 
              color: 'white', 
              padding: '20px', 
              border: 'none', 
              fontSize: '16px',
              cursor: 'pointer',
              margin: '10px',
              borderRadius: '5px'
            }}
            onClick={() => console.log('🔍 Debug - React button clicked')}
          >
            CONSOLE LOG TEST
          </button>
          
          <div 
            onClick={() => alert('Div clicked')}
            style={{
              background: 'yellow', 
              padding: '20px', 
              margin: '10px',
              border: '1px solid black',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Click en este div amarillo
          </div>
          
          <div style={{ 
            background: '#f0f0f0', 
            padding: '20px', 
            margin: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px'
          }}>
            <h3>Información de diagnóstico:</h3>
            <p>URL: {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
            <p>Timestamp: {new Date().toLocaleString()}</p>
            <p>User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}</p>
          </div>
        </>
      )}
    </div>
  );
}
