/* =================== USUÁRIOS ===================
   Sem papéis/roles — cada usuário é só nome + e-mail + senha, e o que ele
   pode fazer é definido projeto a projeto em Repo/Permissions.js (mais a
   opção de gerenciar usuários e permissões de um projeto específico). O
   administrador NÃO é um usuário desta coleção: é um fato fixo do sistema
   (existe exatamente um, sempre com acesso completo, nunca criado/editado/
   removido por aqui) — ver administrador() abaixo, guardado à parte em
   admin.json. A senha do administrador só pode ser definida (ou trocada) na
   mão, pelo editor do Apps Script (ver Seed.js#definirSenhaAdmin) — nunca
   pela API pública.

   senhaHash/senhaSalt NUNCA saem por listar()/buscar()/buscarPorEmail() —
   só as variantes *ComSenha_ (uso interno de Repo/Auth.js) devolvem o hash. */
var RepoUsers = {
  listar(){ return LibCollection.list('users').map(despojarSenha_); },
  buscar(id){ return despojarSenha_(LibCollection.get('users', id)); },
  buscarPorEmail(email){
    return despojarSenha_(buscarPorEmailComSenha_(email));
  },
  // registro fixo do administrador — não é um "usuário" gerenciável, só uma
  // informação de exibição (nome/e-mail), populada uma vez pelo Seed
  administrador(){
    return despojarSenha_(administradorComSenha_());
  },
  criar(dados){
    const nome = dados.nome, email = dados.email, senha = dados.senha;
    if(!nome || !email) throw new Error('Informe nome e e-mail.');
    validarSenha_(senha);
    if(buscarPorEmailComSenha_(email)) throw new Error('Já existe um usuário com o e-mail '+email+'.');
    const salt = gerarSalt_();
    return despojarSenha_(LibCollection.create('users', {
      nome:nome, email:email, senhaHash:hashSenha_(senha, salt), senhaSalt:salt,
      criadoEm:new Date().toISOString(),
    }));
  },
  atualizar(id, patch){
    // nome/e-mail podem mudar por aqui; senha é só por redefinirSenha (evita
    // alguém trocar a senha "de passagem" escondida num patch qualquer)
    const seguro = Object.assign({}, patch);
    delete seguro.senha; delete seguro.senhaHash; delete seguro.senhaSalt;
    return despojarSenha_(LibCollection.update('users', id, seguro));
  },
  remover(id){ LibCollection.remove('users', id); },
  redefinirSenha(id, novaSenha){
    validarSenha_(novaSenha);
    const salt = gerarSalt_();
    return despojarSenha_(LibCollection.update('users', id, {senhaHash:hashSenha_(novaSenha, salt), senhaSalt:salt}));
  },
};

function despojarSenha_(u){
  if(!u) return u;
  const copia = Object.assign({}, u);
  delete copia.senhaHash; delete copia.senhaSalt;
  return copia;
}
function validarSenha_(senha){
  if(!senha || String(senha).length<6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
}
// uso interno (Repo/Auth.js) — inclui o hash/salt, nunca deve ser exposto
// pelo despacho da API (por isso vivem soltos aqui, não como método de
// RepoUsers — não são alcançáveis via {"collection":"users","op":"..."})
function buscarPorEmailComSenha_(email){
  const alvo = String(email).trim().toLowerCase();
  return LibCollection.list('users').find(function(u){ return u.email.toLowerCase()===alvo; }) || null;
}
function administradorComSenha_(){
  return LibDriveStore.readJson(LibFolders.getRootFolder(), 'admin.json', null);
}
