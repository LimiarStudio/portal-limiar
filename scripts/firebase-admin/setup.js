/* =================== SETUP (rodar uma vez só) ===================
   Fase 2 do plano de migração: cria a conta do administrador no Firebase
   Auth, escreve os documentos "system/admin" e "system/counters", e importa
   o catálogo de fábrica (etapas/categorias/funções/equipamentos) pro
   Firestore em catalogDefaults/factory. Não roda em produção nenhuma —
   script local, usa a service account em key/*.json (nunca commitado, ver
   .gitignore). Rodar: node setup.js */
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

// credenciais reais NUNCA hardcoded aqui — este arquivo vai pro repo público
// (github.com/LimiarStudio/portal-limiar). Rodar como:
//   ADMIN_EMAIL=... ADMIN_SENHA=... node setup.js
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_SENHA = process.env.ADMIN_SENHA;
const ADMIN_NOME = 'Studio Limiar';
const PROJECT_COUNTER_START = 2; // ids reais já existentes: 1 ("Teste"), 2 ("306_Oyama e Layanne")
if(!ADMIN_EMAIL || !ADMIN_SENHA) throw new Error('Defina ADMIN_EMAIL e ADMIN_SENHA como variáveis de ambiente antes de rodar.');

async function main(){
  console.log('Usando service account:', keyFile);
  console.log('Projeto Firebase:', serviceAccount.project_id);

  // 1) conta do administrador no Firebase Auth
  let userRecord;
  try{
    userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
    console.log('Admin já existe no Firebase Auth, uid =', userRecord.uid);
  }catch(e){
    userRecord = await auth.createUser({ email: ADMIN_EMAIL, password: ADMIN_SENHA, displayName: ADMIN_NOME });
    console.log('Admin criado no Firebase Auth, uid =', userRecord.uid);
  }

  // 2) system/admin — inclui nome/e-mail (não só uid): qualquer usuário
  // autenticado precisa poder mostrar "quem é o administrador" na tela de
  // Usuários e Permissões de um projeto, não só o próprio administrador
  // logado (que poderia ler isso de firebase.auth().currentUser)
  await db.doc('system/admin').set({ uid: userRecord.uid, nome: ADMIN_NOME, email: ADMIN_EMAIL });
  console.log('system/admin gravado.');

  // 3) system/counters — só grava se ainda não existir, pra nunca sobrescrever
  // um contador que já avançou numa reexecução acidental deste script
  const countersRef = db.doc('system/counters');
  const countersSnap = await countersRef.get();
  if(!countersSnap.exists){
    await countersRef.set({ projects: PROJECT_COUNTER_START });
    console.log('system/counters gravado, projects =', PROJECT_COUNTER_START);
  }else{
    console.log('system/counters já existe, mantido como está:', countersSnap.data());
  }

  // 4) catalogDefaults/factory
  const catalogPath = path.join(__dirname, 'catalog-factory-export.json');
  if(!fs.existsSync(catalogPath)) throw new Error('catalog-factory-export.json não encontrado — rode a exportação do catálogo primeiro.');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  await db.doc('catalogDefaults/factory').set(catalog);
  console.log('catalogDefaults/factory gravado:', {
    etapas: catalog.etapas.length, categorias: catalog.categorias.length,
    funcoes: catalog.funcoes.length, equipamentos: catalog.equipamentos.length,
  });

  console.log('\nSetup concluído.');
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });
