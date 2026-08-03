/* =================== USUÁRIOS ===================
   "papel" usa o mesmo vocabulário do site (ROLE 'gestor'/'cliente' em
   session.js): 'gestor' = acesso total e fixo — existe exatamente UM, nunca
   criado, editado ou removido por aqui (só via Seed/edição direta no Drive) —
   'cliente' = acesso definido módulo a módulo, projeto a projeto (ver
   Repo/Permissions.js). Isto não é autenticação de verdade — não guardamos
   senha nem sessão. */
var RepoUsers = {
  listar(){ return LibCollection.list('users'); },
  buscar(id){ return LibCollection.get('users', id); },
  buscarPorEmail(email){
    const alvo = email.trim().toLowerCase();
    return RepoUsers.listar().find(function(u){ return u.email.toLowerCase()===alvo; }) || null;
  },
  criar(dados){
    const nome = dados.nome, email = dados.email, papel = dados.papel;
    if(!nome || !email) throw new Error('Informe nome e e-mail.');
    // o único gestor é um fato definido no Seed — a API pública nunca cria um
    // segundo, senão "existe exatamente um administrador" deixaria de valer
    if(papel!=='cliente') throw new Error('Usuários gestor não podem ser criados pela API — apenas via seed/edição direta no Drive.');
    if(RepoUsers.buscarPorEmail(email)) throw new Error('Já existe um usuário com o e-mail '+email+'.');
    return LibCollection.create('users', {nome:nome, email:email, papel:papel, criadoEm:new Date().toISOString()});
  },
  atualizar(id, patch){
    const atual = RepoUsers.buscar(id);
    if(!atual) throw new Error('Documento "'+id+'" não existe em users');
    if(atual.papel==='gestor') throw new Error('O usuário administrador não pode ser editado.');
    if(patch.papel==='gestor') throw new Error('Não é possível promover um usuário a gestor pela API.');
    return LibCollection.update('users', id, patch);
  },
  remover(id){
    const atual = RepoUsers.buscar(id);
    if(atual && atual.papel==='gestor') throw new Error('O usuário administrador não pode ser removido.');
    LibCollection.remove('users', id);
  },
};
