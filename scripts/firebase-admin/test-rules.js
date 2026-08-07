/* Testa as Security Rules publicadas contra identidades reais (não o Admin
   SDK, que ignora as rules por completo) — cria dados de teste via Admin
   SDK, testa como um usuário comum de verdade via o client SDK (REST, sem
   precisar de navegador), depois apaga tudo. Rodar: node test-rules.js */
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const keyFile = fs.readdirSync(path.join(__dirname, '..', '..', 'key')).find(f => f.endsWith('.json'));
const serviceAccount = require(path.join(__dirname, '..', '..', 'key', keyFile));
const FIREBASE_API_KEY = 'AIzaSyBcnud0ZuzNt066KQa9OUtlc1a7KozjTOc'; // apiKey do js/firebase-init.js, não é segredo

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const TEST_PID = 'rulestest1';
let results = [];
function check(nome, ok){ results.push({nome, ok}); console.log((ok?'OK  ':'FAIL')+' - '+nome); }

// login REST direto (client SDK de verdade sujeito às rules) — sem precisar
// de navegador, é só um POST simples
async function loginComo(email, senha){
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email, password: senha, returnSecureToken: true}),
  });
  const data = await res.json();
  if(!data.idToken) throw new Error('login falhou: '+JSON.stringify(data));
  return data.idToken;
}
// leitura/escrita via REST do Firestore, usando o idToken (sujeito às rules)
async function firestoreGet(idToken, docPath){
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/${docPath}`, {
    headers: {Authorization: `Bearer ${idToken}`},
  });
  return {status: res.status, body: await res.json()};
}
async function firestoreList(idToken, collectionPath){
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/${collectionPath}`, {
    headers: {Authorization: `Bearer ${idToken}`},
  });
  return {status: res.status, body: await res.json()};
}
async function firestoreSet(idToken, docPath, fields){
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/${docPath}`, {
    method: 'PATCH', headers: {Authorization: `Bearer ${idToken}`, 'Content-Type':'application/json'},
    body: JSON.stringify({fields}),
  });
  return {status: res.status, body: await res.json()};
}

async function main(){
  // --- setup (via Admin SDK, ignora as rules) ---
  const emailA = 'teste-rules-a@example.com', emailB = 'teste-rules-b@example.com';
  const senha = 'senhaTeste123';
  let userA, userB;
  try{ userA = await auth.getUserByEmail(emailA); }catch(e){ userA = await auth.createUser({email: emailA, password: senha}); }
  try{ userB = await auth.getUserByEmail(emailB); }catch(e){ userB = await auth.createUser({email: emailB, password: senha}); }

  await db.doc(`projects/${TEST_PID}`).set({nome:'Projeto Teste Rules', tipo:'completo'});
  // userA TEM permissão (rdo.view=true) neste projeto; userB NÃO tem doc nenhum
  await db.doc(`projects/${TEST_PID}/permissions/${userA.uid}`).set({
    gerenciarUsuarios:false,
    visao:{view:false,write:false,delete:false},
    rdo:{view:true,write:false,delete:false},
    financeiro:{view:false,write:false,delete:false},
    cronograma:{view:false,write:false,delete:false},
  });

  const tokenA = await loginComo(emailA, senha);
  const tokenB = await loginComo(emailB, senha);

  // 1) A lê o próprio doc de permissões -> deve funcionar
  let r = await firestoreGet(tokenA, `projects/${TEST_PID}/permissions/${userA.uid}`);
  check('usuário lê o próprio doc de permissões', r.status === 200);

  // 2) B tenta ler o doc de permissões de A -> deve falhar
  r = await firestoreGet(tokenB, `projects/${TEST_PID}/permissions/${userA.uid}`);
  check('usuário NÃO lê doc de permissões de outro usuário', r.status !== 200);

  // 3) B tenta ler o projeto (sem ter permissão nenhuma nele) -> deve falhar
  r = await firestoreGet(tokenB, `projects/${TEST_PID}`);
  check('usuário sem permissão NÃO lê o projeto', r.status !== 200);

  // 3b) A tenta ler o projeto (TEM permissão em rdo) -> deve funcionar
  r = await firestoreGet(tokenA, `projects/${TEST_PID}`);
  check('usuário COM permissão lê o projeto', r.status === 200);

  // 4) B (não-admin) tenta escrever um doc de permissões pra si mesmo -> deve falhar
  r = await firestoreSet(tokenB, `projects/${TEST_PID}/permissions/${userB.uid}`, {
    gerenciarUsuarios:{booleanValue:false},
    visao:{mapValue:{fields:{view:{booleanValue:true},write:{booleanValue:false},delete:{booleanValue:false}}}},
    rdo:{mapValue:{fields:{view:{booleanValue:false},write:{booleanValue:false},delete:{booleanValue:false}}}},
    financeiro:{mapValue:{fields:{view:{booleanValue:false},write:{booleanValue:false},delete:{booleanValue:false}}}},
    cronograma:{mapValue:{fields:{view:{booleanValue:false},write:{booleanValue:false},delete:{booleanValue:false}}}},
  });
  check('usuário comum NÃO consegue se auto-conceder permissão', r.status !== 200);

  // 5) A (rdo.view=true, rdo.write=false) tenta escrever em rdos/ -> deve falhar
  r = await firestoreSet(tokenA, `projects/${TEST_PID}/rdos/1`, {n:{integerValue:1}});
  check('usuário sem write no módulo NÃO consegue escrever', r.status !== 200);

  // 6) A tenta ler rdos/ (tem rdo.view=true) -> deve funcionar (mesmo que vazio, sem 403)
  r = await firestoreGet(tokenA, `projects/${TEST_PID}/rdos/1`);
  check('usuário com view no módulo consegue tentar ler (404 do doc inexistente é ok, 403 não)', r.status !== 403);

  // 7) A tenta ler cronogramas/ (não tem permissão em cronograma) -> deve falhar
  r = await firestoreGet(tokenA, `cronogramas/${TEST_PID}`);
  check('usuário sem view no módulo NÃO lê esse módulo', r.status !== 200);

  // 7b) B (sem gerenciarUsuarios) tenta LISTAR a subcoleção inteira de
  // permissions do projeto -> deve falhar (nem A, que tem gerenciarUsuarios
  // false também, conseguiria)
  r = await firestoreList(tokenB, `projects/${TEST_PID}/permissions`);
  check('usuário comum NÃO consegue listar as permissões de todo mundo no projeto', r.status !== 200);

  // 7c) dá gerenciarUsuarios=true pra A (via Admin SDK, simulando o admin
  // configurando isso) e confirma que A AGORA consegue listar a subcoleção
  // inteira — é o que usuarios-page.js precisa pra um delegado ver quem tem
  // acesso ao projeto, não só a própria permissão
  await db.doc(`projects/${TEST_PID}/permissions/${userA.uid}`).set({
    gerenciarUsuarios:true,
    visao:{view:false,write:false,delete:false},
    rdo:{view:true,write:false,delete:false},
    financeiro:{view:false,write:false,delete:false},
    cronograma:{view:false,write:false,delete:false},
  });
  r = await firestoreList(tokenA, `projects/${TEST_PID}/permissions`);
  check('delegado (gerenciarUsuarios=true) consegue listar as permissões do projeto', r.status === 200 && Array.isArray(r.body.documents) && r.body.documents.length >= 1, r.status);

  // 8) admin (mesmo sem doc de permissões nenhum) lê e escreve livremente
  const adminSnap = await db.doc('system/admin').get();
  const adminUid = adminSnap.data().uid;
  const adminEmail = (await auth.getUser(adminUid)).email;
  // não temos a senha do admin aqui (é a de produção) — testa via um
  // custom token, que também passa pelas rules normalmente
  const adminCustomToken = await auth.createCustomToken(adminUid);
  const exchangeRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({token: adminCustomToken, returnSecureToken: true}),
  });
  const adminIdToken = (await exchangeRes.json()).idToken;
  r = await firestoreGet(adminIdToken, `projects/${TEST_PID}`);
  check('admin lê o projeto mesmo sem doc de permissões', r.status === 200 || r.status === 404); // 404 só se já foi apagado nesse ponto — ainda não foi
  // recria o projeto de teste já que o teste acima pode ter corrido antes do delete
  await db.doc(`projects/${TEST_PID}`).set({nome:'Projeto Teste Rules', tipo:'completo'});
  r = await firestoreGet(adminIdToken, `projects/${TEST_PID}`);
  check('admin lê o projeto (confirmado após recriar)', r.status === 200);

  // 9) admin tenta gravar um módulo com write:true, view:false -> rules
  // devem rejeitar mesmo sendo admin (moduloValido/permissoesValidas)
  r = await firestoreSet(adminIdToken, `projects/${TEST_PID}/permissions/${userA.uid}`, {
    gerenciarUsuarios:{booleanValue:false},
    visao:{mapValue:{fields:{view:{booleanValue:false},write:{booleanValue:false},delete:{booleanValue:false}}}},
    rdo:{mapValue:{fields:{view:{booleanValue:false},write:{booleanValue:true},delete:{booleanValue:false}}}}, // write=true, view=false -> inválido
    financeiro:{mapValue:{fields:{view:{booleanValue:false},write:{booleanValue:false},delete:{booleanValue:false}}}},
    cronograma:{mapValue:{fields:{view:{booleanValue:false},write:{booleanValue:false},delete:{booleanValue:false}}}},
  });
  check('write:true com view:false é rejeitado mesmo vindo do admin', r.status !== 200);

  // --- cleanup ---
  await db.doc(`projects/${TEST_PID}/permissions/${userA.uid}`).delete();
  await db.doc(`projects/${TEST_PID}`).delete();
  await auth.deleteUser(userA.uid);
  await auth.deleteUser(userB.uid);
  console.log('\nlimpeza concluída.');

  const falhas = results.filter(r => !r.ok);
  console.log(`\n${results.length - falhas.length}/${results.length} passaram.`);
  if(falhas.length) process.exit(1);
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });
