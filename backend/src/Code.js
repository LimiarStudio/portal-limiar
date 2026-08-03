/* =================== ENTRY POINT (Web App) ===================
   Apps Script só expõe doGet/doPost — não tem roteamento por caminho como um
   servidor HTTP de verdade, e a resposta é sempre HTTP 200 no nível de
   transporte (não dá pra mandar um 404/400 real). Por isso o contrato é um
   envelope JSON: {ok:true, data:...} ou {ok:false, error:"..."} — quem
   chamar tem que checar "ok", nunca o status HTTP da resposta.

   doPost é o ponto de entrada principal, inclusive pra leituras — o corpo é
   {collection, op, args:[...]}, despachado direto pra Db[collection][op].
   O corpo é lido como JSON independente do Content-Type enviado — isso
   importa pra mais adiante: um fetch() de navegador com
   "Content-Type: application/json" dispara um preflight CORS que Web Apps do
   Apps Script não respondem, então o front-end (próxima fase) vai mandar o
   corpo como text/plain pra evitar isso, e aceitar aqui já sem exigir um
   Content-Type específico não custa nada hoje.

   doGet serve só como healthcheck e atalho de leitura (só ações da lista
   LEITURAS_PERMITIDAS_GET) pra testar pelo navegador/curl sem montar um POST. */
function doPost(e){
  if(!e || !e.postData || !e.postData.contents) return jsonResponse_({ok:false, error:'Corpo da requisição ausente.'});

  var body;
  try{ body = JSON.parse(e.postData.contents); }
  catch(err){ return jsonResponse_({ok:false, error:'Corpo da requisição não é um JSON válido.'}); }

  var collection = body && body.collection;
  var op = body && body.op;
  var args = (body && body.args) || [];
  if(!Db[collection] || typeof Db[collection][op]!=='function'){
    return jsonResponse_({ok:false, error:'Ação desconhecida: '+collection+'.'+op});
  }

  var lock = LockService.getScriptLock();
  try{
    lock.waitLock(30000);
  }catch(err){
    return jsonResponse_({ok:false, error:'Sistema ocupado, tente novamente.'});
  }
  try{
    var result = Db[collection][op].apply(null, args);
    return jsonResponse_({ok:true, data: result===undefined ? null : result});
  }catch(err){
    return jsonResponse_({ok:false, error: err.message || String(err)});
  }finally{
    lock.releaseLock();
  }
}

// só leituras — nunca mutações — pra uma URL de GET (histórico do navegador,
// logs, um bot indexando) nunca conseguir alterar dado nenhum
var LEITURAS_PERMITIDAS_GET = [
  'users.listar','users.buscar','users.buscarPorEmail',
  'projects.listar','projects.buscar',
  'catalog.etapasFactory','catalog.categoriasFactory','catalog.funcoesFactory','catalog.equipamentosFactory',
  'catalog.etapasDoProjeto','catalog.categoriasDoProjeto',
  'cronograma.listar',
  'financeiro.tudo','financeiro.porEtapa',
  'rdos.listar','rdos.buscar',
  'permissions.obter','permissions.doUsuario',
];

function doGet(e){
  var action = e && e.parameter && e.parameter.action;
  if(!action) return jsonResponse_({ok:true, service:'Portal Limiar backend', time:new Date().toISOString()});

  if(LEITURAS_PERMITIDAS_GET.indexOf(action)===-1){
    return jsonResponse_({ok:false, error:'Ação não permitida via GET — use POST.'});
  }
  var partes = action.split('.');
  var collection = partes[0], op = partes[1];
  var args;
  try{ args = e.parameter.args ? JSON.parse(e.parameter.args) : []; }
  catch(err){ return jsonResponse_({ok:false, error:'args deve ser um array JSON válido.'}); }

  try{
    var result = Db[collection][op].apply(null, args);
    return jsonResponse_({ok:true, data: result===undefined ? null : result});
  }catch(err){
    return jsonResponse_({ok:false, error: err.message || String(err)});
  }
}

function jsonResponse_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
