/* =================== ADMIN: EDITAR PROJETO ===================
   editar-projeto.html define o projeto via ?projeto=N na URL (não por PROJETO_ID fixo,
   já que essa página é compartilhada entre todos os projetos). Edita os campos gerais do
   projeto — os mesmos que aparecem no card de Meus Projetos e no card "Informações do
   projeto" da Visão Geral. */
let PROJETO_ID;
let novaImagem; // data URL escolhida nesta sessão de edição e ainda não salva; undefined = nenhuma alteração

async function onCapaChange(input){
  const file=(input.files||[])[0];
  input.value='';
  if(!file) return;
  try{
    novaImagem=await resizeImageFile(file);
    drawCapaPreview();
  }catch(e){
    alert('Não foi possível processar a imagem: '+e.message);
  }
}
function removerCapa(){ novaImagem=''; drawCapaPreview(); }
function drawCapaPreview(){
  const p=projetos.find(x=>x.id===PROJETO_ID);
  const img = novaImagem===undefined ? p.imagem : novaImagem;
  $('#capa-preview').innerHTML = img ? `<img src="${img}" alt="Capa do projeto">` : p.icon;
}

function renderEditarProjetoForm(p){
  return `
  <div class="card">
    <h3>Imagem de capa</h3>
    <p class="card-note">Aparece no card do projeto em Meus Projetos, logo após o login. Sem imagem enviada, mostra o ícone padrão.</p>
    <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
      <div class="proj-thumb" id="capa-preview" style="width:260px;height:180px;border-radius:10px;flex:none;overflow:hidden">${p.imagem?`<img src="${p.imagem}" alt="Capa do projeto">`:p.icon}</div>
      <div style="display:flex;gap:8px">
        <input type="file" id="capa-input" accept="image/*" style="display:none" onchange="onCapaChange(this)">
        <button class="mini-btn" onclick="$('#capa-input').click()">Escolher imagem</button>
        <button class="mini-btn mini-btn-danger" onclick="removerCapa()">Remover imagem</button>
      </div>
    </div>
  </div>
  <div class="card">
    <h3>Informações do projeto</h3>
    <p class="card-note">Esses dados aparecem em Meus Projetos e na aba Visão Geral do projeto.</p>
    <div class="form-grid">
      <div class="fg full"><label>Nome do projeto</label><input id="ep-nome" value="${escapeHtml(p.nome)}"></div>
      <div class="fg"><label>Cliente</label><input id="ep-cliente" value="${escapeHtml(p.cliente)}"></div>
      <div class="fg"><label>Responsável</label><input id="ep-resp" value="${escapeHtml(p.resp)}"></div>
      <div class="fg full"><label>Endereço</label><input id="ep-endereco" value="${escapeHtml(p.endereco)}"></div>
      <div class="fg"><label>Início</label><input id="ep-inicio" type="date" value="${dataParaInput(p.inicio)}"></div>
      <div class="fg"><label>Término</label><input id="ep-termino" type="date" value="${dataParaInput(p.termino)}"></div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:22px;padding-top:16px;border-top:1px solid var(--line)">
      <button class="btn-primary" style="width:auto" onclick="salvarEdicaoProjeto(${p.id})">Salvar alterações</button>
    </div>
  </div>
  <div class="card">
    <h3>Zona de risco</h3>
    <p class="card-note">Arquive este projeto quando ele estiver encerrado, para manter o banco de dados enxuto. Os relatórios semanais são convertidos em PDF e guardados numa pasta própria do projeto no Google Drive, e a entrada do projeto é apagada do sistema — ele deixa de aparecer em Meus Projetos e em qualquer módulo. Só o administrador pode arquivar, e a ação não pode ser desfeita por aqui.</p>
    <div style="display:flex;justify-content:flex-end;padding-top:16px;border-top:1px solid var(--line)">
      <button class="btn-danger" style="width:auto" onclick="abrirModalArquivar(${p.id})">Arquivar projeto</button>
    </div>
  </div>`;
}

