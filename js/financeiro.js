/* =================== FINANCEIRO: CATEGORIAS & GASTOS =================== */
// categorias padrão de uma etapa que ainda não foram cadastradas neste projeto
function categoriaOptionsFor(pid,etapa){
  const atuais=categorias(pid,etapa).map(c=>c.nome);
  return categoriasPadrao(pid).filter(c=>c.etapas.includes(etapa) && !atuais.includes(c.nome)).map(c=>c.nome);
}
function updateCategoriaOptions(pid){
  const etapa=$('#cat-etapa').value, opts=categoriaOptionsFor(pid,etapa);
  $('#cat-nome').innerHTML = opts.length
    ? opts.map(n=>`<option>${n}</option>`).join('')
    : `<option value="">Nenhuma categoria padrão disponível para esta etapa</option>`;
  $('#cat-nome').disabled = !opts.length;
}
async function openCategoria(pid, etapaPreset){
  await garantirCatalogCache(pid);
  const etapas=etapasFinanceiras(pid);
  if(!etapas.length){
    modal('Nova categoria',`<div class="empty">Este projeto ainda não tem nenhuma etapa no cronograma. Adicione uma etapa primeiro.</div>`,
      `<button class="btn" onclick="closeModal()">Fechar</button>`);
    return;
  }
  modal('Nova categoria',`
    <div class="form-grid">
      <div class="fg"><label>Etapa</label>
        <select id="cat-etapa" onchange="updateCategoriaOptions(${pid})">${etapas.map(e=>`<option ${e===etapaPreset?'selected':''}>${e}</option>`).join('')}</select></div>
      <div class="fg"><label>Valor orçado (R$)</label><input id="cat-val" type="number" min="1" step="100" placeholder="0,00"></div>
      <div class="fg full"><label>Categoria</label><select id="cat-nome"></select></div>
    </div>
    <p class="card-note" style="margin-top:14px">As categorias são padronizadas por etapa — se a etapa que você precisa ainda não existe, cadastre-a primeiro no cronograma.</p>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="saveCategoria(${pid})">Salvar categoria</button>`);
  updateCategoriaOptions(pid);
}
async function saveCategoria(pid){
  const etapa=$('#cat-etapa').value, val=+$('#cat-val').value, nome=$('#cat-nome').value;
  if(!nome){alert('Não há categorias padrão disponíveis para esta etapa.');return;}
  if(!(val>0)){alert('Informe um valor orçado maior que zero.');return;}
  const btn=document.querySelector('#modalRoot .btn-primary');
  btn.disabled=true;
  try{
    await Api.financeiro.adicionarCategoria(pid, etapa, {nome, prev:val});
    financeiro[pid][etapa]=await Api.financeiro.porEtapa(pid, etapa);
    closeModal();renderProjetoTabs();
  }catch(e){
    alert('Não foi possível salvar a categoria: '+e.message);
    btn.disabled=false;
  }
}
function openEditOrcamento(pid,etapa,i){
  const it=financeiro[pid][etapa][i];
  modal('Editar orçamento — '+etapa+' · '+it.nome,`
    <div class="fg full"><label>Valor orçado (R$)</label><input id="orc-val" type="number" min="0" step="100" value="${it.prev}"></div>
    <p class="card-note" style="margin-top:14px">Altera só o valor previsto desta categoria — os lançamentos de gasto já feitos não são afetados.</p>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="saveEditOrcamento(${pid},'${etapa}',${i})">Salvar orçamento</button>`);
}
async function saveEditOrcamento(pid,etapa,i){
  const val=+$('#orc-val').value;
  if(!(val>=0)){alert('Informe um valor orçado válido.');return;}
  const nome=financeiro[pid][etapa][i].nome;
  const btn=document.querySelector('#modalRoot .btn-primary');
  btn.disabled=true;
  try{
    await Api.financeiro.atualizarOrcamento(pid, etapa, nome, val);
    financeiro[pid][etapa]=await Api.financeiro.porEtapa(pid, etapa);
    closeModal();renderProjetoTabs();
  }catch(e){
    alert('Não foi possível salvar o orçamento: '+e.message);
    btn.disabled=false;
  }
}
async function removeCategoriaFin(pid,etapa,i){
  const it=financeiro[pid][etapa][i];
  const aviso=it.lanc&&it.lanc.length?` Os ${it.lanc.length} lançamento(s) registrados nela também serão apagados.`:'';
  if(!confirm(`Remover a categoria "${it.nome}" de ${etapa}?${aviso} Essa ação não pode ser desfeita.`)) return;
  try{
    await Api.financeiro.removerCategoria(pid, etapa, it.nome);
    financeiro[pid][etapa]=await Api.financeiro.porEtapa(pid, etapa);
    renderProjetoTabs();
  }catch(e){
    alert('Não foi possível remover a categoria: '+e.message);
  }
}
function openGasto(pid,etapa,i){
  const it=financeiro[pid][etapa][i], real=realizado(it), saldo=it.prev-real;
  modal('Lançar gasto — '+etapa+' · '+it.nome,`
    <div class="grid-3" style="margin-bottom:16px">
      ${kpi('Orçado',fmtK(it.prev))}
      ${kpi('Já gasto',fmtK(real))}
      ${kpi('Saldo',fmtK(saldo),null,null,saldo<0?'estourado':'disponível')}
    </div>
    <div class="form-grid three">
      <div class="fg"><label>Data da compra</label><input id="g-data" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="fg"><label>Valor (R$)</label><input id="g-val" type="number" min="1" step="100" placeholder="0,00"></div>
      <div class="fg"><label>&nbsp;</label><div class="mut" style="font-size:12px;padding-top:9px">Somado ao gasto</div></div>
      <div class="fg full"><label>Descrição do gasto</label><input id="g-desc" placeholder="Ex.: Concreto usinado - NF 1234"></div>
    </div>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="saveGasto(${pid},'${etapa}',${i})">Lançar gasto</button>`);
}
async function saveGasto(pid,etapa,i){
  const val=+$('#g-val').value;
  if(!(val>0)){alert('Informe um valor gasto maior que zero.');return;}
  const nome=financeiro[pid][etapa][i].nome;
  const d=inputParaData($('#g-data').value);
  const desc=$('#g-desc').value.trim()||'—';
  const btn=document.querySelector('#modalRoot .btn-primary');
  btn.disabled=true;
  try{
    await Api.financeiro.lancarGasto(pid, etapa, nome, {data:d, desc, valor:val});
    financeiro[pid][etapa]=await Api.financeiro.porEtapa(pid, etapa);
    closeModal();renderProjetoTabs();
  }catch(e){
    alert('Não foi possível lançar o gasto: '+e.message);
    btn.disabled=false;
  }
}
function verLanc(pid,etapa,i){
  const it=financeiro[pid][etapa][i];
  const gest=ROLE==='gestor';
  modal('Lançamentos — '+etapa+' · '+it.nome,`
    <table><thead><tr><th>Data</th><th>Descrição</th><th class="num">Valor</th>${gest?'<th></th>':''}</tr></thead>
    <tbody>${it.lanc.length?it.lanc.map((l,li)=>`<tr><td>${l.data}</td><td>${l.desc}</td><td class="num">${fmt(l.valor)}</td>
      ${gest?`<td style="text-align:right"><button class="mini-btn mini-btn-danger" onclick="removeLancamento(${pid},'${etapa}',${i},${li})">Remover</button></td>`:''}</tr>`).join('')
      :`<tr><td colspan="${gest?4:3}" class="mut" style="text-align:center;padding:16px 0">Nenhum lançamento ainda.</td></tr>`}</tbody>
    <tfoot><tr><td colspan="2"><b>Total realizado</b></td><td class="num"><b>${fmt(realizado(it))}</b></td>${gest?'<td></td>':''}</tr></tfoot></table>
  `,`<button class="btn" onclick="closeModal()">Fechar</button>`);
}
async function removeLancamento(pid,etapa,i,li){
  const l=financeiro[pid][etapa][i].lanc[li];
  const nome=financeiro[pid][etapa][i].nome;
  if(!confirm(`Remover o lançamento "${l.desc}" (${fmt(l.valor)})? Essa ação não pode ser desfeita.`)) return;
  try{
    await Api.financeiro.removerLancamento(pid, etapa, nome, li);
    financeiro[pid][etapa]=await Api.financeiro.porEtapa(pid, etapa);
    renderProjetoTabs();
    verLanc(pid,etapa,i);
  }catch(e){
    alert('Não foi possível remover o lançamento: '+e.message);
  }
}
