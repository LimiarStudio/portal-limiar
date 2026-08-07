/* =================== GERAÇÃO DE PDF DE RELATÓRIO (RDO) — versão enxuta ===================
   Fase 5: o relatório em si (JSON) agora vive no Firestore, lido/escrito
   direto do navegador — este backend nunca mais toca essa coleção. A única
   coisa que sobra aqui é o PDF, porque só o Apps Script tem acesso nativo a
   DocumentApp/DriveApp pra montar um documento de verdade com imagem
   embutida. Por isso gerarPdf() recebe o relatório INTEIRO já montado (o
   cliente já leu isso do Firestore) em vez de (projectId, n) — este backend
   não sabe mais onde os relatórios "moram", só sabe gerar o PDF a partir do
   que foi passado.

   Continua sendo um export avulso, sob demanda: gera (ou regenera,
   substituindo o anterior — não acumula duplicata) o PDF de UM relatório,
   com as fotos de verdade incorporadas, salvo em rdoPdfs/<projectId>/, sem
   depender de nada além do que veio no argumento. */
var RepoRdos = {
  gerarPdf(projectNome, relatorio){
    if(!relatorio || !relatorio.n) throw new Error('Relatório inválido — faltando "n".');
    if(!relatorio.projectId) throw new Error('Relatório inválido — faltando "projectId".');

    const pdfBlob = montarPdfDeRelatorio_(relatorio, projectNome);
    const filename = 'relatorio-'+relatorio.n+'.pdf';
    const folder = LibFolders.getProjectSubfolder('rdoPdfs', relatorio.projectId);

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
// verdade) ou só a legenda (fotos legado, sem arquivo). Não salva em pasta
// nenhuma — quem chama decide onde guardar.
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
    appendRichText_(body, a.texto);
    if(a.etapa) body.appendParagraph('('+a.etapa+' +'+a.avanco+'%)');
  });

  if(relatorio.ocorrencias){
    body.appendParagraph('Ocorrências').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    appendRichText_(body, relatorio.ocorrencias);
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

// suporte bem limitado de propósito, espelhando exatamente o que
// renderRichText() em js/helpers.js entende no site: "**negrito**" e uma
// linha começando com "- " vira item de lista. Nada de HTML arbitrário —
// só essas duas transformações, então não existe risco de injeção nem
// necessidade de sanitizar nada aqui.
function appendRichText_(body, texto){
  String(texto||'').split('\n').forEach(function(linha){
    const isItem = /^\s*-\s+/.test(linha);
    const conteudo = isItem ? linha.replace(/^\s*-\s+/, '') : linha;
    const partes = conteudo.split(/(\*\*.+?\*\*)/g).filter(function(p){ return p; });
    const elemento = isItem ? body.appendListItem('') : body.appendParagraph('');
    if(isItem) elemento.setGlyphType(DocumentApp.GlyphType.BULLET);
    if(!partes.length) return; // linha em branco — parágrafo vazio já basta
    partes.forEach(function(parte){
      const negrito = /^\*\*(.+)\*\*$/.exec(parte);
      const run = elemento.appendText(negrito ? negrito[1] : parte);
      if(negrito) run.setBold(true);
    });
  });
}
