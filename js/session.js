/* =================== SESSION ===================
   O papel do usuário é propagado tanto por localStorage quanto por
   parâmetro de URL (?role=). O parâmetro é a fonte confiável: quando
   os arquivos são abertos direto (file://) em vez de por um servidor,
   vários navegadores isolam ou bloqueiam o localStorage por arquivo,
   então ele sozinho não é suficiente para manter a sessão entre páginas. */
let ROLE = 'gestor';

function urlRole(){
  return new URLSearchParams(window.location.search).get('role');
}
function storedRole(){
  try{ return localStorage.getItem('obraview_role'); }catch(e){ return null; }
}
function storedLoggedIn(){
  try{ return localStorage.getItem('obraview_loggedIn')==='1'; }catch(e){ return false; }
}
function persistSession(role){
  try{
    localStorage.setItem('obraview_role', role);
    localStorage.setItem('obraview_loggedIn', '1');
  }catch(e){}
}
function requireAuth(){
  if(!urlRole() && !storedLoggedIn()){
    window.location.href = 'login.html';
  }
}
function logout(){
  try{
    localStorage.removeItem('obraview_loggedIn');
    localStorage.removeItem('obraview_role');
  }catch(e){}
  window.location.href = 'login.html';
}
function renderUserChip(){
  ROLE = urlRole() || storedRole() || 'gestor';
  persistSession(ROLE);
  if(ROLE==='cliente'){
    $('#userName').textContent="João Costa";$('#userRole').textContent="Cliente";
    $('#avatar').textContent="JC";$('#avatar').style.background="var(--blue)";
  }else{
    $('#userName').textContent="Joyce Santos";$('#userRole').textContent="Gestor";
    $('#avatar').textContent="JS";$('#avatar').style.background="var(--violet)";
  }
}
/* Anexa o papel atual a um link interno, para que a sessão sobreviva
   à navegação mesmo sem localStorage disponível. */
function withRole(url){
  return url + (url.includes('?') ? '&' : '?') + 'role=' + encodeURIComponent(ROLE);
}
