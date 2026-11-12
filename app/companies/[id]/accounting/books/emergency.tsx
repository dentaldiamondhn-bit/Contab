export default function EmergencyTestPage() {
  return (
    <html>
      <head>
        <title>Emergency Test</title>
        <style dangerouslySetInnerHTML={{__html: `
          body { font-family: Arial, sans-serif; padding: 20px; }
          .test-button { 
            background: red; 
            color: white; 
            padding: 20px; 
            border: none; 
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
          }
          .info-box { 
            background: lightblue; 
            padding: 20px; 
            margin: 10px; 
            border: 2px solid blue;
          }
        `}} />
      </head>
      <body>
        <div className="info-box">
          <h1>🚨 EMERGENCY TEST PAGE</h1>
          <p>Esta es una prueba de emergencia con HTML puro.</p>
          <p>Si este botón funciona, el problema está en React/Next.js.</p>
          <p>Si este botón no funciona, hay un problema global.</p>
        </div>
        
        <button 
          className="test-button"
          onClick={() => alert('✅ HTML PURO FUNCIONA!')}
        >
          CLICK AQUÍ (HTML PURO)
        </button>
        
        <button 
          className="test-button"
          onClick={() => console.log('🔍 Debug - HTML button clicked')}
        >
          CONSOLE LOG TEST
        </button>
        
        <div onClick={() => alert('Div clicked')} style={{background: 'yellow', padding: '10px', margin: '10px'}}>
          Click en este div amarillo
        </div>
        
        <script dangerouslySetInnerHTML={{__html: `
          console.log('🔍 Debug - Emergency test page loaded');
          
          document.addEventListener('click', function(e) {
            console.log('🔍 Debug - Click detected on:', e.target);
          });
          
          // Probar si alert() funciona
          try {
            alert('✅ Alert() funciona en esta página');
          } catch(e) {
            console.error('🔍 Debug - Alert() no funciona:', e);
          }
        `}} />
      </body>
    </html>
  );
}
