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
// só habilita o de Relatórios Semanais — os demais dependem de Financeiro/Cronograma,
// que esse tipo de projeto não usa
const MODULOS_PROJETO = [['visao','Visão Geral','gauge'],['rdo','Relatórios Semanais','clipboard'],
  ['financeiro','Financeiro','wallet'],['cronograma','Cronograma','calendar']];
const modulosDoProjeto = p => p.tipo==='relatorios' ? MODULOS_PROJETO.filter(([k])=>k==='rdo') : MODULOS_PROJETO;

// permissões por usuário, por projeto — hoje só existem pro usuário de demonstração fixo
// (USUARIO_DEMO), já que o protótipo ainda não tem login/cadastro de verdade. Ficam no
// localStorage, no mesmo padrão das outras customizações de admin. "view" é pré-requisito
// de "write"/"delete" — não dá pra editar ou excluir um módulo que não se pode nem ver (a
// interface já impede isso, mas salvarPermissoesModal também garante na hora de salvar).
// "gerenciarUsuarios" é uma permissão à parte dos módulos: dá acesso à própria página de
// Usuários e Permissões (nunca a Configurações/Editar projeto, e nunca afeta o
// administrador — esse sempre tem acesso completo e não pode ser removido nem editado por
// ninguém).
const USUARIO_DEMO = 'João Costa';
const PERMISSOES_PADRAO = () => ({view:false, write:false, delete:false});
const permissoesUsuario = (pid, modulos) => {
  const base={gerenciarUsuarios:false};
  modulos.forEach(([k])=>base[k]=PERMISSOES_PADRAO());
  try{
    const salvas=JSON.parse(localStorage.getItem('obraview_permissoes_'+pid)||'null');
    if(salvas){
      modulos.forEach(([k])=>{ if(salvas[k]) base[k]=salvas[k]; });
      if(salvas.gerenciarUsuarios!==undefined) base.gerenciarUsuarios=salvas.gerenciarUsuarios;
    }
  }catch(e){}
  return base;
};
const salvarPermissoesUsuario = (pid, permissoes) => {
  try{ localStorage.setItem('obraview_permissoes_'+pid, JSON.stringify(permissoes)); }catch(e){}
};
// true quando a sessão atual é o usuário de demonstração (ROLE==='cliente') e ele foi
// autorizado a gerenciar usuários e permissões deste projeto — o administrador
// (ROLE==='gestor') já tem acesso a tudo por um caminho totalmente separado
const clientePodeGerenciarUsuarios = pid => {
  const p=projetos.find(x=>x.id===pid);
  return !!p && ROLE==='cliente' && permissoesUsuario(pid, modulosDoProjeto(p)).gerenciarUsuarios;
};
// módulos que a sessão atual pode efetivamente ver: o administrador sempre vê todos os
// módulos do projeto; o cliente de demonstração só vê os que tiverem "view" autorizado
const modulosVisiveis = p => {
  const todos = modulosDoProjeto(p);
  if(ROLE==='gestor') return todos;
  const perm = permissoesUsuario(p.id, todos);
  return todos.filter(([k])=>perm[k].view);
};

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
