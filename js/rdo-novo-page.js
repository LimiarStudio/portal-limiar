/* =================== RELATÓRIO SEMANAL: NOVO / EDIÇÃO (página dedicada) ===================
   rdo-novo.html define o projeto via ?projeto=N na URL (não por PROJETO_ID fixo, já que
   essa página é compartilhada entre todos os projetos). Se a URL também tiver &n=M, a
   página edita o relatório existente de número M em vez de criar um novo.
   PROJETO_ID já vem declarado por projeto-page.js, carregado antes deste arquivo. */
let moRows=[], eqRows=[], fotoRows=[], ativRows=[];
let editing=null;

// "DD/MM/AAAA a DD/MM/AAAA" -> ["AAAA-MM-DD","AAAA-MM-DD"], pros <input type="date">
function semanaParaInputs(semana){
  const [ini,fim]=semana.split(' a ').map(s=>s.trim());
  return [dataParaInput(ini), dataParaInput(fim)];
}
function renderRdoNovoForm(p, nextN, editing){
  const etapas=ensureCronograma(p.id);
  const voltar=withRole(projetoHref(p.id,'rdo'));
  const [iniVal,fimVal]=editing?semanaParaInputs(editing.semana):['2026-07-28','2026-08-01'];
  const respVal=editing?editing.resp:'Joyce Santos';
  return `
  <a class="page-back" href="${voltar}">← Voltar para Relatórios</a>
  <div class="card">
    <h3>${editing?'Editar':'Novo'} Relatório Semanal — ${p.nome}</h3>
    <p class="card-note">${editing?'Altere o que for necessário e salve para atualizar o relatório.':'Registre tudo o que aconteceu na semana em um único relatório — pode lançar várias atividades e progressos antes de salvar.'}</p>

    <div class="section-label">Cabeçalho</div>
    <div class="form-grid three">
      <div class="fg"><label>Nº do relatório</label><input value="${nextN}" readonly></div>
      <div class="fg"><label>Início da semana</label><input id="rd-ini" type="date" value="${iniVal}"></div>
      <div class="fg"><label>Término da semana</label><input id="rd-fim" type="date" value="${fimVal}"></div>
      <div class="fg full"><label>Responsável pelo acompanhamento</label><input id="rd-resp" value="${escapeHtml(respVal)}"></div>
      <div class="fg full" style="grid-column:1/-1"><label>Endereço da obra</label><input value="${p.endereco}" readonly></div>
    </div>

    <div class="section-label">Mão de obra</div>
    <div class="addrow">
      <select id="mo-sel">${FUNCOES.map(f=>`<option>${f}</option>`).join('')}</select>
      <input id="mo-qtd" type="number" min="1" value="1" style="max-width:90px">
      <button class="mini-btn" onclick="addRow('mo')">+ Adicionar</button>
    </div>
    <div class="row-list" id="mo-list"></div>

    <div class="section-label">Equipamentos</div>
    <div class="addrow">
      <select id="eq-sel">${EQUIPS.map(f=>`<option>${f}</option>`).join('')}</select>
      <input id="eq-qtd" type="number" min="1" value="1" style="max-width:90px">
      <button class="mini-btn" onclick="addRow('eq')">+ Adicionar</button>
    </div>
    <div class="row-list" id="eq-list"></div>

    <div class="section-label">Atividades realizadas</div>
    <div class="fg full"><label>Descrição da atividade</label><textarea id="ativ-desc" rows="8" placeholder="Ex.: Concretagem da laje do 2º pavimento"></textarea></div>
    <div class="form-grid" style="margin-top:10px">
      <div class="fg"><label>Vincular ao cronograma (opcional)</label>
        <select id="ativ-etapa"><option value="">— sem vínculo —</option>${etapas.map(e=>`<option>${e.nome}</option>`).join('')}</select></div>
      <div class="fg"><label>Avanço a lançar (%)</label><input id="ativ-av" type="number" min="0" max="100" value="0"></div>
    </div>
    <div style="margin-top:8px"><button class="mini-btn" onclick="addAtiv()">+ Adicionar atividade ao relatório</button></div>
    <div class="row-list" id="ativ-list"></div>

    <div class="section-label">Ocorrências</div>
    <div class="fg full"><textarea id="rd-ocorr" rows="8" placeholder="Registre atrasos, imprevistos, visitas, etc.">${editing?escapeHtml(editing.ocorr||''):''}</textarea></div>

    <div class="section-label">Fotos</div>
    <input type="file" id="foto-input" accept="image/*" multiple style="display:none" onchange="addFoto(this)">
    <div class="dropzone" onclick="$('#foto-input').click()">📷 Clique para anexar fotos</div>
    <div class="photo-grid" id="foto-list" style="margin-top:12px"></div>

    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:26px;padding-top:18px;border-top:1px solid var(--line)">
      <a class="btn" href="${voltar}" style="text-decoration:none;display:inline-flex;align-items:center">Cancelar</a>
      <button class="btn-primary" style="width:auto" onclick="saveRDO(${p.id})">${editing?'Salvar alterações':'Salvar e publicar'}</button>
    </div>
  </div>`;
}

