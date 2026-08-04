/* =================== BANCO DE DADOS (agregador) ===================
   Objeto único que Code.js usa pra despachar Db[collection][op](...args).

   Layout de dados no Drive (dentro de ROOT_FOLDER_ID — ver Lib/Folders.js):
     admin.json                           — o único administrador (nome, e-mail) — não é um "usuário"
     users/<id>.json                      — usuários (nome, e-mail — sem papéis/roles)
     projects/<id>.json                   — projetos
     projectPermissions/<projectId>.json  — o que cada usuário pode em cada módulo
     catalogDefaults/etapas.json          — catálogo de fábrica de etapas
     catalogDefaults/categorias.json      — catálogo de fábrica de categorias
     catalogDefaults/funcoes.json         — funções de mão de obra (RDO)
     catalogDefaults/equipamentos.json    — equipamentos (RDO)
     projectCatalog/<projectId>.json      — customizações de etapas/categorias daquele projeto
     cronogramas/<projectId>.json         — etapas do cronograma daquele projeto
     financeiro/<projectId>.json          — etapa -> categorias -> lançamentos
     rdos/<projectId>/<n>.json            — um relatório semanal por arquivo
     rdoPdfs/<projectId>/relatorio-<n>.pdf — export avulso de um relatório, sob demanda (ver Repo/Rdos.js#gerarPdf)
     images/<projectId>/...               — capa e fotos de RDO de verdade (ver Lib/Images.js)
     archive/<projectId> - <nome>/...     — PDFs + imagens de projetos arquivados (ver Repo/Archive.js)

   Db é uma FUNÇÃO, não um objeto pronto: no Apps Script todo o código do
   projeto é recarregado do zero a cada execução, na ordem alfabética dos
   arquivos (Code.js, Db.js, Lib/*, Repo/*, Seed.js). Como "Db.js" vem antes
   de "Repo/*.js" nessa ordem, um objeto literal capturado no momento em que
   o ARQUIVO carrega veria RepoUsers (e os demais) ainda como undefined. Uma
   função só monta o objeto quando é CHAMADA — e ela só é chamada de dentro
   de doGet/doPost em Code.js, depois que todo o projeto já terminou de
   carregar. */
function Db(){
  return {
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
}
