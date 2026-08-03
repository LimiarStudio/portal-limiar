/* =================== BANCO DE DADOS (agregador) ===================
   Objeto único que Code.js usa pra despachar Db[collection][op](...args).

   Layout de dados no Drive (dentro de ROOT_FOLDER_ID — ver Lib/Folders.js):
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
     images/<projectId>/...               — capa e fotos de RDO de verdade (ver Lib/Images.js)
     archive/<projectId> - <nome>/...     — PDFs + imagens de projetos arquivados (ver Repo/Archive.js) */
var Db = {
  users: RepoUsers,
  projects: RepoProjects,
  permissions: RepoPermissions,
  catalog: RepoCatalog,
  cronograma: RepoCronograma,
  financeiro: RepoFinanceiro,
  rdos: RepoRdos,
  images: LibImages,
  archive: RepoArchive,
  seed: Seed,
};
