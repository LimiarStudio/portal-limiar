/* =================== CATÁLOGO: ETAPAS, CATEGORIAS, FUNÇÕES, EQUIPAMENTOS ===================
   Espelha etapasPadrao(pid)/categoriasPadrao(pid) de js/data.js: um catálogo
   de fábrica fixo (mesmo pra todo projeto novo) + uma sobreposição por
   projeto (etapas/categorias adicionadas ou removidas só ali, e relações
   etapa↔categoria reatribuídas em Configurações). "todasEtapas: true" numa
   categoria de fábrica (caso de "Ajudante"/"Mestre de Obras") substitui o
   truque de igualdade de referência de array que o site usa hoje — JSON não
   tem esse conceito. Funções (mão de obra) e equipamentos são catálogos de
   fábrica fixos, sem sobreposição por projeto — usados como opções no
   formulário de RDO (FUNCOES/EQUIPS em js/rdo-novo-page.js). */
var RepoCatalog = {
  etapasFactory(){ return LibDriveStore.readJson(LibFolders.getDataSubfolder('catalogDefaults'), 'etapas.json', []); },
  categoriasFactory(){ return LibDriveStore.readJson(LibFolders.getDataSubfolder('catalogDefaults'), 'categorias.json', []); },
  funcoesFactory(){ return LibDriveStore.readJson(LibFolders.getDataSubfolder('catalogDefaults'), 'funcoes.json', []); },
  equipamentosFactory(){ return LibDriveStore.readJson(LibFolders.getDataSubfolder('catalogDefaults'), 'equipamentos.json', []); },

  overridesVazios(projectId){
    return {projectId:projectId, removedEtapas:[], customEtapas:[], removedCategorias:[], customCategorias:[], categoriaEtapaOverrides:{}};
  },
  overrides(projectId){
    return LibDriveStore.readJson(LibFolders.getDataSubfolder('projectCatalog'), projectId+'.json', RepoCatalog.overridesVazios(projectId));
  },
  salvarOverrides(projectId, doc){
    LibDriveStore.writeJson(LibFolders.getDataSubfolder('projectCatalog'), projectId+'.json', doc);
    return doc;
  },

  etapasDoProjeto(projectId){
    const o = RepoCatalog.overrides(projectId);
    return RepoCatalog.etapasFactory().filter(function(e){ return o.removedEtapas.indexOf(e)===-1; }).concat(o.customEtapas);
  },
  categoriasDoProjeto(projectId){
    const etapas = RepoCatalog.etapasDoProjeto(projectId);
    const o = RepoCatalog.overrides(projectId);
    const lista = RepoCatalog.categoriasFactory()
      .filter(function(c){ return o.removedCategorias.indexOf(c.nome)===-1; })
      .map(function(c){ return {nome:c.nome, etapas: c.todasEtapas ? etapas.slice() : c.etapas.slice()}; })
      .concat(o.customCategorias.map(function(c){ return {nome:c.nome, etapas:c.etapas.slice()}; }));
    lista.forEach(function(c){ if(o.categoriaEtapaOverrides[c.nome]) c.etapas = o.categoriaEtapaOverrides[c.nome].slice(); });
    return lista;
  },

  adicionarEtapa(projectId, nome){
    const o = RepoCatalog.overrides(projectId);
    o.removedEtapas = o.removedEtapas.filter(function(e){ return e!==nome; });
    // só entra em customEtapas se não for uma etapa de fábrica — "adicionar" uma
    // que só estava removida é apenas desfazer a remoção acima, não duplicar
    if(RepoCatalog.etapasFactory().indexOf(nome)===-1 && o.customEtapas.indexOf(nome)===-1) o.customEtapas.push(nome);
    return RepoCatalog.salvarOverrides(projectId, o);
  },
  removerEtapa(projectId, nome){
    const o = RepoCatalog.overrides(projectId);
    if(RepoCatalog.etapasFactory().indexOf(nome)!==-1 && o.removedEtapas.indexOf(nome)===-1) o.removedEtapas.push(nome);
    o.customEtapas = o.customEtapas.filter(function(e){ return e!==nome; });
    return RepoCatalog.salvarOverrides(projectId, o);
  },
  adicionarCategoria(projectId, dados){
    const nome = dados.nome, etapas = dados.etapas;
    const o = RepoCatalog.overrides(projectId);
    o.removedCategorias = o.removedCategorias.filter(function(c){ return c!==nome; });
    // mesma lógica de adicionarEtapa: uma categoria de fábrica só reaparece
    // (linha acima) — vira customCategoria de verdade só se não existir na fábrica
    if(!RepoCatalog.categoriasFactory().some(function(c){ return c.nome===nome; })){
      o.customCategorias = o.customCategorias.filter(function(c){ return c.nome!==nome; }).concat([{nome:nome, etapas:etapas}]);
    }
    return RepoCatalog.salvarOverrides(projectId, o);
  },
  removerCategoria(projectId, nome){
    const o = RepoCatalog.overrides(projectId);
    if(RepoCatalog.categoriasFactory().some(function(c){ return c.nome===nome; }) && o.removedCategorias.indexOf(nome)===-1) o.removedCategorias.push(nome);
    o.customCategorias = o.customCategorias.filter(function(c){ return c.nome!==nome; });
    return RepoCatalog.salvarOverrides(projectId, o);
  },
  definirEtapasDaCategoria(projectId, categoriaNome, etapas){
    const o = RepoCatalog.overrides(projectId);
    o.categoriaEtapaOverrides[categoriaNome] = etapas;
    return RepoCatalog.salvarOverrides(projectId, o);
  },
};
