/* =================== SESSION ===================
   Sessão de verdade: token + dados de quem logou vêm do backend (ver
   js/login.js) e ficam no localStorage (obraview_token/obraview_user).
   ROLE continua existindo só pra não precisar reescrever as dezenas de
   checagens ROLE==='gestor' espalhadas pelo site — agora é sempre calculado
   a partir de quem realmente logou (CURRENT_USER.isAdmin), nunca escolhido
   à parte por um parâmetro de URL como antes. */
function usuarioLogado(){
  try{ return JSON.parse(localStorage.getItem('obraview_user')||'null'); }
  catch(e){ return null; }
}
const CURRENT_USER = usuarioLogado();
let ROLE = (CURRENT_USER && CURRENT_USER.isAdmin) ? 'gestor' : 'cliente';

function requireAuth(){
  let token = null;
  try{ token = localStorage.getItem('obraview_token'); }catch(e){}
  if(!token) window.location.href = 'login.html';
}
async function logout(){
  let token = null;
  try{ token = localStorage.getItem('obraview_token'); }catch(e){}
  try{ if(token) await Api.auth.logout(token); }catch(e){}
  try{
    localStorage.removeItem('obraview_token');
    localStorage.removeItem('obraview_user');
  }catch(e){}
  window.location.href = 'login.html';
}
function iniciais(nome){
  const partes = (nome||'').trim().split(/\s+/);
  return (((partes[0]||'')[0]||'') + ((partes[partes.length-1]||'')[0]||'')).toUpperCase();
}
function renderUserChip(){
  if(!CURRENT_USER) return;
  $('#userName').textContent = CURRENT_USER.nome;
  $('#avatar').textContent = iniciais(CURRENT_USER.nome);
  $('#avatar').style.background = ROLE==='cliente' ? 'var(--blue)' : 'var(--violet)';
}
/* mantido só pra não precisar tocar nas dezenas de hrefs que já chamam
   withRole(...) pelo site inteiro — o mecanismo de "trocar de papel pela
   URL" acabou (ROLE agora vem de quem realmente logou), mas a função
   continua existindo como passthrough pra não ter que reescrever cada uma */
function withRole(url){ return url; }

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
