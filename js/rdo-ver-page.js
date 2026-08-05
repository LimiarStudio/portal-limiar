/* =================== RELATÓRIO SEMANAL: LEITURA (página dedicada) ===================
   rdo-ver.html define o projeto e o relatório via ?projeto=N&n=M na URL (não por
   PROJETO_ID fixo, já que essa página é compartilhada entre todos os projetos).
   Página cheia em vez de modal: as atividades e ocorrências podem ter bastante texto.
   PROJETO_ID já vem declarado por projeto-page.js, carregado antes deste arquivo. */

function infoBox(l,v){return `<div class="fg"><label>${l}</label><div style="padding:9px 11px;background:var(--bg2);border-radius:8px">${v}</div></div>`;}

async function baixarPdf(pid, n){
  const btn=$('#btn-baixar-pdf');
  const original=btn.textContent;
  btn.disabled=true; btn.textContent='Gerando PDF…';
  try{
    const {url}=await Api.rdos.gerarPdf(pid, n);
    window.open(url, '_blank');
  }catch(e){
    alert('Não foi possível gerar o PDF: '+e.message);
  }finally{
    btn.disabled=false; btn.textContent=original;
  }
}

function renderRdoVer(p, r){
  const voltar=withRole(projetoHref(p.id,'rdo'));
  return `
  <a class="page-back" href="${voltar}">← Voltar para Relatórios</a>
  <div class="card">
    <h3>Relatório nº ${r.n} — ${p.nome}</h3>
    <p class="card-note">Semana de ${r.semana}</p>

    <div class="form-grid three">
      ${infoBox('Semana',r.semana)}${infoBox('Responsável',r.resp)}${infoBox('Efetivo',r.mo.reduce((a,b)=>a+b[1],0)+' pessoas')}
    </div>

    <div class="section-label">Mão de obra</div>
    ${r.mo.map(m=>`<div class="r" style="display:flex;padding:7px 10px;background:var(--bg2);border-radius:8px;margin-bottom:6px"><span class="chip cat-mo">${m[0]}</span><b style="margin-left:auto">${m[1]}</b></div>`).join('')}

    <div class="section-label">Equipamentos</div>
    ${r.eq.map(m=>`<div class="r" style="display:flex;padding:7px 10px;background:var(--bg2);border-radius:8px;margin-bottom:6px"><span class="chip cat-eq">${m[0]}</span><b style="margin-left:auto">${m[1]}</b></div>`).join('')}

    <div class="section-label">Atividades realizadas</div>
    ${r.ativ.length?r.ativ.map(a=>`<div style="padding:14px 16px;background:var(--bg2);border-radius:10px;margin-bottom:10px">
      <div style="white-space:pre-wrap;line-height:1.6">${escapeHtml(a.t)}</div>
      <div style="margin-top:10px">${a.etapa?`<span class="chip cat-eg">🔗 ${a.etapa} +${a.av}%</span>`:`<span class="chip">sem vínculo</span>`}</div>
    </div>`).join(''):`<div class="mut" style="font-size:12px">Nenhuma atividade registrada.</div>`}

    <div class="section-label">Ocorrências</div>
    <div style="padding:14px 16px;background:var(--bg2);border-radius:10px;white-space:pre-wrap;line-height:1.6">${r.ocorr?escapeHtml(r.ocorr):'<span class="mut">Nenhuma ocorrência registrada.</span>'}</div>

    <div class="section-label">Fotos</div>
    ${r.fotos.length?`<div class="photo-grid">${r.fotos.map(normalizeFoto).map(f=>`<div class="photo"><div class="ph">${fotoTileBody(f)}</div><div class="cap">${escapeHtml(f.cap)}</div></div>`).join('')}</div>`:`<div class="mut" style="font-size:12px">Nenhuma foto anexada.</div>`}
  </div>`;
}

async function initRdoVerPage(){
  requireAuth();
  renderUserChip();
  PROJETO_ID=+new URLSearchParams(window.location.search).get('projeto');
  const n=+new URLSearchParams(window.location.search).get('n');
  $('#content').innerHTML = `<div class="empty">Carregando…</div>`;
  let p, r;
  try{
    [p, r] = await Promise.all([
      Api.projects.buscar(PROJETO_ID),
      Api.rdos.buscar(PROJETO_ID, n),
      carregarPermissoes(PROJETO_ID),
    ]);
  }catch(e){
    window.location.href=withRole('projetos.html'); return;
  }
  const idx=projetos.findIndex(x=>x.id===PROJETO_ID);
  if(idx===-1) projetos.push(p); else projetos[idx]=p;
  if(ROLE!=='gestor' && !permissoesUsuario(PROJETO_ID, modulosDoProjeto(p)).rdo.view){
    window.location.href=withRole(projetoHref(PROJETO_ID)); return;
  }
  current.tab='rdo';
  buildNavProjeto();
  $('#crumb').textContent='Projetos · '+p.nome+' · Relatórios';
  $('#pageTitle').textContent='Relatório nº '+r.n;
  $('#topActions').innerHTML=
    (podeEditar(PROJETO_ID,'rdo')?`<a class="btn-primary" style="width:auto;display:inline-block;text-decoration:none;text-align:center" href="${withRole('rdo-novo.html?projeto='+PROJETO_ID+'&n='+r.n)}">Editar relatório</a>`:'')
    +`<button id="btn-baixar-pdf" class="btn" style="width:auto;margin-left:8px" onclick="baixarPdf(${PROJETO_ID},${r.n})">Baixar PDF</button>`;
  $('#content').innerHTML=renderRdoVer(p, r);
}
