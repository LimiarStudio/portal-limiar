/* =================== BANCO DE DADOS (agregador) — versão enxuta ===================
   Fase 5: só sobram duas coisas que precisam de credencial de servidor —
   imagem (Drive) e PDF de relatório (DocumentApp + Drive). Tudo o mais
   (projects, users, permissions, catalog, cronograma, financeiro) mudou pra
   Firestore, lido/escrito direto do navegador — não faz sentido mais aqui.

   Db continua sendo uma FUNÇÃO (não um objeto pronto) pelo mesmo motivo de
   sempre: Apps Script recarrega o projeto do zero a cada execução, em ordem
   alfabética de arquivo — um objeto literal capturado no carregamento de
   "Db.js" veria RepoRdos ainda undefined, já que "Repo/Rdos.js" carrega
   depois. Só quando Db() é CHAMADA (de dentro de doPost, depois que tudo já
   carregou) é que faz sentido montar o objeto. */
function Db(){
  return {
    images: LibImages,
    rdos: RepoRdos,
  };
}
