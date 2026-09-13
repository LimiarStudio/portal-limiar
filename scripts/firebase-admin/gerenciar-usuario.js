/* =================== GERENCIAR USUÁRIO (rodar à mão, quando precisar) ===================
   Fase 9 do plano de migração: as duas únicas operações de usuário que não
   têm como acontecer direto do navegador — trocar a senha de OUTRA conta
   (só o próprio usuário logado pode trocar a própria senha client-side) e
   apagar uma conta do Firebase Auth de verdade (o botão "Remover" no site
   só revoga acesso no Firestore na hora; a conta em si continua existindo
   até rodar isto — ver Known Risk 3 do plano de migração, opção B: nenhuma
   infra nova, só este script local usando a mesma service account de sempre).

   Rodar:
     node gerenciar-usuario.js redefinir-senha <email> <novaSenha>
     node gerenciar-usuario.js remover <email>
     node gerenciar-usuario.js limpar-orfaos

   "remover" aqui É o offboarding completo (apaga a conta do Firebase Auth,
   libera o e-mail pra reuso) — diferente do botão "Remover" no site, que só
   tira o acesso (users/{uid} + permissões) e deixa a conta existindo. Rode
   o botão no site primeiro (revoga acesso na hora) e isto depois, quando
   quiser mesmo encerrar a conta.

   "limpar-orfaos" varre TODAS as contas do Firebase Auth e apaga de vez
   qualquer uma que não tenha mais um documento users/{uid} no Firestore (ou
   seja, alguém que já foi "removido" pelo site em algum momento, mas cuja
   conta de login nunca foi encerrada por aqui) — pra zerar o acúmulo de uma
   vez, em vez de rodar "remover <email>" uma por uma. Sempre lista antes de
   apagar. */
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const keyFile = fs.readdirSync(path.join(__dirname, '..', '..', 'key')).find(f => f.endsWith('.json'));
if (!keyFile) throw new Error('Nenhum arquivo .json encontrado em key/ — baixe a chave da service account primeiro.');
const serviceAccount = require(path.join(__dirname, '..', '..', 'key', keyFile));

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const [,, comando, email, novaSenha] = process.argv;

function uso(){
  console.log('Uso:');
  console.log('  node gerenciar-usuario.js redefinir-senha <email> <novaSenha>');
  console.log('  node gerenciar-usuario.js remover <email>');
  console.log('  node gerenciar-usuario.js limpar-orfaos');
  process.exit(1);
}

async function redefinirSenha(){
  if(!email || !novaSenha) uso();
  if(novaSenha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres (mínimo do Firebase Auth).');
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password: novaSenha });
  console.log('Senha redefinida para', email, '(uid', user.uid+').');
}

// revoga acesso no Firestore (idempotente: não falha se já não existir) e
// apaga a conta do Firebase Auth de vez — usado tanto por "remover <email>"
// quanto por "limpar-orfaos"
async function removerContaCompleta(uid, emailParaLog){
  const batch = db.batch();
  batch.delete(db.doc('users/'+uid));
  const projSnap = await db.collection('projects').get();
  for(const p of projSnap.docs){
    const permRef = db.doc('projects/'+p.id+'/permissions/'+uid);
    const permDoc = await permRef.get();
    if(permDoc.exists) batch.delete(permRef);
  }
  await batch.commit();
  await auth.deleteUser(uid);
  console.log('Conta de', emailParaLog, '(uid', uid+') removida do Firebase Auth e de todo acesso no Firestore.');
}

async function remover(){
  if(!email) uso();
  const user = await auth.getUserByEmail(email);
  await removerContaCompleta(user.uid, email);
}

async function limparOrfaos(){
  const adminSnap = await db.doc('system/admin').get();
  const adminUid = adminSnap.exists ? adminSnap.data().uid : null;
  const usersSnap = await db.collection('users').get();
  const uidsComDoc = new Set(usersSnap.docs.map(d => d.id));

  const orfaos = [];
  let pageToken;
  do{
    const page = await auth.listUsers(1000, pageToken);
    for(const u of page.users){
      if(u.uid===adminUid || uidsComDoc.has(u.uid)) continue;
      orfaos.push(u);
    }
    pageToken = page.pageToken;
  }while(pageToken);

  if(!orfaos.length){ console.log('Nenhuma conta órfã encontrada — tudo limpo.'); return; }
  console.log(orfaos.length+' conta(s) órfã(s) encontrada(s) (sem acesso a nada, mas o login ainda existia):');
  orfaos.forEach(u => console.log('  - '+(u.email||'(sem e-mail)')+' (uid '+u.uid+')'));
  console.log('\nApagando...');
  for(const u of orfaos) await removerContaCompleta(u.uid, u.email||u.uid);
  console.log('\n'+orfaos.length+' conta(s) removida(s) de vez.');
}

async function main(){
  if(comando==='redefinir-senha') return redefinirSenha();
  if(comando==='remover') return remover();
  if(comando==='limpar-orfaos') return limparOrfaos();
  uso();
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
