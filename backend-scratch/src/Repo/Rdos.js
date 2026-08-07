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

/* --- identidade visual: espelha as variáveis de css/styles.css (:root) pra
   o PDF combinar com o site, em vez de sair com a formatação padrão do
   Google Docs. Roboto no lugar da Segoe UI do site — mais próxima fonte
   disponível nativamente no Google Docs. --- */
var COR_ACCENT = '#276272';
var COR_ACCENT_ESCURO = '#1c4854';
var COR_FUNDO_CARD = '#ecf2f3';
var COR_LINHA = '#c7d5d8';
var COR_TEXTO = '#122226';
var COR_MUTED = '#5e7278';
var FONTE = 'Roboto';
var LOGO_URL = 'https://limiarstudio.github.io/portal-limiar/img/logo-limiar.png';

// monta o Blob de PDF de um relatório, com as fotos incorporadas (fileId de
// verdade) ou só a legenda (fotos legado, sem arquivo). Não salva em pasta
// nenhuma — quem chama decide onde guardar.
function montarPdfDeRelatorio_(relatorio, nomeProjeto){
  const doc = DocumentApp.create('tmp-relatorio-'+relatorio.n);
  const body = doc.getBody();
  body.setMarginTop(40).setMarginBottom(40).setMarginLeft(50).setMarginRight(50);

  inserirLogo_(body);
  inserirFaixaTitulo_(body, relatorio, nomeProjeto);

  const infoPar = body.appendParagraph('Semana de '+relatorio.semanaInicio+' a '+relatorio.semanaFim+'   ·   Responsável: '+relatorio.resp);
  estilizarParagrafo_(infoPar, {tamanho:10, cor:COR_MUTED, antes:12, depois:22});

  tituloSecao_(body, 'Mão de obra');
  tabelaContagem_(body, (relatorio.mo||[]).map(function(m){ return [m.funcao, String(m.qtd)]; }), 'Função', 'Qtd');

  tituloSecao_(body, 'Equipamentos');
  tabelaContagem_(body, (relatorio.eq||[]).map(function(e){ return [e.equipamento, String(e.qtd)]; }), 'Equipamento', 'Qtd');

  tituloSecao_(body, 'Atividades realizadas');
  if(!(relatorio.atividades||[]).length){
    paragrafoVazio_(body, 'Nenhuma atividade registrada.');
  }
  (relatorio.atividades||[]).forEach(function(a){
    cardTexto_(body, a.texto, a.etapa ? (a.etapa+'  ·  +'+a.avanco+'%') : null);
  });

  if(relatorio.ocorrencias){
    tituloSecao_(body, 'Ocorrências');
    cardTexto_(body, relatorio.ocorrencias, null);
  }

  tituloSecao_(body, 'Fotos');
  const fotos = relatorio.fotos||[];
  if(!fotos.length){
    paragrafoVazio_(body, 'Nenhuma foto anexada.');
  }else{
    gradeFotos_(body, fotos);
  }

  const rodape = body.appendParagraph('Studio Limiar  ·  Portal Limiar');
  estilizarParagrafo_(rodape, {tamanho:8, cor:COR_MUTED, antes:28});
  rodape.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  doc.saveAndClose();
  const pdfBlob = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  pdfBlob.setName('relatorio-'+relatorio.n+'.pdf');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  return pdfBlob;
}

// --- construção visual ---------------------------------------------------

// logo do Studio Limiar buscada direto do site publicado — sem precisar
// guardar uma cópia no Drive nem no Apps Script; se o fetch falhar (site
// fora do ar, sem internet no momento), segue sem travar a geração do PDF
function inserirLogo_(body){
  try{
    const resposta = UrlFetchApp.fetch(LOGO_URL, {muteHttpExceptions:true});
    if(resposta.getResponseCode()!==200) return;
    const img = body.appendImage(resposta.getBlob());
    const proporcao = img.getWidth()/img.getHeight();
    img.setHeight(30);
    img.setWidth(Math.round(30*proporcao));
    img.getParent().asParagraph().setSpacingAfter(10);
  }catch(e){}
}

// faixa colorida com o número do relatório e o nome do projeto — uma
// tabela de 1 célula só, sem borda, usada como "banner" (o Docs não tem um
// jeito nativo de colorir só o fundo de um parágrafo comum)
function inserirFaixaTitulo_(body, relatorio, nomeProjeto){
  const tabela = body.appendTable([['']]);
  tabela.setBorderWidth(0);
  const celula = tabela.getCell(0,0);
  celula.setBackgroundColor(COR_ACCENT);
  celula.setPaddingTop(14).setPaddingBottom(14).setPaddingLeft(18).setPaddingRight(18);

  const primeiro = celula.getChild(0).asParagraph();
  primeiro.editAsText().setText('Relatório Semanal nº '+relatorio.n);
  estilizarParagrafo_(primeiro, {tamanho:17, cor:'#ffffff', negrito:true, depois:2});

  const subtitulo = celula.appendParagraph(nomeProjeto);
  estilizarParagrafo_(subtitulo, {tamanho:11.5, cor:'#d7e7ea'});
}

