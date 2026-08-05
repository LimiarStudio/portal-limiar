/* =================== AUTENTICAÇÃO ===================
   Login por e-mail+senha, devolve um token de sessão (UUID) que o chamador
   deve reenviar em toda requisição daí em diante (ver Code.js). A sessão
   vive inteiramente na CacheService (rápida, consistente dentro do próprio
   projeto) — token -> {userId, isAdmin}, TTL deslizante de 6h: cada
   requisição válida (ver verificarSessao_) reaquece o TTL, então um usuário
   ativo nunca é derrubado; só expira depois de 6h seguidas sem nenhuma
   chamada, ou no logout explícito.

   Isso substitui um design anterior com um documento sessions.json no Drive
   como fonte de verdade durável (sessão válida por 30 dias). Dois problemas
   mataram esse design: (1) o Drive não garante que uma leitura enxergue uma
   escrita recém-feita no mesmo arquivo — login gravava sessions.json, e a
   chamada seguinte, quase instantânea, às vezes ainda lia a versão antiga,
   sem o token novo, e a sessão parecia inválida; (2) o arquivo é reescrito
   POR INTEIRO a cada login, então cresce sem limite ao longo de uma sessão
   de testes/uso — cada leitura+escrita fica mais lenta com o tempo, e como
   TODA requisição (não só escritas) espera o mesmo lock global em doPost
   (ver Code.js), esse custo crescente se propaga pra fila inteira. Pra um
   app interno de equipe pequena, "sessão expira depois de 6h sem uso" é uma
   troca aceitável em troca de remover Drive do caminho crítico por completo.

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
    try{ CacheService.getScriptCache().remove('sessao:'+token); }catch(e){}
    return {ok:true};
  },
};

var SESSAO_CACHE_TTL_S = 21600; // 6h, deslizante (reaquecida a cada requisição válida)

// usado só por Code.js pra validar o token de cada requisição — não é
// método de RepoAuth de propósito, então não é alcançável via despacho
// normal da API ({"collection":"auth","op":"..."})
function verificarSessao_(token){
  if(!token) return null;
  const s = lerSessaoDoCache_(token);
  if(!s) return null;
  // a conta referenciada pode ter sido removida depois do login — confirma
  // que ainda existe antes de aceitar o token. Isso rodava em TODA requisição
  // autenticada (não só login), sempre com uma leitura do Drive — cacheado
  // por 5min (ver contaExiste_) pra não pagar esse Drive extra em cada
  // chamada; troca aceitável já que remover alguém é raro e o pior caso é a
  // conta removida continuar valendo por até 5min a mais (o remover() em
  // Repo/Users.js já invalida a cache na hora, então nem isso costuma ocorrer)
  if(!contaExiste_(s)) return null;
  // TTL deslizante: quem está ativo nunca é derrubado por tempo
  salvarSessaoNoCache_(token, s);
  return s;
}

var CONTA_EXISTE_TTL_S = 300; // 5min
function contaExiste_(sessao){
  const chave = 'existe:'+(sessao.isAdmin ? 'admin' : 'user:'+sessao.userId);
  try{
    const v = CacheService.getScriptCache().get(chave);
    if(v!==null) return v==='1';
  }catch(e){}
  const existe = sessao.isAdmin ? !!administradorComSenha_() : !!LibCollection.get('users', sessao.userId);
  try{ CacheService.getScriptCache().put(chave, existe ? '1' : '0', CONTA_EXISTE_TTL_S); }catch(e){}
  return existe;
}
// chamado por Repo/Users.js#remover pra derrubar sessões da conta removida na
// hora, em vez de esperar a cache de 5min expirar sozinha
function invalidarContaExiste_(userId){
  try{ CacheService.getScriptCache().remove('existe:user:'+userId); }catch(e){}
}

function criarSessao_(dados){
  const token = Utilities.getUuid();
  const sessao = {userId: dados.userId, isAdmin: dados.isAdmin};
  salvarSessaoNoCache_(token, sessao);
  return {token:token, nome:dados.nome, email:dados.email, isAdmin:dados.isAdmin};
}

function lerSessaoDoCache_(token){
  try{
    const v = CacheService.getScriptCache().get('sessao:'+token);
    return v ? JSON.parse(v) : null;
  }catch(e){ return null; }
}
function salvarSessaoNoCache_(token, sessao){
  try{ CacheService.getScriptCache().put('sessao:'+token, JSON.stringify(sessao), SESSAO_CACHE_TTL_S); }catch(e){}
}
