/* =================== LOGIN ===================
   Login de verdade: Firebase Auth (signInWithEmailAndPassword) — sem token
   próprio, sem localStorage. onAuthStateChanged (ver js/session.js) é quem
   detecta a sessão daqui pra frente, inclusive entre recarregamentos de
   página, então login() só precisa disparar o signIn e redirecionar; não
   guarda mais nada manualmente.

   Não existe mais o round-trip de buscarPorEmail() depois do login só pra
   descobrir o id de quem não é admin — firebase.auth().currentUser.uid JÁ É
   esse id, direto, sem chamada nenhuma.

   "E-mail ou senha inválidos" continua sendo a mensagem SEMPRE, tanto pra
   e-mail inexistente quanto pra senha errada — não dá pra descobrir por
   tentativa se um e-mail está cadastrado. O Firebase Auth às vezes já
   consolida os dois casos num único código (auth/invalid-credential) por
   conta própria, mas os códigos antigos (user-not-found/wrong-password)
   ainda podem aparecer dependendo da versão/config do projeto — os dois
   caem na mesma mensagem genérica abaixo. */
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
    await firebase.auth().signInWithEmailAndPassword(email, senha);
    window.location.href = 'projetos.html';
  }catch(e){
    erro.textContent = mensagemDeErroDeLogin_(e);
    erro.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

function mensagemDeErroDeLogin_(e){
  const credenciaisInvalidas = [
    'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential',
    'auth/invalid-email', 'auth/user-disabled',
  ];
  if(credenciaisInvalidas.indexOf(e.code)!==-1) return 'E-mail ou senha inválidos.';
  if(e.code==='auth/too-many-requests') return 'Muitas tentativas seguidas — aguarde um pouco e tente de novo.';
  if(e.code==='auth/network-request-failed') return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
  return 'E-mail ou senha inválidos.';
}
