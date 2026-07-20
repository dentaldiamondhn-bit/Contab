const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Servidor de prueba funcionando correctamente');
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Servidor de prueba corriendo en http://localhost:${PORT}`);
});
