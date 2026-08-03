/* =================== PERMISSÕES POR PROJETO ===================
   Um documento por projeto, mapeando userId (de usuários 'cliente' — ver
   Repo/Users.js) para o que ele pode em cada módulo do projeto, mais se ele
   pode gerenciar usuários e permissões deste projeto. "visualizar" é um
   controle de verdade (padrão desligado — mais restritivo que deixar tudo
   implicitamente visível) e é pré-requisito de "write"/"delete": nunca ficam
   true se "view" for false, mesmo que o chamador tente mandar assim — ver a
   checagem defensiva em definir(), que nunca confia soment no que foi
   enviado. Usuários 'gestor' nunca aparecem aqui — o acesso deles é sempre
   total. Páginas de admin (Configurações, Editar projeto, Usuários e
   Permissões) não têm — e nunca vão ter — uma entrada aqui: são exclusivas
   de quem é 'gestor'. Módulos espelham MODULOS_PROJETO em js/helpers.js. */
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
    if(usuario.papel!=='cliente') throw new Error('Só usuários "cliente" podem ter permissões definidas — o gestor sempre tem acesso completo.');
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
