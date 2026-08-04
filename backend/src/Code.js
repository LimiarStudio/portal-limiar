/* =================== ENTRY POINT (Web App) ===================
   Apps Script só expõe doGet/doPost — não tem roteamento por caminho como um
   servidor HTTP de verdade, e a resposta é sempre HTTP 200 no nível de
   transporte (não dá pra mandar um 404/400 real). Por isso o contrato é um
   envelope JSON: {ok:true, data:...} ou {ok:false, error:"..."} — quem
   chamar tem que checar "ok", nunca o status HTTP da resposta.

   doPost é o ÚNICO ponto de entrada de verdade (inclusive pra leituras) —
   o corpo é {collection, op, args:[...], token}, despachado pra
   Db[collection][op] depois de checar o token (ver Repo/Auth.js). O corpo é
   lido como JSON independente do Content-Type enviado — isso importa pra
   mais adiante: um fetch() de navegador com "Content-Type: application/json"
   dispara um preflight CORS que Web Apps do Apps Script não respondem, então
   o front-end vai mandar o corpo como text/plain pra evitar isso.

   doGet só serve como healthcheck (sem acesso a dado nenhum) — um token não
   deveria nunca viajar numa query string de GET (fica em histórico/logs). */
var ACOES_PUBLICAS = ['auth.login']; // não exigem login nenhum
var ACOES_ADMIN = [
  'users.criar','users.atualizar','users.remover','users.redefinirSenha',
  'permissions.definir','permissions.remover',
  'archive.arquivarProjeto',
  'projects.criar','projects.atualizar','projects.remover',
  'catalog.adicionarEtapa','catalog.removerEtapa','catalog.adicionarCategoria','catalog.removerCategoria','catalog.definirEtapasDaCategoria',
  'cronograma.adicionar','cronograma.atualizar','cronograma.remover','cronograma.salvar',
  'financeiro.adicionarCategoria','financeiro.atualizarOrcamento','financeiro.lancarGasto','financeiro.removerLancamento','financeiro.removerCategoria','financeiro.salvarTudo',
  'seed.rodar','seed.resetar',
];

function doPost(e){
  if(!e || !e.postData || !e.postData.contents) return jsonResponse_({ok:false, error:'Corpo da requisição ausente.'});

  var body;
  try{ body = JSON.parse(e.postData.contents); }
  catch(err){ return jsonResponse_({ok:false, error:'Corpo da requisição não é um JSON válido.'}); }

  var collection = body && body.collection;
  var op = body && body.op;
  var args = (body && body.args) || [];
  var acao = collection+'.'+op;
  var db = Db();
  if(!db[collection] || typeof db[collection][op]!=='function'){
    return jsonResponse_({ok:false, error:'Ação desconhecida: '+acao});
  }

  if(ACOES_PUBLICAS.indexOf(acao)===-1){
    var sessao = verificarSessao_(body.token);
    if(!sessao) return jsonResponse_({ok:false, error:'Não autenticado — faça login novamente.'});
    if(ACOES_ADMIN.indexOf(acao)!==-1 && !sessao.isAdmin){
      return jsonResponse_({ok:false, error:'Ação restrita ao administrador.'});
    }
  }

  var lock = LockService.getScriptLock();
  try{
    lock.waitLock(30000);
  }catch(err){
    return jsonResponse_({ok:false, error:'Sistema ocupado, tente novamente.'});
  }
  try{
    var result = db[collection][op].apply(null, args);
    return jsonResponse_({ok:true, data: result===undefined ? null : result});
  }catch(err){
    return jsonResponse_({ok:false, error: err.message || String(err)});
  }finally{
    lock.releaseLock();
  }
}

function doGet(e){
  return jsonResponse_({ok:true, service:'Portal Limiar backend', time:new Date().toISOString()});
}

function jsonResponse_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
