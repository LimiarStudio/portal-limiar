/* =================== RENDER (detalhe do projeto) =================== */
function renderVisao(p){
  // projetos "Apenas Relatórios" não têm módulo Financeiro — sem orçado/gasto
  // pra mostrar, então essa parte (KPI de Gasto + os dois gráficos) some
  const completo = p.tipo!=='relatorios';
  const finP=completo?finTotalPrevisto(p.id):0, finR=completo?finTotalRealizado(p.id):0;
  const ult=(rdos[p.id]||[])[0];
  return `
  <div class="grid-2">
    <div class="card">
      <h3>Informações do projeto</h3>
      <table style="margin-top:8px">
        <tr><td class="mut">Cliente</td><td><b>${p.cliente}</b></td></tr>
        <tr><td class="mut">Endereço</td><td>${p.endereco}</td></tr>
        <tr><td class="mut">Responsável</td><td>${p.resp}</td></tr>
        <tr><td class="mut">Início / Término</td><td>${p.inicio} → ${p.termino}</td></tr>
      </table>
    </div>
    <div class="card">
      <h3><span class="live-dot"></span>Última atualização em campo</h3>
      <p class="card-note">Feed que o cliente acompanha em tempo real</p>
      ${ult?`<a class="rdo-item" href="${withRole('rdo-ver.html?projeto='+p.id+'&n='+ult.n)}">
        <div class="rdo-num"><small>Rel.</small>${ult.n}</div>
        <div class="rdo-main"><div class="t">Semana ${ult.semana}</div>
        <div class="s">${escapeHtml(ult.ativ.map(a=>a.t).join(' · '))}</div></div>
      </a>
        <div class="photo-grid" style="margin-top:12px">${ult.fotos.slice(0,3).map(normalizeFoto).map(f=>`<div class="photo"><div class="ph">${fotoTileBody(f)}</div><div class="cap">${escapeHtml(f.cap)}</div></div>`).join('')}</div>`
        :`<div class="empty">Nenhum relatório lançado ainda.</div>`}
    </div>
  </div>
  ${completo
    ? `<div class="grid-2">${kpi('Progresso geral',p.avanco+'%','progress-mini',p.avanco)}${kpi('Gasto', fmtK(finR), null, null, `de ${fmtK(finP)} orçado`)}</div>
       <div class="grid-2">${renderDonutGastoEtapa(p.id)}${renderGastoMensal(p.id)}</div>`
    : kpi('Progresso geral',p.avanco+'%','progress-mini',p.avanco)}`;
}

/* paleta cíclica para os gráficos — cores repetem se houver mais etapas/meses do que cores */
const CHART_COLORS = ['#276272','#3194b0','#4f46e5','#16a34a','#d97706','#dc2626','#0e7490','#9333ea','#65a30d','#0369a1'];
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function renderDonutGastoEtapa(pid){
  const data = gastoPorEtapa(pid);
  if(!data.length){
    return `<div class="card"><h3>Gasto por etapa</h3><p class="card-note">Distribuição do total já gasto entre as etapas do cronograma.</p><div class="empty">Nenhum gasto lançado ainda.</div></div>`;
  }
  const total = data.reduce((a,d)=>a+d.valor,0);
  let acc=0;
  const stops = data.map((d,i)=>{
    const from=acc/total*360; acc+=d.valor; const to=acc/total*360;
    return `${CHART_COLORS[i%CHART_COLORS.length]} ${from}deg ${to}deg`;
  }).join(',');
  return `<div class="card">
    <h3>Gasto por etapa</h3>
    <p class="card-note">Distribuição do total já gasto entre as etapas do cronograma.</p>
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${stops})">
        <div class="donut-hole"><b>${fmtK(total)}</b><span>gasto total</span></div>
      </div>
      <div class="donut-legend">
        ${data.map((d,i)=>`<div class="dl-row"><span class="dot" style="background:${CHART_COLORS[i%CHART_COLORS.length]}"></span>${d.nome}<b>${fmt(d.valor)}</b><span class="mut">${Math.round(d.valor/total*100)}%</span></div>`).join('')}
      </div>
    </div>
  </div>`;
}

