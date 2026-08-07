/* =================== VERIFICAÇÃO DE ID TOKEN (Firebase Auth) ===================
   Substitui a sessão própria (CacheService + token UUID) da versão anterior —
   agora quem autentica de verdade é o Firebase Auth, no cliente; este backend
   só confirma que o idToken recebido é genuíno antes de tocar o Drive.

   Usa o endpoint REST "accounts:lookup" com a Web API Key do projeto Firebase
   (a mesma já embutida em js/firebase-init.js — não é segredo, é a chave
   pública do app; a segurança de verdade está nas Firestore Security Rules e
   em quem consegue gerar um idToken válido, não em esconder essa chave). Não
   usa o Firebase Admin SDK (não existe pra Apps Script) nem verifica a
   assinatura JWT localmente — delega a verificação inteira pro próprio
   Google via essa chamada. */
var FIREBASE_WEB_API_KEY = 'AIzaSyBcnud0ZuzNt066KQa9OUtlc1a7KozjTOc';

// devolve o uid do Firebase se o token for válido, ou null (token ausente,
// expirado, ou de outro projeto Firebase)
function verificarIdToken_(idToken){
  if(!idToken) return null;
  try{
    var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FIREBASE_WEB_API_KEY, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({idToken: idToken}),
      muteHttpExceptions: true,
    });
    if(res.getResponseCode()!==200) return null;
    var data = JSON.parse(res.getContentText());
    var users = data && data.users;
    return (users && users[0] && users[0].localId) || null;
  }catch(e){ return null; }
}

// rodar UMA VEZ à mão pelo editor do Apps Script (Executar) — só existe pra
// disparar a tela de autorização do escopo script.external_request (usado
// por UrlFetchApp acima), que o deploy via clasp/CLI não passa por sozinho.
// Sem efeito nenhum além de conceder essa permissão pra conta que a rodar;
// seguro de deixar aqui depois.
function autorizarUrlFetch_(){
  UrlFetchApp.fetch('https://www.google.com', {muteHttpExceptions: true});
}
