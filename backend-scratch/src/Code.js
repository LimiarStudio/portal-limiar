/* =================== ENTRY POINT (Web App) — versão enxuta ===================
   Fase 5 da migração pra Firebase: este projeto Apps Script SÓ existe pra
   duas coisas que precisam de uma credencial de servidor que o navegador não
   pode ter — subir/apagar imagem no Drive e gerar o PDF de um relatório.
   Tudo o mais (projetos, cronograma, financeiro, permissões, usuários) já
   fica no Firestore, lido/escrito direto do navegador — este backend nunca
   toca o Firestore.

   Sem ACOES_ADMIN/ACOES_LEITURA nem LockService: não sobrou nenhuma escrita
   de documento compartilhado aqui (upload de imagem e geração de PDF cada um
   mexe só no seu próprio arquivo, substituindo-o — não há leitura-modificação-
   escrita de um JSON coletivo pra proteger contra concorrência).

   Autenticação: quem loga é o Firebase Auth, no cliente — este backend só
   confirma que o idToken recebido é genuíno (ver Lib/FirebaseAuth.js) antes
   de tocar o Drive. Não existe mais um token de sessão próprio. */
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

  // mesmo motivo do backend original: um try/catch único aqui garante que
  // NENHUMA exceção (nem uma falha inesperada em UrlFetchApp) escapa como
  // página de erro HTML do Apps Script — sempre volta o envelope JSON.
  try{
    var uid = verificarIdToken_(body.idToken);
    if(!uid) return jsonResponse_({ok:false, error:'Não autenticado — faça login novamente.'});

    var result = db[collection][op].apply(null, args);
    return jsonResponse_({ok:true, data: result===undefined ? null : result});
  }catch(err){
    return jsonResponse_({ok:false, error: (err && err.message) || String(err)});
  }
}

function doGet(e){
  return jsonResponse_({ok:true, service:'Portal Limiar backend (enxuto — imagens e PDF)', time:new Date().toISOString()});
}

function jsonResponse_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