function addRow(t){
  const sel=$('#'+t+'-sel').value, q=+$('#'+t+'-qtd').value;
  if(!(q>0)){alert('Informe uma quantidade maior que zero.');return;}
  (t==='mo'?moRows:eqRows).push([sel,q]);drawRows(t);
}
function drawRows(t){
  const arr=t==='mo'?moRows:eqRows, cls=t==='mo'?'cat-mo':'cat-eq';
  $('#'+t+'-list').innerHTML=arr.map((r,i)=>`<div class="r"><span class="chip ${cls}">${r[0]}</span> × <b>${r[1]}</b>
    <button class="del" onclick="delRow('${t}',${i})">×</button></div>`).join('');
}
function delRow(t,i){(t==='mo'?moRows:eqRows).splice(i,1);drawRows(t);}

function addAtiv(){
  const t=$('#ativ-desc').value.trim();
  if(!t){alert('Descreva a atividade antes de adicionar.');return;}
  const etapa=$('#ativ-etapa').value||null, av=+$('#ativ-av').value||0;
  if(av<0||av>100){alert('O avanço deve estar entre 0 e 100%.');return;}
  ativRows.push({t,etapa,av});
  $('#ativ-desc').value='';$('#ativ-av').value=0;$('#ativ-etapa').value='';
  drawAtiv();
}
function drawAtiv(){
  $('#ativ-list').innerHTML=ativRows.map((a,i)=>`<div class="r">
    <span style="white-space:pre-wrap">${escapeHtml(a.t)}${a.etapa?` <span class="chip cat-eg">🔗 ${a.etapa} +${a.av}%</span>`:` <span class="chip">sem vínculo</span>`}</span>
    <button class="del" onclick="delAtiv(${i})">×</button></div>`).join('');
}
function delAtiv(i){ativRows.splice(i,1);drawAtiv();}

function addFoto(input){
  Array.from(input.files||[]).forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{ fotoRows.push({src:e.target.result, cap:file.name}); drawFotos(); };
    reader.readAsDataURL(file);
  });
  input.value='';
}
function drawFotos(){
  $('#foto-list').innerHTML=fotoRows.map((f,i)=>{
    const capAttr=(f.cap||'').replace(/"/g,'&quot;');
    return `<div class="photo">
    <button class="del" onclick="delFoto(${i})">×</button>
    <div class="ph">${fotoTileBody(f)}</div>
    <input class="cap" value="${capAttr}" placeholder="Legenda da foto" oninput="updateFotoCap(${i},this.value)">
  </div>`;
  }).join('');
}
function updateFotoCap(i,val){ fotoRows[i].cap=val; }
function delFoto(i){ fotoRows.splice(i,1); drawFotos(); }

function saveRDO(pid){
  if(!ativRows.length){alert('Adicione pelo menos uma atividade antes de salvar.');return;}
  const iniV=$('#rd-ini').value, fimV=$('#rd-fim').value;
  if(!iniV||!fimV){alert('Informe o início e o término da semana.');return;}
  const semana=inputParaData(iniV)+' a '+inputParaData(fimV);
  const resp=$('#rd-resp').value.trim()||'—';
  const ocorr=$('#rd-ocorr').value.trim();

  if(editing){
    Object.assign(editing, {semana, resp, mo:moRows.slice(), eq:eqRows.slice(), ativ:ativRows.slice(), ocorr, fotos:fotoRows.slice()});
    alert(`Relatório nº ${editing.n} atualizado com sucesso!`);
  }else{
    if(!rdos[pid]) rdos[pid]=[];
    const nextN=Math.max(0,...rdos[pid].map(r=>r.n))+1;
    rdos[pid].unshift({n:nextN, semana, resp, mo:moRows.slice(), eq:eqRows.slice(), ativ:ativRows.slice(), ocorr, fotos:fotoRows.slice()});
    alert(`Relatório nº ${nextN} salvo e publicado!\n\nNo sistema real:\n• O cliente receberia a notificação em tempo real\n• Cada progresso lançado atualizaria a etapa vinculada no cronograma\n• As fotos ficariam no histórico da obra`);
  }
  window.location.href = withRole(projetoHref(pid,'rdo'));
}

function initRdoNovoPage(){
  requireAuth();
  renderUserChip();
  if(ROLE!=='gestor'){ window.location.href=withRole('projetos.html'); return; }
  PROJETO_ID=+new URLSearchParams(window.location.search).get('projeto');
  const editN=new URLSearchParams(window.location.search).get('n');
  const p=projetos.find(x=>x.id===PROJETO_ID);
  if(!p){ window.location.href=withRole('projetos.html'); return; }
  current.tab='rdo';
  buildNavProjeto();
  $('#topActions').innerHTML='';

  editing = editN ? (rdos[PROJETO_ID]||[]).find(x=>x.n===+editN) : null;
  if(editN && !editing){ window.location.href=withRole(projetoHref(PROJETO_ID,'rdo')); return; }

  if(editing){
    moRows=editing.mo.map(r=>r.slice());
    eqRows=editing.eq.map(r=>r.slice());
    ativRows=editing.ativ.map(a=>({...a}));
    fotoRows=editing.fotos.map(normalizeFoto).map(f=>({...f}));
  }else{
    moRows=[]; eqRows=[]; ativRows=[]; fotoRows=[];
  }

  $('#crumb').textContent='Projetos · '+p.nome+' · Relatórios';
  $('#pageTitle').textContent=editing?'Editar Relatório nº '+editing.n:'Novo Relatório Semanal';
  const nextN=editing?editing.n:Math.max(0,...(rdos[PROJETO_ID]||[]).map(r=>r.n))+1;
  $('#content').innerHTML = renderRdoNovoForm(p, nextN, editing);
  drawRows('mo');drawRows('eq');drawAtiv();drawFotos();
}
