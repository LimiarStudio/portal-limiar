/* =================== USUÁRIOS (só o administrador) ===================
   Único op do backend enxuto que mexe no LOGIN de outra pessoa — apagar de
   vez uma conta do Firebase Auth. O botão "Remover" do site já revogou o
   acesso no Firestore direto do navegador antes de chamar isto (ver
   Api.users.remover em js/api.js); aqui só falta encerrar o login em si —
   a mesma coisa que scripts/firebase-admin/gerenciar-usuario.js já fazia
   rodando à mão, só que agora disparada pelo próprio botão do site.

   Autorização: doPost (Code.js) já verificou que o idToken é genuíno e
   passa o uid de quem chamou como ÚLTIMO argumento de QUALQUER op (ver
   comentário em Code.js) — aqui comparamos esse uid contra a Script
   Property "ADMIN_UID" (Project Settings > Script Properties, configurada
   uma vez com o uid do Firebase Auth do administrador — visível em
   Firebase Console > Authentication > Users), já que este backend não tem
   mais acesso ao Firestore pra ler system/admin.uid como o resto do site
   faz. Só o administrador passa; qualquer outro idToken válido (mas de
   outra pessoa) é rejeitado aqui, mesmo sendo genuíno — sem essa checagem,
   qualquer usuário autenticado (ex.: um funcionário com acesso a só um
   projeto) poderia chamar este op direto na API e apagar QUALQUER conta. */
var RepoUsers = {
  remover(uidAlvo, uidChamador){
    var adminUid = PropertiesService.getScriptProperties().getProperty('ADMIN_UID');
    if(!adminUid) throw new Error('Script Property "ADMIN_UID" não configurada.');
    if(uidChamador !== adminUid) throw new Error('Só o administrador pode encerrar a conta de outro usuário.');
    if(!uidAlvo) throw new Error('uid do usuário a remover não informado.');
    if(uidAlvo === adminUid) throw new Error('O administrador não pode apagar a própria conta por aqui.');

    // token OAuth do PRÓPRIO deploy (executeAs: USER_DEPLOYING, ver
    // appsscript.json) — precisa do escopo identitytoolkit + do papel IAM
    // "Firebase Authentication Admin" concedido a essa conta no projeto do
    // Google Cloud (ver backend/README.md)
    var token = ScriptApp.getOAuthToken();
    var resp = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/projects/'+FIREBASE_PROJECT_ID_+'/accounts:delete', {
      method: 'post',
      contentType: 'application/json',
      headers: {Authorization: 'Bearer '+token},
      payload: JSON.stringify({localId: uidAlvo}),
      muteHttpExceptions: true,
    });
    var code = resp.getResponseCode();
    if(code < 200 || code >= 300){
      throw new Error('Não foi possível apagar a conta de login (HTTP '+code+'): '+resp.getContentText());
    }
    return {removido: true, uid: uidAlvo};
  },
};

// mesmo projeto de js/firebase-init.js e .firebaserc — não é segredo (já
// público no próprio código do site)
var FIREBASE_PROJECT_ID_ = 'portal-limiar-api';
