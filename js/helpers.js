/* =================== HELPERS =================== */
const $ = s=>document.querySelector(s);
const fmt = v=>"R$ "+v.toLocaleString('pt-BR');
const fmtK = v=>"R$ "+(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:0})+"k";
// escapa texto livre digitado pelo usuário antes de inserir no HTML (descrições de
// atividades, ocorrências etc. podem conter <, &, aspas...)
const escapeHtml = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// fotos de relatórios podem estar no formato antigo dos exemplos (array [legenda, emoji])
// ou no formato novo, com imagem real anexada de verdade ({cap, src}) — normaliza os dois
const normalizeFoto = f => Array.isArray(f) ? {cap:f[0], emoji:f[1]} : f;
const fotoTileBody = f => f.src ? `<img src="${f.src}" alt="${escapeHtml(f.cap||'')}">` : (f.emoji||'📷');

// redimensiona uma foto no navegador antes de anexar — uma foto de celular
// sem redimensionar (frequentemente 3-8MB) deixava o envio lento e às vezes
// estourava o tempo do Apps Script; nada aqui (grade de miniatura, lightbox
// em tela cheia, capa de projeto) precisa da resolução original de qualquer
// forma. Reduz pro lado maior caber em maxDim e reexporta como JPEG.
function resizeImageFile(file, maxDim=1920, quality=0.8){
  return new Promise((resolve, reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));
    reader.onload=e=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('Não foi possível processar a imagem.'));
      img.onload=()=>{
        let w=img.width, h=img.height;
        if(w>maxDim||h>maxDim){
          if(w>h){ h=Math.round(h*maxDim/w); w=maxDim; }
          else{ w=Math.round(w*maxDim/h); h=maxDim; }
        }
        const canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// suporte bem limitado e seguro pro texto de atividades/ocorrências dos
// relatórios: só "**negrito**" e uma linha começando com "- " (item de
// lista) — nada de HTML arbitrário, tudo passa por escapeHtml antes das
// poucas transformações. O PDF (backend/src/Repo/Rdos.js#appendRichText_)
// entende exatamente a mesma sintaxe, pra web e PDF baterem.
function renderRichText(raw){
  if(!raw) return '';
  const linhas = String(raw).split('\n');
  let html = '', dentroLista = false;
  linhas.forEach(linha=>{
    const isItem = /^\s*-\s+/.test(linha);
    if(isItem && !dentroLista){ html += '<ul>'; dentroLista = true; }
    if(!isItem && dentroLista){ html += '</ul>'; dentroLista = false; }
    const texto = escapeHtml(isItem ? linha.replace(/^\s*-\s+/,'') : linha)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html += isItem ? `<li>${texto}</li>` : `<p>${texto||'&nbsp;'}</p>`;
  });
  if(dentroLista) html += '</ul>';
  return html;
}
let current = {tab:'visao'};

// conversões de data usadas em qualquer <input type="date"> do site (cronograma,
// relatórios, edição de projeto)
const dataParaInput = s => { const [d,m,a] = s.split('/'); return `${a}-${m}-${d}`; }; // "DD/MM/AAAA" -> "AAAA-MM-DD"
const inputParaData = s => { const [a,m,d] = s.split('-'); return `${d}/${m}/${a}`; }; // "AAAA-MM-DD" -> "DD/MM/AAAA"

// URL da página de detalhe de um projeto — uma página só (projeto.html?projeto=N)
// compartilhada por todos os projetos, inclusive os criados em tempo real pelo usuário
// (que não têm — e não podem ter — um arquivo .html próprio nesse protótipo estático)
const projetoHref = (pid, tab) => 'projeto.html?projeto='+pid+(tab?'&tab='+tab:'');

// catálogo completo de módulos do projeto; "Apenas Relatórios" (ver novo-projeto.html)
// habilita Relatórios Semanais + Visão Geral + um Cronograma simplificado (só
// nome da etapa e progresso, sem datas — ver renderCrono/openEtapaSimples em
// js/cronograma.js) — só o Financeiro fica de fora, já que não há orçamento
// a acompanhar nesse tipo de projeto
const MODULOS_PROJETO = [['visao','Visão Geral','gauge'],['rdo','Relatórios Semanais','clipboard'],
  ['financeiro','Financeiro','wallet'],['cronograma','Cronograma','calendar']];
const modulosDoProjeto = p => p.tipo==='relatorios' ? MODULOS_PROJETO.filter(([k])=>k==='rdo'||k==='visao'||k==='cronograma') : MODULOS_PROJETO;

// permissões por usuário, por projeto — vêm do backend (Api.permissions.doUsuario),
// buscadas uma vez por carregamento de página (carregarPermissoes, chamada no
// init de cada página de projeto) e guardadas em permissionsCache; o administrador
// nunca precisa disso (sempre acesso completo, por um caminho totalmente separado
// em modulosVisiveis/clientePodeGerenciarUsuarios). "view" é pré-requisito de
// "write"/"delete" — o backend já garante isso na hora de salvar (permissions.definir),
// então mesmo se a interface deixasse passar algo incoerente o servidor corrige.
// "gerenciarUsuarios" é uma permissão à parte dos módulos: dá acesso à própria página
// de Usuários e Permissões (nunca a Configurações/Editar projeto, e nunca afeta o
// administrador — esse sempre tem acesso completo e não pode ser removido nem editado
// por ninguém).
// catálogo de etapas/categorias por projeto — vem do backend (Api.catalog), buscado sob
// demanda (garantirCatalogCache) na primeira vez que uma tela realmente precisa dele
// (abrir "+ Nova etapa"/"+ Nova categoria" ou a página de Configurações), não em todo
// carregamento de página — a maioria das visitas a um projeto nunca chega a abrir esses
// modais, então não vale a pena gastar uma chamada a mais em toda visita
const catalogCache = {};
async function recarregarCatalogo(pid){
  const [etapas, categorias] = await Promise.all([
    Api.catalog.etapasDoProjeto(pid),
    Api.catalog.categoriasDoProjeto(pid),
  ]);
  catalogCache[pid] = {etapas, categorias};
}
async function garantirCatalogCache(pid){
  if(catalogCache[pid]) return;
  await recarregarCatalogo(pid);
}

// recalcula p.avanco (Progresso Geral) a partir do cronograma atual e persiste
// no backend — chamada depois de qualquer mutação no cronograma (adicionar/
// editar/remover etapa, ou uma atividade de relatório lançando avanço numa
// etapa, ver rdo-novo-page.js) pra a listagem de projetos (que só busca
// projects.listar(), nunca o cronograma de cada um) continuar mostrando o
// número certo sem precisar mudar como aquela tela busca dados
async function recalcularAvancoProjeto(pid){
  const novo = progressoGeral(pid);
  const p = projetos.find(x=>x.id===pid);
  if(p && p.avanco===novo) return;
  await Api.projects.atualizar(pid, {avanco:novo});
  if(p) p.avanco = novo;
}

const PERMISSOES_PADRAO = () => ({view:false, write:false, delete:false});
const permissionsCache = {};
async function carregarPermissoes(pid){
  if(ROLE==='gestor' || !CURRENT_USER) return;
  try{ permissionsCache[pid] = await Api.permissions.doUsuario(pid, CURRENT_USER.id); }
  catch(e){ permissionsCache[pid] = null; }
}
const permissoesUsuario = (pid, modulos) => {
  const base={gerenciarUsuarios:false};
  modulos.forEach(([k])=>base[k]=PERMISSOES_PADRAO());
  const salvas = permissionsCache[pid];
  if(salvas){
    modulos.forEach(([k])=>{ if(salvas[k]) base[k]=salvas[k]; });
    if(salvas.gerenciarUsuarios!==undefined) base.gerenciarUsuarios=salvas.gerenciarUsuarios;
  }
  return base;
};
// true quando a sessão atual é o usuário de demonstração (ROLE==='cliente') e ele foi
// autorizado a gerenciar usuários e permissões deste projeto — o administrador
// (ROLE==='gestor') já tem acesso a tudo por um caminho totalmente separado
const clientePodeGerenciarUsuarios = pid => {
  const p=projetos.find(x=>x.id===pid);
  return !!p && ROLE==='cliente' && permissoesUsuario(pid, modulosDoProjeto(p)).gerenciarUsuarios;
};
// módulos que a sessão atual pode efetivamente ver: o administrador sempre vê todos os
// módulos do projeto; usuários comuns só veem os que tiverem "view" autorizado
const modulosVisiveis = p => {
  const todos = modulosDoProjeto(p);
  if(ROLE==='gestor') return todos;
  const perm = permissoesUsuario(p.id, todos);
  return todos.filter(([k])=>perm[k].view);
};
// se a sessão atual pode criar/editar (podeEditar) ou excluir (podeExcluir) algo de um
// módulo — administrador sempre pode; usuário comum, só se tiver write/delete autorizado
// pra esse módulo naquele projeto (o backend garante "view" como pré-requisito ao salvar,
// mas a interface já nem oferece o write/delete sem view, pra não confundir)
const podeEditar = (pid, modulo) => ROLE==='gestor' || permissoesUsuario(pid, MODULOS_PROJETO)[modulo].write;
const podeExcluir = (pid, modulo) => ROLE==='gestor' || permissoesUsuario(pid, MODULOS_PROJETO)[modulo].delete;

// bloco "Módulos" do menu lateral, reaproveitado em toda página secundária de um
// projeto (Configurações, Editar projeto, Usuários e Permissões...) — só lista os
// módulos que a sessão atual pode ver
const projectModulosNavHtml = p => {
  return `<div class="nav-group">Projeto</div>
    <a class="nav-item" href="${withRole(projetoHref(p.id))}">${ic('back')} Voltar para ${p.nome}</a>
    <div class="nav-group">Módulos</div>`+
    modulosVisiveis(p).map(([k,l,i])=>`<a class="nav-item" href="${withRole(projetoHref(p.id,k))}">${ic(i)} ${l}</a>`).join('');
};
// bloco "Admin" do menu lateral (dentro de um projeto) — as 3 páginas de admin do
// projeto, com a atual destacada. apenasUsuarios=true restringe a Usuários e
// Permissões — é o que um usuário autorizado a gerenciar usuários (mas que não é o
// administrador) enxerga; Configurações e Editar projeto continuam fora do alcance dele
const adminNavHtml = (pid, active, apenasUsuarios) => {
  let items=[['config','Configurações','settings','configuracoes.html'],
    ['editar','Editar projeto','edit','editar-projeto.html'],
    ['usuarios','Usuários e Permissões','users','usuarios.html']];
  if(apenasUsuarios) items=items.filter(([k])=>k==='usuarios');
  return `<div class="nav-group">Admin</div>`+
    items.map(([k,l,i,href])=>`<a class="nav-item ${active===k?'active':''}" href="${withRole(href+'?projeto='+pid)}">${ic(i)} ${l}</a>`).join('');
};
// menu lateral completo da "página inicial" (Meus Projetos + Admin de sistema) —
// compartilhado pelas páginas que o usam, pra sempre navegarem entre si corretamente
const buildNavProjetos = active => {
  $('#nav').innerHTML = `<div class="nav-group">Geral</div>
    <a class="nav-item ${active==='projetos'?'active':''}" href="${withRole('projetos.html')}">${ic('home')} Meus Projetos</a>`+
    (ROLE==='gestor'?`<div class="nav-group">Admin</div>
    <a class="nav-item ${active==='usuarios'?'active':''}" href="${withRole('admin-usuarios.html')}">${ic('users')} Usuários</a>`:'');
};

/* =================== MENU LATERAL NO CELULAR =================== */
// abaixo de 900px o menu vira um painel deslizante fora da tela (ver CSS),
// aberto por um botão hambúrguer — injetado aqui via JS, uma vez só, em vez
// de repetir esse HTML em cada uma das páginas que usam o app shell
(function initMobileNav(){
  const topbar = document.querySelector('.topbar');
  const sidebar = document.querySelector('.sidebar');
  if(!topbar || !sidebar) return; // login.html não usa o app shell

  const hamb = document.createElement('button');
  hamb.className = 'hamburger';
  hamb.setAttribute('aria-label', 'Abrir menu');
  hamb.innerHTML = '☰';
  hamb.onclick = toggleSidebar;
  topbar.insertBefore(hamb, topbar.firstChild);

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.onclick = closeSidebar;
  sidebar.insertAdjacentElement('afterend', backdrop);

  // fecha o menu ao clicar num item — necessário pras abas trocadas via
  // setTab() (não recarregam a página, então o menu ficaria aberto por cima)
  document.querySelector('.nav').addEventListener('click', e=>{
    if(e.target.closest('.nav-item')) closeSidebar();
  });
})();
function toggleSidebar(){
  document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.sidebar-backdrop').classList.toggle('open');
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-backdrop').classList.remove('open');
}
