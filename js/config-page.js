/* =================== CONFIGURAÇÕES: ETAPAS, CATEGORIAS E SUAS RELAÇÕES ===================
   configuracoes.html define o projeto via ?projeto=N na URL (não por PROJETO_ID fixo, já que
   essa página é compartilhada entre todos os projetos). O catálogo de etapas/categorias é
   local a cada projeto — mudanças aqui não afetam os outros projetos. A distinção entre "de
   fábrica" (só suprimida) e "cadastrada pelo usuário" (removida de verdade) já é resolvida
   inteiramente pelo backend (RepoCatalog.removerEtapa/removerCategoria) — aqui é só chamar
   Api.catalog.* e recarregar. */
let PROJETO_ID;

function buildNavConfig(p){
  $('#nav').innerHTML = projectModulosNavHtml(p) + adminNavHtml(p.id,'config');
}

async function addEtapa(){
  const nome=$('#cfg-etapa-nome').value.trim();
  if(!nome){alert('Informe o nome da etapa.');return;}
  if(etapasPadrao(PROJETO_ID).some(e=>e.toLowerCase()===nome.toLowerCase())){alert('Essa etapa já existe neste projeto.');return;}
  const btn=document.querySelector('button[onclick="addEtapa()"]');
  btn.disabled=true;
  try{
    await Api.catalog.adicionarEtapa(PROJETO_ID, nome);
    await recarregarCatalogo(PROJETO_ID);
    renderConfigContent();
  }catch(e){
    alert('Não foi possível adicionar a etapa: '+e.message);
    btn.disabled=false;
  }
}
async function removeEtapa(nome){
  if(!confirm(`Remover a etapa "${nome}" deste projeto? Outros projetos não são afetados, e etapas já lançadas no cronograma continuam existindo.`)) return;
  try{
    await Api.catalog.removerEtapa(PROJETO_ID, nome);
    await recarregarCatalogo(PROJETO_ID);
    renderConfigContent();
  }catch(e){
    alert('Não foi possível remover a etapa: '+e.message);
  }
}

async function addCategoria(){
  const nome=$('#cfg-cat-nome').value.trim();
  if(!nome){alert('Informe o nome da categoria.');return;}
  if(categoriasPadrao(PROJETO_ID).some(c=>c.nome.toLowerCase()===nome.toLowerCase())){alert('Essa categoria já existe neste projeto.');return;}
  const etapas=Array.from(document.querySelectorAll('.cfg-etapa-check:checked')).map(c=>c.value);
  if(!etapas.length){alert('Selecione ao menos uma etapa relacionada.');return;}
  const btn=document.querySelector('button[onclick="addCategoria()"]');
  btn.disabled=true;
  try{
    await Api.catalog.adicionarCategoria(PROJETO_ID, {nome, etapas});
    await recarregarCatalogo(PROJETO_ID);
    renderConfigContent();
  }catch(e){
    alert('Não foi possível adicionar a categoria: '+e.message);
    btn.disabled=false;
  }
}
async function removeCategoria(nome){
  if(!confirm(`Remover a categoria "${nome}" deste projeto? Outros projetos não são afetados.`)) return;
  try{
    await Api.catalog.removerCategoria(PROJETO_ID, nome);
    await recarregarCatalogo(PROJETO_ID);
    renderConfigContent();
  }catch(e){
    alert('Não foi possível remover a categoria: '+e.message);
  }
}

function editCategoriaEtapas(nome){
  const c=categoriasPadrao(PROJETO_ID).find(x=>x.nome===nome);
  if(!c) return;
  const etapas=etapasPadrao(PROJETO_ID);
  modal('Editar etapas de "'+nome+'"',`
    <p class="card-note" style="margin-bottom:12px">Escolha em quais etapas esta categoria deve aparecer como opção no Financeiro deste projeto.</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;max-height:260px;overflow:auto">
      ${etapas.map(e=>`<label style="display:flex;align-items:center;gap:6px;font-size:12px;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:6px 10px;cursor:pointer">
        <input type="checkbox" class="edit-cat-etapa-check" value="${e}" ${c.etapas.includes(e)?'checked':''}> ${e}
      </label>`).join('')}
    </div>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="saveCategoriaEtapas('${nome.replace(/'/g,"\\'")}')">Salvar</button>`);
}
async function saveCategoriaEtapas(nome){
  const etapas=Array.from(document.querySelectorAll('.edit-cat-etapa-check:checked')).map(c=>c.value);
  if(!etapas.length){alert('Selecione ao menos uma etapa relacionada.');return;}
  const btn=document.querySelector('#modalRoot .btn-primary');
  btn.disabled=true;
  try{
    await Api.catalog.definirEtapasDaCategoria(PROJETO_ID, nome, etapas);
    await recarregarCatalogo(PROJETO_ID);
    closeModal();
    renderConfigContent();
  }catch(e){
    alert('Não foi possível salvar as etapas da categoria: '+e.message);
    btn.disabled=false;
  }
}