function abrirModalArquivar(pid){
  const p=projetos.find(x=>x.id===pid);
  modal('Arquivar projeto',`
    <p class="card-note" style="margin-bottom:12px">Ao arquivar <b>${escapeHtml(p.nome)}</b>:</p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:13px;line-height:1.8;color:var(--txt)">
      <li>Todos os relatórios semanais deste projeto serão convertidos em PDF e salvos numa pasta própria do projeto no Google Drive.</li>
      <li>A entrada do projeto será apagada do sistema — deixa de aparecer em Meus Projetos e em qualquer módulo, para qualquer usuário.</li>
      <li>Essa ação não pode ser desfeita por aqui: os dados passam a existir só como PDFs no Drive.</li>
    </ul>
    <p class="card-note" style="margin-bottom:6px">Para confirmar, digite <b>ARQUIVAR PROJETO</b> abaixo:</p>
    <input id="arq-confirm-input" placeholder="ARQUIVAR PROJETO" autocomplete="off" oninput="onArquivarInputChange()">
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-danger" id="arq-confirm-btn" style="width:auto" disabled onclick="confirmarArquivar(${pid})">Arquivar projeto</button>`);
  $('#arq-confirm-input').focus();
}
function onArquivarInputChange(){
  $('#arq-confirm-btn').disabled = $('#arq-confirm-input').value !== 'ARQUIVAR PROJETO';
}
async function confirmarArquivar(pid){
  const btn=$('#arq-confirm-btn');
  btn.disabled=true;
  const textoOriginal=btn.textContent;
  btn.textContent='Gerando PDFs...';
  try{
    await Api.archive.arquivarProjeto(pid, 'ARQUIVAR PROJETO', (etapa,feito,total)=>{
      if(etapa==='pdf') btn.textContent = `Gerando PDF ${feito}/${total}...`;
      else if(etapa==='movendo') btn.textContent = 'Organizando arquivos...';
      else btn.textContent = 'Removendo dados...';
    });
    closeModal();
    alert('Projeto arquivado. Os relatórios foram convertidos em PDF e salvos no Google Drive, e a entrada foi removida do sistema.');
    window.location.href=withRole('projetos.html');
  }catch(e){
    alert('Não foi possível arquivar o projeto: '+e.message+' Nada foi apagado ainda se a falha aconteceu gerando os PDFs — pode tentar de novo.');
    btn.disabled=false;
    btn.textContent=textoOriginal;
  }
}

async function salvarEdicaoProjeto(pid){
  const nome=$('#ep-nome').value.trim(), cliente=$('#ep-cliente').value.trim();
  const resp=$('#ep-resp').value.trim(), endereco=$('#ep-endereco').value.trim();
  const iniV=$('#ep-inicio').value, fimV=$('#ep-termino').value;
  if(!nome||!cliente||!resp||!endereco){alert('Preencha nome, cliente, responsável e endereço.');return;}
  if(!iniV||!fimV){alert('Informe as datas de início e término.');return;}
  if(fimV<iniV){alert('A data de término não pode ser antes da data de início.');return;}
  const btn=document.querySelector('button.btn-primary');
  const textoOriginal=btn.textContent;
  btn.disabled=true; btn.textContent='Salvando...';
  try{
    const patch={nome, cliente, resp, endereco, inicio:inputParaData(iniV), termino:inputParaData(fimV)};
    if(novaImagem!==undefined){
      // string vazia = capa removida explicitamente; qualquer outra string = nova capa pra enviar
      patch.imagem = novaImagem==='' ? null : (await Api.images.saveCapa(pid, novaImagem)).url;
    }
    const atualizado=await Api.projects.atualizar(pid, patch);
    const idx=projetos.findIndex(x=>x.id===pid);
    if(idx!==-1) projetos[idx]=atualizado;
    alert('Projeto atualizado com sucesso!');
    window.location.href=withRole(projetoHref(pid));
  }catch(e){
    alert('Não foi possível salvar as alterações: '+e.message);
    btn.disabled=false;
    btn.textContent=textoOriginal;
  }
}

async function initEditarProjetoPage(){
  await requireAuth();
  renderUserChip();
  if(ROLE!=='gestor'){ window.location.href=withRole('projetos.html'); return; }
  PROJETO_ID=+new URLSearchParams(window.location.search).get('projeto');
  $('#content').innerHTML = `<div class="empty">Carregando…</div>`;
  let p;
  try{ p=await Api.projects.buscar(PROJETO_ID); }
  catch(e){ window.location.href=withRole('projetos.html'); return; }
  const idx=projetos.findIndex(x=>x.id===PROJETO_ID);
  if(idx===-1) projetos.push(p); else projetos[idx]=p;
  novaImagem=undefined;
  $('#nav').innerHTML = projectModulosNavHtml(p) + adminNavHtml(p.id,'editar');
  $('#crumb').textContent='Projetos · '+p.nome;
  $('#pageTitle').textContent='Editar projeto — '+p.nome;
  $('#topActions').innerHTML='';
  $('#content').innerHTML=renderEditarProjetoForm(p);
}
