/* =================== LOGIN ===================
   Autenticação fictícia: ainda não existe cadastro/login real de usuários
   (ver alertas em usuarios-page.js/admin-usuarios-page.js), então a única
   conta que de fato loga aqui é o administrador — outros usuários e suas
   permissões são geridos dentro de cada projeto, não escolhidos no login. */
function login(){
  try{
    localStorage.setItem('obraview_role', 'gestor');
    localStorage.setItem('obraview_loggedIn', '1');
  }catch(e){}
  window.location.href = 'projetos.html?role=gestor';
}
