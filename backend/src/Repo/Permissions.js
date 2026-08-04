/* =================== PERMISSÕES POR PROJETO ===================
   Um documento por projeto, mapeando userId (de Repo/Users.js — não há mais
   "papéis": qualquer usuário cadastrado é um alvo válido) para o que ele pode
   em cada módulo do projeto, mais se ele pode gerenciar usuários e
   permissões deste projeto. "visualizar" é um controle de verdade (padrão
   desligado — mais restritivo que deixar tudo implicitamente visível) e é
   pré-requisito de "write"/"delete": nunca ficam true se "view" for false,
   mesmo que o chamador tente mandar assim — ver a checagem defensiva em
   definir(), que nunca confia só no que foi enviado. O administrador nunca
   aparece aqui — não é um usuário desta coleção (ver Repo/Users.js), então
   nem tem um userId pra ser referenciado; o acesso dele é sempre total.
   Páginas de admin (Configurações, Editar projeto, Usuários e Permissões)
   continuam exclusivas dele. Módulos espelham MODULOS_PROJETO em
   js/helpers.js. */
var MODULOS_VALIDOS = ['visao', 'rdo', 'financeiro', 'cronograma'];

var RepoPermissions = {
  obter(projectId){
    return LibDriveStore.readJson(LibFolders.getDataSubfolder('projectPermissions'), projectId+'.json', {projectId:projectId, permissoes:{}});
  },
  doUsuario(projectId, userId){
    return RepoPermissions.obter(projectId).permissoes[userId] || null;
  },
  efetiva(projectId, userId, modulo){
    const padrao = {view:false, write:false, delete:false};
    const doUsuario = RepoPermissions.doUsuario(projectId, userId);
    if(!doUsuario || !doUsuario[modulo]) return padrao;
    return doUsuario[modulo];
  },
  definir(projectId, userId, permissoesDoUsuario){
    const usuario = RepoUsers.buscar(userId);
    if(!usuario) throw new Error('Usuário não encontrado: '+userId);
    Object.keys(permissoesDoUsuario).forEach(function(k){
      if(k!=='gerenciarUsuarios' && MODULOS_VALIDOS.indexOf(k)===-1) throw new Error('Módulo desconhecido: '+k);
    });

    const entrada = {gerenciarUsuarios: !!permissoesDoUsuario.gerenciarUsuarios};
    MODULOS_VALIDOS.forEach(function(modulo){
      const enviado = permissoesDoUsuario[modulo] || {};
      const view = !!enviado.view;
      // nunca confia em write/delete=true vindo do chamador se view for false
      entrada[modulo] = {view:view, write: view && !!enviado.write, delete: view && !!enviado.delete};
    });

    const doc = RepoPermissions.obter(projectId);
    doc.projectId = projectId;
    doc.permissoes[userId] = entrada;
    LibDriveStore.writeJson(LibFolders.getDataSubfolder('projectPermissions'), projectId+'.json', doc);
    return doc;
  },
  remover(projectId, userId){
    const doc = RepoPermissions.obter(projectId);
    delete doc.permissoes[userId];
    LibDriveStore.writeJson(LibFolders.getDataSubfolder('projectPermissions'), projectId+'.json', doc);
    return doc;
  },
};
