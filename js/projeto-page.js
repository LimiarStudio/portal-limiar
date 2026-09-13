/* =================== PROJETO: PÁGINA DETALHE ===================
   projeto.html define o projeto via ?projeto=N na URL (não por PROJETO_ID fixo — uma
   página só, compartilhada por todos os projetos, inclusive os criados em tempo real).
   O administrador sempre vê todos os módulos do projeto; o cliente de demonstração só
   vê os que tiverem "visualizar" autorizado em Usuários e Permissões (modulosVisiveis,
   em helpers.js). */
let PROJETO_ID;

function buildNavProjeto(){
  const p=projetos.find(x=>x.id===PROJETO_ID);
  $('#nav').innerHTML = `<div class="nav-group">Projeto</div>
    <a class="nav-item" href="${withRole('projetos.html')}">${ic('back')} Voltar aos projetos</a>
    <div class="nav-group">Módulos</div>`+
    modulosVisiveis(p).map(([k,l,i])=>`<div class="nav-item ${current.tab===k?'active':''}" onclick="setTab('${k}')">${ic(i)} ${l}</div>`).join('')+
    (ROLE==='gestor'?adminNavHtml(PROJETO_ID,null):(clientePodeGerenciarUsuarios(PROJETO_ID)?adminNavHtml(PROJETO_ID,null,true):''));
}

function setTab(t){ current.tab=t; renderProjetoTabs(); }

function renderProjetoTabs(){
  const p=projetos.find(x=>x.id===PROJETO_ID);
  buildNavProjeto();
  const ta=$('#topActions'); ta.innerHTML='';
  $('#crumb').textContent='Projetos · '+p.cliente;
  $('#pageTitle').textContent=p.nome;
  const c=$('#content');
  const modulos=modulosVisiveis(p);
  if(!modulos.length){
    c.innerHTML=`<div class="card"><div class="empty">Você não tem permissão para ver nenhum módulo deste projeto.</div></div>`;
    return;
  }
  c.innerHTML=`<div class="tabs">`+
    modulos.map(([k,l])=>`<div class="tab ${current.tab===k?'active':''}" onclick="setTab('${k}')">${l}</div>`).join('')+`</div>`;
  if(current.tab==='visao') c.innerHTML+=renderVisao(p);
  if(current.tab==='rdo'){
    if(podeEditar(PROJETO_ID,'rdo')) ta.innerHTML=`<a class="btn-primary" style="width:auto;display:inline-block;text-decoration:none;text-align:center" href="${withRole('rdo-novo.html?projeto='+PROJETO_ID)}">+ Novo Relatório</a>`;
    c.innerHTML+=renderRDO(p);
  }
  if(current.tab==='financeiro'){ if(podeEditar(PROJETO_ID,'financeiro')) ta.innerHTML=`<button class="btn-primary" style="width:auto" onclick="openCategoria(${PROJETO_ID})">+ Nova categoria</button>`; c.innerHTML+=renderFin(p);}
  if(current.tab==='cronograma'){ if(podeEditar(PROJETO_ID,'cronograma')) ta.innerHTML=`<button class="btn-primary" style="width:auto" onclick="${p.tipo==='relatorios'?'openEtapaSimples':'openEtapa'}(${PROJETO_ID})">+ Nova etapa</button>`; c.innerHTML+=renderCrono(p);}
}

async function initProjetoPage(){
  await requireAuth();
  renderUserChip();
  PROJETO_ID=+new URLSearchParams(window.location.search).get('projeto');
  $('#content').innerHTML = `<div class="empty">Carregando…</div>`;
  // busca tudo que as 4 abas podem precisar de uma vez só, antes da primeira
  // renderização — troca de aba (setTab) continua síncrona/instantânea depois disso
  let p, crono, fin, rdosList;
  try{
    [p, crono, fin, rdosList] = await Promise.all([
      Api.projects.buscar(PROJETO_ID),
      Api.cronograma.listar(PROJETO_ID),
      // projetos "Apenas Relatórios" não têm módulo Financeiro (ver
      // modulosDoProjeto em helpers.js) — a permissão desse módulo fica
      // sempre false pra todo mundo (não dá nem pra conceder pela tela de
      // Usuários), então as Firestore rules SEMPRE negam esta leitura pra
      // quem não é admin. Isso é esperado, não um erro fatal: sem o
      // .catch(), a rejeição derrubava o Promise.all inteiro e mandava
      // qualquer cliente de volta pra projetos.html ao tentar abrir um
      // projeto desse tipo, mesmo com acesso total aos módulos que existem.
      Api.financeiro.tudo(PROJETO_ID).catch(()=>({})),
      Api.rdos.listar(PROJETO_ID),
      carregarPermissoes(PROJETO_ID),
    ]);
  }catch(e){
    window.location.href=withRole('projetos.html'); return;
  }
  const idx=projetos.findIndex(x=>x.id===PROJETO_ID);
  if(idx===-1) projetos.push(p); else projetos[idx]=p;
  cronogramas[PROJETO_ID]=crono;
  financeiro[PROJETO_ID]=fin;
  rdos[PROJETO_ID]=rdosList;

  const tabParam=new URLSearchParams(window.location.search).get('tab');
  const permitidas=modulosVisiveis(p).map(([k])=>k);
  current.tab = (tabParam && permitidas.includes(tabParam)) ? tabParam : permitidas[0];
  renderProjetoTabs();
}