function renderGastoMensal(pid){
  const data = gastoPorMes(pid);
  if(!data.length){
    return `<div class="card"><h3>Gasto mensal</h3><p class="card-note">Total gasto por mês, somando todas as etapas.</p><div class="empty">Nenhum gasto lançado ainda.</div></div>`;
  }
  const max = Math.max(...data.map(d=>d.valor));
  return `<div class="card">
    <h3>Gasto mensal</h3>
    <p class="card-note">Total gasto por mês, somando todas as etapas — mostra os últimos 8 meses com lançamento.</p>
    <div class="month-chart">
      ${data.map(d=>`<div class="mc-col">
        <div class="mc-val">${fmt(d.valor)}</div>
        <div class="mc-bar-wrap"><div class="mc-bar" style="height:${Math.max(4,Math.round(d.valor/max*100))}%"></div></div>
        <div class="mc-label">${MESES_ABREV[d.mes-1]}/${String(d.ano).slice(-2)}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderRDO(p){
  const list=rdos[p.id]||[];
  if(!list.length) return `<div class="card"><div class="empty">Nenhum relatório lançado ainda.${ROLE==='gestor'?' Clique em <b>+ Novo Relatório</b>.':''}</div></div>`;
  return `<div class="card"><h3>Relatórios Semanais</h3><p class="card-note">${list.length} relatórios · o cliente visualiza cada um em tempo real</p>`+
    list.map(r=>`<a class="rdo-item" href="${withRole('rdo-ver.html?projeto='+p.id+'&n='+r.n)}">
      <div class="rdo-num"><small>Rel.</small>${r.n}</div>
      <div class="rdo-main">
        <div class="t">Semana ${r.semana}</div>
        <div class="s">${escapeHtml(r.ativ.map(a=>a.t).join(' · '))}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:var(--mut)">
        <div>${r.mo.reduce((a,b)=>a+b[1],0)} pessoas · ${r.fotos.length} fotos</div>
      </div>
    </a>`).join('')+`</div>`;
}

function renderFin(p){
  const etapas=etapasFinanceiras(p.id);
  const tp=finTotalPrevisto(p.id), tr=finTotalRealizado(p.id);
  const totais=categoriaTotals(p.id);
  const gest=ROLE==='gestor';
  return `
  <div class="grid-3">
    ${kpi('Total orçado',fmtK(tp))}
    ${kpi('Total gasto',fmtK(tr),null,null,`${tp?Math.round(tr/tp*100):0}% do orçado`)}
    ${kpi('Saldo a gastar',fmtK(tp-tr),null,null,(tr<=tp?'dentro do orçamento':'ACIMA do orçamento'))}
  </div>
  <div class="card">
    <h3>Orçado × Gasto por etapa e categoria</h3>
    <p class="card-note">As etapas vêm do cronograma (fixas). O orçado de cada etapa é a soma das suas categorias.</p>
    <div class="fin-legend"><span><span class="dot" style="background:#94a3b8"></span>Orçado</span><span><span class="dot" style="background:var(--accent)"></span>Gasto</span></div>
    ${etapas.length?etapas.map(etapa=>{
      const cs=categorias(p.id,etapa), ep=etapaPrevisto(p.id,etapa), er=etapaRealizado(p.id,etapa);
      return `<div class="fin-etapa">
        <div class="fin-etapa-head">
          <h4>${etapa}</h4>
          <div style="display:flex;align-items:center;gap:12px">
            <span class="tot"><b>${fmtK(er)}</b> de ${fmt(ep)} orçado</span>
            <span class="fin-pct ${er>ep?'over':''}">${ep?Math.round(er/ep*100):0}%</span>
          </div>
        </div>
        ${cs.length?cs.map((c,i)=>{
          const real=realizado(c), saldo=c.prev-real, estouro=real>c.prev, pct=c.prev?Math.round(real/c.prev*100):(real?100:0);
          // a barra maior (orçado ou gasto, o que for maior) é sempre a referência cheia —
          // as cores não mudam com estouro, o badge de % já avisa quando passou do orçado
          const localMax=Math.max(c.prev,real,1);
          return `<div class="fin-row" style="grid-template-columns:190px 1fr 120px ${gest?'160px':'0'}">
            <div>${c.nome}<br>
              ${(c.lanc&&c.lanc.length)?`<button class="linklike" onclick="verLanc(${p.id},'${etapa}',${i})">${c.lanc.length} lançamento(s)</button>`:`<span class="mut" style="font-size:11px">sem gastos</span>`}</div>
            <div style="display:flex;align-items:center;gap:14px">
              <span class="fin-pct ${estouro?'over':''}">${pct}%</span>
              <div class="fin-bars" style="flex:1">
                <div class="fin-bar bar-prev"><i style="width:${c.prev/localMax*100}%"></i></div>
                <div class="fin-bar bar-real"><i style="width:${real/localMax*100}%"></i></div>
              </div>
            </div>
            <div class="num" style="font-size:12px"><b>${fmtK(real)}</b><br><span class="mut">de ${fmtK(c.prev)}</span><br>
              <span class="${estouro?'down':'up'}" style="font-size:11px">${estouro?'+':''}${fmtK(Math.abs(saldo))} ${estouro?'acima':'saldo'}</span></div>
            ${gest?`<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              <button class="mini-btn" onclick="openEditOrcamento(${p.id},'${etapa}',${i})">Editar orçado</button>
              <button class="mini-btn" onclick="openGasto(${p.id},'${etapa}',${i})">+ Lançar gasto</button>
              <button class="mini-btn mini-btn-danger" onclick="removeCategoriaFin(${p.id},'${etapa}',${i})">Remover</button>
            </div>`:''}
          </div>`;
        }).join(''):`<div class="fin-row" style="grid-template-columns:1fr"><span class="mut" style="font-size:12px">Nenhuma categoria cadastrada ainda.</span></div>`}
        ${gest?`<div style="text-align:right;margin-top:8px"><button class="btn" style="font-size:12px;padding:8px 14px" onclick="openCategoria(${p.id},'${etapa}')">+ Nova categoria em ${etapa}</button></div>`:''}
      </div>`;
    }).join(''):`<div class="empty">Nenhuma etapa adicionada ao cronograma ainda.${gest?' Adicione etapas na aba <b>Cronograma</b> para lançar valores.':''}</div>`}
  </div>
  <div class="card">
    <h3>Resumo por categoria</h3>
    <p class="card-note">Soma de cada categoria em todas as etapas do projeto — quanto foi orçado e gasto no total, independente da etapa.</p>
    ${totais.length?totais.map(t=>{
      const estouro=t.real>t.prev, pct=t.prev?Math.round(t.real/t.prev*100):(t.real?100:0);
      const localMax=Math.max(t.prev,t.real,1);
      return `<div class="fin-row" style="grid-template-columns:190px 1fr 120px">
        <div>${t.nome}</div>
        <div style="display:flex;align-items:center;gap:14px">
          <span class="fin-pct ${estouro?'over':''}">${pct}%</span>
          <div class="fin-bars" style="flex:1">
            <div class="fin-bar bar-prev"><i style="width:${t.prev/localMax*100}%"></i></div>
            <div class="fin-bar bar-real"><i style="width:${t.real/localMax*100}%"></i></div>
          </div>
        </div>
        <div class="num" style="font-size:12px"><b>${fmtK(t.real)}</b><br><span class="mut">de ${fmtK(t.prev)}</span></div>
      </div>`;
    }).join(''):`<div class="mut" style="font-size:12px">Nenhum lançamento ainda.</div>`}
  </div>`;
}

function renderCrono(p){
  const t=ensureCronograma(p.id);
  const gest=ROLE==='gestor';
  // projetos "Apenas Relatórios" usam um cronograma sem datas/prazo — só
  // nome da etapa e a barra de progresso (ver openEtapaSimples/editEtapaSimples
  // em js/cronograma.js), já que esse tipo de projeto não acompanha prazos
  if(p.tipo==='relatorios'){
    return `<div class="card"><h3>Avanço de etapas</h3>
      <p class="card-note">O avanço de cada etapa é atualizado automaticamente pelos relatórios semanais vinculados.</p>
      ${t.length?t.map(x=>`<div class="r" style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--line)">
        <b style="flex:0 0 160px">${x.nome}</b>
        <div class="gbar" style="flex:1"><i style="width:${x.av}%"></i></div>
        <span class="fin-pct" style="flex:0 0 44px;text-align:right">${x.av}%</span>
        ${gest?`<div style="display:flex;gap:6px;flex:0 0 auto">
          <button class="mini-btn" onclick="editEtapaSimples(${p.id},'${x.id}')">Editar</button>
          <button class="mini-btn mini-btn-danger" onclick="removeCronogramaEtapa(${p.id},'${x.id}','${x.nome.replace(/'/g,"\\'")}')">Remover</button>
        </div>`:''}
      </div>`).join(''):`<div class="empty">Nenhuma etapa adicionada ainda.${gest?' Clique em <b>+ Nova etapa</b>.':''}</div>`}
    </div>`;
  }
  return `<div class="card"><h3>Cronograma detalhado</h3>
    <p class="card-note">O avanço de cada etapa é atualizado automaticamente pelos relatórios semanais vinculados</p>
    ${t.length?`<div class="gantt"><table>
    <thead><tr><th style="width:220px">Etapa</th><th>Início</th><th>Término</th><th style="width:90px">Avanço</th><th style="width:340px">Progresso</th>${gest?'<th style="width:90px"></th>':''}</tr></thead>
    <tbody>${t.map(x=>`<tr>
      <td><b>${x.nome}</b></td><td>${x.ini||'—'}</td><td>${x.fim||'—'}</td>
      <td><span class="fin-pct">${x.av}%</span></td>
      <td class="bar-cell"><div class="gbar"><i style="width:${x.av}%"></i></div></td>
      ${gest?`<td style="text-align:right"><div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        <button class="mini-btn" onclick="editEtapa(${p.id},'${x.id}')">Editar</button>
        <button class="mini-btn mini-btn-danger" onclick="removeCronogramaEtapa(${p.id},'${x.id}','${x.nome.replace(/'/g,"\\'")}')">Remover</button>
      </div></td>`:''}
    </tr>`).join('')}</tbody></table></div>`
    :`<div class="empty">Nenhuma etapa adicionada a este cronograma ainda.${gest?' Clique em <b>+ Nova etapa</b>.':''}</div>`}
  </div>`;
}

/* KPI helper */
function kpi(label,val,cls,pct,sub){
  let body;
  if(cls&&cls.startsWith('badge')) body=`<span class="${cls}">${val}</span>`;
  else if(cls==='progress-mini') body=`<div class="kpi-value">${val}</div><div class="progress" style="margin-top:8px"><i style="width:${pct}%"></i></div>`;
  else body=`<div class="kpi-value">${val}</div>`;
  return `<div class="kpi"><div class="kpi-label">${label}</div>${body}${sub?`<div class="kpi-sub mut">${sub}</div>`:''}</div>`;
}
