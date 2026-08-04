/* =================== AUTENTICAÇÃO ===================
   Login por e-mail+senha, devolve um token de sessão (UUID) que o chamador
   deve reenviar em toda requisição daí em diante (ver Code.js). Sessões
   ficam num único documento (sessions.json na raiz), válidas por 30 dias
   OU até logout — sem servidor de sessão de verdade, só um mapa
   token -> {userId, isAdmin, expiraEm}.

   "E-mail ou senha inválidos" é a mensagem SEMPRE, tanto pra e-mail
   inexistente quanto pra senha errada — não dá pra descobrir por tentativa
   se um e-mail está cadastrado. */
var RepoAuth = {
  login(email, senha){
    if(!email || !senha) throw new Error('Informe e-mail e senha.');
    const alvo = String(email).trim().toLowerCase();

    const admin = administradorComSenha_();
    if(admin && admin.email && admin.email.toLowerCase()===alvo){
      if(!verificarSenha_(senha, admin.senhaSalt, admin.senhaHash)) throw new Error('E-mail ou senha inválidos.');
      return criarSessao_({userId:null, isAdmin:true, nome:admin.nome, email:admin.email});
    }

    const usuario = buscarPorEmailComSenha_(alvo);
    if(!usuario || !verificarSenha_(senha, usuario.senhaSalt, usuario.senhaHash)) throw new Error('E-mail ou senha inválidos.');
    return criarSessao_({userId:usuario.id, isAdmin:false, nome:usuario.nome, email:usuario.email});
  },
  logout(token){
    const sessoes = lerSessoes_();
    delete sessoes[token];
    salvarSessoes_(sessoes);
    return {ok:true};
  },
};

// usado só por Code.js pra validar o token de cada requisição — não é
// método de RepoAuth de propósito, então não é alcançável via despacho
// normal da API ({"collection":"auth","op":"..."})
function verificarSessao_(token){
  if(!token) return null;
  const sessoes = lerSessoes_();
  const s = sessoes[token];
  if(!s) return null;
  if(new Date(s.expiraEm).getTime() < Date.now()) return null;
  // a conta referenciada pode ter sido removida depois do login — confirma
  // que ainda existe antes de aceitar o token
  if(s.isAdmin){ if(!administradorComSenha_()) return null; }
  else{ if(!LibCollection.get('users', s.userId)) return null; }
  return s;
}

function criarSessao_(dados){
  const token = Utilities.getUuid();
  const sessoes = lerSessoes_();
  sessoes[token] = {
    userId: dados.userId, isAdmin: dados.isAdmin,
    expiraEm: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
  };
  salvarSessoes_(sessoes);
  return {token:token, nome:dados.nome, email:dados.email, isAdmin:dados.isAdmin};
}
function lerSessoes_(){ return LibDriveStore.readJson(LibFolders.getRootFolder(), 'sessions.json', {}); }
function salvarSessoes_(s){ LibDriveStore.writeJson(LibFolders.getRootFolder(), 'sessions.json', s); }
