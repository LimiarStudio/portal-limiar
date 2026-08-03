/* =================== PROJETOS: LISTAGEM =================== */
function renderProjetos(){
  return `<div class="proj-grid">`+projetos.map(p=>{
    return `<a class="proj-card" href="${withRole(projetoHref(p.id))}">
      <div class="proj-thumb">${p.imagem?`<img src="${p.imagem}" alt="${p.nome}">`:p.icon}</div>
      <div class="proj-body">
        <h4>${p.nome}</h4><div class="sub">${p.cliente}</div>
        <div style="margin:14px 0 4px;display:flex;justify-content:space-between;font-size:12px">
          <span class="mut">Progresso</span><b>${p.avanco}%</b></div>
        <div class="progress"><i style="width:${p.avanco}%"></i></div>
        <div class="proj-meta"><span>📅 ${p.inicio} → ${p.termino}</span></div>
      </div></a>`;
  }).join('')+`</div>`;
}

function initProjetosPage(){
  requireAuth();
  renderUserChip();
  buildNavProjetos('projetos');
  $('#crumb').textContent='Início';
  $('#pageTitle').textContent='Meus Projetos';
  if(ROLE==='gestor') $('#topActions').innerHTML=`<a class="btn-primary" style="width:auto;display:inline-block;text-decoration:none;text-align:center" href="${withRole('novo-projeto.html')}">+ Novo projeto</a>`;
  $('#content').innerHTML = renderProjetos();
}
