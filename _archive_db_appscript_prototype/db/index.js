/* =================== BANCO DE DADOS (documentos em JSON) ===================
   Banco local baseado em arquivo, sem dependências externas — cada "documento"
   é um arquivo .json de verdade dentro de db/data/, organizado por coleção.
   Pensado como a camada de dados que uma futura API (Apps Script ou outra)
   viria a expor; o site (js/*.js) ainda não fala com isso — continua com os
   arrays em memória de js/data.js até essa ligação ser feita.

   Layout de db/data/:
     users/<id>.json                      — contas (nome, e-mail, papel gestor/cliente)
     projects/<id>.json                   — projetos
     projectPermissions/<projectId>.json  — o que cada usuário 'cliente' pode em cada módulo
     catalogDefaults/etapas.json          — catálogo de fábrica de etapas
     catalogDefaults/categorias.json      — catálogo de fábrica de categorias
     catalogDefaults/funcoes.json         — funções de mão de obra (RDO)
     catalogDefaults/equipamentos.json    — equipamentos (RDO)
     projectCatalog/<projectId>.json      — customizações de etapas/categorias daquele projeto
     cronogramas/<projectId>.json         — etapas do cronograma daquele projeto
     financeiro/<projectId>.json          — etapa -> categorias -> lançamentos
     rdos/<projectId>/<n>.json            — um relatório semanal por arquivo

   Imagens ficam à parte, em db/images/ (ver db/lib/images.js) — os documentos
   acima só guardam o caminho relativo, nunca a imagem em si. */
module.exports = {
  users: require('./repo/users'),
  projects: require('./repo/projects'),
  permissions: require('./repo/permissions'),
  catalog: require('./repo/catalog'),
  cronograma: require('./repo/cronograma'),
  financeiro: require('./repo/financeiro'),
  rdos: require('./repo/rdos'),
  images: require('./lib/images'),
};
