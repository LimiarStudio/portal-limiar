/* =================== ARQUIVAMENTO DE PROJETO ===================
   Converte cada relatório semanal do projeto num PDF com as fotos realmente
   incorporadas (não um link — o arquivo original é apagado depois, então o
   PDF precisa ser autocontido), salva os PDFs numa pasta própria do projeto
   em Arquivo/, MOVE (não apaga) a pasta de imagens originais pra dentro dela
   também — preserva os originais em alta resolução a custo quase zero de
   espaço, já que o real motivo do arquivamento é manter o banco ATIVO
   enxuto, não economizar espaço no Drive — e só então apaga o resto do
   projeto do banco ativo: permissões, catálogo, cronograma, financeiro e os
   próprios relatórios. Espelha o fluxo já aprovado e simulado na demo
   estática (ver "Zona de risco" em editar-projeto-page.js). A montagem do
   PDF em si (montarPdfDeRelatorio_) é compartilhada com o export avulso de
   Repo/Rdos.js#gerarPdf — aqui só decide ONDE guardar o resultado. */
var RepoArchive = {
  arquivarProjeto(projectId, confirm){
    if(confirm!=='ARQUIVAR PROJETO') throw new Error('Confirmação inválida — digite "ARQUIVAR PROJETO" para arquivar.');
    const projeto = RepoProjects.buscar(projectId);
    if(!projeto) throw new Error('Projeto não encontrado: '+projectId);

    const nome = projeto.nome;
    const archiveFolder = LibFolders.getArchiveFolder(projectId, nome);
    const relatorios = RepoRdos.listar(projectId);
    const pdfsGerados = [];

    relatorios.forEach(function(relatorio){
      const pdfBlob = montarPdfDeRelatorio_(relatorio, nome);
      archiveFolder.createFile(pdfBlob);
      pdfsGerados.push(relatorio.n);
    });

    moveImagesFolderToArchive_(projectId, archiveFolder);

    // apaga o que resta do projeto no banco ativo — os relatórios já viraram
    // PDF e as imagens já foram preservadas dentro do Arquivo
    relatorios.forEach(function(r){ RepoRdos.remover(projectId, r.n); });
    LibDriveStore.deleteFile(LibFolders.getDataSubfolder('projectPermissions'), projectId+'.json');
    LibDriveStore.deleteFile(LibFolders.getDataSubfolder('projectCatalog'), projectId+'.json');
    LibDriveStore.deleteFile(LibFolders.getDataSubfolder('cronogramas'), projectId+'.json');
    LibDriveStore.deleteFile(LibFolders.getDataSubfolder('financeiro'), projectId+'.json');
    RepoProjects.remover(projectId);

    return {projectId:projectId, nome:nome, pdfsGerados:pdfsGerados, pastaArquivo:archiveFolder.getUrl()};
  },
};

function moveImagesFolderToArchive_(projectId, archiveFolder){
  const imagesRoot = LibFolders.getDataSubfolder('images');
  const it = imagesRoot.getFoldersByName(String(projectId));
  if(!it.hasNext()) return; // projeto sem nenhuma imagem enviada
  const imgFolder = it.next();
  if(typeof imgFolder.moveTo === 'function'){
    imgFolder.moveTo(archiveFolder);
  }else{
    const parents = imgFolder.getParents();
    while(parents.hasNext()) parents.next().removeFolder(imgFolder);
    archiveFolder.addFolder(imgFolder);
  }
  LibFolders.invalidate('folder:proj:images:'+projectId);
}
