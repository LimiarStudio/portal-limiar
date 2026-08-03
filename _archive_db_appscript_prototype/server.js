/* =================== SERVIDOR LOCAL ===================
   Serve os arquivos estáticos do site (html/css/js/img) e expõe uma API REST
   em /api/... que lê e grava no banco de documentos JSON (db/). Sem
   dependências externas — só o módulo http do próprio Node.

   Rodar com: node server.js   (porta padrão 3000, ou PORT=xxxx node server.js)

   O formato das rotas foi desenhado pra ficar perto do que uma futura versão
   em Google Apps Script faria (um endpoint por recurso, JSON no corpo) —
   trocar o backend depois deve significar trocar só js/api.js, não o resto
   do site. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db');

// primeira execução (db/data ainda vazio) já sobe com os dados de demonstração,
// pra "node server.js" funcionar de primeira sem precisar rodar o seed à mão
if(!db.projects.listar().length){
  console.log('db/data vazio — populando com os dados de demonstração (db/seed.js)...');
  require('./db/seed').main();
}

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon',
};

/* ---------- helpers de request/response ---------- */
function sendJson(res, status, data){
  const body = JSON.stringify(data);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Content-Length':Buffer.byteLength(body)});
  res.end(body);
}
function sendError(res, status, message){
  sendJson(res, status, {error: message});
}
function readBody(req){
  return new Promise((resolve, reject)=>{
    let chunks=[];
    req.on('data', c=>chunks.push(c));
    req.on('end', ()=>{
      if(!chunks.length) return resolve(null);
      try{ resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch(e){ reject(new Error('Corpo da requisição não é um JSON válido.')); }
    });
    req.on('error', reject);
  });
}
// segmentos da URL, decodificados individualmente — decodeURIComponent na URL inteira
// primeiro estragaria segmentos que têm "/" codificado dentro do nome (ex.: a etapa
// "Revestimentos/Acabamentos" usada como parâmetro de rota)
function segments(pathname){
  return pathname.split('/').filter(Boolean).map(decodeURIComponent);
}

/* ---------- arquivos estáticos ---------- */
function serveStatic(req, res, pathname){
  let rel = pathname==='/' ? '/projetos.html' : pathname;
  const filePath = path.join(ROOT, rel);
  if(!filePath.startsWith(ROOT)){ sendError(res, 403, 'Acesso negado.'); return; }
  fs.readFile(filePath, (err, data)=>{
    if(err){ sendError(res, 404, 'Arquivo não encontrado: '+rel); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    res.end(data);
  });
}

/* ---------- rotas da API ---------- */
// cada rota: [MÉTODO, [segmentos fixos ou ':param'...], handler(params, body)]
const routes = [
  ['GET', ['api','users'], () => db.users.listar()],
  ['POST', ['api','users'], (p, body) => db.users.criar(body)],

  ['GET', ['api','projects'], () => db.projects.listar()],
  ['GET', ['api','projects',':id'], p => acharProjetoOu404(p.id)],
  ['POST', ['api','projects'], (p, body) => db.projects.criar(body)],
  ['PATCH', ['api','projects',':id'], (p, body) => db.projects.atualizar(p.id, body)],

  ['GET', ['api','projects',':id','catalog'], p => ({
    etapas: db.catalog.etapasDoProjeto(p.id),
    categorias: db.catalog.categoriasDoProjeto(p.id),
  })],
  ['POST', ['api','projects',':id','catalog','etapas'], (p, body) => {
    db.catalog.adicionarEtapa(p.id, body.nome);
    return db.catalog.etapasDoProjeto(p.id);
  }],
  ['DELETE', ['api','projects',':id','catalog','etapas',':nome'], p => {
    db.catalog.removerEtapa(p.id, p.nome);
    return db.catalog.etapasDoProjeto(p.id);
  }],
  ['POST', ['api','projects',':id','catalog','categorias'], (p, body) => {
    db.catalog.adicionarCategoria(p.id, body);
    return db.catalog.categoriasDoProjeto(p.id);
  }],
  ['DELETE', ['api','projects',':id','catalog','categorias',':nome'], p => {
    db.catalog.removerCategoria(p.id, p.nome);
    return db.catalog.categoriasDoProjeto(p.id);
  }],
  ['PUT', ['api','projects',':id','catalog','categorias',':nome','etapas'], (p, body) => {
    db.catalog.definirEtapasDaCategoria(p.id, p.nome, body.etapas);
    return db.catalog.categoriasDoProjeto(p.id);
  }],

  ['GET', ['api','projects',':id','cronograma'], p => db.cronograma.listar(p.id)],
  ['POST', ['api','projects',':id','cronograma'], (p, body) => db.cronograma.adicionar(p.id, body)],
  ['PATCH', ['api','projects',':id','cronograma',':etapaId'], (p, body) => db.cronograma.atualizar(p.id, p.etapaId, body)],
  ['DELETE', ['api','projects',':id','cronograma',':etapaId'], p => { db.cronograma.remover(p.id, p.etapaId); return {ok:true}; }],

  ['GET', ['api','projects',':id','financeiro'], p => db.financeiro.tudo(p.id)],
  ['POST', ['api','projects',':id','financeiro',':etapa','categorias'], (p, body) => db.financeiro.adicionarCategoria(p.id, p.etapa, body)],
  ['PATCH', ['api','projects',':id','financeiro',':etapa','categorias',':nome'], (p, body) => db.financeiro.atualizarOrcamento(p.id, p.etapa, p.nome, body.prev)],
  ['POST', ['api','projects',':id','financeiro',':etapa','categorias',':nome','lancamentos'], (p, body) => db.financeiro.lancarGasto(p.id, p.etapa, p.nome, body)],
  ['DELETE', ['api','projects',':id','financeiro',':etapa','categorias',':nome','lancamentos',':i'], p => db.financeiro.removerLancamento(p.id, p.etapa, p.nome, +p.i)],
  ['DELETE', ['api','projects',':id','financeiro',':etapa','categorias',':nome'], p => { db.financeiro.removerCategoria(p.id, p.etapa, p.nome); return {ok:true}; }],

  ['GET', ['api','projects',':id','rdos'], p => db.rdos.listar(p.id)],
  ['GET', ['api','projects',':id','rdos',':n'], p => acharRdoOu404(p.id, +p.n)],
  ['POST', ['api','projects',':id','rdos'], (p, body) => db.rdos.salvar(p.id, {...body, n: body.n || db.rdos.proximoNumero(p.id)})],
  ['DELETE', ['api','projects',':id','rdos',':n'], p => { db.rdos.remover(p.id, +p.n); return {ok:true}; }],

  ['GET', ['api','projects',':id','permissions'], p => db.permissions.obter(p.id)],
  ['PUT', ['api','projects',':id','permissions',':userId'], (p, body) => db.permissions.definir(p.id, p.userId, body)],
  ['DELETE', ['api','projects',':id','permissions',':userId'], p => db.permissions.remover(p.id, p.userId)],

  ['POST', ['api','images'], (p, body) => ({caminho: db.images.saveDataUrl(body.dataUrl, body.relPath)})],
];

function acharProjetoOu404(id){
  const p = db.projects.buscar(+id);
  if(!p) throw httpError(404, 'Projeto não encontrado: '+id);
  return p;
}
function acharRdoOu404(pid, n){
  const r = db.rdos.buscar(+pid, n);
  if(!r) throw httpError(404, `Relatório nº ${n} não encontrado no projeto ${pid}.`);
  return r;
}
function httpError(status, message){
  const e = new Error(message);
  e.status = status;
  return e;
}

function matchRoute(method, segs){
  for(const [routeMethod, pattern, handler] of routes){
    if(routeMethod!==method || pattern.length!==segs.length) continue;
    const params = {};
    let ok = true;
    for(let i=0;i<pattern.length;i++){
      if(pattern[i].startsWith(':')) params[pattern[i].slice(1)] = segs[i];
      else if(pattern[i]!==segs[i]){ ok=false; break; }
    }
    if(ok) return {handler, params};
  }
  return null;
}

async function handleApi(req, res, pathname){
  const segs = segments(pathname);
  const match = matchRoute(req.method, segs);
  if(!match){ sendError(res, 404, `Rota não encontrada: ${req.method} ${pathname}`); return; }
  try{
    const body = (req.method==='POST'||req.method==='PATCH'||req.method==='PUT') ? await readBody(req) : null;
    // "id" nas rotas de projeto sempre vira número — normaliza uma vez só, aqui
    if(match.params.id!==undefined) match.params.id = +match.params.id;
    const result = match.handler(match.params, body);
    sendJson(res, 200, result ?? {ok:true});
  }catch(e){
    sendError(res, e.status || 400, e.message || 'Erro interno.');
  }
}

const server = http.createServer((req, res)=>{
  const {pathname} = new URL(req.url, 'http://localhost');
  if(pathname.startsWith('/api/')) handleApi(req, res, pathname);
  else serveStatic(req, res, pathname);
});

server.listen(PORT, ()=>{
  console.log(`Portal Limiar rodando em http://localhost:${PORT}`);
});
