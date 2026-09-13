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
      <div class="fg"><label>Valor orçado (R$)</label><input id="cat-val" type="number" min="0" step="100" placeholder="0,00"></div>
      <div class="fg full"><label>Categoria</label><select id="cat-nome"></select></div>
    </div>
    <p class="card-note" style="margin-top:14px">As categorias são padronizadas por etapa — se a etapa que você precisa ainda não existe, cadastre-a primeiro no cronograma. Orçado 0 registra os gastos normalmente, mas eles não contam no saldo do projeto.</p>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="saveCategoria(${pid})">Salvar categoria</button>`);
  updateCategoriaOptions(pid);
}
async function saveCategoria(pid){
  const etapa=$('#cat-etapa').value, val=+$('#cat-val').value, nome=$('#cat-nome').value;
  if(!nome){alert('Não há categorias padrão disponíveis para esta etapa.');return;}
  if(!(val>=0)){alert('Informe um valor orçado válido.');return;}
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
// data URL escolhida no modal "Lançar gasto" (comprovante), ainda não salva —
// mesmo padrão de novaImagem em editar-projeto-page.js
let gastoFotoDataUrl;
function openGasto(pid,etapa,i){
  const it=financeiro[pid][etapa][i], real=realizado(it), saldo=it.prev-real;
  gastoFotoDataUrl=undefined;
  modal('Lançar gasto — '+etapa+' · '+it.nome,`
    <div class="grid-3" style="margin-bottom:16px">
      ${kpi('Orçado',fmt(it.prev))}
      ${kpi('Já gasto',fmt(real))}
      ${kpi('Saldo',fmt(saldo),null,null,saldo<0?'estourado':'disponível')}
    </div>
    <div class="form-grid three">
      <div class="fg"><label>Data da compra</label><input id="g-data" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="fg"><label>Valor (R$)</label><input id="g-val" type="number" min="1" step="100" placeholder="0,00"></div>
      <div class="fg"><label>&nbsp;</label><div class="mut" style="font-size:12px;padding-top:9px">Somado ao gasto</div></div>
      <div class="fg full"><label>Descrição do gasto</label><input id="g-desc" placeholder="Ex.: Concreto usinado - NF 1234"></div>
    </div>
    <div class="fg full" style="margin-top:12px">
      <label>Comprovante (opcional)</label>
      <input type="file" id="g-foto-input" accept="image/*" style="display:none" onchange="onGastoFotoChange(this)">
      <div id="g-foto-preview"></div>
      <button type="button" class="mini-btn" style="margin-top:8px" onclick="$('#g-foto-input').click()">Escolher imagem</button>
    </div>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="saveGasto(${pid},'${etapa}',${i})">Lançar gasto</button>`);
}
async function onGastoFotoChange(input){
  const file=(input.files||[])[0];
  input.value='';
  if(!file) return;
  try{
    gastoFotoDataUrl=await resizeImageFile(file);
    drawGastoFotoPreview();
  }catch(e){
    alert('Não foi possível processar a imagem: '+e.message);
  }
}
function drawGastoFotoPreview(){
  $('#g-foto-preview').innerHTML = gastoFotoDataUrl
    ? `<div class="photo" style="width:130px;margin-top:8px"><button type="button" class="del" onclick="removerGastoFoto()">×</button><div class="ph" style="height:90px"><img src="${gastoFotoDataUrl}"></div></div>`
    : '';
}
function removerGastoFoto(){ gastoFotoDataUrl=undefined; drawGastoFotoPreview(); }
async function saveGasto(pid,etapa,i){
  const val=+$('#g-val').value;
  if(!(val>0)){alert('Informe um valor gasto maior que zero.');return;}
  const nome=financeiro[pid][etapa][i].nome;
  const d=inputParaData($('#g-data').value);
  const desc=$('#g-desc').value.trim()||'—';
  const btn=document.querySelector('#modalRoot .btn-primary');
  btn.disabled=true;
  try{
    const l={data:d, desc, valor:val};
    if(gastoFotoDataUrl) l.fotoDataUrl=gastoFotoDataUrl;
    await Api.financeiro.lancarGasto(pid, etapa, nome, l);
    financeiro[pid][etapa]=await Api.financeiro.porEtapa(pid, etapa);
    closeModal();renderProjetoTabs();
  }catch(e){
    alert('Não foi possível lançar o gasto: '+e.message);
    btn.disabled=false;
  }
}
// "DD/MM/AAAA" -> AAAAMMDD, só pra ordenar — mesma quebra por "/" que
// gastoPorMes já usa em data.js
const chaveData = dataBr => { const [d,m,a]=dataBr.split('/').map(Number); return a*10000+m*100+d; };

// preenchido por verLanc, lido por abrirLancFotoLightbox(pos) — evita ter que
// escapar legenda/src dentro de um atributo onclick (mesmo motivo de
// FOTOS_RDO_ATUAL em rdo-ver-page.js)
let LANC_ATUAL = [];
function verLanc(pid,etapa,i){
  const it=financeiro[pid][etapa][i];
  const podeExclFin=podeExcluir(pid,'financeiro');
  // mais recente primeiro (por mês/ano da data da compra), não mais por
  // ordem de lançamento — "li" (índice original no array) segue sendo o que
  // remover/removeLancamento espera, então guarda os dois lado a lado
  const ordenados=it.lanc.map((l,li)=>({l,li})).sort((a,b)=>chaveData(b.l.data)-chaveData(a.l.data));
  LANC_ATUAL=ordenados.map(o=>o.l);
  modal('Lançamentos — '+etapa+' · '+it.nome,`
    <table><thead><tr><th>Data</th><th>Descrição</th><th class="num">Valor</th><th></th>${podeExclFin?'<th></th>':''}</tr></thead>
    <tbody>${ordenados.length?ordenados.map(({l,li},pos)=>`<tr><td>${l.data}</td><td>${l.desc}</td><td class="num">${fmt(l.valor)}</td>
      <td>${l.foto?`<div class="photo" style="width:36px;height:36px;border-radius:6px"><div class="ph" style="height:36px;cursor:zoom-in" onclick="abrirLancFotoLightbox(${pos})">${fotoTileBody(l.foto)}</div></div>`:''}</td>
      ${podeExclFin?`<td style="text-align:right"><button class="mini-btn mini-btn-danger" onclick="removeLancamento(${pid},'${etapa}',${i},${li})">Remover</button></td>`:''}</tr>`).join('')
      :`<tr><td colspan="${podeExclFin?5:4}" class="mut" style="text-align:center;padding:16px 0">Nenhum lançamento ainda.</td></tr>`}</tbody>
    <tfoot><tr><td colspan="2"><b>Total realizado</b></td><td class="num"><b>${fmt(realizado(it))}</b></td><td></td>${podeExclFin?'<td></td>':''}</tr></tfoot></table>
  `,`<button class="btn" onclick="closeModal()">Fechar</button>`);
}
function abrirLancFotoLightbox(pos){
  const l=LANC_ATUAL[pos];
  if(!l || !l.foto) return;
  abrirLightbox(l.foto.src, l.desc);
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
