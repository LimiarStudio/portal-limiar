/* =================== FINANCEIRO ===================
   Um documento por projeto: {etapaNome: [{nome, prev, lanc:[{data,desc,valor}]}]}.
   Espelha financeiro[pid] de js/data.js — fica aninhado assim (em vez de
   "achatado" em tabelas separadas) de propósito: isso é um banco de
   documentos, não uma planilha. */
var RepoFinanceiro = {
  tudo(projectId){ return LibDriveStore.readJson(LibFolders.getDataSubfolder('financeiro'), projectId+'.json', {}); },
  porEtapa(projectId, etapa){ return RepoFinanceiro.tudo(projectId)[etapa] || []; },
  salvarTudo(projectId, doc){
    LibDriveStore.writeJson(LibFolders.getDataSubfolder('financeiro'), projectId+'.json', doc);
    return doc;
  },
  realizado(categoria){ return (categoria.lanc||[]).reduce(function(a,l){ return a+l.valor; }, 0); },
  totalPrevisto(projectId, etapa){ return RepoFinanceiro.porEtapa(projectId, etapa).reduce(function(a,c){ return a+c.prev; }, 0); },
  totalRealizado(projectId, etapa){ return RepoFinanceiro.porEtapa(projectId, etapa).reduce(function(a,c){ return a+RepoFinanceiro.realizado(c); }, 0); },
  adicionarCategoria(projectId, etapa, dados){
    const doc = RepoFinanceiro.tudo(projectId);
    if(!doc[etapa]) doc[etapa] = [];
    const nova = {nome:dados.nome, prev:dados.prev, lanc:[]};
    doc[etapa].push(nova);
    RepoFinanceiro.salvarTudo(projectId, doc);
    return nova;
  },
  atualizarOrcamento(projectId, etapa, categoriaNome, novoPrev){
    const doc = RepoFinanceiro.tudo(projectId);
    const cat = (doc[etapa]||[]).find(function(c){ return c.nome===categoriaNome; });
    if(!cat) throw new Error('Categoria "'+categoriaNome+'" não encontrada em '+etapa+'.');
    cat.prev = novoPrev;
    RepoFinanceiro.salvarTudo(projectId, doc);
    return cat;
  },
  lancarGasto(projectId, etapa, categoriaNome, dados){
    const doc = RepoFinanceiro.tudo(projectId);
    const cat = (doc[etapa]||[]).find(function(c){ return c.nome===categoriaNome; });
    if(!cat) throw new Error('Categoria "'+categoriaNome+'" não encontrada em '+etapa+'.');
    cat.lanc.push({data:dados.data, desc:dados.desc, valor:dados.valor});
    RepoFinanceiro.salvarTudo(projectId, doc);
    return cat;
  },
  removerLancamento(projectId, etapa, categoriaNome, indice){
    const doc = RepoFinanceiro.tudo(projectId);
    const cat = (doc[etapa]||[]).find(function(c){ return c.nome===categoriaNome; });
    if(!cat) throw new Error('Categoria "'+categoriaNome+'" não encontrada em '+etapa+'.');
    cat.lanc.splice(indice, 1);
    RepoFinanceiro.salvarTudo(projectId, doc);
    return cat;
  },
  removerCategoria(projectId, etapa, categoriaNome){
    const doc = RepoFinanceiro.tudo(projectId);
    doc[etapa] = (doc[etapa]||[]).filter(function(c){ return c.nome!==categoriaNome; });
    RepoFinanceiro.salvarTudo(projectId, doc);
  },
};
