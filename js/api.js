/* =================== API ===================
   Fase 8 da migração pra Firebase: a maior parte dos dados (projetos,
   permissões, catálogo, cronograma, financeiro, relatórios) agora mora no
   Firestore, lida/escrita DIRETO do navegador — sem backend no meio, sem a
   lentidão do redirecionamento do Apps Script. Só sobram duas coisas que
   precisam de credencial de servidor (Drive) e por isso continuam passando
   por um Apps Script — agora bem menor (ver backend-scratch/src): upload de
   imagem e geração de PDF de relatório.

   Cada Api.<coleção>.<op> abaixo continua cuidando da conversão de formato
   entre o que o banco guarda (datas ISO, RDO com mo/eq como objetos, fotos
   por fileId...) e o que o resto do site já espera (datas BR, RDO com mo/eq
   como tuplas, fotos com src/emoji...) — essa parte não mudou nem precisou
   mudar: só o transporte por baixo de cada função trocou, as funções de
   conversão (dbParaMemoria/memoriaParaDb) são as mesmas de sempre.

   Api.users (Fase 9) é contas de verdade do Firebase Auth, não mais um
   documento com senhaHash/senhaSalt — id é o uid, criação é client-side (uma
   instância secundária do app, pra não afetar a sessão do administrador),
   remoção/redefinição de senha de OUTRA conta exigem o Admin SDK e por isso
   vivem num script local (scripts/firebase-admin/gerenciar-usuario.js).

   Api.archive (Fase 10) também não tem mais equivalente no backend — vira
   um fluxo orquestrado inteiramente pelo cliente (gera todo PDF de relatório
   ANTES de apagar qualquer coisa do Firestore, projeto por último). */

const firestoreDb = () => firebase.firestore();

// Fase 5-11: aponta pro projeto Apps Script SCRATCH (nunca o real, que segue
// em produção rodando o backend antigo até o corte da Fase 12) — só usado
// por Api.images.*/Api.rdos.gerarPdf, os 2 únicos ops que sobraram no
// backend depois da Fase 5. Vira a URL real na Fase 12.
const API_URL = 'https://script.google.com/macros/s/AKfycbzOTXNNfoFSHBl63ZC_6MhKf8p-LgIkDJfZ4y2h6DObA1GsLjmH3LNmbITqcKmQtLaBzA/exec';

