/* =================== PERMISSÕES POR PROJETO ===================
   Um documento por projeto, mapeando userId (de usuários com papel 'cliente' —
   ver db/repo/users.js) para o que ele pode fazer em cada módulo do projeto.
   Visualizar já vale pra todos os módulos que o projeto tiver (ver
   modulosDoProjeto() em js/helpers.js); "write"/"delete" abaixo é só sobre
   poder editar/criar ou excluir. Usuários 'gestor' nunca aparecem aqui —
   o acesso deles é sempre total e não passa por essa checagem. Páginas de
   admin (Configurações, Editar projeto, Usuários e Permissões) não têm — e
   nunca vão ter — uma entrada aqui: são exclusivas de quem é 'gestor'. */
const path = require('path');
const {readJson, writeJson} = require('../lib/jsonFile');

const fileFor = projectId => path.join(__dirname, '..', 'data', 'projectPermissions', String(projectId)+'.json');

function obter(projectId){
  return readJson(fileFor(projectId), {projectId, permissoes:{}});
}
// permissoesPorModulo: {visao:{write,delete}, rdo:{write,delete}, financeiro:{write,delete}, cronograma:{write,delete}}
function definir(projectId, userId, permissoesPorModulo){
  const doc = obter(projectId);
  doc.permissoes[userId] = permissoesPorModulo;
  writeJson(fileFor(projectId), doc);
  return doc;
}
function remover(projectId, userId){
  const doc = obter(projectId);
  delete doc.permissoes[userId];
  writeJson(fileFor(projectId), doc);
  return doc;
}
function doUsuario(projectId, userId){
  return obter(projectId).permissoes[userId] || null;
}

module.exports = {obter, definir, remover, doUsuario};
