/* =================== CRONOGRAMA: ETAPAS ===================
   A ordenação por data de início já vem pronta do backend (Repo/Cronograma.js
   reordena a cada escrita) — nada aqui precisa ordenar a lista de novo. */

// lê e valida os campos de início/término/avanço do modal de etapa (usado tanto ao
// adicionar quanto ao editar) — retorna {ini,fim,av,dur} formatados, ou null se inválido
function lerFormEtapa(){
  const iniV=$('#et-ini').value, fimV=$('#et-fim').value, av=+$('#et-av').value||0;
  if(!iniV||!fimV){alert('Informe as datas de início e término.');return null;}
  if(av<0||av>100){alert('O avanço deve estar entre 0 e 100%.');return null;}
  const ini=new Date(iniV+'T00:00:00'), fim=new Date(fimV+'T00:00:00');
  if(fim<ini){alert('A data de término não pode ser antes da data de início.');return null;}
  const dur=Math.max(1,Math.round((fim-ini)/86400000));
  const dd=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
  return {ini:dd(ini), fim:dd(fim), av, dur};
}

async function openEtapa(pid){
  await garantirCatalogCache(pid);
  const atuais=ensureCronograma(pid).map(e=>e.nome);
  const disponiveis=etapasPadrao(pid).filter(e=>!atuais.includes(e));
  if(!disponiveis.length){
    modal('Nova etapa do cronograma',`<div class="empty">Todas as etapas padrão já foram adicionadas a este cronograma.</div>`,
      `<button class="btn" onclick="closeModal()">Fechar</button>`);
    return;
  }
  modal('Nova etapa do cronograma',`
    <div class="form-grid three">
      <div class="fg full"><label>Etapa</label><select id="et-nome">${disponiveis.map(e=>`<option>${e}</option>`).join('')}</select></div>
      <div class="fg"><label>Início</label><input id="et-ini" type="date"></div>
      <div class="fg"><label>Término</label><input id="et-fim" type="date"></div>
      <div class="fg"><label>Avanço inicial (%)</label><input id="et-av" type="number" min="0" max="100" value="0"></div>
    </div>
    <p class="card-note" style="margin-top:14px">As etapas são padronizadas — a escolhida aqui também passa a ser o agrupador fixo no Financeiro.</p>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="saveEtapa(${pid})">Salvar etapa</button>`);
}
async function saveEtapa(pid){
  const nome=$('#et-nome').value;
  const parsed=lerFormEtapa();
  if(!parsed) return;
  const btn=document.querySelector('#modalRoot .btn-primary');
  btn.disabled=true;
  try{
    await Api.cronograma.adicionar(pid, {nome, ini:parsed.ini, fim:parsed.fim, av:parsed.av, dur:parsed.dur});
    cronogramas[pid]=await Api.cronograma.listar(pid);
    closeModal();renderProjetoTabs();
  }catch(e){
    alert('Não foi possível adicionar a etapa: '+e.message);
    btn.disabled=false;
  }
}
function editEtapa(pid, id){
  const item=ensureCronograma(pid).find(x=>x.id===id);
  if(!item) return;
  modal('Editar etapa — '+item.nome,`
    <div class="form-grid three">
      <div class="fg full"><label>Etapa</label><input value="${item.nome}" readonly></div>
      <div class="fg"><label>Início</label><input id="et-ini" type="date" value="${dataParaInput(item.ini)}"></div>
      <div class="fg"><label>Término</label><input id="et-fim" type="date" value="${dataParaInput(item.fim)}"></div>
      <div class="fg"><label>Avanço (%)</label><input id="et-av" type="number" min="0" max="100" value="${item.av}"></div>
    </div>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="saveEtapaEdit(${pid},'${id}')">Salvar alterações</button>`);
}
async function saveEtapaEdit(pid, id){
  const parsed=lerFormEtapa();
  if(!parsed) return;
  const btn=document.querySelector('#modalRoot .btn-primary');
  btn.disabled=true;
  try{
    await Api.cronograma.atualizar(pid, id, {ini:parsed.ini, fim:parsed.fim, av:parsed.av, dur:parsed.dur});
    cronogramas[pid]=await Api.cronograma.listar(pid);
    closeModal();renderProjetoTabs();
  }catch(e){
    alert('Não foi possível salvar as alterações: '+e.message);
    btn.disabled=false;
  }
}
async function removeCronogramaEtapa(pid, id, nome){
  if(!confirm(`Remover a etapa "${nome}" do cronograma deste projeto? As categorias e gastos já lançados nela não são apagados, mas deixam de aparecer até que a etapa seja adicionada novamente.`)) return;
  try{
    await Api.cronograma.remover(pid, id);
    cronogramas[pid]=await Api.cronograma.listar(pid);
    renderProjetoTabs();
  }catch(e){
    alert('Não foi possível remover a etapa: '+e.message);
  }
}
