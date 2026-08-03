/* =================== CRONOGRAMA: ETAPAS =================== */
// converte uma data "DD/MM/AAAA" num número comparável, pra ordenar o cronograma por data
const dataChave = s => { const [d,m,a]=s.split('/').map(Number); return a*10000+m*100+d; };

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

function openEtapa(pid){
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
function saveEtapa(pid){
  const nome=$('#et-nome').value;
  const parsed=lerFormEtapa();
  if(!parsed) return;
  const lista=ensureCronograma(pid);
  lista.push({id:'t'+Date.now(), nome, ...parsed});
  lista.sort((a,b)=>dataChave(a.ini)-dataChave(b.ini));
  closeModal();renderProjetoTabs();
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
function saveEtapaEdit(pid, id){
  const parsed=lerFormEtapa();
  if(!parsed) return;
  const item=ensureCronograma(pid).find(x=>x.id===id);
  if(!item) return;
  Object.assign(item, parsed);
  ensureCronograma(pid).sort((a,b)=>dataChave(a.ini)-dataChave(b.ini));
  closeModal();renderProjetoTabs();
}
function removeCronogramaEtapa(pid, id, nome){
  if(!confirm(`Remover a etapa "${nome}" do cronograma deste projeto? As categorias e gastos já lançados nela não são apagados, mas deixam de aparecer até que a etapa seja adicionada novamente.`)) return;
  const lista=ensureCronograma(pid);
  const i=lista.findIndex(x=>x.id===id);
  if(i>=0) lista.splice(i,1);
  renderProjetoTabs();
}