function tituloSecao_(body, texto){
  const p = body.appendParagraph(texto);
  estilizarParagrafo_(p, {tamanho:12.5, cor:COR_ACCENT_ESCURO, negrito:true, antes:12, depois:8});
  return p;
}

function paragrafoVazio_(body, texto){
  const p = body.appendParagraph(texto);
  estilizarParagrafo_(p, {tamanho:10, cor:COR_MUTED, italico:true, depois:4});
  return p;
}

// espaço em branco entre blocos (tabela, card...) — Table não tem
// setSpacingAfter próprio, então isso é sempre um parágrafo vazio depois.
// Precisa desligar itálico/negrito explicitamente: o Docs às vezes propaga
// a formatação do parágrafo/célula anterior pro próximo elemento inserido
// quando ela não é dita explicitamente, e um espaçador "contamina" o que
// vier depois dele em silêncio se não for zerado
function espacador_(body, altura){
  const p = body.appendParagraph('');
  const t = p.editAsText();
  t.setItalic(false);
  t.setBold(false);
  p.setSpacingAfter(altura===undefined ? 4 : altura);
  return p;
}

// tabela simples de 2 colunas (nome + quantidade) com cabeçalho destacado —
// usada tanto pra mão de obra quanto equipamentos
function tabelaContagem_(body, linhas, rotuloA, rotuloB){
  if(!linhas.length){ paragrafoVazio_(body, 'Nenhum registro.'); return; }
  const dados = [[rotuloA, rotuloB]].concat(linhas);
  const tabela = body.appendTable(dados);
  tabela.setBorderColor(COR_LINHA).setBorderWidth(0.75);
  for(let coluna=0; coluna<2; coluna++){
    const celula = tabela.getCell(0, coluna);
    celula.setBackgroundColor(COR_FUNDO_CARD);
    celula.setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(10).setPaddingRight(10);
    estilizarParagrafo_(celula.getChild(0).asParagraph(), {tamanho:8.5, cor:COR_MUTED, negrito:true});
  }
  for(let linha=1; linha<dados.length; linha++){
    for(let coluna=0; coluna<2; coluna++){
      const celula = tabela.getCell(linha, coluna);
      celula.setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(10).setPaddingRight(10);
      estilizarParagrafo_(celula.getChild(0).asParagraph(), {tamanho:10.5, cor:COR_TEXTO});
    }
  }
}

// "card" com fundo suave pra uma atividade ou as ocorrências — mesmo efeito
// visual das divs .card do site, adaptado pro modelo de tabela do Docs.
// appendRichText_ (já existia, entende **negrito** e "- item") funciona sem
// mudança nenhuma aqui porque TableCell tem os mesmos métodos appendParagraph/
// appendListItem que Body — só precisa estilizar o resultado depois
function cardTexto_(body, texto, legendaEtapa){
  const tabela = body.appendTable([['']]);
  tabela.setBorderWidth(0);
  const celula = tabela.getCell(0,0);
  celula.setBackgroundColor(COR_FUNDO_CARD);
  celula.setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(14).setPaddingRight(14);

  const vazioInicial = celula.getChild(0);
  appendRichText_(celula, texto);
  if(legendaEtapa){
    const badge = celula.appendParagraph(legendaEtapa);
    estilizarParagrafo_(badge, {tamanho:9, cor:COR_ACCENT, negrito:true, antes:6});
  }
  vazioInicial.asParagraph().removeFromParent();
  estilizarFilhos_(celula, {tamanho:10.5, cor:COR_TEXTO});

  espacador_(body, 6);
}

