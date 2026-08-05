/* =================== API (backend real) ===================
   Cliente HTTP pro backend em Google Apps Script + Drive (ver backend/src).
   Só existe um ponto de entrada, doPost, despachado por {collection,op,args,
   token} — ver backend/src/Code.js. Cada Api.<coleção>.<op> abaixo cuida de
   duas coisas à parte da chamada em si: o token (lido do localStorage) e a
   conversão de formato entre o que o backend guarda (datas ISO, RDO com
   mo/eq como objetos, fotos por fileId...) e o que o resto do site já espera
   (datas BR, RDO com mo/eq como tuplas, fotos com src/emoji...) — assim
   render.js/cronograma.js/financeiro.js/etc. nunca precisam saber que existe
   uma rede no meio (ver init<Página>Page() de cada página, que busca tudo
   antes de chamar a renderização de sempre, sem alterá-la). */

const API_URL = 'https://script.google.com/macros/s/AKfycbwz-gJ4cN6Ay68Fm1ywvyh6A95JtxIN-PKYdH-vViP3akQeuBBAfqXl56K0vjcbCbP0Yg/exec';

async function apiCall(collection, op, args){
  let token = null;
  try{ token = localStorage.getItem('obraview_token'); }catch(e){}

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
      body: JSON.stringify({collection, op, args: args||[], token}),
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
    // sessão inválida/expirada: limpa e manda pro login de um lugar só, em
    // vez de cada chamador precisar tratar isso separadamente
    if(/^Não autenticado/.test(corpo.error||'')){
      try{ localStorage.removeItem('obraview_token'); localStorage.removeItem('obraview_user'); }catch(e){}
      if(!location.pathname.endsWith('login.html')) location.href='login.html';
    }
    throw new Error(corpo.error || 'Erro desconhecido.');
  }
  return corpo.data;
}

const Api = {};

Api.auth = {
  // login tenta de novo sozinho (uma vez) se a primeira tentativa falhar por
  // instabilidade da infraestrutura (timeout, resposta inesperada, falha de
  // rede) — nunca se a senha/e-mail estiverem realmente errados, isso o
  // servidor já respondeu com clareza. Chamar login() duas vezes não tem
  // efeito colateral (só cria mais uma sessão válida), diferente da maioria
  // das outras chamadas, então só aqui vale a pena repetir sozinho em vez de
  // fazer o usuário clicar em "Entrar" de novo
  login: async (email, senha) => {
    try{ return await apiCall('auth','login',[email, senha]); }
    catch(e){
      if(/inválidos/.test(e.message)) throw e;
      return await apiCall('auth','login',[email, senha]);
    }
  },
  logout: token => apiCall('auth','logout',[token]),
};

Api.users = {
  listar: () => apiCall('users','listar',[]),
  buscar: id => apiCall('users','buscar',[id]),
  buscarPorEmail: email => apiCall('users','buscarPorEmail',[email]),
  administrador: () => apiCall('users','administrador',[]),
  criar: dados => apiCall('users','criar',[dados]),
  atualizar: (id, patch) => apiCall('users','atualizar',[id, patch]),
  remover: id => apiCall('users','remover',[id]),
  redefinirSenha: (id, novaSenha) => apiCall('users','redefinirSenha',[id, novaSenha]),
};

/* --- projetos: só datas (BR <-> ISO) mudam de formato; o resto é igual --- */
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
  return doc;
}
Api.projects = {
  listar: async () => (await apiCall('projects','listar',[])).map(projetoDbParaMemoria),
  buscar: async id => projetoDbParaMemoria(await apiCall('projects','buscar',[id])),
  criar: async dados => projetoDbParaMemoria(await apiCall('projects','criar',[projetoMemoriaParaDb(dados)])),
  atualizar: async (id, patch) => projetoDbParaMemoria(await apiCall('projects','atualizar',[id, projetoMemoriaParaDb(patch)])),
  remover: id => apiCall('projects','remover',[id]),
};

Api.permissions = {
  obter: pid => apiCall('permissions','obter',[pid]),
  doUsuario: (pid, userId) => apiCall('permissions','doUsuario',[pid, userId]),
  efetiva: (pid, userId, modulo) => apiCall('permissions','efetiva',[pid, userId, modulo]),
  definir: (pid, userId, permissoesDoUsuario) => apiCall('permissions','definir',[pid, userId, permissoesDoUsuario]),
  remover: (pid, userId) => apiCall('permissions','remover',[pid, userId]),
};

/* --- catálogo: etapasDoProjeto()/categoriasDoProjeto() já devolvem o mesmo
   formato que etapasPadrao(pid)/categoriasPadrao(pid) esperavam — sem conversão */
Api.catalog = {
  etapasDoProjeto: pid => apiCall('catalog','etapasDoProjeto',[pid]),
  categoriasDoProjeto: pid => apiCall('catalog','categoriasDoProjeto',[pid]),
  funcoesFactory: () => apiCall('catalog','funcoesFactory',[]),
  equipamentosFactory: () => apiCall('catalog','equipamentosFactory',[]),
  adicionarEtapa: (pid, nome) => apiCall('catalog','adicionarEtapa',[pid, nome]),
  removerEtapa: (pid, nome) => apiCall('catalog','removerEtapa',[pid, nome]),
  adicionarCategoria: (pid, categoria) => apiCall('catalog','adicionarCategoria',[pid, categoria]),
  removerCategoria: (pid, nome) => apiCall('catalog','removerCategoria',[pid, nome]),
  definirEtapasDaCategoria: (pid, categoriaNome, etapas) => apiCall('catalog','definirEtapasDaCategoria',[pid, categoriaNome, etapas]),
};

/* --- cronograma: só ini/fim (BR <-> ISO) mudam --- */
function etapaCronoDbParaMemoria(e){
  return {id:e.id, nome:e.nome, ini:inputParaData(e.ini), fim:inputParaData(e.fim), av:e.av, dur:e.dur};
}
function etapaCronoMemoriaParaDb(dados){
  const doc = Object.assign({}, dados);
  if(doc.ini!==undefined) doc.ini = dataParaInput(doc.ini);
  if(doc.fim!==undefined) doc.fim = dataParaInput(doc.fim);
  return doc;
}
Api.cronograma = {
  listar: async pid => (await apiCall('cronograma','listar',[pid])).map(etapaCronoDbParaMemoria),
  adicionar: async (pid, dados) => etapaCronoDbParaMemoria(await apiCall('cronograma','adicionar',[pid, etapaCronoMemoriaParaDb(dados)])),
  atualizar: async (pid, etapaId, patch) => etapaCronoDbParaMemoria(await apiCall('cronograma','atualizar',[pid, etapaId, etapaCronoMemoriaParaDb(patch)])),
  remover: (pid, etapaId) => apiCall('cronograma','remover',[pid, etapaId]),
};

/* --- financeiro: só lanc[].data (BR <-> ISO) muda --- */
function lancDbParaMemoria(l){ return {data:inputParaData(l.data), desc:l.desc, valor:l.valor}; }
function lancMemoriaParaDb(l){ return {data:dataParaInput(l.data), desc:l.desc, valor:l.valor}; }
function categoriaFinDbParaMemoria(c){ return {nome:c.nome, prev:c.prev, lanc:(c.lanc||[]).map(lancDbParaMemoria)}; }
function financeiroDocDbParaMemoria(doc){
  const out = {};
  Object.keys(doc||{}).forEach(etapa=>{ out[etapa] = (doc[etapa]||[]).map(categoriaFinDbParaMemoria); });
  return out;
}
Api.financeiro = {
  tudo: async pid => financeiroDocDbParaMemoria(await apiCall('financeiro','tudo',[pid])),
  porEtapa: async (pid, etapa) => (await apiCall('financeiro','porEtapa',[pid, etapa])).map(categoriaFinDbParaMemoria),
  adicionarCategoria: async (pid, etapa, c) => categoriaFinDbParaMemoria(await apiCall('financeiro','adicionarCategoria',[pid, etapa, {nome:c.nome, prev:c.prev}])),
  atualizarOrcamento: async (pid, etapa, categoriaNome, novoPrev) => categoriaFinDbParaMemoria(await apiCall('financeiro','atualizarOrcamento',[pid, etapa, categoriaNome, novoPrev])),
  lancarGasto: async (pid, etapa, categoriaNome, l) => categoriaFinDbParaMemoria(await apiCall('financeiro','lancarGasto',[pid, etapa, categoriaNome, lancMemoriaParaDb(l)])),
  removerLancamento: (pid, etapa, categoriaNome, indice) => apiCall('financeiro','removerLancamento',[pid, etapa, categoriaNome, indice]),
  removerCategoria: (pid, etapa, categoriaNome) => apiCall('financeiro','removerCategoria',[pid, etapa, categoriaNome]),
};

Api.archive = {
  arquivarProjeto: (pid, confirm) => apiCall('archive','arquivarProjeto',[pid, confirm]),
};

Api.images = {
  saveCapa: (pid, dataUrl) => apiCall('images','saveDataUrl',[dataUrl, pid, 'capa']),
  saveRdoFoto: (pid, n, index, dataUrl) => apiCall('images','saveDataUrl',[dataUrl, pid, 'rdo-foto', {n, index}]),
  remove: fileId => apiCall('images','remove',[fileId]),
};

/* --- RDOs: o formato que mais diverge do backend —
   mo/eq: tuplas [nome,qtd] (memória) <-> objetos {funcao|equipamento,qtd} (db)
   ativ/atividades: {t,etapa,av} <-> {texto,etapa,avanco}
   semana: "DD/MM/AAAA a DD/MM/AAAA" única <-> semanaInicio+semanaFim (ISO, separadas)
   fotos: {cap,src|emoji} <-> {legenda,fileId|emoji} — upload de foto nova
   acontece à parte (Api.images.saveRdoFoto), antes de salvar() */
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
// comentário equivalente em backend/src/Lib/Images.js#saveDataUrl
function fotoDbParaMemoria(f){
  return f.fileId
    ? {cap:f.legenda, src:'https://lh3.googleusercontent.com/d/'+f.fileId, fileId:f.fileId}
    : {cap:f.legenda, emoji:f.emoji};
}
// só fotos recém-anexadas (ainda como data URL, nunca enviadas) precisam de upload —
// as que já têm fileId (edição de um relatório existente) são só repassadas
const fotoPrecisaUpload = f => !!(f.src && f.src.indexOf('data:')===0);
// upload sequencial (não Promise.all) de propósito: o backend serializa toda
// requisição num único lock global (ver Code.js), então enviar em paralelo
// não ganha nada em velocidade e só dificulta reportar progresso claro ao
// usuário — onProgress(enviadas, totalParaEnviar), opcional
async function prepararFotosParaSalvar(pid, n, fotosMem, onProgress){
  const out = [];
  const totalParaEnviar = fotosMem.filter(fotoPrecisaUpload).length;
  let enviadas = 0;
  for(let i=0;i<fotosMem.length;i++){
    const f = fotosMem[i];
    if(fotoPrecisaUpload(f)){
      const up = await Api.images.saveRdoFoto(pid, n, i, f.src);
      out.push({legenda:f.cap, fileId:up.fileId});
      enviadas++;
      if(onProgress) onProgress(enviadas, totalParaEnviar);
    }else if(f.fileId){
      out.push({legenda:f.cap, fileId:f.fileId});
    }else{
      out.push({legenda:f.cap, emoji:f.emoji});
    }
  }
  return out;
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
Api.rdos = {
  listar: async pid => (await apiCall('rdos','listar',[pid])).map(rdoDbParaMemoria),
  buscar: async (pid, n) => rdoDbParaMemoria(await apiCall('rdos','buscar',[pid, n])),
  proximoNumero: pid => apiCall('rdos','proximoNumero',[pid]),
  salvar: async (pid, rMem, onProgress) => {
    const fotos = await prepararFotosParaSalvar(pid, rMem.n, rMem.fotos||[], onProgress);
    return rdoDbParaMemoria(await apiCall('rdos','salvar',[pid, rdoMemoriaParaDb(rMem, fotos)]));
  },
  remover: (pid, n) => apiCall('rdos','remover',[pid, n]),
  gerarPdf: (pid, n) => apiCall('rdos','gerarPdf',[pid, n]),
};
