/* =================== ADMIN: NOVO PROJETO ===================
   novo-projeto.html não tem projeto associado ainda — o formulário é o mesmo de
   Editar Projeto (capa + informações gerais), acrescido do tipo de projeto, que só
   pode ser escolhido na criação (ver modulosDoProjeto() em helpers.js). */
let novaImagem; // data URL escolhida; undefined = nenhuma imagem enviada ainda
let tipoSelecionado = 'completo';

function onCapaChange(input){
  const file=(input.files||[])[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{ novaImagem=e.target.result; drawCapaPreview(); };
  reader.readAsDataURL(file);
  input.value='';
}
function removerCapa(){ novaImagem=undefined; drawCapaPreview(); }
function drawCapaPreview(){
  $('#capa-preview').innerHTML = novaImagem ? `<img src="${novaImagem}" alt="Capa do projeto">` : '🏗️';
}
function selecionarTipo(t){
  tipoSelecionado=t;
  document.querySelectorAll('.tipo-card').forEach(el=>el.classList.toggle('selected', el.dataset.tipo===t));
}

function renderNovoProjetoForm(){
  return `
  <div class="card">
    <h3>Tipo de projeto</h3>
    <p class="card-note">Define quais módulos o projeto vai ter. Não dá pra mudar depois de criado.</p>
    <div class="tipo-grid">
      <label class="tipo-card selected" data-tipo="completo" onclick="selecionarTipo('completo')">
        <input type="radio" name="np-tipo" checked>
        <b>Projeto completo</b>
        <span>Todos os módulos: Visão Geral, Relatórios Semanais, Financeiro e Cronograma.</span>
      </label>
      <label class="tipo-card" data-tipo="relatorios" onclick="selecionarTipo('relatorios')">
        <input type="radio" name="np-tipo">
        <b>Apenas Relatórios</b>
        <span>Só o módulo de Relatórios Semanais — acompanhamento simples, sem financeiro ou cronograma.</span>
      </label>
    </div>
  </div>
  <div class="card">
    <h3>Imagem de capa</h3>
    <p class="card-note">Aparece no card do projeto em Meus Projetos, logo após o login. Sem imagem enviada, mostra um ícone padrão.</p>
    <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
      <div class="proj-thumb" id="capa-preview" style="width:180px;height:120px;border-radius:10px;flex:none;overflow:hidden">🏗️</div>
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
      <div class="fg full"><label>Nome do projeto</label><input id="np-nome" placeholder="Ex.: Residência Alphaville"></div>
      <div class="fg"><label>Cliente</label><input id="np-cliente" placeholder="Nome do cliente"></div>
      <div class="fg"><label>Responsável</label><input id="np-resp" placeholder="Ex.: Joyce Santos"></div>
      <div class="fg full"><label>Endereço</label><input id="np-endereco" placeholder="Endereço da obra"></div>
      <div class="fg"><label>Início</label><input id="np-inicio" type="date"></div>
      <div class="fg"><label>Término</label><input id="np-termino" type="date"></div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:22px;padding-top:16px;border-top:1px solid var(--line)">
      <a class="btn" href="${withRole('projetos.html')}" style="text-decoration:none;display:inline-flex;align-items:center;margin-right:10px">Cancelar</a>
      <button class="btn-primary" style="width:auto" onclick="salvarNovoProjeto()">Criar projeto</button>
    </div>
  </div>`;
}

function salvarNovoProjeto(){
  const nome=$('#np-nome').value.trim(), cliente=$('#np-cliente').value.trim();
  const resp=$('#np-resp').value.trim(), endereco=$('#np-endereco').value.trim();
  const iniV=$('#np-inicio').value, fimV=$('#np-termino').value;
  if(!nome||!cliente||!resp||!endereco){alert('Preencha nome, cliente, responsável e endereço.');return;}
  if(!iniV||!fimV){alert('Informe as datas de início e término.');return;}
  if(fimV<iniV){alert('A data de término não pode ser antes da data de início.');return;}
  const nextId=Math.max(0,...projetos.map(x=>x.id))+1;
  const novo={
    id:nextId, nome, cliente, resp, endereco,
    inicio:inputParaData(iniV), termino:inputParaData(fimV),
    avanco:0, icon: novaImagem?'':'🏗️', imagem: novaImagem||'', tipo:tipoSelecionado,
  };
  try{
    const extras=JSON.parse(localStorage.getItem('obraview_extra_projetos')||'[]');
    extras.push(novo);
    localStorage.setItem('obraview_extra_projetos', JSON.stringify(extras));
  }catch(e){}
  alert('Projeto criado com sucesso!');
  window.location.href=withRole(projetoHref(nextId));
}

function initNovoProjetoPage(){
  requireAuth();
  renderUserChip();
  if(ROLE!=='gestor'){ window.location.href=withRole('projetos.html'); return; }
  novaImagem=undefined;
  tipoSelecionado='completo';
  $('#nav').innerHTML = `<div class="nav-group">Geral</div>
    <a class="nav-item" href="${withRole('projetos.html')}">${ic('back')} Voltar aos projetos</a>`;
  $('#crumb').textContent='Início';
  $('#pageTitle').textContent='Novo Projeto';
  $('#topActions').innerHTML='';
  $('#content').innerHTML=renderNovoProjetoForm();
}
