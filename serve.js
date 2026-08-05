// Servidor estático local, sem dependências — serve o site pra teste (o app
// usa localStorage pra sessão/token, então precisa de um http:// de verdade;
// abrir os arquivos direto (file://) quebra isso). Rodar: node serve.js
// depois abrir http://localhost:8934/login.html no navegador.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 8934;
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const full = path.join(ROOT, p);
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + p); return; }
    const ext = path.extname(full);
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Portal Limiar rodando em http://localhost:' + PORT + '/login.html'));
