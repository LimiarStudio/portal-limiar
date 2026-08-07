/* =================== MIGRAÇÃO DE DADOS (Fase 4) ===================
   Lê scripts/firebase-admin/migration-export.json (exportado do Apps
   Script/Drive ainda ativo — ver scratchpad/export_migration_data.js, ou
   reexporte antes de rodar isto de novo) e grava tudo no Firestore, no
   formato descrito no plano de migração. Não mexe em imagens/PDFs — ficam
   onde estão no Drive, os RDOs migrados só mantêm os mesmos fileId.

   O único usuário não-admin encontrado na exportação (andre@teste.com) foi
   confirmado como dado de teste, não usuário real — por isso este script
   NÃO cria contas de usuário nem migra o documento de permissões que
   referenciava esse id. Usuários reais entram depois, pela tela de admin
   já reconstruída (Fase 9).

   Idempotente por design: cada `.set()` sobrescreve o doc inteiro, então
   rodar de novo (ex.: sincronização final antes do corte de produção, ver
   Fase 12) é seguro. Rodar: node migrate.js */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const keyFile = fs.readdirSync(path.join(__dirname, '..', '..', 'key')).find(f => f.endsWith('.json'));
const serviceAccount = require(path.join(__dirname, '..', '..', 'key', keyFile));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const exportPath = path.join(__dirname, 'migration-export.json');
if (!fs.existsSync(exportPath)) throw new Error('migration-export.json não encontrado — rode a exportação primeiro.');
const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));

async function main(){
  console.log('Projetos a migrar:', data.projects.map(p => `${p.id} (${p.nome})`).join(', '));

  for (const p of data.projects) {
    const pid = String(p.id);
    const pp = data.perProject[p.id];

    // projects/{pid} — mesmos campos, id como string
    const projeto = Object.assign({}, p);
    delete projeto.id; // o id já é o nome do documento, não precisa duplicar dentro dele
    await db.doc(`projects/${pid}`).set(projeto);

    // cronogramas/{pid} — array vira {etapas:[...]} (doc do Firestore precisa ser um mapa)
    await db.doc(`cronogramas/${pid}`).set({ etapas: pp.cronograma });

    // financeiro/{pid} — mesmo shape aninhado de hoje
    await db.doc(`financeiro/${pid}`).set(pp.financeiro);

    // projectCatalog/{pid} — overrides crus (não a versão computada)
    await db.doc(`projectCatalog/${pid}`).set(pp.catalogOverrides);

    // projects/{pid}/rdos/{n} — um doc por relatório, fileId das fotos mantido igual
    for (const rdo of pp.rdos) {
      await db.doc(`projects/${pid}/rdos/${rdo.n}`).set(rdo);
    }

    // permissoes: só migraria pra usuários reais — nenhum nesta migração
    // (ver comentário no topo do arquivo)
    const permCount = Object.keys(pp.permissions.permissoes || {}).length;

    console.log(`  projeto ${pid} (${p.nome}): cronograma=${pp.cronograma.length} etapas, rdos=${pp.rdos.length} relatórios, permissões ignoradas=${permCount}`);
  }

  console.log('\nMigração concluída.');
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });
