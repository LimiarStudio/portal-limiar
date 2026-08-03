/* =================== CLIENTE DA API ===================
   Fala com server.js (que por sua vez fala com db/) e mantém os globais que o
   resto do site já lê direto — projetos, rdos, financeiro, cronogramas — como
   um cache local. Assim render.js, financeiro.js, cronograma.js etc. continuam
   síncronos e praticamente sem mudança: eles só leem esses globais, e são as
   páginas (initXPage) e as ações de salvar/remover que agora são async e
   passam por aqui antes de re-renderizar.

   Os documentos do banco usam nomes de campo e formato de data (ISO) mais
   "corretos" para um backend de verdade; o resto do site usa nomes/formatos
   herdados do protótipo original (datas BR, mão de obra em tupla, etc.) — as
   conversões entre os dois formatos ficam todas isoladas aqui dentro. */

const API_BASE = '/api';
let catalogCache = {};   // pid -> {etapas:[...], categorias:[...]}
let usersCache = [];

async function apiFetch(caminho, options){
  const res = await fetch(API_BASE+caminho, {
    headers: {'Content-Type':'application/json'},
    ...options,
  });
  const corpo = await res.json().catch(()=>null);
  if(!res.ok) throw new Error((corpo&&corpo.error) || `Erro ${res.status} em ${caminho}`);
  return corpo;
}
const qs = s => encodeURIComponent(s);

/* ---------- conversões banco <-> memória do site ---------- */
function projetoDbParaMemoria(p){
  return {...p, inicio:inputParaData(p.inicio), termino:inputParaData(p.termino)};
}
function etapaDbParaMemoria(e){
  return {...e, ini:inputParaData(e.ini), fim:inputParaData(e.fim)};
}
function etapaMemoriaParaDb(e){
  const out = {...e};
  if(out.ini) out.ini = dataParaInput(out.ini);
  if(out.fim) out.fim = dataParaInput(out.fim);
  return out;
}
function categoriaFinDbParaMemoria(c){
  return {...c, lanc:(c.lanc||[]).map(l=>({...l, data:inputParaData(l.data)}))};
}
function lancamentoMemoriaParaDb(l){
  return {...l, data:dataParaInput(l.data)};
}
function rdoDbParaMemoria(r){
  return {
    n: r.n,
    semana: inputParaData(r.semanaInicio)+' a '+inputParaData(r.semanaFim),
    resp: r.resp,
    mo: (r.mo||[]).map(x=>[x.funcao, x.qtd]),
    eq: (r.eq||[]).map(x=>[x.equipamento, x.qtd]),
    ativ: (r.atividades||[]).map(a=>({t:a.texto, etapa:a.etapa, av:a.avanco})),
    ocorr: r.ocorrencias||'',
    fotos: (r.fotos||[]).map(f=> f.caminho ? {cap:f.legenda, src:f.caminho} : {cap:f.legenda, emoji:f.emoji}),
  };
}
function rdoMemoriaParaDb(r){
  const [iniStr, fimStr] = r.semana.split(' a ').map(s=>s.trim());
  return {
    n: r.n,
    semanaInicio: dataParaInput(iniStr),
    semanaFim: dataParaInput(fimStr),
    resp: r.resp,
    mo: (r.mo||[]).map(([funcao,qtd])=>({funcao,qtd})),
    eq: (r.eq||[]).map(([equipamento,qtd])=>({equipamento,qtd})),
    atividades: (r.ativ||[]).map(a=>({texto:a.t, etapa:a.etapa, avanco:a.av})),
    ocorrencias: r.ocorr||'',
    fotos: (r.fotos||[]).map(f=> f.src ? {legenda:f.cap, caminho:f.src} : {legenda:f.cap, emoji:f.emoji}),
  };
}
function extFromDataUrl(dataUrl){
  const m = /^data:image\/(\w+);/.exec(dataUrl);
  const tipo = m ? m[1] : 'png';
  return tipo==='jpeg' ? 'jpg' : tipo;
}
async function uploadImagem(dataUrl, relPath){
  return (await apiFetch('/images', {method:'POST', body:JSON.stringify({dataUrl, relPath})})).caminho;
}
// fotos com "src" começando em "data:" ainda não foram enviadas pro servidor —
// sobem agora e viram {cap, src:<caminho salvo>}; as demais (já enviadas antes,
// ou legado {cap,emoji}) passam direto
async function prepararFotosParaSalvar(pid, n, fotos){
  const out = [];
  for(const f of fotos){
    if(f.src && f.src.startsWith('data:')){
      const caminho = await uploadImagem(f.src, `${pid}/rdos/${n}/${Date.now()}-${out.length}.${extFromDataUrl(f.src)}`);
      out.push({cap:f.cap, src:caminho});
    }else{
      out.push(f);
    }
  }
  return out;
}

const Api = {};

/* ---------- projetos ---------- */
function upsertProjetoMemoria(pMem){
  const i = projetos.findIndex(x=>x.id===pMem.id);
  if(i>=0) projetos[i]=pMem; else projetos.push(pMem);
  return pMem;
}
Api.projects = {
  async carregarTodos(){
    projetos = (await apiFetch('/projects')).map(projetoDbParaMemoria);
    return projetos;
  },
  async carregar(pid){
    return upsertProjetoMemoria(projetoDbParaMemoria(await apiFetch(`/projects/${pid}`)));
  },
  // dados: {nome,cliente,endereco,resp,inicio,termino,tipo,imagemDataUrl?}  (datas em BR)
  async criar(dados){
    const {imagemDataUrl, ...resto} = dados;
    let p = await apiFetch('/projects', {method:'POST', body:JSON.stringify({
      ...resto, inicio:dataParaInput(resto.inicio), termino:dataParaInput(resto.termino),
    })});
    if(imagemDataUrl){
      const caminho = await uploadImagem(imagemDataUrl, `${p.id}/capa.${extFromDataUrl(imagemDataUrl)}`);
      p = await apiFetch(`/projects/${p.id}`, {method:'PATCH', body:JSON.stringify({imagem:caminho})});
    }
    return upsertProjetoMemoria(projetoDbParaMemoria(p));
  },
  // patch: campos a alterar (datas em BR se presentes); imagemDataUrl (nova) ou
  // imagemRemovida:true (voltar ao ícone padrão) são tratados à parte
  async atualizar(pid, patch){
    const {imagemDataUrl, imagemRemovida, ...resto} = patch;
    const body = {...resto};
    if(body.inicio) body.inicio = dataParaInput(body.inicio);
    if(body.termino) body.termino = dataParaInput(body.termino);
    if(imagemDataUrl) body.imagem = await uploadImagem(imagemDataUrl, `${pid}/capa.${extFromDataUrl(imagemDataUrl)}`);
    else if(imagemRemovida) body.imagem = null;
    const p = await apiFetch(`/projects/${pid}`, {method:'PATCH', body:JSON.stringify(body)});
    return upsertProjetoMemoria(projetoDbParaMemoria(p));
  },
};

/* ---------- catálogo de etapas/categorias ---------- */
async function recarregarCatalogo(pid){
  catalogCache[pid] = await apiFetch(`/projects/${pid}/catalog`);
  return catalogCache[pid];
}
Api.catalog = {
  carregar: recarregarCatalogo,
  async adicionarEtapa(pid, nome){ await apiFetch(`/projects/${pid}/catalog/etapas`, {method:'POST', body:JSON.stringify({nome})}); return recarregarCatalogo(pid); },
  async removerEtapa(pid, nome){ await apiFetch(`/projects/${pid}/catalog/etapas/${qs(nome)}`, {method:'DELETE'}); return recarregarCatalogo(pid); },
  async adicionarCategoria(pid, {nome, etapas}){ await apiFetch(`/projects/${pid}/catalog/categorias`, {method:'POST', body:JSON.stringify({nome,etapas})}); return recarregarCatalogo(pid); },
  async removerCategoria(pid, nome){ await apiFetch(`/projects/${pid}/catalog/categorias/${qs(nome)}`, {method:'DELETE'}); return recarregarCatalogo(pid); },
  async definirEtapasDaCategoria(pid, nome, etapas){ await apiFetch(`/projects/${pid}/catalog/categorias/${qs(nome)}/etapas`, {method:'PUT', body:JSON.stringify({etapas})}); return recarregarCatalogo(pid); },
};

/* ---------- cronograma ---------- */
async function recarregarCronograma(pid){
  cronogramas[pid] = (await apiFetch(`/projects/${pid}/cronograma`)).map(etapaDbParaMemoria);
  return cronogramas[pid];
}
Api.cronograma = {
  carregar: recarregarCronograma,
  async adicionar(pid, etapaMem){ await apiFetch(`/projects/${pid}/cronograma`, {method:'POST', body:JSON.stringify(etapaMemoriaParaDb(etapaMem))}); return recarregarCronograma(pid); },
  async atualizar(pid, etapaId, patchMem){ await apiFetch(`/projects/${pid}/cronograma/${qs(etapaId)}`, {method:'PATCH', body:JSON.stringify(etapaMemoriaParaDb(patchMem))}); return recarregarCronograma(pid); },
  async remover(pid, etapaId){ await apiFetch(`/projects/${pid}/cronograma/${qs(etapaId)}`, {method:'DELETE'}); return recarregarCronograma(pid); },
};

/* ---------- financeiro ---------- */
async function recarregarFinanceiro(pid){
  const doc = await apiFetch(`/projects/${pid}/financeiro`);
  const out = {};
  Object.keys(doc).forEach(etapa=>{ out[etapa] = doc[etapa].map(categoriaFinDbParaMemoria); });
  financeiro[pid] = out;
  return financeiro[pid];
}
Api.financeiro = {
  carregar: recarregarFinanceiro,
  async adicionarCategoria(pid, etapa, {nome, prev}){ await apiFetch(`/projects/${pid}/financeiro/${qs(etapa)}/categorias`, {method:'POST', body:JSON.stringify({nome,prev})}); return recarregarFinanceiro(pid); },
  async atualizarOrcamento(pid, etapa, nome, prev){ await apiFetch(`/projects/${pid}/financeiro/${qs(etapa)}/categorias/${qs(nome)}`, {method:'PATCH', body:JSON.stringify({prev})}); return recarregarFinanceiro(pid); },
  async lancarGasto(pid, etapa, nome, lancamentoMem){ await apiFetch(`/projects/${pid}/financeiro/${qs(etapa)}/categorias/${qs(nome)}/lancamentos`, {method:'POST', body:JSON.stringify(lancamentoMemoriaParaDb(lancamentoMem))}); return recarregarFinanceiro(pid); },
  async removerLancamento(pid, etapa, nome, i){ await apiFetch(`/projects/${pid}/financeiro/${qs(etapa)}/categorias/${qs(nome)}/lancamentos/${i}`, {method:'DELETE'}); return recarregarFinanceiro(pid); },
  async removerCategoria(pid, etapa, nome){ await apiFetch(`/projects/${pid}/financeiro/${qs(etapa)}/categorias/${qs(nome)}`, {method:'DELETE'}); return recarregarFinanceiro(pid); },
};

/* ---------- relatórios semanais ---------- */
async function recarregarRdos(pid){
  rdos[pid] = (await apiFetch(`/projects/${pid}/rdos`)).map(rdoDbParaMemoria);
  return rdos[pid];
}
Api.rdos = {
  carregar: recarregarRdos,
  // rdoMem.n precisa já vir preenchido (a página sempre sabe o próximo número
  // de antemão, pro campo "Nº do relatório" somente leitura do formulário)
  async salvar(pid, rdoMem){
    const fotos = await prepararFotosParaSalvar(pid, rdoMem.n, rdoMem.fotos);
    await apiFetch(`/projects/${pid}/rdos`, {method:'POST', body:JSON.stringify(rdoMemoriaParaDb({...rdoMem, fotos}))});
    return recarregarRdos(pid);
  },
  async remover(pid, n){ await apiFetch(`/projects/${pid}/rdos/${n}`, {method:'DELETE'}); return recarregarRdos(pid); },
};

/* ---------- permissões por projeto ---------- */
Api.permissions = {
  carregar: pid => apiFetch(`/projects/${pid}/permissions`),
  definir: (pid, userId, permissoesPorModulo) => apiFetch(`/projects/${pid}/permissions/${userId}`, {method:'PUT', body:JSON.stringify(permissoesPorModulo)}),
  remover: (pid, userId) => apiFetch(`/projects/${pid}/permissions/${userId}`, {method:'DELETE'}),
};

/* ---------- usuários (conta, não é a mesma coisa que sessão/login) ---------- */
Api.users = {
  async listar(){ usersCache = await apiFetch('/users'); return usersCache; },
  async criar(dados){ const novo = await apiFetch('/users', {method:'POST', body:JSON.stringify(dados)}); usersCache.push(novo); return novo; },
};

/* ---------- carga combinada, pras páginas que mostram um projeto inteiro ---------- */
Api.carregarProjetoCompleto = async pid => {
  const [p] = await Promise.all([
    Api.projects.carregar(pid),
    Api.catalog.carregar(pid),
    Api.cronograma.carregar(pid),
    Api.financeiro.carregar(pid),
    Api.rdos.carregar(pid),
  ]);
  return p;
};
