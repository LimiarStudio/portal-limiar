/* =================== RELATÓRIOS SEMANAIS (RDO) ===================
   Um arquivo por relatório, numa subpasta por projeto — diferente do
   financeiro/cronograma (um documento por projeto), porque cada RDO é
   lançado e editado como uma unidade própria. Fotos guardam "fileId" (arquivo
   de verdade no Drive, ver Lib/Images.js) OU "emoji"/"legenda" (só pros
   relatórios de exemplo antigos sem imagem de verdade) — o mesmo par que
   normalizeFoto()/fotoTileBody() já tratam em js/helpers.js. Uploads de foto
   acontecem à parte, via LibImages.saveDataUrl, ANTES de salvar() — o
   relatório só guarda a referência (fileId) devolvida por esse upload.

   gerarPdf() é um export avulso, sob demanda: gera (ou regenera) o PDF de UM
   relatório, com as fotos de verdade incorporadas, sem apagar ou alterar
   nada do relatório — o projeto continua vivo e ativo depois. É diferente de
   Repo/Archive.js#arquivarProjeto, que também gera PDF de cada relatório,
   mas como parte de arquivar (e apagar) o projeto inteiro. Os dois
   compartilham a mesma lógica de montagem do PDF via montarPdfDeRelatorio_,
   que só devolve o Blob pronto — cada um decide onde guardá-lo. */
var RepoRdos = {
  listar(projectId){
    const folder = LibFolders.getProjectSubfolder('rdos', projectId);
    return LibDriveStore.listJsonFiles(folder)
      .map(function(f){ try{ return JSON.parse(f.getBlob().getDataAsString()); }catch(e){ return null; } })
      .filter(Boolean)
      .sort(function(a,b){ return b.n-a.n; }); // mais recente primeiro
  },
  buscar(projectId, n){
    return LibDriveStore.readJson(LibFolders.getProjectSubfolder('rdos', projectId), n+'.json', null);
  },
  proximoNumero(projectId){
    const numeros = RepoRdos.listar(projectId).map(function(r){ return r.n; });
    return numeros.length ? Math.max.apply(null, numeros)+1 : 1;
  },
  // cobre tanto criar (n novo) quanto editar (n existente)
  salvar(projectId, relatorio){
    if(!relatorio.n) throw new Error('Relatório precisa de um número (n) — use proximoNumero() para um novo.');
    const doc = Object.assign({}, relatorio, {projectId:projectId});
    LibDriveStore.writeJson(LibFolders.getProjectSubfolder('rdos', projectId), doc.n+'.json', doc);
    return doc;
  },
  remover(projectId, n){
    LibDriveStore.deleteFile(LibFolders.getProjectSubfolder('rdos', projectId), n+'.json');
  },
  // export avulso: PDF de um relatório só, salvo em rdoPdfs/<projectId>/,
  // sem tocar no relatório nem no projeto. Regenerar substitui o PDF
  // anterior (não acumula duplicatas a cada novo pedido).
  gerarPdf(projectId, n){
    const projeto = RepoProjects.buscar(projectId);
    if(!projeto) throw new Error('Projeto não encontrado: '+projectId);
    const relatorio = RepoRdos.buscar(projectId, n);
    if(!relatorio) throw new Error('Relatório não encontrado: '+n);

    const pdfBlob = montarPdfDeRelatorio_(relatorio, projeto.nome);
    const filename = 'relatorio-'+n+'.pdf';
    const folder = LibFolders.getProjectSubfolder('rdoPdfs', projectId);

    const existente = folder.getFilesByName(filename);
    while(existente.hasNext()) existente.next().setTrashed(true);

    const file = folder.createFile(pdfBlob);
    // mesma razão do Lib/Images.js: privado por padrão bloquearia até o
    // próprio administrador de abrir o link fora da conta que fez o deploy
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {fileId: file.getId(), name: filename, url: file.getUrl()};
  },
};

// monta o Blob de PDF de um relatório, com as fotos incorporadas (fileId de
// verdade) ou só a legenda (fotos legado, sem arquivo — mo/eq/atividades
// seguem o mesmo formato salvo por RepoRdos.salvar). Não salva em pasta
// nenhuma — cada chamador (gerarPdf ou Repo/Archive.js) decide onde guardar.
function montarPdfDeRelatorio_(relatorio, nomeProjeto){
  const doc = DocumentApp.create('tmp-relatorio-'+relatorio.n);
  const body = doc.getBody();
  body.appendParagraph('Relatório nº '+relatorio.n+' — '+nomeProjeto).setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Semana de '+relatorio.semanaInicio+' a '+relatorio.semanaFim);
  body.appendParagraph('Responsável: '+relatorio.resp);

  body.appendParagraph('Mão de obra').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (relatorio.mo||[]).forEach(function(m){ body.appendParagraph(m.funcao+': '+m.qtd); });

  body.appendParagraph('Equipamentos').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (relatorio.eq||[]).forEach(function(e){ body.appendParagraph(e.equipamento+': '+e.qtd); });

  body.appendParagraph('Atividades realizadas').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (relatorio.atividades||[]).forEach(function(a){
    const linha = a.etapa ? (a.texto+' ('+a.etapa+' +'+a.avanco+'%)') : a.texto;
    body.appendParagraph(linha);
  });

  if(relatorio.ocorrencias){
    body.appendParagraph('Ocorrências').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(relatorio.ocorrencias);
  }

  body.appendParagraph('Fotos').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (relatorio.fotos||[]).forEach(function(foto){
    if(foto.fileId){
      try{ body.appendImage(LibImages.getBlob(foto.fileId)); }
      catch(e){ body.appendParagraph('[Não foi possível recuperar a imagem]'); }
    }
    body.appendParagraph(foto.legenda || foto.cap || '');
  });

  doc.saveAndClose();
  const pdfBlob = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  pdfBlob.setName('relatorio-'+relatorio.n+'.pdf');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  return pdfBlob;
}