function renderConfigContent(){
  const etapas=etapasPadrao(PROJETO_ID);
  const categoriaList=categoriasPadrao(PROJETO_ID);
  $('#content').innerHTML=`
  <div class="grid-2">
    <div class="card">
      <h3>Etapas de obra</h3>
      <p class="card-note">Lista de etapas do cronograma deste projeto. Cada etapa também é o agrupador fixo usado no Financeiro. Adicione ou remova etapas — vale só para este projeto.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        ${etapas.map(e=>`<span class="chip" style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px">${e}<button onclick="removeEtapa('${e.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;line-height:1;padding:0">×</button></span>`).join('')}
      </div>
      <div class="addrow">
        <input id="cfg-etapa-nome" placeholder="Nome da nova etapa">
        <button class="mini-btn" onclick="addEtapa()">+ Adicionar etapa</button>
      </div>
    </div>
    <div class="card">
      <h3>Nova categoria</h3>
      <p class="card-note">Escolha o nome e em quais etapas ela deve aparecer como opção no Financeiro deste projeto.</p>
      <div class="fg full" style="margin-bottom:12px"><label>Nome da categoria</label><input id="cfg-cat-nome" placeholder="Ex.: Gesso acartonado"></div>
      <label style="display:block;font-size:12px;color:var(--mut);margin-bottom:6px">Etapas relacionadas</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;max-height:220px;overflow:auto">
        ${etapas.map(e=>`<label style="display:flex;align-items:center;gap:6px;font-size:12px;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:6px 10px;cursor:pointer">
          <input type="checkbox" class="cfg-etapa-check" value="${e}"> ${e}
        </label>`).join('')}
      </div>
      <button class="btn-primary" style="width:auto" onclick="addCategoria()">+ Adicionar categoria</button>
    </div>
  </div>
  <div class="card">
    <h3>Categorias e suas relações</h3>
    <p class="card-note">${categoriaList.length} categorias cadastradas neste projeto — cada uma aparece como opção apenas nas etapas relacionadas a ela.</p>
    <table>
      <thead><tr><th>Categoria</th><th>Etapas relacionadas</th><th></th></tr></thead>
      <tbody>
      ${categoriaList.map(c=>{
        const todas=c.etapas.length===etapas.length;
        return `<tr>
          <td><b>${c.nome}</b></td>
          <td>${todas?`<span class="mut">Todas as etapas</span>`:c.etapas.map(e=>`<span class="chip" style="margin:2px 4px 2px 0">${e}</span>`).join('')}</td>
          <td style="text-align:right"><div style="display:flex;gap:6px;justify-content:flex-end">
            <button class="mini-btn" onclick="editCategoriaEtapas('${c.nome.replace(/'/g,"\\'")}')">Editar</button>
            <button class="mini-btn mini-btn-danger" onclick="removeCategoria('${c.nome.replace(/'/g,"\\'")}')">Remover</button>
          </div></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>`;
}

async function initConfigPage(){
  requireAuth();
  renderUserChip();
  if(ROLE!=='gestor'){ window.location.href=withRole('projetos.html'); return; }
  PROJETO_ID = +new URLSearchParams(window.location.search).get('projeto');
  $('#content').innerHTML = `<div class="empty">Carregando…</div>`;
  let p;
  try{
    p = await Api.projects.buscar(PROJETO_ID);
    await garantirCatalogCache(PROJETO_ID);
  }catch(e){
    window.location.href=withRole('projetos.html'); return;
  }
  buildNavConfig(p);
  $('#crumb').textContent='Projetos · '+p.nome;
  $('#pageTitle').textContent='Configurações — '+p.nome;
  $('#topActions').innerHTML='';
  renderConfigContent();
}
