/* =================== USUÁRIOS ===================
   Sem papéis/roles — cada usuário é só nome + e-mail, e o que ele pode fazer
   é definido projeto a projeto em Repo/Permissions.js (mais a opção de
   gerenciar usuários e permissões de um projeto específico). O administrador
   NÃO é um usuário desta coleção: é um fato fixo do sistema (existe
   exatamente um, sempre com acesso completo, nunca criado/editado/removido
   por aqui) — ver administrador() abaixo, guardado à parte em admin.json.
   Isto não é autenticação de verdade — não guardamos senha nem sessão. */
var RepoUsers = {
  listar(){ return LibCollection.list('users'); },
  buscar(id){ return LibCollection.get('users', id); },
  buscarPorEmail(email){
    const alvo = email.trim().toLowerCase();
    return RepoUsers.listar().find(function(u){ return u.email.toLowerCase()===alvo; }) || null;
  },
  // registro fixo do administrador — não é um "usuário" gerenciável, só uma
  // informação de exibição (nome/e-mail), populada uma vez pelo Seed
  administrador(){
    return LibDriveStore.readJson(LibFolders.getRootFolder(), 'admin.json', null);
  },
  criar(dados){
    const nome = dados.nome, email = dados.email;
    if(!nome || !email) throw new Error('Informe nome e e-mail.');
    if(RepoUsers.buscarPorEmail(email)) throw new Error('Já existe um usuário com o e-mail '+email+'.');
    return LibCollection.create('users', {nome:nome, email:email, criadoEm:new Date().toISOString()});
  },
  atualizar(id, patch){ return LibCollection.update('users', id, patch); },
  remover(id){ LibCollection.remove('users', id); },
};
