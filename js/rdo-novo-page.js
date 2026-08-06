/* =================== RELATÓRIO SEMANAL: NOVO / EDIÇÃO (página dedicada) ===================
   rdo-novo.html define o projeto via ?projeto=N na URL (não por PROJETO_ID fixo, já que
   essa página é compartilhada entre todos os projetos). Se a URL também tiver &n=M, a
   página edita o relatório existente de número M em vez de criar um novo.
   PROJETO_ID já vem declarado por projeto-page.js, carregado antes deste arquivo. */
let moRows=[], eqRows=[], fotoRows=[], ativRows=[];
let editing=null;
let currentN=null;

function renderRdoNovoForm(p, nextN, editing){
  const etapas=ensureCronograma(p.id);
  const voltar=withRole(projetoHref(p.id,'rdo'));
  const [iniVal,fimVal]=editing?semanaParaIso(editing.semana):['',''];
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

// soma, por etapa, o avanço de todas as atividades do relatório vinculadas a
// ela — usado por saveRDO pra saber quanto empurrar o avanço de cada etapa
// do cronograma quando o relatório é salvo (ver comentário lá embaixo)
function somarAvancoPorEtapa(ativ){
  const out={};
  (ativ||[]).forEach(a=>{ if(a.etapa) out[a.etapa]=(out[a.etapa]||0)+(+a.av||0); });
  return out;
}

// "Avanço a lançar" numa atividade é sempre incremental ("+5% essa semana",
// não "a etapa está em 5%" — daí o "+" na exibição em drawAtiv/renderRdoVer),
// então salvar o relatório soma esse valor ao avanço já registrado na etapa
// correspondente do cronograma. Comparar contra o relatório ANTERIOR (não só
// aplicar direto) é o que evita contar duas vezes ao editar um relatório já
// salvo: só a DIFERENÇA entre o que tinha antes e o que tem agora é aplicada
// — reduzir o avanço lançado, trocar de etapa ou remover o vínculo também
// funcionam corretamente, cada um vira só a diferença certa por etapa.
async function atualizarAvancoCronograma(pid, ativAntes, ativDepois){
  const antes=somarAvancoPorEtapa(ativAntes), depois=somarAvancoPorEtapa(ativDepois);
  const etapasAfetadas=new Set([...Object.keys(antes), ...Object.keys(depois)]);
  let mudou=false;
  for(const nomeEtapa of etapasAfetadas){
    const delta=(depois[nomeEtapa]||0)-(antes[nomeEtapa]||0);
    if(!delta) continue;
    const etapa=ensureCronograma(pid).find(e=>e.nome===nomeEtapa);
    if(!etapa) continue; // etapa pode ter sido removida do cronograma desde o relatório anterior
    const novoAv=Math.max(0, Math.min(100, etapa.av+delta));
    if(novoAv===etapa.av) continue;
    await Api.cronograma.atualizar(pid, etapa.id, {av:novoAv});
    mudou=true;
  }
  if(mudou){
    cronogramas[pid]=await Api.cronograma.listar(pid);
    await recalcularAvancoProjeto(pid);
  }
}

async function saveRDO(pid){
  if(!ativRows.length){alert('Adicione pelo menos uma atividade antes de salvar.');return;}
  const iniV=$('#rd-ini').value, fimV=$('#rd-fim').value;
  if(!iniV||!fimV){alert('Informe o início e o término da semana.');return;}
  const semana=inputParaData(iniV)+' a '+inputParaData(fimV);
  const resp=$('#rd-resp').value.trim()||'—';
  const ocorr=$('#rd-ocorr').value.trim();

  const btn=document.querySelector('button.btn-primary');
  const textoOriginal=btn.textContent;
  btn.disabled=true;
  try{
    const rMem={n:currentN, semana, resp, mo:moRows.slice(), eq:eqRows.slice(), ativ:ativRows.slice(), ocorr, fotos:fotoRows.slice()};
    await Api.rdos.salvar(pid, rMem, (enviadas,total)=>{
      if(total) btn.textContent=`Enviando foto ${enviadas}/${total}…`;
    });
    try{
      await atualizarAvancoCronograma(pid, editing ? editing.ativ : [], ativRows);
    }catch(e){
      // o relatório em si já salvou com sucesso — um problema só em propagar o
      // avanço pro cronograma não deveria impedir o usuário de seguir em frente
      console.warn('Não foi possível atualizar o avanço do cronograma:', e.message);
    }
    alert(editing ? `Relatório nº ${currentN} atualizado com sucesso!` : `Relatório nº ${currentN} salvo e publicado!`);
    window.location.href = withRole(projetoHref(pid,'rdo'));
  }catch(e){
    alert('Não foi possível salvar o relatório: '+e.message);
    btn.disabled=false;
    btn.textContent=textoOriginal;
  }
}

async function initRdoNovoPage(){
  requireAuth();
  renderUserChip();
  PROJETO_ID=+new URLSearchParams(window.location.search).get('projeto');
  const editN=new URLSearchParams(window.location.search).get('n');
  $('#content').innerHTML = `<div class="empty">Carregando…</div>`;
  let p, etapas, nextNumero;
  try{
    [p, etapas, nextNumero] = await Promise.all([
      Api.projects.buscar(PROJETO_ID),
      Api.cronograma.listar(PROJETO_ID),
      Api.rdos.proximoNumero(PROJETO_ID),
      carregarPermissoes(PROJETO_ID),
    ]);
  }catch(e){
    window.location.href=withRole('projetos.html'); return;
  }
  const idx=projetos.findIndex(x=>x.id===PROJETO_ID);
  if(idx===-1) projetos.push(p); else projetos[idx]=p;
  cronogramas[PROJETO_ID]=etapas;

  if(!podeEditar(PROJETO_ID,'rdo')){ window.location.href=withRole('projetos.html'); return; }

  current.tab='rdo';
  buildNavProjeto();
  $('#topActions').innerHTML='';

  if(editN){
    try{ editing = await Api.rdos.buscar(PROJETO_ID, +editN); }
    catch(e){ editing = null; }
  }else{
    editing = null;
  }
  if(editN && !editing){ window.location.href=withRole(projetoHref(PROJETO_ID,'rdo')); return; }

  if(editing){
    moRows=editing.mo.map(r=>r.slice());
    eqRows=editing.eq.map(r=>r.slice());
    ativRows=editing.ativ.map(a=>({...a}));
    fotoRows=editing.fotos.map(normalizeFoto).map(f=>({...f}));
  }else{
    moRows=[]; eqRows=[]; ativRows=[]; fotoRows=[];
  }

  currentN = editing ? editing.n : nextNumero;
  $('#crumb').textContent='Projetos · '+p.nome+' · Relatórios';
  $('#pageTitle').textContent=editing?'Editar Relatório nº '+editing.n:'Novo Relatório Semanal';
  $('#content').innerHTML = renderRdoNovoForm(p, currentN, editing);
  drawRows('mo');drawRows('eq');drawAtiv();drawFotos();
}
