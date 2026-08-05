/* =================== LOGIN ===================
   Login de verdade: chama o backend (Api.auth.login), guarda o token da
   sessão e os dados de quem logou — ver js/session.js pra como isso vira
   ROLE/CURRENT_USER no resto do site. Usuário sem papel fixo: o que ele
   pode fazer em cada projeto é definido em Usuários e Permissões, não
   escolhido aqui — só o administrador tem um jeito de logar diferente
   (conta única e fixa, ver backend/src/Repo/Auth.js). */
async function login(){
  const email = $('#login-email').value.trim();
  const senha = $('#login-senha').value;
  const btn = $('#login-btn');
  const erro = $('#login-error');
  erro.style.display = 'none';
  if(!email || !senha){
    erro.textContent = 'Informe e-mail e senha.';
    erro.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Entrando...';
  try{
    const sessao = await Api.auth.login(email, senha);
    // token precisa estar salvo ANTES de qualquer outra chamada — apiCall lê
    // o token do localStorage, então buscarPorEmail (linha abaixo) iria sem
    // token nenhum se isso ficasse pra depois
    localStorage.setItem('obraview_token', sessao.token);
    // login não devolve id (administrador não tem um) — resolvido à parte,
    // só pra quem não é admin, já que permissões são sempre por userId
    let id = null;
    if(!sessao.isAdmin){
      const usuario = await Api.users.buscarPorEmail(email);
      id = usuario ? usuario.id : null;
    }
    localStorage.setItem('obraview_user', JSON.stringify({nome:sessao.nome, email:sessao.email, isAdmin:sessao.isAdmin, id}));
    window.location.href = 'projetos.html';
  }catch(e){
    // se o login em si deu certo mas algo depois falhou (ex.: buscarPorEmail),
    // não deixa um token órfão sem obraview_user correspondente
    try{ localStorage.removeItem('obraview_token'); }catch(e2){}
    erro.textContent = e.message;
    erro.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}
