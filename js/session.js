/* =================== SESSION ===================
   Sessão de verdade agora é o Firebase Auth (ver js/firebase-init.js) — não
   existe mais token/usuário próprios no localStorage. requireAuth() é
   assíncrona porque até uma sessão já persistida localmente pelo Firebase
   leva um instante pra ser confirmada (onAuthStateChanged) antes do primeiro
   disparo; cada init<Página>Page() já é async e chama isso como primeira
   linha (ver ~9 call sites), então o resto da página só roda depois que
   CURRENT_USER/ROLE estão prontos.

   isAdmin não vem de custom claims nem de um papel salvo em algum lugar —
   é sempre resolvido comparando o uid de quem logou com system/admin.uid no
   Firestore (single source of truth, ver firestore.rules). nome/email pra
   exibição vêm direto de firebase.auth().currentUser — não duplicados em
   documento nenhum. ROLE continua existindo só pra não reescrever as dezenas
   de checagens ROLE==='gestor' espalhadas pelo site. */
let CURRENT_USER = null;
let ROLE = 'cliente';

// nunca resolve se não houver usuário — a navegação pra login.html assume o
// controle antes que o código depois de "await requireAuth()" continue
function requireAuth(){
  return new Promise(resolve=>{
    const unsubscribe = firebase.auth().onAuthStateChanged(async user=>{
      unsubscribe();
      if(!user){ window.location.href = 'login.html'; return; }
      let isAdmin = false;
      try{
        const adminSnap = await firebase.firestore().doc('system/admin').get();
        isAdmin = adminSnap.exists && adminSnap.data().uid === user.uid;
      }catch(e){ isAdmin = false; }
      CURRENT_USER = {id: user.uid, nome: user.displayName || user.email, email: user.email, isAdmin};
      ROLE = isAdmin ? 'gestor' : 'cliente';
      resolve();
    });
  });
}
async function logout(){
  try{ await firebase.auth().signOut(); }catch(e){}
  window.location.href = 'login.html';
}
function iniciais(nome){
  const partes = (nome||'').trim().split(/\s+/);
  return (((partes[0]||'')[0]||'') + ((partes[partes.length-1]||'')[0]||'')).toUpperCase();
}
function renderUserChip(){
  if(!CURRENT_USER) return;
  $('#userName').textContent = CURRENT_USER.nome;
  $('#avatar').textContent = iniciais(CURRENT_USER.nome);
  $('#avatar').style.background = ROLE==='cliente' ? 'var(--blue)' : 'var(--violet)';
}
/* mantido só pra não precisar tocar nas dezenas de hrefs que já chamam
   withRole(...) pelo site inteiro — o mecanismo de "trocar de papel pela
   URL" acabou (ROLE agora vem de quem realmente logou), mas a função
   continua existindo como passthrough pra não ter que reescrever cada uma */
function withRole(url){ return url; }