// grade de fotos, 2 por linha — cada célula com a imagem redimensionada
// (mantendo proporção) e a legenda embaixo
function gradeFotos_(body, fotos){
  for(let i=0; i<fotos.length; i+=2){
    const par = [fotos[i], fotos[i+1]];
    const linha = body.appendTable([['', '']]);
    linha.setBorderWidth(0);
    for(let coluna=0; coluna<2; coluna++){
      const foto = par[coluna];
      const celula = linha.getCell(0, coluna);
      celula.setPaddingTop(4).setPaddingBottom(10).setPaddingLeft(coluna===0?0:8).setPaddingRight(coluna===0?8:0);
      if(!foto) continue;

      const vazioInicial = celula.getChild(0);
      if(foto.fileId){
        try{
          const img = celula.appendImage(LibImages.getBlob(foto.fileId));
          const proporcao = img.getWidth()/img.getHeight();
          img.setWidth(215);
          img.setHeight(Math.round(215/proporcao));
        }catch(e){
          estilizarParagrafo_(celula.appendParagraph('[Não foi possível recuperar a imagem]'), {tamanho:9, cor:COR_MUTED, italico:true});
        }
      }else if(foto.emoji){
        // fotos de exemplo antigas, sem arquivo de verdade — mesmo placeholder
        // que fotoTileBody() usa no site (js/helpers.js), num quadro do mesmo
        // tamanho da grade pra não deixar um buraco em branco ao lado de fotos reais
        const placeholder = celula.appendTable([[foto.emoji]]);
        placeholder.setBorderColor(COR_LINHA).setBorderWidth(0.75);
        const celulaPlaceholder = placeholder.getCell(0,0);
        celulaPlaceholder.setBackgroundColor(COR_FUNDO_CARD);
        celulaPlaceholder.setWidth(215);
        celulaPlaceholder.setPaddingTop(60).setPaddingBottom(60);
        const parEmoji = celulaPlaceholder.getChild(0).asParagraph();
        parEmoji.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        estilizarParagrafo_(parEmoji, {tamanho:40});
      }
      const legenda = celula.appendParagraph(foto.legenda || foto.cap || '');
      estilizarParagrafo_(legenda, {tamanho:8.5, cor:COR_MUTED, antes:4});
      vazioInicial.asParagraph().removeFromParent();
    }
  }
}

// --- helpers de estilo ----------------------------------------------------

function estilizarParagrafo_(paragrafo, opts){
  const texto = paragrafo.editAsText();
  texto.setFontFamily(FONTE);
  if(opts.tamanho) texto.setFontSize(opts.tamanho);
  if(opts.cor) texto.setForegroundColor(opts.cor);
  if(opts.negrito) texto.setBold(true);
  if(opts.italico) texto.setItalic(true);
  if(opts.antes!==undefined) paragrafo.setSpacingBefore(opts.antes);
  if(opts.depois!==undefined) paragrafo.setSpacingAfter(opts.depois);
  return paragrafo;
}

// aplica fonte/tamanho/cor a todo mundo dentro de um container (célula),
// sem mexer no negrito que appendRichText_ já tiver aplicado por conta
// própria em partes específicas do texto
function estilizarFilhos_(container, opts){
  const n = container.getNumChildren();
  for(let i=0; i<n; i++){
    const filho = container.getChild(i);
    const tipo = filho.getType();
    let texto = null;
    if(tipo===DocumentApp.ElementType.PARAGRAPH) texto = filho.asParagraph().editAsText();
    else if(tipo===DocumentApp.ElementType.LIST_ITEM) texto = filho.asListItem().editAsText();
    if(texto && texto.getText().length){
      texto.setFontFamily(FONTE);
      texto.setItalic(false); // o Docs às vezes herda itálico do parágrafo/célula anterior — nunca é o que queremos aqui
      if(opts.tamanho) texto.setFontSize(opts.tamanho);
      if(opts.cor) texto.setForegroundColor(opts.cor);
    }
  }
}

// suporte bem limitado de propósito, espelhando exatamente o que
// renderRichText() em js/helpers.js entende no site: "**negrito**" e uma
// linha começando com "- " vira item de lista. Nada de HTML arbitrário —
// só essas duas transformações, então não existe risco de injeção nem
// necessidade de sanitizar nada aqui. Funciona tanto com Body quanto com
// TableCell — ambos têm os mesmos métodos appendParagraph/appendListItem.
function appendRichText_(container, texto){
  String(texto||'').split('\n').forEach(function(linha){
    const isItem = /^\s*-\s+/.test(linha);
    const conteudo = isItem ? linha.replace(/^\s*-\s+/, '') : linha;
    const partes = conteudo.split(/(\*\*.+?\*\*)/g).filter(function(p){ return p; });
    const elemento = isItem ? container.appendListItem('') : container.appendParagraph('');
    if(isItem) elemento.setGlyphType(DocumentApp.GlyphType.BULLET);
    if(!partes.length) return; // linha em branco — parágrafo vazio já basta
    partes.forEach(function(parte){
      const negrito = /^\*\*(.+)\*\*$/.exec(parte);
      const run = elemento.appendText(negrito ? negrito[1] : parte);
      if(negrito) run.setBold(true);
    });
  });
}
