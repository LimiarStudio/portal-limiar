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
  // cobre tanto criar (n novo) quanto editar (n existente). Fotos novas vêm
  // com "dataUrl" (ainda não têm arquivo no Drive) em vez de "fileId" — o
  // upload delas acontece AQUI, dentro da mesma execução, em vez do
  // front-end chamar images.saveDataUrl uma vez por foto antes de salvar.
  // Antes, um relatório com N fotos novas custava N+1 idas e voltas pelo
  // Apps Script (cada uma pagando o redirecionamento lento por conta
  // própria); agora custa 1 — a foto ainda é enviada em sequência aqui
  // dentro (sem ganho real em paralelizar, já que tudo roda na mesma
  // execução de qualquer forma), só que sem repetir a viagem de rede.
  salvar(projectId, relatorio){
    if(!relatorio.n) throw new Error('Relatório precisa de um número (n) — use proximoNumero() para um novo.');
    const fotosProntas = (relatorio.fotos||[]).map(function(f, i){
      if(f.dataUrl){
        const up = LibImages.saveDataUrl(f.dataUrl, projectId, 'rdo-foto', {n:relatorio.n, index:i});
        return {legenda:f.legenda, fileId:up.fileId};
      }
      return f;
    });
    const doc = Object.assign({}, relatorio, {projectId:projectId, fotos:fotosProntas});
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
