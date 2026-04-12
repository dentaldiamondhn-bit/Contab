"use client";

import React, { useEffect, useState } from "react";

export default function MinimalTest() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    console.log("🔍 Debug - MinimalTest useEffect mounted");
    
    // Probar click en cualquier parte del documento
    const handleAnyClick = (e: MouseEvent) => {
      console.log("🔍 Debug - Click detected on:", e.target);
    };
    
    document.addEventListener('click', handleAnyClick);
    
    return () => {
      document.removeEventListener('click', handleAnyClick);
    };
  }, []);
  
  return (
    <div 
      style={{ 
        padding: '20px', 
        backgroundColor: 'lightblue',
        border: '2px solid blue',
        margin: '20px'
      }}
      onClick={() => console.log("🔍 Debug - Div clicked")}
    >
      <h1>🧪 MINIMAL TEST</h1>
      <p>Si ves esto, React está funcionando.</p>
      <p>Estado: {isClient ? '✅ Client-side' : '⏳ Server-side'}</p>
      
      {isClient && (
        <>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              console.log("🔍 Debug - Button clicked");
              alert("✅ CLICK FUNCIONA!");
            }}
            style={{
              backgroundColor: 'red',
              color: 'white',
              padding: '15px',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer',
              margin: '10px'
            }}
          >
            CLICK AQUÍ
          </button>
          
          <div 
            onClick={() => console.log("🔍 Debug - Inner div clicked")}
            style={{
              backgroundColor: 'yellow',
              padding: '10px',
              margin: '10px',
              border: '1px solid black'
            }}
          >
            Click en este div amarillo
          </div>
        </>
      )}
      
      <p>Abre la consola (F12) para ver los mensajes de debug.</p>
    </div>
  );
}
