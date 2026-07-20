const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Request received:', req.method, req.url);
  
  res.writeHead(200, { 
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Server</title>
    </head>
    <body>
      <h1>✅ Servidor de Prueba Funcionando</h1>
      <p>Si ves esta página, el servidor Node.js básico funciona correctamente.</p>
      <p>URL solicitada: ${req.url}</p>
      <p>Método: ${req.method}</p>
      <p>Timestamp: ${new Date().toLocaleString()}</p>
    </body>
    </html>
  `);
});

const PORT = 3002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de prueba corriendo en http://localhost:${PORT}`);
  console.log(`También disponible en http://0.0.0.0:${PORT}`);
});