async function apiCall(collection, op, args){
  let idToken = null;
  try{
    const user = firebase.auth().currentUser;
    if(user) idToken = await user.getIdToken();
  }catch(e){}

  // o redirecionamento que o Apps Script faz por trás de todo POST
  // (script.google.com -> script.googleusercontent.com) às vezes trava por
  // dezenas de segundos, ou (mais raro) acaba resolvendo pro doGet em vez do
  // doPost — por isso o timeout abaixo, mais a checagem de "service" logo
  // adiante (só a resposta do doGet tem esse campo; nunca uma resposta real
  // de doPost)
  const controller = new AbortController();
  const timeoutId = setTimeout(()=>controller.abort(), 35000);

  let res;
  try{
    res = await fetch(API_URL, {
      method:'POST',
      // text/plain (não application/json) evita o preflight de CORS que um Web
      // App do Apps Script não responde — o backend faz JSON.parse do corpo do
      // mesmo jeito, independente do Content-Type declarado (ver Code.js)
      headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({collection, op, args: args||[], idToken}),
      signal: controller.signal,
    });
  }catch(e){
    throw new Error(e.name==='AbortError'
      ? 'O servidor demorou demais para responder. Tente novamente.'
      : 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
  }finally{
    clearTimeout(timeoutId);
  }

  let corpo;
  try{ corpo = await res.json(); }
  catch(e){ throw new Error('Resposta inesperada do servidor.'); }

  // resposta do healthcheck (doGet) veio no lugar do resultado de verdade —
  // sintoma do redirecionamento acima resolvendo pro lugar errado, não um
  // erro de aplicação; melhor falhar claro do que seguir com "data" vazio
  if(corpo.service){
    throw new Error('Resposta inesperada do servidor. Tente novamente.');
  }

  if(!corpo.ok){
    if(/^Não autenticado/.test(corpo.error||'') && !location.pathname.endsWith('login.html')){
      location.href='login.html';
    }
    throw new Error(corpo.error || 'Erro desconhecido.');
  }
  return corpo.data;
}

const Api = {};

/* --- usuários: Fase 9. Não existe mais um documento com senhaHash/senhaSalt
   pra gerenciar — cada usuário agora é uma conta de verdade do Firebase
   Auth, e o id É o uid dessa conta (uma string, não mais um número — todo
   lugar que tratava id de usuário como número precisou de ajuste, ver
   usuarios-page.js/admin-usuarios-page.js). users/{uid} no Firestore é só um
   ESPELHO de nome/e-mail (o SDK do Firebase Auth não permite listar contas
   do lado do cliente, daí a necessidade de manter essa cópia em algum lugar
   consultável). system/admin também guarda nome/e-mail (não só uid) pelo
   mesmo motivo — QUALQUER usuário autenticado precisa poder mostrar "quem é
   o administrador" na tela de Usuários e Permissões de um projeto, não só o
   próprio administrador logado (que poderia ler isso de
   firebase.auth().currentUser, mas um usuário comum olhando a MESMA tela
   não tem acesso ao perfil de outra conta).

   Criação é 100% client-side: uma segunda instância do app Firebase, só
   pra criar a conta sem afetar a sessão do administrador que está logado.
   Remoção e redefinição de senha de OUTRA conta exigem o Admin SDK (não tem
   como fazer isso com o usuário logado sendo só o administrador) — ficam
   por conta do script local scripts/firebase-admin/gerenciar-usuario.js;
   remover() aqui só revoga acesso (Firestore), a conta em si no Firebase
   Auth continua existindo até o script rodar (ver Known Risk 3 do plano). */
Api.users = {
  listar: async () => {
    const snap = await firestoreDb().collection('users').get();
    const lista = snap.docs.map(d => Object.assign({id:d.id}, d.data()));
    lista.sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
    return lista;
  },
  buscar: async uid => {
    const doc = await firestoreDb().doc('users/'+uid).get();
    if(!doc.exists) throw new Error('Usuário não encontrado: '+uid);
    return Object.assign({id:doc.id}, doc.data());
  },
  administrador: async () => {
    const doc = await firestoreDb().doc('system/admin').get();
    if(!doc.exists) throw new Error('Administrador não configurado.');
    return {id: doc.data().uid, nome: doc.data().nome, email: doc.data().email};
  },
  // instância secundária e descartável só pra não deslogar o administrador
  // (createUserWithEmailAndPassword loga automaticamente NA INSTÂNCIA que a
  // chamou — sem isso, criar um usuário trocaria a sessão de quem está logado)
  criar: async dados => {
    const nome = dados.nome, email = dados.email, senha = dados.senha;
    if(!nome || !email) throw new Error('Informe nome e e-mail.');
    if(!senha || senha.length<6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    const secundario = firebase.initializeApp(firebaseConfig, 'secundario-'+Date.now());
    try{
      const cred = await secundario.auth().createUserWithEmailAndPassword(email, senha);
      await cred.user.updateProfile({displayName: nome});
      const uid = cred.user.uid;
      const doc = {nome:nome, email:email, criadoEm: new Date().toISOString()};
      await firestoreDb().doc('users/'+uid).set(doc);
      return Object.assign({id:uid}, doc);
    }catch(e){
      if(e.code==='auth/email-already-in-use') throw new Error('Já existe uma conta com o e-mail '+email+'.');
      throw e;
    }finally{
      try{ await secundario.auth().signOut(); }catch(e){}
      try{ await secundario.delete(); }catch(e){}
    }
  },
  // só nome/e-mail de EXIBIÇÃO (o espelho em users/{uid}) — o e-mail de
  // login de verdade não muda por aqui, só pelo script local, senão a lista
  // mostraria um e-mail diferente do que a conta realmente usa pra entrar
  atualizar: async (uid, patch) => {
    const seguro = {};
    if(patch.nome!==undefined) seguro.nome = patch.nome;
    if(patch.email!==undefined) seguro.email = patch.email;
    await firestoreDb().doc('users/'+uid).update(seguro);
    return Api.users.buscar(uid);
  },
  // revoga acesso na hora (some da lista, perde toda permissão de projeto) —
  // NÃO apaga a conta do Firebase Auth de verdade nem libera o e-mail pra
  // reuso; isso é o script local (offboarding completo)
  remover: async uid => {
    const projSnap = await firestoreDb().collection('projects').get();
    const batch = firestoreDb().batch();
    batch.delete(firestoreDb().doc('users/'+uid));
    for(const p of projSnap.docs){
      const permRef = firestoreDb().doc('projects/'+p.id+'/permissions/'+uid);
      const permDoc = await permRef.get();
      if(permDoc.exists) batch.delete(permRef);
    }
    await batch.commit();
  },
};

/* --- projetos: só datas (BR <-> ISO) mudam de formato; o resto é igual.
   O id do projeto continua um número na memória (era assim desde sempre —
   PROJETO_ID em toda página é "+algo") — só vira string na hora de montar o
   caminho do documento no Firestore, e volta a número ao ler de volta. --- */
function projetoDbParaMemoria(p){
  return {
    id:p.id, nome:p.nome, cliente:p.cliente, endereco:p.endereco, resp:p.resp,
    inicio:inputParaData(p.inicio), termino:inputParaData(p.termino),
    avanco:p.avanco, icon:p.icon, imagem:p.imagem||'', tipo:p.tipo,
  };
}
function projetoMemoriaParaDb(dados){
  const doc = Object.assign({}, dados);
  if(doc.inicio!==undefined) doc.inicio = dataParaInput(doc.inicio);
  if(doc.termino!==undefined) doc.termino = dataParaInput(doc.termino);
  delete doc.id;
  return doc;
}
// substitui LibCollection.nextNumericId (max-existing+1) por um contador
// atômico de verdade — elimina de vez a classe de bug de reaproveitamento de
// id que motivou Projects.js#remover apagar dados associados nesta mesma
// sessão de trabalho (um id removido não fica mais "armadilhado": o próximo
// projeto nunca herda um id que já foi de outro)
async function proximoIdDeProjeto_(){
  return firestoreDb().runTransaction(async tx => {
    const ref = firestoreDb().doc('system/counters');
    const snap = await tx.get(ref);
    const atual = (snap.exists && snap.data().projects) || 0;
    const proximo = atual+1;
    tx.set(ref, {projects: proximo}, {merge:true});
    return proximo;
  });
}
async function apagarDadosDoProjetoFirestore_(id){
  const pid = String(id);
  const batch = firestoreDb().batch();
  batch.delete(firestoreDb().doc('cronogramas/'+pid));
  batch.delete(firestoreDb().doc('financeiro/'+pid));
  batch.delete(firestoreDb().doc('projectCatalog/'+pid));
  const [permsSnap, rdosSnap] = await Promise.all([
    firestoreDb().collection('projects/'+pid+'/permissions').get(),
    firestoreDb().collection('projects/'+pid+'/rdos').get(),
  ]);
  permsSnap.forEach(d=>batch.delete(d.ref));
  rdosSnap.forEach(d=>batch.delete(d.ref));
  await batch.commit();
  // imagens/PDFs no Drive não são apagados por aqui — mesma decisão já
  // tomada pro fluxo de arquivar (ver Fase 10): ficam órfãos no Drive, sem
  // custo real (poucos MB) e sem risco de apagar algo por engano
}
Api.projects = {
  // admin lê "projects" sem filtro (isAdmin() é constante pra rule, prova
  // fácil pra qualquer query). Um usuário comum NÃO pode fazer essa mesma
  // query direto — a rule de projects/{pid} depende de temPermissao(pid),
  // que VARIA por documento, e o Firestore só permite uma query sem filtro
  // se a rule for constante (provável) pra QUALQUER resultado possível; sem
  // isso, rejeita a consulta inteira, não filtra parcialmente. Por isso um
  // usuário comum descobre seus projetos de outro jeito: uma collection
  // group query em "permissions" filtrada pelo próprio uid (campo "uid"
  // dentro do doc, não só o {uid} do caminho — ver Api.permissions.definir e
  // o "resource.data.uid" nas rules, é isso que torna ESSA query provável),
  // depois busca cada projeto encontrado individualmente.
  listar: async () => {
    if(CURRENT_USER && CURRENT_USER.isAdmin){
      const snap = await firestoreDb().collection('projects').get();
      return snap.docs.map(d => projetoDbParaMemoria(Object.assign({}, d.data(), {id:+d.id})));
    }
    const uid = firebase.auth().currentUser.uid;
    const permSnap = await firestoreDb().collectionGroup('permissions').where('uid','==', uid).get();
    const pids = permSnap.docs.map(d => d.ref.parent.parent.id);
    const docs = await Promise.all(pids.map(pid => firestoreDb().doc('projects/'+pid).get()));
    return docs.filter(d=>d.exists).map(d => projetoDbParaMemoria(Object.assign({}, d.data(), {id:+d.id})));
  },
  buscar: async id => {
    const doc = await firestoreDb().doc('projects/'+id).get();
    if(!doc.exists) throw new Error('Projeto não encontrado: '+id);
    return projetoDbParaMemoria(Object.assign({}, doc.data(), {id:+doc.id}));
  },
  criar: async dados => {
    const d = projetoMemoriaParaDb(dados);
    if(!d.nome || !d.cliente || !d.endereco || !d.resp) throw new Error('Informe nome, cliente, responsável e endereço.');
    if(!d.inicio || !d.termino) throw new Error('Informe as datas de início e término.');
    if(d.tipo!=='completo' && d.tipo!=='relatorios') throw new Error('tipo deve ser "completo" ou "relatorios".');
    const doc = {
      nome:d.nome, cliente:d.cliente, endereco:d.endereco, resp:d.resp, inicio:d.inicio, termino:d.termino,
      avanco: d.avanco===undefined ? 0 : d.avanco,
      icon: d.icon || '🏗️',
      imagem: d.imagem || null,
      tipo: d.tipo,
      criadoEm: new Date().toISOString(),
    };
    const id = await proximoIdDeProjeto_();
    await firestoreDb().doc('projects/'+id).set(doc);
    return projetoDbParaMemoria(Object.assign({}, doc, {id}));
  },
  atualizar: async (id, patch) => {
    await firestoreDb().doc('projects/'+id).update(projetoMemoriaParaDb(patch));
    const doc = await firestoreDb().doc('projects/'+id).get();
    return projetoDbParaMemoria(Object.assign({}, doc.data(), {id:+doc.id}));
  },
  // não chamado por nenhuma tela hoje (a interface só oferece arquivar, ver
  // Fase 10) — mantido por completude/paridade com o backend original, já
  // apagando os dados associados pelo mesmo motivo documentado lá
  remover: async id => {
    await apagarDadosDoProjetoFirestore_(id);
    await firestoreDb().doc('projects/'+id).delete();
  },
};

/* --- permissões: virou uma subcoleção (um documento por usuário, não mais
   um único documento por projeto com um mapa dentro) — as Firestore Security
   Rules são por documento, então só assim um usuário comum consegue ler a
   PRÓPRIA permissão sem que isso exija poder ler a de todo mundo (ver
   firestore.rules). obter() ainda devolve o formato antigo ({permissoes:{...}})
   pra quem só faz leitura; definir()/remover() agora trabalham em cima de um
   documento por vez — usuarios-page.js precisa de um ajuste correspondente,
   que fica pra Fase 9 (a página já depende de Api.users, que também só volta
   lá). --- */
var MODULOS_VALIDOS_ = ['visao', 'rdo', 'financeiro', 'cronograma'];
Api.permissions = {
  obter: async pid => {
    const snap = await firestoreDb().collection('projects/'+pid+'/permissions').get();
    const permissoes = {};
    snap.forEach(d => { permissoes[d.id] = d.data(); });
    return {projectId: pid, permissoes};
  },
  doUsuario: async (pid, uid) => {
    const doc = await firestoreDb().doc('projects/'+pid+'/permissions/'+uid).get();
    return doc.exists ? doc.data() : null;
  },
  efetiva: async (pid, uid, modulo) => {
    const padrao = {view:false, write:false, delete:false};
    const doUsuario = await Api.permissions.doUsuario(pid, uid);
    if(!doUsuario || !doUsuario[modulo]) return padrao;
    return doUsuario[modulo];
  },
  // mesma checagem defensiva do backend original: write/delete nunca ficam
  // true se view for false, não importa o que foi enviado — as Security
  // Rules (permissoesValidas) fazem a mesma validação de novo do lado do
  // servidor, essa é só a primeira camada
  definir: async (pid, uid, permissoesDoUsuario) => {
    Object.keys(permissoesDoUsuario).forEach(k=>{
      if(k!=='gerenciarUsuarios' && MODULOS_VALIDOS_.indexOf(k)===-1) throw new Error('Módulo desconhecido: '+k);
    });
    // "uid" duplicado como campo (não só o {uid} do caminho do documento) é
    // o que permite Api.projects.listar() encontrar os projetos de um
    // usuário comum via uma collection group query provável pelas rules —
    // ver o comentário lá. Não é lido em lugar nenhum além dessa query.
    const entrada = {uid:uid, gerenciarUsuarios: !!permissoesDoUsuario.gerenciarUsuarios};
    MODULOS_VALIDOS_.forEach(modulo=>{
      const enviado = permissoesDoUsuario[modulo] || {};
      const view = !!enviado.view;
      entrada[modulo] = {view:view, write: view && !!enviado.write, delete: view && !!enviado.delete};
    });
    await firestoreDb().doc('projects/'+pid+'/permissions/'+uid).set(entrada);
    return entrada;
  },
  remover: async (pid, uid) => {
    await firestoreDb().doc('projects/'+pid+'/permissions/'+uid).delete();
  },
};

/* --- catálogo: a computação de fábrica+overrides que era do backend
   (RepoCatalog) foi portada quase literal pra cá — client-side puro, sem
   efeito colateral, exatamente como já era lá. catalogDefaults/factory é um
   documento só (etapas+categorias+funcoes+equipamentos), cacheado em memória
   por carregamento de página (é o mesmo pra todo projeto, não vale a pena
   buscar de novo a cada chamada). --- */
let catalogFactoryCache_ = null;
async function catalogFactory_(){
  if(catalogFactoryCache_) return catalogFactoryCache_;
  const doc = await firestoreDb().doc('catalogDefaults/factory').get();
  catalogFactoryCache_ = doc.exists ? doc.data() : {etapas:[], categorias:[], funcoes:[], equipamentos:[]};
  return catalogFactoryCache_;
}
function overridesVazios_(pid){
  return {projectId:pid, removedEtapas:[], customEtapas:[], removedCategorias:[], customCategorias:[], categoriaEtapaOverrides:{}};
}
async function catalogOverrides_(pid){
  const doc = await firestoreDb().doc('projectCatalog/'+pid).get();
  return doc.exists ? doc.data() : overridesVazios_(pid);
}
async function salvarCatalogOverrides_(pid, o){
  await firestoreDb().doc('projectCatalog/'+pid).set(o);
  return o;
}
async function etapasDoProjetoFs_(pid){
  const [factory, o] = await Promise.all([catalogFactory_(), catalogOverrides_(pid)]);
  return factory.etapas.filter(e=>o.removedEtapas.indexOf(e)===-1).concat(o.customEtapas);
}
async function categoriasDoProjetoFs_(pid){
  const [factory, o, etapas] = await Promise.all([catalogFactory_(), catalogOverrides_(pid), etapasDoProjetoFs_(pid)]);
  const lista = factory.categorias
    .filter(c=>o.removedCategorias.indexOf(c.nome)===-1)
    .map(c=>({nome:c.nome, etapas: c.todasEtapas ? etapas.slice() : c.etapas.slice()}))
    .concat(o.customCategorias.map(c=>({nome:c.nome, etapas:c.etapas.slice()})));
  lista.forEach(c=>{ if(o.categoriaEtapaOverrides[c.nome]) c.etapas = o.categoriaEtapaOverrides[c.nome].slice(); });
  return lista;
}
Api.catalog = {
  etapasDoProjeto: pid => etapasDoProjetoFs_(pid),
  categoriasDoProjeto: pid => categoriasDoProjetoFs_(pid),
  funcoesFactory: async () => (await catalogFactory_()).funcoes,
  equipamentosFactory: async () => (await catalogFactory_()).equipamentos,
  adicionarEtapa: async (pid, nome) => {
    const [factory, o] = await Promise.all([catalogFactory_(), catalogOverrides_(pid)]);
    o.removedEtapas = o.removedEtapas.filter(e=>e!==nome);
    if(factory.etapas.indexOf(nome)===-1 && o.customEtapas.indexOf(nome)===-1) o.customEtapas.push(nome);
    return salvarCatalogOverrides_(pid, o);
  },
  removerEtapa: async (pid, nome) => {
    const [factory, o] = await Promise.all([catalogFactory_(), catalogOverrides_(pid)]);
    if(factory.etapas.indexOf(nome)!==-1 && o.removedEtapas.indexOf(nome)===-1) o.removedEtapas.push(nome);
    o.customEtapas = o.customEtapas.filter(e=>e!==nome);
    return salvarCatalogOverrides_(pid, o);
  },
  adicionarCategoria: async (pid, dados) => {
    const nome = dados.nome, etapas = dados.etapas;
    const [factory, o] = await Promise.all([catalogFactory_(), catalogOverrides_(pid)]);
    o.removedCategorias = o.removedCategorias.filter(c=>c!==nome);
    if(!factory.categorias.some(c=>c.nome===nome)){
      o.customCategorias = o.customCategorias.filter(c=>c.nome!==nome).concat([{nome:nome, etapas:etapas}]);
    }
    return salvarCatalogOverrides_(pid, o);
  },
  removerCategoria: async (pid, nome) => {
    const [factory, o] = await Promise.all([catalogFactory_(), catalogOverrides_(pid)]);
    if(factory.categorias.some(c=>c.nome===nome) && o.removedCategorias.indexOf(nome)===-1) o.removedCategorias.push(nome);
    o.customCategorias = o.customCategorias.filter(c=>c.nome!==nome);
    return salvarCatalogOverrides_(pid, o);
  },
  definirEtapasDaCategoria: async (pid, categoriaNome, etapas) => {
    const o = await catalogOverrides_(pid);
    o.categoriaEtapaOverrides[categoriaNome] = etapas;
    return salvarCatalogOverrides_(pid, o);
  },
};

/* --- cronograma: só ini/fim (BR <-> ISO) mudam. Documento único por projeto
   (cronogramas/{pid} = {etapas:[...]}), leitura-modificação-escrita direto
   do cliente — sem lock nenhum protegendo contra edição concorrente (o
   backend antigo tinha LockService; isso não tem equivalente client-side, e
   o plano de migração aceita esse risco pra uma equipe pequena, o mesmo
   padrão do Financeiro logo abaixo). --- */
function etapaCronoDbParaMemoria(e){
  return {id:e.id, nome:e.nome, ini:inputParaData(e.ini), fim:inputParaData(e.fim), av:e.av, dur:e.dur};
}
function etapaCronoMemoriaParaDb(dados){
  const doc = Object.assign({}, dados);
  if(doc.ini!==undefined) doc.ini = dataParaInput(doc.ini);
  if(doc.fim!==undefined) doc.fim = dataParaInput(doc.fim);
  return doc;
}
async function listarCronogramaFs_(pid){
  const doc = await firestoreDb().doc('cronogramas/'+pid).get();
  return doc.exists ? (doc.data().etapas||[]) : [];
}
async function salvarCronogramaFs_(pid, etapas){
  await firestoreDb().doc('cronogramas/'+pid).set({etapas:etapas});
  return etapas;
}
Api.cronograma = {
  listar: async pid => (await listarCronogramaFs_(pid)).map(etapaCronoDbParaMemoria),
  adicionar: async (pid, dados) => {
    const d = etapaCronoMemoriaParaDb(dados);
    const lista = await listarCronogramaFs_(pid);
    const numeros = lista.map(e=>+String(e.id).replace(/\D/g,'')).filter(n=>!isNaN(n));
    const id = 't'+(numeros.length ? Math.max.apply(null, numeros)+1 : 1);
    const nova = {id:id, nome:d.nome, ini:d.ini, fim:d.fim, av: d.av===undefined?0:d.av, dur:d.dur};
    lista.push(nova);
    lista.sort((a,b)=>a.ini<b.ini?-1:1);
    await salvarCronogramaFs_(pid, lista);
    return etapaCronoDbParaMemoria(nova);
  },
  atualizar: async (pid, etapaId, patch) => {
    const d = etapaCronoMemoriaParaDb(patch);
    const lista = await listarCronogramaFs_(pid);
    const item = lista.find(e=>e.id===etapaId);
    if(!item) throw new Error('Etapa não encontrada: '+etapaId);
    Object.assign(item, d);
    lista.sort((a,b)=>a.ini<b.ini?-1:1);
    await salvarCronogramaFs_(pid, lista);
    return etapaCronoDbParaMemoria(item);
  },
  remover: async (pid, etapaId) => {
    const lista = await listarCronogramaFs_(pid);
    await salvarCronogramaFs_(pid, lista.filter(e=>e.id!==etapaId));
  },
};

/* --- financeiro: só lanc[].data (BR <-> ISO) muda. Documento único por
   projeto, mesmo padrão de leitura-modificação-escrita do cronograma acima
   (removerLancamento continua por índice, não por id — mesma ordem sempre,
   já que lanc[] nunca é reordenado). --- */
function lancDbParaMemoria(l){ return {data:inputParaData(l.data), desc:l.desc, valor:l.valor}; }
function lancMemoriaParaDb(l){ return {data:dataParaInput(l.data), desc:l.desc, valor:l.valor}; }
function categoriaFinDbParaMemoria(c){ return {nome:c.nome, prev:c.prev, lanc:(c.lanc||[]).map(lancDbParaMemoria)}; }
function financeiroDocDbParaMemoria(doc){
  const out = {};
  Object.keys(doc||{}).forEach(etapa=>{ out[etapa] = (doc[etapa]||[]).map(categoriaFinDbParaMemoria); });
  return out;
}
async function financeiroDocFs_(pid){
  const doc = await firestoreDb().doc('financeiro/'+pid).get();
  return doc.exists ? doc.data() : {};
}
async function salvarFinanceiroDocFs_(pid, doc){
  await firestoreDb().doc('financeiro/'+pid).set(doc);
  return doc;
}
Api.financeiro = {
  tudo: async pid => financeiroDocDbParaMemoria(await financeiroDocFs_(pid)),
  porEtapa: async (pid, etapa) => ((await financeiroDocFs_(pid))[etapa]||[]).map(categoriaFinDbParaMemoria),
  adicionarCategoria: async (pid, etapa, c) => {
    const doc = await financeiroDocFs_(pid);
    if(!doc[etapa]) doc[etapa] = [];
    const nova = {nome:c.nome, prev:c.prev, lanc:[]};
    doc[etapa].push(nova);
    await salvarFinanceiroDocFs_(pid, doc);
    return categoriaFinDbParaMemoria(nova);
  },
  atualizarOrcamento: async (pid, etapa, categoriaNome, novoPrev) => {
    const doc = await financeiroDocFs_(pid);
    const cat = (doc[etapa]||[]).find(c=>c.nome===categoriaNome);
    if(!cat) throw new Error('Categoria "'+categoriaNome+'" não encontrada em '+etapa+'.');
    cat.prev = novoPrev;
    await salvarFinanceiroDocFs_(pid, doc);
    return categoriaFinDbParaMemoria(cat);
  },
  lancarGasto: async (pid, etapa, categoriaNome, l) => {
    const doc = await financeiroDocFs_(pid);
    const cat = (doc[etapa]||[]).find(c=>c.nome===categoriaNome);
    if(!cat) throw new Error('Categoria "'+categoriaNome+'" não encontrada em '+etapa+'.');
    cat.lanc.push(lancMemoriaParaDb(l));
    await salvarFinanceiroDocFs_(pid, doc);
    return categoriaFinDbParaMemoria(cat);
  },
  removerLancamento: async (pid, etapa, categoriaNome, indice) => {
    const doc = await financeiroDocFs_(pid);
    const cat = (doc[etapa]||[]).find(c=>c.nome===categoriaNome);
    if(!cat) throw new Error('Categoria "'+categoriaNome+'" não encontrada em '+etapa+'.');
    cat.lanc.splice(indice, 1);
    await salvarFinanceiroDocFs_(pid, doc);
  },
  removerCategoria: async (pid, etapa, categoriaNome) => {
    const doc = await financeiroDocFs_(pid);
    doc[etapa] = (doc[etapa]||[]).filter(c=>c.nome!==categoriaNome);
    await salvarFinanceiroDocFs_(pid, doc);
  },
};

/* --- imagens: continuam indo pro Apps Script (só ele tem credencial de
   Drive) — só o transporte por baixo (apiCall) mudou, de token de sessão
   próprio pra idToken do Firebase. --- */
Api.images = {
  saveCapa: (pid, dataUrl) => apiCall('images','saveDataUrl',[dataUrl, pid, 'capa']),
  saveRdoFoto: (pid, n, index, dataUrl) => apiCall('images','saveDataUrl',[dataUrl, pid, 'rdo-foto', {n, index}]),
  remove: fileId => apiCall('images','remove',[fileId]),
};

/* --- RDOs: o formato que mais diverge do backend —
   mo/eq: tuplas [nome,qtd] (memória) <-> objetos {funcao|equipamento,qtd} (db)
   ativ/atividades: {t,etapa,av} <-> {texto,etapa,avanco}
   semana: "DD/MM/AAAA a DD/MM/AAAA" única <-> semanaInicio+semanaFim (ISO, separadas)
   fotos: {cap,src|emoji} <-> {legenda,fileId|emoji|dataUrl}

   salvar() é o único ponto onde a Fase 8 regride um pouco a otimização que
   tinha acabado de entrar nesta mesma sessão de trabalho: antes, o upload de
   fotos novas E a escrita do relatório aconteciam na MESMA execução do Apps
   Script (1 ida e volta pro relatório inteiro). Agora são dois sistemas
   diferentes — Firestore (relatório) e Apps Script (fotos) não podem mais
   compartilhar uma execução. Promise.all pelo menos paraleliza as N fotos
   entre si antes de escrever o relatório (ver Known Risk 4 do plano de
   migração) — não volta a ser tão rápido quanto na versão anterior, mas
   relatórios SEM foto nova (a maioria das edições) ficam bem mais rápidos,
   já que nem tocam o Apps Script. --- */
const moDbParaMemoria = mo => (mo||[]).map(x=>[x.funcao, x.qtd]);
const moMemoriaParaDb = mo => (mo||[]).map(([funcao,qtd])=>({funcao,qtd}));
const eqDbParaMemoria = eq => (eq||[]).map(x=>[x.equipamento, x.qtd]);
const eqMemoriaParaDb = eq => (eq||[]).map(([equipamento,qtd])=>({equipamento,qtd}));
const ativDbParaMemoria = atividades => (atividades||[]).map(a=>({t:a.texto, etapa:a.etapa, av:a.avanco}));
const ativMemoriaParaDb = ativ => (ativ||[]).map(a=>({texto:a.t, etapa:a.etapa, avanco:a.av}));
const isoParaSemana = (ini, fim) => inputParaData(ini)+' a '+inputParaData(fim);
const semanaParaIso = semana => {
  const [ini, fim] = semana.split(' a ').map(s=>s.trim());
  return [dataParaInput(ini), dataParaInput(fim)];
};

// "lh3.googleusercontent.com/d/" (não "drive.google.com/uc?id=") — ver o
// comentário equivalente em backend-scratch/src/Lib/Images.js#saveDataUrl
function fotoDbParaMemoria(f){
  return f.fileId
    ? {cap:f.legenda, src:'https://lh3.googleusercontent.com/d/'+f.fileId, fileId:f.fileId}
    : {cap:f.legenda, emoji:f.emoji};
}
// só fotos recém-anexadas (ainda como data URL, nunca enviadas) precisam de upload —
// as que já têm fileId (edição de um relatório existente) são só repassadas
const fotoPrecisaUpload = f => !!(f.src && f.src.indexOf('data:')===0);
function fotoMemoriaParaDbPendente(f){
  if(fotoPrecisaUpload(f)) return {legenda:f.cap, dataUrl:f.src};
  if(f.fileId) return {legenda:f.cap, fileId:f.fileId};
  return {legenda:f.cap, emoji:f.emoji};
}
function rdoDbParaMemoria(r){
  return {
    n:r.n, semana:isoParaSemana(r.semanaInicio, r.semanaFim), resp:r.resp,
    mo:moDbParaMemoria(r.mo), eq:eqDbParaMemoria(r.eq),
    ativ:ativDbParaMemoria(r.atividades), ocorr:r.ocorrencias||'',
    fotos:(r.fotos||[]).map(fotoDbParaMemoria),
  };
}
function rdoMemoriaParaDb(r, fotosJaPreparadas){
  const [semanaInicio, semanaFim] = semanaParaIso(r.semana);
  return {
    n:r.n, semanaInicio, semanaFim, resp:r.resp,
    mo:moMemoriaParaDb(r.mo), eq:eqMemoriaParaDb(r.eq),
    atividades:ativMemoriaParaDb(r.ativ), ocorrencias:r.ocorr||'',
    fotos:fotosJaPreparadas,
  };
}
async function buscarRdoRaw_(pid, n){
  const doc = await firestoreDb().doc('projects/'+pid+'/rdos/'+n).get();
  if(!doc.exists) throw new Error('Relatório não encontrado: '+n);
  return doc.data();
}
async function nomeDoProjeto_(pid){
  const cache = projetos.find(x=>x.id===pid);
  if(cache) return cache.nome;
  return (await Api.projects.buscar(pid)).nome;
}
Api.rdos = {
  listar: async pid => {
    const snap = await firestoreDb().collection('projects/'+pid+'/rdos').get();
    const lista = snap.docs.map(d=>d.data());
    lista.sort((a,b)=>b.n-a.n); // mais recente primeiro
    return lista.map(rdoDbParaMemoria);
  },
  buscar: async (pid, n) => rdoDbParaMemoria(await buscarRdoRaw_(pid, n)),
  proximoNumero: async pid => {
    const snap = await firestoreDb().collection('projects/'+pid+'/rdos').get();
    const numeros = snap.docs.map(d=>d.data().n);
    return numeros.length ? Math.max.apply(null, numeros)+1 : 1;
  },
  salvar: async (pid, rMem) => {
    const fotosProntas = await Promise.all((rMem.fotos||[]).map(async (f, i) => {
      const pendente = fotoMemoriaParaDbPendente(f);
      if(pendente.dataUrl){
        const up = await Api.images.saveRdoFoto(pid, rMem.n, i, pendente.dataUrl);
        return {legenda: pendente.legenda, fileId: up.fileId};
      }
      return pendente;
    }));
    const doc = rdoMemoriaParaDb(rMem, fotosProntas);
    doc.projectId = pid;
    await firestoreDb().doc('projects/'+pid+'/rdos/'+doc.n).set(doc);
    return rdoDbParaMemoria(doc);
  },
  remover: async (pid, n) => {
    await firestoreDb().doc('projects/'+pid+'/rdos/'+n).delete();
  },
  // o backend enxuto (Fase 5) não tem mais acesso ao Firestore — recebe o
  // relatório (já no formato de banco) e o nome do projeto prontos, em vez
  // de buscar isso sozinho por (projectId, n) como antes
  gerarPdf: async (pid, n) => {
    const [relatorioDb, projetoNome] = await Promise.all([buscarRdoRaw_(pid, n), nomeDoProjeto_(pid)]);
    return apiCall('rdos','gerarPdf',[projetoNome, relatorioDb]);
  },
};

/* --- arquivar: Fase 10. Não existe mais Repo/Archive.js nenhum — o backend
   enxuto (Fase 5) nem tem acesso ao Firestore pra orquestrar isso sozinho.
   O cliente assume o fluxo inteiro, com uma única invariante de segurança:
   gera (ou confirma, já que gerarPdf SUBSTITUI em vez de acumular — rodar de
   novo nunca duplica) o PDF de TODO relatório do projeto ANTES de apagar
   qualquer coisa, e só apaga o próprio documento do projeto por ÚLTIMO. Se
   algo falhar no meio da geração de PDFs, nada foi apagado ainda — rodar
   arquivar de novo do zero é seguro. Se algo falhar no meio dos deletes,
   "o projeto ainda existe" (o doc em si só some no fim), então também é
   seguro tentar de novo. A única sequência realmente ruim — PDFs faltando
   mas registros já apagados — é estruturalmente impossível por essa ordem.
   Imagens/PDFs no Drive nunca são tocados: ficam nos mesmos caminhos pra
   sempre, só o Firestore (o que hoje decide "ativo ou não") é limpo. */
Api.archive = {
  // onProgress(feito, total) opcional — a geração de PDF é sequencial (o
  // backend enxuto processa um relatório por vez) e cada um paga a lentidão
  // de sempre do Apps Script, então um projeto com vários relatórios pode
  // demorar; sem isso, o botão fica parado sem indicar que algo está
  // acontecendo de verdade
  arquivarProjeto: async (pid, confirm, onProgress) => {
    if(confirm !== 'ARQUIVAR PROJETO') throw new Error('Confirmação inválida.');

    const rdosSnap = await firestoreDb().collection('projects/'+pid+'/rdos').get();
    const numeros = rdosSnap.docs.map(d => d.data().n);
    for(let i=0; i<numeros.length; i++){
      await Api.rdos.gerarPdf(pid, numeros[i]);
      if(onProgress) onProgress('pdf', i+1, numeros.length);
    }
    if(onProgress) onProgress('apagando');

    const batch = firestoreDb().batch();
    rdosSnap.docs.forEach(d => batch.delete(d.ref));
    const permsSnap = await firestoreDb().collection('projects/'+pid+'/permissions').get();
    permsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(firestoreDb().doc('cronogramas/'+pid));
    batch.delete(firestoreDb().doc('financeiro/'+pid));
    batch.delete(firestoreDb().doc('projectCatalog/'+pid));
    await batch.commit();

    await firestoreDb().doc('projects/'+pid).delete();
    return {ok:true};
  },
};
