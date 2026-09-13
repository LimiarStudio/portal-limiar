/* =================== MIGRAÇÃO: orçamento por categoria -> por etapa ===================
   Fase 13: "orçamento" deixou de ser um campo de cada categoria e passou a
   viver na etapa (uma categoria só agrupa os gastos dentro da etapa, sem
   orçamento próprio — ver js/data.js#etapaPrevisto e js/api.js#Api.financeiro).

   Roda uma vez só, contra os dados reais de produção: cada doc de
   financeiro/{pid} tem uma chave por etapa; no formato ANTIGO essa chave é
   um array de categorias ({nome,prev,lanc}), no formato NOVO é um objeto
   {prev, categorias:[{nome,lanc}]}. Pra cada etapa ainda no formato antigo,
   soma o "prev" de todas as categorias dela no novo "prev" da etapa (assim o
   Total orçado/Saldo a gastar do projeto não muda, só troca de nível) e
   remove o "prev" de cada categoria.

   Sem --aplicar, só mostra o que mudaria (dry-run) — sempre rodar assim
   primeiro. Rodar: node migrar_orcamento_por_etapa.js [--aplicar] */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const keyFile = fs.readdirSync(path.join(__dirname, '..', '..', 'key')).find(f => f.endsWith('.json'));
if (!keyFile) throw new Error('Nenhum arquivo .json encontrado em key/ — baixe a chave da service account primeiro.');
const serviceAccount = require(path.join(__dirname, '..', '..', 'key', keyFile));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const APLICAR = process.argv.includes('--aplicar');

function migrarEtapa(v){
  if(!Array.isArray(v)) return {mudou:false, valor:v}; // já está no formato novo
  const prev = v.reduce((a,c)=>a+(c.prev||0), 0);
  const categorias = v.map(c=>({nome:c.nome, lanc:c.lanc||[]}));
  return {mudou:true, valor:{prev, categorias}};
}

async function main(){
  console.log('Usando service account:', keyFile, '| projeto:', serviceAccount.project_id);
  console.log(APLICAR ? '*** MODO APLICAR — vai escrever no Firestore ***' : 'Modo dry-run (nada será escrito — rode com --aplicar pra gravar de verdade)');

  const snap = await db.collection('financeiro').get();
  console.log('docs em financeiro/:', snap.size);

  for(const doc of snap.docs){
    const data = doc.data();
    const novoDoc = {};
    let algumaMudanca = false;
    for(const etapa of Object.keys(data)){
      const {mudou, valor} = migrarEtapa(data[etapa]);
      novoDoc[etapa] = valor;
      if(mudou) algumaMudanca = true;
    }
    if(!algumaMudanca){
      console.log('projeto', doc.id, '— já migrado, nada a fazer.');
      continue;
    }
    console.log('projeto', doc.id, '— etapas a migrar:');
    Object.keys(novoDoc).forEach(etapa=>{
      console.log('  ', etapa, '-> prev:', novoDoc[etapa].prev, '| categorias:', novoDoc[etapa].categorias.map(c=>c.nome).join(', '));
    });
    if(APLICAR){
      await doc.ref.set(novoDoc);
      console.log('   -> gravado.');
    }
  }
  console.log(APLICAR ? 'Migração concluída.' : 'Dry-run concluído — rode com --aplicar pra gravar de verdade.');
}
main().catch(e=>{ console.error(e); process.exit(1); });
